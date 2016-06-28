import path from "path";

import { getFilesFromConfig, constructEnv } from "interlock-test-helper";
import css from "interlock-css";
import webpackLoaders from "interlock-webpack-loaders";


const getConfig = opts => ({
  ns: "test-namespace",

  srcRoot: path.join(__dirname, "fixtures"),
  destRoot: path.join(__dirname, "actual"),
  pretty: true,

  entry: opts.entry,
  plugins: [
    css(opts.cssOpts),
    webpackLoaders({
      loaders: opts.loaders
    })
  ]
});


describe("interlock-webpack-loaders", () => {
  let files;
  before(() => {
    const config = getConfig({
      entry: {
        "./example.js": "example.bundle.js"
      },
      cssOpts: {
        mode: "object"
      },
      loaders: [
        {
          test: /\.json$/,
          loader: require.resolve("json-loader")
        },
        {
          test: /\.scss$/,
          loader: require.resolve("sass-loader"),
          moduleType: "css"
        },
        {
          test: /\.txt$/,
          loader: require.resolve("base64-loader")
        }
      ]
    });

    return getFilesFromConfig(config).then(_files => files = _files);
  });

  it("runs webpack loaders on input files, including ones with moduleType (e.g. css)", () => {
    const {
      insertScript,
      testResult
    } = constructEnv(files);

    insertScript("example.bundle.js");

    return testResult.then(result => {
      expect(result.json).to.deep.equal({ ex: "ample" });
      expect(new Buffer(result.base64, "base64").toString())
        .to.equal("thank u based 64");
      expect(result.scss).to.deep.equal({
        ".example": { color: "blue" },
        ".example .nested": { color: "red" }
      });
    });
  });
});
