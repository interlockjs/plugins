var path = require("path");

var Interlock = require("interlock");
var uglify = require("..");

var ilk = new Interlock({
  srcRoot: __dirname,
  destRoot: path.join(__dirname, "dist"),

  entry: { "./app/app.js": "app.bundle.js" },

  includeComments: true,
  sourceMaps: true,

  plugins: [ uglify({
    sequences: true,
    properties: true,
    dead_code: false,
    drop_debugger: true,
    unsafe: false,
    conditionals: true,
    comparisons: true,
    evaluate: false,
    booleans: false,
    loops: false,
    unused: true,
    hoist_funs: false,
    hoist_vars: false,
    if_return: true,
    join_vars: true,
    cascade: true,
    warnings: true,
    negate_iife: false,
    pure_getters: false,
    pure_funcs: false,
    drop_console: false,
    keep_fargs: false,
    keep_fnames: false
  }, true) ]
});

ilk.build()
