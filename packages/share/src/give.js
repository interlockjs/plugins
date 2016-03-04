export default function (manifestFilename) {
  return function (override, transform) {
    const uriToModuleHash = {};

    transform("compileModules", modules => {
      modules.forEach(module => uriToModuleHash[module.uri] = module.hash);
      return modules;
    });

    transform("emitRawBundles", (bundles, [, urls]) => {
      const manifest = { moduleHashToBundleFn: urls, uriToModuleHash };
      const manifestBundle = {
        dest: manifestFilename,
        raw: JSON.stringify(manifest, null, 2)
      };
      return bundles.concat(manifestBundle);
    });
  };
}
