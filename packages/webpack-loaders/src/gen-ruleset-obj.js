import { assign, chain } from "lodash";
import * as t from "babel-types";

import { fromObject } from "interlock/lib/util/ast";

import getTemplate from "./get-template";


const exportObjTmpl = getTemplate("export-object", node => t.program([node]));


export default function (bundles) {
  return bundles.map(bundle => {
    if (bundle.type === "css") {
      throw new Error("CSS plugin does not support CSS entry points in `object` mode.");
    }
    if (bundle.type !== "javascript") { return bundle; }

    return assign({}, bundle, {
      modules: bundle.modules.map(module => {
        if (module.type !== "css") { return module; }

        const rules = chain(module.ast.nodes)
          .map(node => {
            const ruleset = chain(node.nodes)
              .map(decl => [decl.prop, decl.value])
              .fromPairs()
              .value();
            return [node.selector, ruleset];
          })
          .fromPairs()
          .value();

        return assign({}, module, {
          type: "javascript",
          ast: exportObjTmpl({
            EXPORT_VALUE: fromObject(rules)
          })
        });
      })
    });
  });
}
