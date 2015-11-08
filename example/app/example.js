var childModule = require("./child");
var _ = require("lodash");

_.each(childModule, _.bind(console.log, console));
