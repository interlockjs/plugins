import fs from "fs";
import path from "path";

import _ from "lodash";


import { fromArray } from "interlock/lib/util/ast";
import { bodyTmpl } from "interlock/lib/ast/template";

const tmplStr = fs.readFileSync(path.join(__dirname, "templates/localstorage.jst"), "utf-8");
const tmpl = bodyTmpl(tmplStr);


module.exports = function (opts = {}) {
  opts = Object.assign({}, {
    clearOnFull: true,
    cacheBundles: [],
    cacheModules: []
  }, opts);

  const bundlesDict = _.chain(opts.cacheBundles)
    .map(val => [val, true])
    .object()
    .value();

  const modulesDict = _.chain(opts.cacheModules)
    .map(val => [val, true])
    .object()
    .value();

  const cacheIds = [];

  return function (override, transform) {
    transform("compileModules", function (modules) {
      return modules.tap(module => {
        if (module.uri in modulesDict) {
          cacheIds.push(module.hash);
        }
      });
    });

    transform("getBundles", function (bundles) {
      return bundles.tap(bundle => {
        if (bundle.module && bundlesDict[bundle.module.uri]) {
          cacheIds.push(bundle.module.hash);
          bundle.module.deepDependencies
            .forEach(dep => cacheIds.push(dep.hash));
        }
      });
    });

    transform("constructBundleBody", function (body, [{includeRuntime}]) {
      return !includeRuntime ?
        body :
        tmpl({
          identifier: {
            "CACHE_IDS": fromArray(_.uniq(cacheIds))
          }
        }).then(runtimeNodes => {
          const loadIndex = _.findIndex(body, node =>
            node.type === "ExpressionStatement" &&
              node.expression.type === "CallExpression" &&
              node.expression.callee.type === "MemberExpression" &&
              node.expression.callee.property.name === "load"
          );
          return [].concat(body.slice(0, loadIndex), runtimeNodes, body.slice(loadIndex));
        });
    });
  };
};
