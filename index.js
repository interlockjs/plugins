// TODO: Add proper sourcemap support.

import path from "path";

import * as Handlebars from "handlebars";

import resolve from "interlock/lib/resolve";

const BUILT_IN_HELPERS = {
  each: true,
  if: true,
  log: true,
  lookup: true,
  with: true
};

function DependenciesVisitor (context, registerHelpers) {
  this.context = context;
  this.partials = [];
  this.helpers = [];
  if (!registerHelpers) { this.BlockStatement = Handlebars.Visitor.prototype.BlockStatement; }
  Handlebars.Visitor.apply(this, arguments);
}

DependenciesVisitor.prototype = Object.create(Handlebars.Visitor.prototype);

Object.assign(DependenciesVisitor.prototype, {
  PartialStatement: function (partial) {
    const partialAsset = this.resolve(partial.name.original, true);
    const uniqueName = `${partialAsset.ns}:${partialAsset.nsPath}`;
    const relPath = path.relative(this.context.contextPath + "/", partialAsset.path);
    partial.name.original = partial.name.parts[0] = uniqueName;
    this.partials.push({ uniqueName, relPath });

    Handlebars.Visitor.prototype.PartialStatement.call(this, partial);
  },

  BlockStatement: function (block) {
    if (!BUILT_IN_HELPERS[block.path.original]) {
      const helperAsset = this.resolve(block.path.original, false);
      const relPath = path.relative(this.context.contextPath + "/", helperAsset.path);
      this.helpers.push({ name: block.path.original, relPath });
    }
    Handlebars.Visitor.prototype.BlockStatement.call(this, block);
  },

  resolve: function (name, isPartial) {
    const resolved = resolve(
      name,
      this.context.contextPath,
      this.context.ns,
      this.context.nsRoot,
      isPartial ? this.context.hbsExtensions : this.context.jsExtensions,
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


function getHbsRequires (ast, registerHelpers, knownHelpers, extension, context) {
  var requires = "var Handlebars = require('handlebars/runtime');\n";

  var depsVisitor = new DependenciesVisitor(context, registerHelpers);
  depsVisitor.accept(ast);

  depsVisitor.partials.forEach(partial => {
    requires = requires +
      `Handlebars.registerPartial("${partial.uniqueName}", require("${partial.relPath}"));\n`;
  });

  depsVisitor.helpers.forEach((helper, idx) => {
    if (!knownHelpers[helper]) {
      const helperVar = `helper${idx}`;
      requires = requires + `
        var ${helperVar} = require("${helper.relPath}");
        if (typeof ${helperVar} === "function") {
          Handlebars.registerHelper("${helper.name}", ${helperVar});
        }
      `;
    }
  });

  return requires;
}

module.exports = function (opts={}) {
  const extension = opts.extension || "hbs";
  const searchPaths = opts.searchPaths || [];
  const registerHelpers = opts.registerHelpers === undefined ? true : opts.registerHelpers;

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
          jsExtensions: this.opts.extensions,
          hbsExtensions: ["." + extension],
          searchPaths: searchPaths
        };
        const ast = Handlebars.parse(source);
        source = getHbsRequires(ast, registerHelpers, knownHelpers, extension, context) +
          `module.exports = Handlebars.template(${Handlebars.precompile(ast)});\n`;
      }
      return source;
    });
  };
};
