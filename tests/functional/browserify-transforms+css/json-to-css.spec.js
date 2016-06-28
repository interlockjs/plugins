import path from "path";

import { getFilesFromConfig, constructEnv } from "interlock-test-helper";
import css from "interlock-css";
import browserifyTransforms from "interlock-browserify-transforms";


const getConfig = opts => ({
  ns: "test-namespace",

  srcRoot: path.join(__dirname, "json-to-css"),
  destRoot: path.join(__dirname, "actual"),
  pretty: true,

  entry: opts.entry,
  plugins: [
    browserifyTransforms(opts.transforms),
    css(opts.cssOpts)
  ]
});

describe("interlock-browserify-transforms + interlock-css", () => {
  describe("transforming json to css to javascript", () => {
    const config = getConfig({
      entry: {
        "./a.js": "a.bundle.js"
      },
      transforms: [{
        // eslint-disable-next-line global-require
        transform: require("./json-to-css/transform-json-to-css"),
        filter: /\.styles\.json$/,
        moduleType: "css"
      }],
      cssOpts: {
        mode: "bundle"
      }
    });

    let files;
    before(() => {
      return getFilesFromConfig(config).then(_files => files = _files);
    });

    it("applies custom transform and behaves otherwise as a normal CSS input", () => {
      const {
        insertScript,
        testResult
      } = constructEnv(files);

      insertScript("a.bundle.js");

      return testResult.then(cssFilename => {
        const cssFile = files[cssFilename];
        expect(cssFile).to.contain(".my-class");
        expect(cssFile).to.contain("height: 4px");
      });
    });
  });
});
