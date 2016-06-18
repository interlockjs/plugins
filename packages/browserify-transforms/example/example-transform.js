var through = require("through");

module.exports = function (file) {
  if (!/\.json$/.test(file)) {
    return through();
  }

  let data = "";

  function write (chunk) { data += chunk; }
  function end () {
    this.queue("module.exports = " + data + ";");
    this.queue(null);
  }

  return through(write, end);
};