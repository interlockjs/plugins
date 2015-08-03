const Handlebars = require("handlebars/runtime");

Handlebars.registerHelper('example-helper', function (conditional, options) {
  if (conditional) {
    return options.fn(this);
  }
});
