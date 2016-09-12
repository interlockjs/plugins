const assign = Object.assign;
const includes = (arr, match) => arr.reduce((memo, el) => memo || el === match, false);


export default function (opts = {}) {
  const filter = opts.filter || null;
  const exclude = opts.exclude || null;
  const include = opts.include || null;

  const isRawFile = filePath => {
    const dotSegments = filePath.split(/\.|\//);
    const extension = dotSegments[dotSegments.length - 1];

    return (filter ? filter.test(filePath) : true) &&
      (exclude ? !includes(exclude, extension) : true) &&
      (include ? includes(include, extension) : true);
  };

  return (override, transform) => {
    transform("setModuleType", module => {
      return isRawFile(module.path) ?
        assign({}, module, { type: "raw" }) :
        module;
    });

    override("parseModule", module => {
      return module.type === "raw" ?
        module :
        override.CONTINUE;
    });

    override("transformModule", module => {
      return module.type === "raw" ?
        module :
        override.CONTINUE;
    });

    override("generateDependencies", module => {
      return module.type === "raw" ?
        assign({}, module, { dependencies: [], deepDependencies: [] }) :
        override.CONTINUE;
    });

    override("updateRequires", module => {
      return module.type === "raw" ?
        module :
        override.CONTINUE;
    });

    override("initBundle", bundleOpts => {
      return bundleOpts.module.type === "raw" ?
        assign({}, bundleOpts, { type: "raw" }) :
        override.CONTINUE;
    });

    override("populateBundleModules", (bundle) => {
      return bundle.type === "raw" ?
        assign({}, bundle, { modules: [ bundle.module ] }) :
        override.CONTINUE;
    });

    transform("getUrls", urls => {
      return Object.keys(urls).reduce((memo, moduleId) => {
        const url = urls[moduleId];
        if (!isRawFile(url)) {
          memo[moduleId] = url;
        }
        return memo;
      }, {});
    });

    override("constructBundle", bundle => {
      return bundle.type === "raw" ?
        bundle :
        override.CONTINUE;
    });

    override("generateRawBundles", bundle => {
      if (bundle.type !== "raw") {
        return override.CONTINUE;
      }

      return assign({}, bundle, {
        raw: bundle.module.rawSource
      });
    });
  };
}
