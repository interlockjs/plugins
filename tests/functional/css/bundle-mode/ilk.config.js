import path from "path";
import css from "interlock-css";


module.exports = {
  ns: "test-namespace",
  srcRoot: path.join(__dirname, "src"),
  destRoot: path.join(__dirname, "actual"),

  entry: {
    "./a.js": { dest: "a.bundle.js" },
    "./b.css": { dest: "b.bundle.css" }
  },

  pretty: true,

  plugins: [
    css({
      mode: "bundle",
      modules: true
    })
  ]
};
