import path from "path";
import fs from "fs";

import { chain, map, assign, filter } from "lodash";
import * as t from "babel-types";
import template from "interlock/lib/util/template";
import initBundle from "interlock/lib/compile/bundles/init";


function getTemplate (templateName, transform) {
  transform = transform || (node => node);
  const absPath = path.join(__dirname, `../templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8")
    // Remove ESlint rule exclusions from parsed templates.
    .replace(/\s*\/\/\s*eslint-disable-line.*/g, "");
  const _template = template(templateStr);
  return opts => transform(_template(opts));
}

const overrideGetUrlTmpl = getTemplate("override-get-url", body => body);

function getSeedsByPath (definitions, moduleSeeds) {
  return chain(definitions)
    .map((def, relPath) => [ moduleSeeds[relPath].path, def ])
    .fromPairs()
    .value();
}

export default function (opts = {}) {
  const {
    baseUrl = "/",
    pushManifest = "push-manifest.json",
    pushManifestPretty = false
  } = opts;

  return (override, transform) => {
    // Prepend `h2_` to each module's moduleId.  This disambiguates
    // H2 modules from standard modules, and signifies that the module
    // should be loaded using a non-standard mechanism, to
    transform("generateModuleId", module => {
      return assign({}, module, {
        id: `h2_${module.id}`
      });
    });

    // Generate a single "bundle" for each input module.  Make sure
    // to use the specified output filename if it was provided.
    override("partitionBundles", function (moduleSeeds, moduleMaps) {
      const entryModuleDefs = getSeedsByPath(this.opts.entry, moduleSeeds);
      const splitModuleDefs = getSeedsByPath(this.opts.split, moduleSeeds);

      const bundleSeedsPs = map(moduleMaps.byAbsPath, (module, absPath) => {
        const entryConfig = entryModuleDefs[absPath];
        const splitConfig = splitModuleDefs[absPath];

        return initBundle.call(this, {
          dest: entryConfig && entryConfig.dest ||
            splitConfig && splitConfig.dest,
          module,
          moduleHashes: [ module.hash ],
          isEntryPt: !!entryConfig,
          type: module.type
        });
      });

      return Promise.all(bundleSeedsPs);
    });

    // We'll be modifying the behavior of the default provider, such
    // that when a moduleId prefixed with `h2_` comes along, a URL
    // will be generated for it directly, rather than consulting the
    // moduleId-to-bundleUrl hash created here.
    override("getUrls", () => ({}));

    override("constructRegisterUrls", () => {
      return overrideGetUrlTmpl({
        BASE_URL: t.stringLiteral(baseUrl)
      });
    });

    // Build a bundle dependency graph, such that when a JS bundle is
    // requested, the server can know what other files will be requested
    // once the bundle loads in the client browser.
    function buildPushManifest (bundles, manifestFilename) {
      const manifestableBundles = filter(bundles, bundle => bundle.module);

      const bundlesByModuleId = chain(manifestableBundles)
        .map(bundle => [ bundle.module.id, bundle ])
        .fromPairs()
        .value();

      const bundleDepGraph = chain(manifestableBundles)
        .map(bundle => {
          const deepDependencyFilenames = map(bundle.module.deepDependencies,
            dependency => bundlesByModuleId[dependency.id].dest
          );
          return [ bundle.dest, deepDependencyFilenames ];
        })
        .fromPairs()
        .value();

      const output = pushManifestPretty ?
        JSON.stringify(bundleDepGraph, null, 2) :
        JSON.stringify(bundleDepGraph);

      return {
        raw: output,
        dest: manifestFilename
      };
    }

    transform("emitRawBundles", bundles => {
      return pushManifest ?
        bundles.concat(buildPushManifest(bundles, pushManifest)) :
        bundles;
    });
  };
}
