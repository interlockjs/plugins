import postcss from "postcss";
import postcssModules from "postcss-modules";
import { assign, includes, values, chain } from "lodash";

import generateStyleLoaders from "./gen-style-loaders";
import generateCssBundles from "./gen-css-bundles";
import generateRuleSetObj from "./gen-ruleset-obj";


const VALID_MODES = [
  "bundle",
  "insert",
  "object"
];


const checkMode = mode => {
  if (!includes(VALID_MODES, mode)) {
    throw new Error(`interlock-css: '${mode}' is not a valid mode.  Must be one of: ${VALID_MODES.join(", ")}.`); // eslint-disable-line max-len
  }
};


export default function (opts = {}) {
  const mode = opts.mode || "insert";
  const modules = !!opts.modules;
  const isCssFile = opts.filter || /\.css$/;

  const processor = postcss(opts.plugins || []);

  let moduleClassnameMaps = null;
  if (modules) {
    moduleClassnameMaps = {};
    processor.use(postcssModules({
      getJSON (modulePath, json) {
        moduleClassnameMaps[modulePath] = json;
      }
    }));
  }

  checkMode(mode);

  return (override, transform) => {
    /**
     * Modules whose file paths match the provided filter (`.css` by default)
     * should be of type `css`.
     */
    transform("setModuleType", module => {
      return isCssFile.test(module.path) ?
        assign({}, module, { type: "css" }) :
        module;
    });

    /**
     * Modules of type `css` should be parsed with PostCSS.
     */
    override("parseModule", module => {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return assign({}, module, {
        ast: postcss.parse(module.rawSource, {
          from: module.path
        })
      });
    });

    /**
     * CSS is transformed via a PostCSS processor.  This processor is
     * configured when the plugin is initialized, using the plugins that
     * were provided.
     */
    override("transformModule", module => {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return processor.process(module.ast).then(result => {
        return assign({}, module, {
          ast: result.root,
          synchronousRequires: []
        });
      });
    });

    /**
     * No extra work needs to occur here.  CSS modules should have no
     * run-time dependencies.
     */
    override("updateRequires", module => {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return module;
    });

    /**
     * Bundles should be of type `css` if their module entry point is a CSS
     * module.
     */
    override("initBundle", bundleOpts => {
      if (bundleOpts.module.type !== "css") {
        return override.CONTINUE;
      }

      return assign({}, bundleOpts, {
        type: "css"
      });
    });

    transform("generateBundles", function (bundles, [, moduleMaps]) {
      // Return a JavaScript object with selectors as keys and rulesets as
      // values.  These rulesets will be expressed as objects with rule names
      // as keys and rule values as values.
      if (mode === "object") {
        return generateRuleSetObj(bundles);
      }

      // Output a .css file for per-bundle CSS modules.  If in CSS module
      // mode, instead return a mapping of original and mapped class names.
      if (mode === "bundle") {
        return generateCssBundles.call(this, bundles, moduleClassnameMaps);
      }

      // Transforms CSS modules into separate distinct CSS output bundles, and
      // replaces with a JavaScript module.  When required, this module will
      // insert a <script> tag into the DOM, referencing the CSS output bundle.
      if (mode === "tag") {
        // TODO
      }

      // Transform CSS into JS that inserts the rules, and return the DOM element.
      if (mode === "insert") {
        // TODO: If in CSS module mode, export map of written class names to
        //       unique/generated class names.
        return generateStyleLoaders(bundles, values(moduleMaps.byHash), moduleClassnameMaps);
      }

      return bundles;
    });

    /**
     * CSS modules that are to be emitted as part of a CSS bundle should not
     * be included in the URL hash used for loading JS modules.
     */
    transform("getUrls", urls => {
      return chain(urls)
        .map((url, moduleId) => [moduleId, url])
        .filter(([, url]) => !isCssFile.test(url))
        .fromPairs()
        .value();
    });


    /**
     * No extra work needs to occur here.
     */
    override("constructBundle", bundle => {
      if (bundle.type !== "css") {
        return override.CONTINUE;
      }
      return bundle;
    });

    /**
     * For any bundles of type `css`, convert the PostCSS ASTs of constituent
     * CSS modules to their string form and concatenate.
     */
    override("generateRawBundles", bundle => {
      if (bundle.type !== "css") {
        return override.CONTINUE;
      }
      return assign({}, bundle, {
        raw: bundle.modules.map(module => module.ast.toString()).join("\n")
      });
    });
  };
}
