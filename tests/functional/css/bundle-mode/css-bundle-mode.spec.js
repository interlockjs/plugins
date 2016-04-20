import path from "path";

import { getFilesFromConfig, constructEnv } from "interlock-test-helper";
import css from "interlock-css";


const getConfig = opts => ({
  ns: "test-namespace",

  srcRoot: path.join(__dirname, opts.srcRoot || "src"),
  destRoot: path.join(__dirname, "actual"),
  pretty: true,

  entry: opts.entry,
  plugins: [
    css(opts.cssOpts)
  ]
});


describe("interlock-css", () => {
  describe("in bundle mode with css modules enabled", () => {
    let files;

    const config = getConfig({
      entry: {
        "./a.js": { dest: "a.bundle.js" },
        "./b.css": { dest: "b.bundle.css" }
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
      const {
        insertScript,
        testResult
      } = constructEnv(files);

      insertScript("a.bundle.js");

      return testResult.then(cssDep => {
        expect(cssDep).to.have.property("friendlyClassname");
      });
    });

    it("provides the pathname to the output CSS file", () => {
      const {
        insertScript,
        testResult
      } = constructEnv(files);

      insertScript("a.bundle.js");

      return testResult.then(cssDep => {
        expect(cssDep).to.have.property("_path");
        expect(files).to.have.property(cssDep._path);
      });
    });

    it("applies expected styles to elements with css-module classname", () => {
      const {
        document,
        window,
        insertScript,
        testResult
      } = constructEnv(files);

      insertScript("a.bundle.js");

      return testResult.then(cssDep => {
        const div = document.createElement("div");
        div.classList.add(cssDep.friendlyClassname);
        document.body.appendChild(div);

        const divColor = window.getComputedStyle(div).getPropertyValue("color");
        expect(divColor).to.equal("red");
      });
    });

    it("outputs expected CSS when CSS provided as entry point", () => {
      expect(files).to.have.property("b.bundle.css");
      const bundle = files["b.bundle.css"];
      expect(bundle).to.contain(":fullscreen");
      expect(bundle).to.contain("display: flex");
    });
  });
});
