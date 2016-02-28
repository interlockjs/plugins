var path = require("path");

var Interlock = require("interlock");
var share = require("..");

var ilkShared = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist/shared"),

  split: {
    "./shared/lib.js": "lib.bundle.js",
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    share.give("manifest.json")
  ]
});

var ilkApp = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/entry.js": "entry.bundle.js",
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    share.take(path.join(__dirname, "dist/shared", "manifest.json"))
  ]
});

ilkShared.build().then(function () {
  return ilkApp.build();
});
