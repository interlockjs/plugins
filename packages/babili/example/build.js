var path = require("path");

var Interlock = require("interlock");
var interlockBabili = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/example.js": "example.bundle.js" },

  sourceMaps: true,

  plugins: [ interlockBabili() ]
});

ilk.build();
