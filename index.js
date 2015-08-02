module.exports = function (opts={}) {
  var isJsonFile = opts.filter || /\.json$/;

  return function (override, transform, control) {
    transform("readSource", function (source, args) {
      const asset = args[0];
      if (isJsonFile.test(asset.path)) {
        source = `module.exports = ${source};`;
      }
      return source;
    });
  };
};
