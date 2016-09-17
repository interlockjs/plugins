const path = require("path");

const Interlock = require("interlock");
const interlockHtmlPrerender = require("..");
const interlockHtml = require("../../html");

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/example.html": "example.html" },

  includeComments: true,
  sourceMaps: true,

  plugins: [
    interlockHtmlPrerender(),
    interlockHtml()
  ]
});

ilk.build();
