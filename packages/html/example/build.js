const path = require("path");

const html = require("..");
const Interlock = require("interlock");

Error.stackTraceLimit = Infinity;

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "example.bundle.js",
    "./app/example.html": "example.html"
  },

  pretty: true,

  plugins: [
    html()
  ],

  babelConfig: {
    presets: ["nodejs-lts"]
  }
});

ilk.build();
