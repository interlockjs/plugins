const path = require("path");

const webpackLoaders = require("..");
const Interlock = require("interlock");
const css = require("interlock-css");
const autoprefixer = require("autoprefixer");

Error.stackTraceLimit = Infinity;

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "example.bundle.js"
  },

  pretty: true,

  plugins: [
    css({
      mode: "object",
      plugins: [autoprefixer]
    }),
    webpackLoaders({
      loaders: [
        {
          test: /\.json$/,
          loader: require.resolve("json-loader")
        },
        {
          test: /\.scss$/,
          loader: require.resolve("sass-loader"),
          transpileTarget: "css"
        },
        {
          test: /\.txt$/,
          loader: require.resolve("base64-loader")
        }
      ]
    })
  ]
});

ilk.build();
