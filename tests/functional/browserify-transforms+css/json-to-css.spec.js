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


function fakeRequire(files, path) {
  // This is _not_ robust.  But it is simple and it works for
  // our test input.
  path = path.replace(/^\.\.?\//, "");

  if (!(path in files)) {
    const altPath = `${path}.js`;
    if (altPath in files) {
      path = altPath;
    } else {
      throw new Error(`Cannot find '${path}' in files.`);
    }
  }
  const _module = { exports: {} };
  const fn = new Function("require", "module", files[path]);
  fn(dependency => fakeRequire(files, dependency), _module);
  return _module.exports;
}


describe("interlock-browserify-transforms + interlock-css", () => {
	describe("transforming json to css to javascript", () => {
    const config = getConfig({
      entry: {
        "./a.js": "a.bundle.js"
      },
      transforms: [{
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

    it("does stuff!", () => {
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
