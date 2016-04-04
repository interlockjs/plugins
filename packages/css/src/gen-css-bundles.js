import { assign } from "lodash";
import * as t from "babel-types";

import getTemplate from "./get-template";


const returnObjTemplate = getTemplate("return-object", node => t.program([node]));


/**
 * Replace CSS modules with JavaScript modules which reference the CSS
 * output bundle destination.
 *
 * @param  {Array}  bundles                  Original bundles array.
 * @param  {Array}  cssBundles               New CSS bundles.
 * @param  {Object} originBundleCssBundleMap Mapping of origin bundle to sibling
 *                                           CSS bundle.
 *
 * @return {Array}                           Original bundles plus CSS bundles.
 */
function replaceCssModules (bundles, cssBundles, originBundleCssBundleMap) {
  return bundles.map((bundle, bIdx) => {
    if (!(bIdx in originBundleCssBundleMap)) { return bundle; }
    const cssBundle = cssBundles[originBundleCssBundleMap[bIdx]];

    return assign({}, bundle, { modules: bundle.modules.map(module => {
      if (module.type !== "css") { return module; }
      return assign({}, module, {
        type: "javascript",
        ast: returnObjTemplate({
          OBJ: t.stringLiteral(cssBundle.dest)
        })
      });
    })});
  }).concat(cssBundles);
}

export default function generateCssBundles (bundles) {
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
    .then(cssBundles => replaceCssModules(bundles, cssBundles, originBundleCssBundleMap));
}
