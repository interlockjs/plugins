var path = require("path");

var Interlock = require("interlock");
var dce = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),
  entry: { "./app/app.js": "app.bundle.js" },
  pretty: true,
  plugins: [ dce() ]
});

ilk.build();
