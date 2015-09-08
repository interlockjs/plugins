import most from "most";

module.exports = function (manifestFilename) {
  return function (override, transform) {
    const uriToModuleHash = {};

    transform("compileModules", function (modules) {
      return modules.tap(module => {
        uriToModuleHash[module.uri] = module.hash;
      });
    });

    transform("emitRawBundles", function (bundles, [, urls]) {
      const manifest = { moduleHashToBundleFn: urls, uriToModuleHash };
      const manifestBundle = {
        dest: manifestFilename,
        raw: JSON.stringify(manifest, null, 2)
      };
      return bundles.concat(most.of(manifestBundle));
    });
  };
};
