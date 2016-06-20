var path = require("path");

var Interlock = require("interlock");
var browserifyTransforms = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/example.js": "example.bundle.js" },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    browserifyTransforms([{
      transform: require("./example-transform"),
      opts: {},
      filter: /\.json$/,
      moduleType: "javascript" 
    }])
  ]
});

ilk.build()
