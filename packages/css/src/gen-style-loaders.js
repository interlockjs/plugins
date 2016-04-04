import { assign } from "lodash";
import * as t from "babel-types";

import getTemplate from "./get-template";


const styleLoaderTmpl = getTemplate("style-loader", body => t.program(body));


export default function generateStyleLoaders (bundles, compiledModules) {
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
          // TODO: If in CSS-module mode, make sure that the style-loader
          //       template will export an object that maps written
          //       class names to unique/generated class names.
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
