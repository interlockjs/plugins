// TODO: Add proper sourcemap support.

"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _handlebars = require("handlebars");

var Handlebars = _interopRequireWildcard(_handlebars);

var _interlockLibResolve = require("interlock/lib/resolve");

var _interlockLibResolve2 = _interopRequireDefault(_interlockLibResolve);

var BUILT_IN_HELPERS = {
  each: true,
  "if": true,
  log: true,
  lookup: true,
  "with": true
};

function DependenciesVisitor(context, registerHelpers) {
  this.context = context;
  this.partials = [];
  this.helpers = [];
  if (!registerHelpers) {
    this.BlockStatement = Handlebars.Visitor.prototype.BlockStatement;
  }
  Handlebars.Visitor.apply(this, arguments);
}

DependenciesVisitor.prototype = Object.create(Handlebars.Visitor.prototype);

Object.assign(DependenciesVisitor.prototype, {
  PartialStatement: function PartialStatement(partial) {
    var partialAsset = this.resolve(partial.name.original, true);
    var uniqueName = partialAsset.ns + ":" + partialAsset.nsPath;
    var relPath = _path2["default"].relative(this.context.contextPath + "/", partialAsset.path);
    partial.name.original = partial.name.parts[0] = uniqueName;
    this.partials.push({ uniqueName: uniqueName, relPath: relPath });

    Handlebars.Visitor.prototype.PartialStatement.call(this, partial);
  },

  BlockStatement: function BlockStatement(block) {
    if (!BUILT_IN_HELPERS[block.path.original]) {
      var helperAsset = this.resolve(block.path.original, false);
      var relPath = _path2["default"].relative(this.context.contextPath + "/", helperAsset.path);
      this.helpers.push({ name: block.path.original, relPath: relPath });
    }
    Handlebars.Visitor.prototype.BlockStatement.call(this, block);
  },

  resolve: function resolve(name, isPartial) {
    var resolved = (0, _interlockLibResolve2["default"])(name, this.context.contextPath, this.context.ns, this.context.nsRoot, isPartial ? this.context.hbsExtensions : this.context.jsExtensions, this.context.searchPaths);
    if (!resolved) {
      throw new Error("Unable to resolve Handlebars asset " + name + " from " + this.context.contextPath);
    }
    return resolved;
  }
});

function getHbsRequires(ast, registerHelpers, knownHelpers, extension, context) {
  var requires = "var Handlebars = require('handlebars/runtime');\n";

  var depsVisitor = new DependenciesVisitor(context, registerHelpers);
  depsVisitor.accept(ast);

  depsVisitor.partials.forEach(function (partial) {
    requires += "Handlebars.registerPartial(\"" + partial.uniqueName + "\", require(\"" + partial.relPath + "\"));\n";
  });

  depsVisitor.helpers.forEach(function (helper, idx) {
    if (!knownHelpers[helper]) {
      var helperVar = "helper" + idx;
      requires += "\n        var " + helperVar + " = require(\"" + helper.relPath + "\");\n        if (typeof " + helperVar + " === \"function\") {\n          Handlebars.registerHelper(\"" + helper.name + "\", " + helperVar + ");\n        }\n      ";
    }
  });

  return requires;
}

module.exports = function () {
  var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  var extension = opts.extension || "hbs";
  var searchPaths = opts.searchPaths || [];
  var registerHelpers = opts.registerHelpers === undefined ? true : opts.registerHelpers;

  var isHbsFile = new RegExp("\\.(" + extension + ")$");
  var knownHelpers = (opts.knownHelpers || []).reduce(function (obj, entry) {
    obj[entry] = true;
    return obj;
  }, {});

  return function (override, transform) {
    transform("readSource", function (module) {
      var rawSource = module.rawSource;
      if (isHbsFile.test(module.path)) {
        var context = {
          contextPath: _path2["default"].dirname(module.path),
          ns: module.ns || this.opts.ns,
          nsRoot: module.nsRoot || this.opts.nsRoot,
          jsExtensions: this.opts.extensions,
          hbsExtensions: ["." + extension],
          searchPaths: searchPaths
        };
        var ast = Handlebars.parse(rawSource);
        rawSource = getHbsRequires(ast, registerHelpers, knownHelpers, extension, context) + ("module.exports = Handlebars.template(" + Handlebars.precompile(ast) + ");\n");
      }
      return Object.assign({}, module, { rawSource: rawSource });
    });
  };
};