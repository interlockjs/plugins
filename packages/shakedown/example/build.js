const path = require("path");

const Interlock = require("interlock");
const interlockShakedown = require("..");

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/example.js": "example.bundle.js" },

  pretty: true,
  // includeComments: true,
  // sourceMaps: true,

  plugins: [ interlockShakedown() ]
});

ilk.build();
