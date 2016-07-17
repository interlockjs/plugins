import path from "path";
import fs from "fs";

import { chain, map, assign } from "lodash";
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
    baseUrl = "/"
  } = opts;

  return (override, transform) => {
    // Prepend `h2:` to each module's moduleId.  This disambiguates
    // H2 modules from standard modules, and signifies that the module
    // should be loaded using a non-standard mechanism, to
    transform("generateModuleId", module => {
      return assign({}, module, {
        id: `h2:${module.id}`
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
    // that when a moduleId prefixed with `h2:` comes along, a URL
    // will be generated for it directly, rather than consulting the
    // moduleId-to-bundleUrl hash created here.
    override("getUrls", () => ({}));

    override("constructRegisterUrls", () => {
      return overrideGetUrlTmpl({
        BASE_URL: t.stringLiteral(baseUrl)
      });
    });
  };
}
