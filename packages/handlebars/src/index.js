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
  PartialStatement (partial) {
    const partialAsset = this.resolve(partial.name.original, true);
    const uniqueName = `${partialAsset.ns}:${partialAsset.nsPath}`;
    const relPath = path.relative(`${this.context.contextPath}/`, partialAsset.path);
    partial.name.original = partial.name.parts[0] = uniqueName; // eslint-disable-line no-magic-numbers,max-len
    this.partials.push({ uniqueName, relPath });

    Handlebars.Visitor.prototype.PartialStatement.call(this, partial);
  },

  BlockStatement (block) {
    if (!BUILT_IN_HELPERS[block.path.original]) {
      const helperAsset = this.resolve(block.path.original, false);
      const relPath = path.relative(`${this.context.contextPath}/`, helperAsset.path);
      this.helpers.push({ name: block.path.original, relPath });
    }
    Handlebars.Visitor.prototype.BlockStatement.call(this, block);
  },

  resolve (name, isPartial) {
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
  let requires = "var Handlebars = require('handlebars/runtime');\n";

  const depsVisitor = new DependenciesVisitor(context, registerHelpers);
  depsVisitor.accept(ast);

  depsVisitor.partials.forEach(partial => {
    requires +=
      `Handlebars.registerPartial("${partial.uniqueName}", require("${partial.relPath}"));\n`;
  });

  depsVisitor.helpers.forEach((helper, idx) => {
    if (!knownHelpers[helper]) {
      const helperVar = `helper${idx}`;
      requires += `
        var ${helperVar} = require("${helper.relPath}");
        if (typeof ${helperVar} === "function") {
          Handlebars.registerHelper("${helper.name}", ${helperVar});
        }
      `;
    }
  });

  return requires;
}

module.exports = function (opts = {}) {
  const extension = opts.extension || "hbs";
  const searchPaths = opts.searchPaths || [];
  const registerHelpers = opts.registerHelpers === undefined ? true : opts.registerHelpers;

  const isHbsFile = new RegExp(`\\.(${extension})$`);
  const knownHelpers = (opts.knownHelpers || []).reduce((obj, entry) => {
    obj[entry] = true;
    return obj;
  }, {});

  return function (override, transform) {
    transform("readSource", function (module) {
      let rawSource = module.rawSource;
      if (isHbsFile.test(module.path)) {
        const context = {
          contextPath: path.dirname(module.path),
          ns: module.ns || this.opts.ns,
          nsRoot: module.nsRoot || this.opts.nsRoot,
          jsExtensions: this.opts.extensions,
          hbsExtensions: [`.${extension}`],
          searchPaths
        };
        const ast = Handlebars.parse(rawSource);
        const hbsRequires = getHbsRequires(ast, registerHelpers, knownHelpers, extension, context);
        const precompiledTmpl = Handlebars.precompile(ast);
        rawSource = `${hbsRequires}\nmodule.exports = Handlebars.template(${precompiledTmpl});\n`;
      }
      return Object.assign({}, module, { rawSource });
    });
  };
};
