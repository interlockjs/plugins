module.exports = function (manifestFilename) {
  return function (override, transform) {
    const uriToModuleHash = {};

    transform("compileModules", function (modules) {
      modules.forEach(module => uriToModuleHash[module.uri] = module.hash);
      return modules;
    });

    transform("emitRawBundles", function (bundles, [, urls]) {
      const manifest = { moduleHashToBundleFn: urls, uriToModuleHash };
      const manifestBundle = {
        dest: manifestFilename,
        raw: JSON.stringify(manifest, null, 2)
      };
      return bundles.concat(manifestBundle);
    });
  };
};
