module.exports = function (opts={}) {
  var isJsonFile = opts.filter || /\.json$/;

  return function (override, transform, control) {
    // https://github.com/interlockjs/interlock/blob/master/docs/extensibility.md#readsource
    transform("readSource", function (source, args) {
      const asset = args[0];
      if (isJsonFile.test(asset.path)) {
        source = `module.exports = ${source};`;
      }
      return source;
    });
  };
};
