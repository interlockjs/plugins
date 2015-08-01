import _ from "lodash";
import { parse } from "interlock/lib/compile/modules/load-ast";

module.exports = function (opts={}) {
  var isJson = opts.filter || /\.json$/;

  return function (override, transform, control) {
    override("parseModule", function (asset) {
      if (isJson.test(asset.path)) {
        const modifiedSource = `module.exports = ${asset.rawSource};`;
        return _.extend({}, asset, {
          ast: parse(modifiedSource)
        });
      }
      return control.CONTINUE;
    });
  };
};
