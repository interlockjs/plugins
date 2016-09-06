import { transformFromAst } from "babel-core";
import * as t from "babel-types";


const babiliPreset = require.resolve("babel-preset-babili");


export default function () {
  return (override, transform) => {
    transform("constructBundleAst", bundleAst => {
      const config = {
        code: false,
        ast: true,
        presets: [ babiliPreset ]
      };

      const programWrapper = t.program([ bundleAst ]);

      const { ast } = transformFromAst(programWrapper, null, config);
      return ast.program.body[0];
    });
  };
}
