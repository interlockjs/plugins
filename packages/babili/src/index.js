import { transformFromAst } from "babel-core";
import * as t from "babel-types";


const plugins = [
  "babel-plugin-minify-constant-folding",
  // This plugin does not yet work correctly with classes and ES6 exports.
  // "babel-plugin-minify-dead-code-elimination",
  "babel-plugin-minify-flip-comparisons",
  "babel-plugin-minify-guarded-expressions",
  "babel-plugin-minify-infinity",
  "babel-plugin-minify-mangle-names",
  "babel-plugin-minify-replace",
  "babel-plugin-minify-simplify",
  "babel-plugin-minify-type-constructors",
  "babel-plugin-transform-member-expression-literals",
  "babel-plugin-transform-merge-sibling-variables",
  "babel-plugin-transform-minify-booleans",
  "babel-plugin-transform-property-literals",
  "babel-plugin-transform-simplify-comparison-operators",
  "babel-plugin-transform-undefined-to-void"
].map(require.resolve.bind(require));

export default function () {
  return (override, transform) => {
    transform("constructBundleAst", bundleAst => {
      const config = {
        code: false,
        ast: true,
        plugins
      };

      const programWrapper = t.program([ bundleAst ]);

      const { ast } = transformFromAst(programWrapper, null, config);
      return ast.program.body[0];
    });
  };
}
