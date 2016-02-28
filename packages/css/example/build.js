var path = require("path");

var css = require("..");
var Interlock = require("interlock");
var autoprefixer = require("autoprefixer");

Error.stackTraceLimit = Infinity;

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "example.bundle.js",
    "./app/example-b.css": "example-b.build.css"
  },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    css({
      plugins: [ autoprefixer ]
    })
  ]
});

ilk.build();
