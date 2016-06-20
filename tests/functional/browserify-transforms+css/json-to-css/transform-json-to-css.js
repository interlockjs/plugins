const through = require("through");

module.exports = file => {
  let data = "";
  const write = buf => data += buf;

  function end () {
    const styles = JSON.parse(data);
    const css = Object.keys(styles).map(selector => {
      const ruleSet = styles[selector];
      const rules = Object.keys(ruleSet)
        .map(ruleKey => `${ruleKey}: ${ruleSet[ruleKey]}`)
        .join(";\n");
      return `${selector} {\n${rules}\n}`;
    }).join("\n");

    this.queue(css);
    this.queue(null);
  };

  return through(write, end);
};
