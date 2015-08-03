// TODO: Add proper sourcemap support.

import path from "path";

import * as Handlebars from "handlebars";

import resolve from "interlock/lib/resolve";

function DependenciesVisitor (context) {
  this.context = context;
  this.partials = [];
  this.helpers = [];
  Handlebars.Visitor.apply(this, arguments);
}

DependenciesVisitor.prototype = Object.create(Handlebars.Visitor.prototype);

Object.assign(DependenciesVisitor.prototype, {
  PartialStatement: function (partial) {
    const partialAsset = this.resolve(partial.name.original);
    const uniqueName = `${partialAsset.ns}:${partialAsset.nsPath}`;
    const relPath = path.relative(this.context.contextPath + "/", partialAsset.path);
    partial.name.original = partial.name.parts[0] = uniqueName;
    this.partials.push({ uniqueName, relPath });

    Handlebars.Visitor.prototype.PartialStatement.call(this, partial);
  },

  sexpr: function (sexpr) {
    var id = sexpr.id;
    if (id.isSimple) {
      this.helpers.push(id.original);
    }
    Handlebars.Visitor.prototype.sexpr.call(this, sexpr);
  },

  resolve: function (name) {
    const resolved = resolve(
      name,
      this.context.contextPath,
      this.context.ns,
      this.context.nsRoot,
      this.context.extensions,
      this.context.searchPaths
    );
    if (!resolved) {
      throw new Error(
        `Unable to resolve Handlebars asset ${name} from ${this.context.contextPath}`
      );
    }
    return resolved;
  }
});


function getHbsRequires (ast, knownHelpers, extension, context) {
  var requires = "var Handlebars = require('handlebars/runtime');\n";

  var depsVisitor = new DependenciesVisitor(context);
  depsVisitor.accept(ast);

  depsVisitor.partials.forEach(partial => {
    requires = requires +
      `Handlebars.registerPartial("${partial.uniqueName}", require("${partial.relPath}"));\n`;
  });

  depsVisitor.helpers.forEach(helper => {
    if (!knownHelpers[helper]) {
      const helperRequire = helper.endsWith("." + extension) ?
        helper :
        helper + "." + extension;
      requires = requires + `Handlebars.registerHelper("${helper}", require(${helperRequire}));\n`;
    }
  });

  return requires;
}

module.exports = function (opts={}) {
  const extension = opts.extension || "hbs";
  const searchPaths = opts.searchPaths || [];
  const isHbsFile = new RegExp(`\\.(${extension})$`);
  const knownHelpers = (opts.knownHelpers || []).reduce((obj, entry) => {
    obj[entry] = true;
    return obj;
  }, {});

  return function (override, transform, control) {
    transform("readSource", function (source, [asset]) {
      if (isHbsFile.test(asset.path)) {
        const context = {
          contextPath: path.dirname(asset.path),
          ns: asset.ns || this.opts.ns,
          nsRoot: asset.nsRoot || this.opts.nsRoot,
          extensions: ["." + extension],
          searchPaths: searchPaths
        };
        const ast = Handlebars.parse(source);
        source = getHbsRequires(ast, knownHelpers, extension, context) +
          `module.exports = Handlebars.template(${Handlebars.precompile(ast)});\n`;
      }
      return source;
    });
  };
};
