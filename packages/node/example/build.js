const path = require("path");

const node = require("..");
const Interlock = require("interlock");

Error.stackTraceLimit = Infinity;

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: {
    "./app/example.js": "~"
  },

  pretty: true,

  plugins: [
    node({})
  ]
});

ilk.build();
