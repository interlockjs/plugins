var path = require("path");

var h2 = require("..");
var Interlock = require("interlock");

Error.stackTraceLimit = Infinity;

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "example.bundle.js"
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    h2({})
  ]
});

ilk.build();
