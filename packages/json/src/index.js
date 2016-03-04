export default function (opts = {}) {
  const isJsonFile = opts.filter || /\.json$/;
  return (override, transform) => {
    transform("readSource", module => {
      if (isJsonFile.test(module.path)) {
        module = Object.assign({}, module, {
          rawSource: `module.exports = ${module.rawSource};`
        });
      }
      return module;
    });
  };
}
