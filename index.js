// TODO: Add proper sourcemap support.

import * as Handlebars from "handlebars";

function DependenciesVisitor () {
  this.partials = [];
  this.helpers = [];
  Handlebars.Visitor.apply(this, arguments);
}

DependenciesVisitor.prototype = Object.create(Handlebars.Visitor.prototype);

Object.assign(DependenciesVisitor.prototype, {
  PartialStatement: function (partial) {
    this.partials.push({request: partial.name.original});
    Handlebars.Visitor.prototype.PartialStatement.call(this, partial);
  },

  sexpr: function (sexpr) {
    var id = sexpr.id;
    if (id.isSimple) {
      this.helpers.push(id.original);
    }
    Handlebars.Visitor.prototype.sexpr.call(this, sexpr);
  }
});


function getHbsRequires (ast, knownHelpers, extension) {
  var requires = "var Handlebars = require('handlebars/runtime');\n";

  var depsVisitor = new DependenciesVisitor();
  depsVisitor.accept(ast);

  depsVisitor.partials.forEach(partial => {
    const partialRequire = partial.name.name.endsWith("." + extension) ?
      partial.name.name :
      partial.name.name + "." + extension;
    requires = requires +
      `Handlebars.registerPartial("${partial.name.name}", require(${partialRequire});\n`;
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
  const isHbsFile = new RegExp(`\\.(${extension})$`);
  const knownHelpers = (opts.knownHelpers || []).reduce((obj, entry) => {
    obj[entry] = true;
    return obj;
  }, {});

  return function (override, transform, control) {
    transform("readSource", function (source, [asset]) {
      if (isHbsFile.test(asset.path)) {
        const ast = Handlebars.parse(source);
        source = getHbsRequires(ast, knownHelpers, extension) +
          `module.exports = Handlebars.template(${Handlebars.precompile(ast)});\n`;
      }
      return source;
    });
  };
};
