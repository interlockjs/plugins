var path = require("path");

var Interlock = require("interlock");
var requireJsInterop = require("..");

var ilkShared = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist/shared"),

  entry: {
    "./shared/lib.js": "lib.bundle.js",
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    requireJsInterop()
  ]
});

ilkShared.build();
