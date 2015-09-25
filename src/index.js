export default function (opts = {}) {
  const isJsonFile = opts.filter || /\.json$/;
  return (override, transform) => {
    transform("readSource", function (source, [module]) {
      if (isJsonFile.test(module.path)) {
        source = `module.exports = ${source};`;
      }
      return source;
    });
  };
}
