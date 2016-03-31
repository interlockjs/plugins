import path from "path";
import fs from "fs";

import postcss from "postcss";
import { assign, includes, values } from "lodash";
import * as t from "babel-types";
import template from "interlock/lib/util/template";


const VALID_MODES = ["file", "tag", "bundle"];


const checkMode = mode => {
  if (!includes(VALID_MODES, mode)) {
    throw new Error(`interlock-css: '${mode}' is not a valid mode.  Must be one of: ${VALID_MODES.join(", ")}.`);
  }
};

function getTemplate (templateName, transform) {
  transform = transform || (node => node);
  const absPath = path.join(__dirname, `../templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8")
    // Remove ESlint rule exclusions from parsed templates.
    .replace(/\s*\/\/\s*eslint-disable-line.*/g, "");
  const _template = template(templateStr);
  return opts => transform(_template(opts));
}

const styleLoaderTmpl = getTemplate("style-loader", body => t.program(body));


function generateCssBundles (bundles) {
  // TODO: For each bundle, determine a corresponding (new) CSS bundle name.
  //       Then, replace all CSS modules with JavaScript module that exports
  //       the entry point of this new CSS bundle.  When the CSS module is
  //       required, it will return the path to the new CSS bundle output file
  //       path.
}

function generateStyleLoaders (bundles, compiledModules) {
  // TODO: The modules belonging to CSS bundles (specified in `entry`) should
  //       not be transformed here.  Too much extra work.  Instead, create a
  //       memoized function here that will return a JavaScript module that
  //       was created from the original CSS module.
  const jsifiedModules = compiledModules.reduce((jsified, module) => {
    if (module.type === "css") {
      jsified[module.hash] = assign({}, module, {
        type: "javascript",
        ast: styleLoaderTmpl({
          STYLE_ID: t.stringLiteral(module.hash),
          RULES: t.stringLiteral(escape(module.ast.toString()))
        })
      });
    }
    return jsified;
  }, {});

  return bundles.map(bundle => {
    return bundle.type === "javascript" ?
      assign({}, bundle, {
        modules: bundle.modules.map(module => {
          return jsifiedModules[module.hash] || module;
        })
      }) :
      bundle;
  });
}

export default function (opts = {}) {
  const mode = opts.mode || "tag"; // file, tag, bundle
  const isCssFile = opts.filter || /\.css$/;
  const processor = postcss(opts.plugins || []);

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
        ast: postcss.parse(module.rawSource)
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

    transform("generateBundles", (bundles, [, moduleMaps]) => {
      // Return a string containing CSS rules.
      if (mode === "string") {
        // TODO
      }

      // Return a JavaScript object with selectors as keys and rulesets as
      // values.  These rulesets will be expressed as objects with rule names
      // as keys and rule values as values.
      if (mode === "object") {
        // TODO
      }

      // Output a .css file for per-bundle CSS modules, and return null;
      if (mode === "bundle") {
        return generateCssBundles(bundles);
      }

      // Transforms CSS modules into separate distinct CSS output bundles, and
      // replaces with a JavaScript module.  When required, this module will
      // insert a <script> tag into the DOM, referencing the CSS output bundle.
      if (mode === "tag") {
        // TODO
      }

      // Transform CSS into JS that inserts the rules, and return the DOM element.
      if (mode === "insert") {
        return generateStyleLoaders(bundles, values(moduleMaps.byHash));
      }

      return bundles;
    });

    /**
     * No extra work needs to occur here.
     */
    override("constructBundle", (bundle) => {
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
