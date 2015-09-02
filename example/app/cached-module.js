var subModule = require("./cached-module-b");

module.exports = function () {
  return "cached module " + subModule();
};
