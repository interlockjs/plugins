import path from "path";

import { getFilesFromConfig, constructEnv } from "interlock-test-helper";

import node from "interlock-node";
import css from "interlock-css";


const getConfig = opts => ({
  ns: "test-namespace",

  srcRoot: path.join(__dirname, "bundle-mode"),
  destRoot: path.join(__dirname, "actual"),
  pretty: true,

  entry: opts.entry,
  plugins: [
    css(opts.cssOpts),
    node()
  ]
});

let files;
function fakeRequire(path) {
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
  fn(fakeRequire, _module);
  return _module.exports;
}

describe("interlock-node + interlock-css", () => {
  describe("in bundle mode with css modules enabled", () => {
    const config = getConfig({
      entry: {
        "./a.js": "~",
        "./b.css": "~"
      },
      cssOpts: {
        mode: "bundle",
        modules: true
      }      
    });

    before(() => {
      return getFilesFromConfig(config).then(_files => files = _files);
    });

    it("provides friendly:css-module classname mapping where required by JavaScript", () => {
      const cssDep = fakeRequire("c.css");
      expect(cssDep).to.have.property("friendlyClassname");
    });

    it("provides the pathname to the output CSS file", () => {
      const cssDep = fakeRequire("c.css");
      expect(cssDep).to.have.property("_path");
      expect(files).to.have.property(cssDep._path);
    });

    it("outputs expected CSS when CSS provided as entry point", () => {
      expect(files).to.have.property("b.css");
      const bundle = files["b.css"];
      expect(bundle).to.contain(":fullscreen");
      expect(bundle).to.contain("display: flex");
    });
  });
});
