var path = require("path");

var Interlock = require("interlock");
var localStorage = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/entry.js": "entry.bundle.js",

  },
  split: {
    "./app/other-module.js": "[setHash].js",
    "./app/cached-module.js": "[setHash].js"
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    localStorage({
      clearOnFull: true,
      cacheBundles: [
        "interlock-localstorage-example:app/cached-module.js"
      ]
    })
  ]
});

ilk.build();
