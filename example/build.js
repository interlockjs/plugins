var path = require("path");

var Interlock = require("interlock");
var interlockJson = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/example.js": "example.bundle.js" },

  includeComments: true,
  sourceMaps: true,

  plugins: [ interlockJson() ]
});

ilk.build()
