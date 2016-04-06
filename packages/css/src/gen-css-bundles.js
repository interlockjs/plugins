import { assign } from "lodash";
import * as t from "babel-types";

import { fromObject } from "interlock/lib/util/ast";

import getTemplate from "./get-template";


const exportObjTmpl = getTemplate("export-object", node => t.program([node]));


/**
 * Replace CSS modules with JavaScript modules which reference the CSS
 * output bundle destination.
 *
 * @param  {Array}  bundles                  Original bundles array.
 * @param  {Array}  cssBundles               New CSS bundles.
 * @param  {Object} originBundleCssBundleMap Mapping of origin bundle to sibling
 *                                           CSS bundle.
 * @param  {Object} moduleClassnameMaps      Mapping of filename to friendly/module
 *                                           classname maps.
 *
 * @return {Array}                           Original bundles plus CSS bundles.
 */
function replaceCssModules (bundles, cssBundles, originBundleCssBundleMap, moduleClassnameMaps) {
  return bundles.map((bundle, bIdx) => {
    if (!(bIdx in originBundleCssBundleMap)) { return bundle; }
    const cssBundle = cssBundles[originBundleCssBundleMap[bIdx]];

    return assign({}, bundle, { modules: bundle.modules.map(module => {
      if (module.type !== "css") { return module; }

      const exportValue = moduleClassnameMaps && moduleClassnameMaps[module.path] ?
        fromObject(assign(
          {},
          moduleClassnameMaps[module.path],
          { _path: cssBundle.dest }
        )) :
        t.stringLiteral(cssBundle.dest);

      return assign({}, module, {
        type: "javascript",
        ast: exportObjTmpl({ EXPORT_VALUE: exportValue })
      });
    })});
  }).concat(cssBundles);
}

export default function generateCssBundles (bundles, moduleClassnameMaps) {
  const cssBundleSeeds = [];
  const originBundleCssBundleMap = {};

  bundles.forEach((bundle, bIdx) => {
    if (bundle.type !== "javascript") { return; }
    const cssModules = [];

    bundle.modules.forEach(module => {
      if (module.type === "css") { cssModules.push(module); }
    });

    if (cssModules.length) {
      originBundleCssBundleMap[bIdx] = cssBundleSeeds.length;

      cssBundleSeeds.push({
        type: "css",
        dest: "[hash].css",
        modules: cssModules,
        moduleHashes: cssModules.map(module => module.hash),
        isEntryPt: false
      });
    }
  });

  const cssBundlesPs = cssBundleSeeds.map(
    bundle => this.hashBundle(bundle).then(this.interpolateFilename)
  );

  return Promise.all(cssBundlesPs)
    .then(cssBundles => replaceCssModules(
      bundles,
      cssBundles,
      originBundleCssBundleMap,
      moduleClassnameMaps
    ));
}
