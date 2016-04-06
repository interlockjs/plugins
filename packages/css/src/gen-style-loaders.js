import { assign } from "lodash";
import * as t from "babel-types";

import { fromObject } from "interlock/lib/util/ast";

import getTemplate from "./get-template";


const styleLoaderTmpl = getTemplate("style-loader", body => t.program(body));


export default function generateStyleLoaders (bundles, compiledModules, moduleClassnameMaps) {
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
          RULES: t.stringLiteral(escape(module.ast.toString())),
          EXPORT_VALUE: moduleClassnameMaps && moduleClassnameMaps[module.path] ?
            fromObject(moduleClassnameMaps[module.path]) :
            t.identifier("stylesheet")
        })
      });
    }
    return jsified;
  }, {});

  return bundles.map(bundle => {
    return bundle.type === "javascript" ?
      assign({}, bundle, {
        modules: bundle.modules.map(module => jsifiedModules[module.hash] || module)
      }) :
      bundle;
  });
}
