var childModule = require("./child");
var each = require("lodash/each");

each(childModule, console.log.bind(console));
