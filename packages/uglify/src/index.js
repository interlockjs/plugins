const UglifyJS = require("uglify-js");

function uglify (ast, options, mangle) {
  let uAST = UglifyJS.AST_Node.from_mozilla_ast(ast);
  uAST.figure_out_scope();
  uAST = uAST.transform(UglifyJS.Compressor(options)); // eslint-disable-line new-cap

  if (mangle) {
    uAST.figure_out_scope();
    uAST.compute_char_frequency();
    uAST.mangle_names();
  }

  return uAST.to_mozilla_ast();
}

module.exports = function (uglifyOpts, mangle) {
  uglifyOpts = uglifyOpts || {};
  return function (override, transform) {
    transform("constructBundle", function (bundleAst) {
      return uglify(bundleAst, uglifyOpts, mangle);
    });
  };
};
