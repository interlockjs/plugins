import cheerio from "cheerio";
import generate from "babel-generator";
import { assign, includes, chain } from "lodash";


const VALID_SCRIPT_TYPES = [
  "text/javascript",
  "text/ecmascript",
  "application/javascript",
  "application/ecmascript",
  undefined
];

const VALID_STYLE_TYPES = [
  "text/css",
  undefined
];


export default function (opts = {}) {
  const isHtmlFile = opts.filter || /\.html?$/;

  return (override, transform) => {
    /**
     * Modules whose file paths match the provided filter (`.htm(l)` by
     * default) should be of type `html`.
     */
    transform("setModuleType", module => {
      return isHtmlFile.test(module.path) ?
        assign({}, module, { type: "html" }) :
        module;
    });

    /**
     * Parse the HTML and make `$` available on the module.
     */
    override("parseModule", module => {
      if (module.type !== "html") {
        return override.CONTINUE;
      }
      return assign({}, module, {
        $: cheerio.load(module.rawSource)
      });
    });

    /**
     * No work needs to occur here, although plugins may mutate the DOM
     * via `module.$`.
     */
    override("transformModule", module => {
      if (module.type !== "html") {
        return override.CONTINUE;
      }
      return module;
    });

    /**
     * Find all <script> and <style> tags, create pseudo-modules for
     * them, compile these pseudo-modules, and attach them as
     * dependencies to the entry HTML module.
     */
    override("generateDependencies", function (module) {
      if (module.type !== "html") {
        return override.CONTINUE;
      }

      const $ = module.$;

      const scriptPseudoModules = chain($("script"))
        .map((scriptTag, idx) => [scriptTag, idx])
        .filter(([scriptTag]) =>
          includes(VALID_SCRIPT_TYPES, scriptTag.attribs.type) &&
          !scriptTag.attribs.src
        )
        .map(([scriptTag, idx]) => ({
          rawSource: $(scriptTag).text(),
          type: "javascript",
          path: `${module.path}#script-${idx}`,
          ns: `${module.ns}#script-${idx}`,
          nsPath: `${module.nsPath}#script-${idx}`,
          uri: `${module.ns}:${module.nsPath}##script-${idx}`,
          tagIdx: idx
        }))
        .value();

      const stylePseudoModules = chain($("style"))
        .map((scriptTag, idx) => [scriptTag, idx])
        .filter(([scriptTag]) =>
          includes(VALID_STYLE_TYPES, scriptTag.attribs.type)
        )
        .map(([scriptTag, idx]) => ({
          rawSource: $(scriptTag).text(),
          type: "css",
          path: `${module.path}#script-${idx}`,
          ns: `${module.ns}#script-${idx}`,
          nsPath: `${module.nsPath}#script-${idx}`,
          uri: `${module.ns}:${module.nsPath}##script-${idx}`,
          tagIdx: idx
        }))
        .value();

      const pseudoModules = []
        .concat(scriptPseudoModules, stylePseudoModules)
        .map(dependency => this.compileModuleR(dependency));

      return Promise.all(pseudoModules)
        .then(dependencies => assign({}, module, {
          dependencies,
          deepDependencies: dependencies
        }));
    });

    /**
     * No extra work needs to occur here.  HTML modules should have no
     * run-time dependencies.
     */
    override("updateRequires", module => {
      if (module.type !== "html") {
        return override.CONTINUE;
      }
      return module;
    });

    /**
     * Bundles should be of type `html` if their module entry point is a
     * HTML file.
     */
    override("initBundle", bundleOpts => {
      if (bundleOpts.module.type !== "html") {
        return override.CONTINUE;
      }
      return assign({}, bundleOpts, {
        type: "html"
      });
    });

    override("populateBundleModules", (bundle/*, moduleMaps*/) => {
      if (bundle.type !== "html") {
        return override.CONTINUE;
      }
      return assign({}, bundle, {
        modules: bundle.module.dependencies
      });
    });

    /**
     * JavaScript pseudo-modules that originated (and are outputted) in an
     * HTML file will be included in the URL hash for loading JS modules. We
     * don't want that.
     */
    transform("getUrls", urls => {
      return chain(urls)
        .map((url, moduleId) => [moduleId, url])
        .filter(([, url]) => !isHtmlFile.test(url))
        .fromPairs()
        .value();
    });

    /**
     * No extra work needs to occur here.
     */
    override("constructBundle", bundle => {
      if (bundle.type !== "html") {
        return override.CONTINUE;
      }
      return bundle;
    });

    /**
     * For any bundles of type `html`, transform JS and CSS dependency-ASTs to
     * their output text, and replace the original <script> and <style> tag
     * content with the transformed content.
     */
    override("generateRawBundles", function (bundle) {
      if (bundle.type !== "html") {
        return override.CONTINUE;
      }

      const $ = bundle.module.$;

      const scriptTags = $("script");
      const styleTags = $("style");

      const scriptPseudoModules = bundle.modules
        .filter(module => module.type === "javascript");
      const stylePseudoModules = bundle.modules
        .filter(module => module.type === "css");

      scriptPseudoModules.forEach(scriptModule => {
        const { code } = generate(scriptModule.ast, {
          comments: !!this.opts.includeComments,
          compact: !this.opts.pretty,
          quotes: "double"
        });
        $(scriptTags[scriptModule.tagIdx]).text(code);
      });

      stylePseudoModules.forEach(styleModule => {
        styleTags[styleModule.tagIdx].text(styleModule.ast.toString());
      });

      return assign({}, bundle, {
        raw: $.html()
      });
    });
  };
}
