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
      modules.forEach(module => {
        if (module.uri in modulesDict) {
          cacheIds.push(module.hash);
        }
      });
      return modules;
    });

    transform("getBundles", function (bundles) {
      bundles.forEach(bundle => {
        if (bundle.module && bundlesDict[bundle.module.uri]) {
          cacheIds.push(bundle.module.hash);
          bundle.module.deepDependencies
            .forEach(dep => cacheIds.push(dep.hash));
        }
      });
      return bundles;
    });

    transform("constructRuntime", function (runtimeNodes) {
      return tmpl({
        identifier: {
          "CACHE_IDS": fromArray(_.uniq(cacheIds))
        }
      }).then(localstorageRuntimeNodes => {
        return [].concat(runtimeNodes, localstorageRuntimeNodes);
      });
    });
  };
};
