const path = require("path");

const css = require("..");
const Interlock = require("interlock");
const autoprefixer = require("autoprefixer");

Error.stackTraceLimit = Infinity;

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "example.bundle.js",
    "./app/example-b.css": "example-b.build.css"
  },

  pretty: true,

  plugins: [
    css({
      plugins: [ autoprefixer ]
    })
  ]
});

ilk.build();
