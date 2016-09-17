const path = require("path");

const Interlock = require("interlock");
const interlockHtmlMinifier = require("..");
const interlockHtml = require("../../html");

const ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),
  entry: { "./app/example.html": "example.html" },

  plugins: [
    interlockHtmlMinifier({
      removeEmptyAttributes: true,
      collapseWhitespace: true
    }),
    interlockHtml()
  ]
});

ilk.build();
