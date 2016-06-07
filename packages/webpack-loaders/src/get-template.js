import path from "path";
import fs from "fs";
import template from "interlock/lib/util/template";


export default function getTemplate (templateName, transform) {
  transform = transform || (node => node);
  const absPath = path.join(__dirname, `../templates/${templateName}.jst`);
  const templateStr = fs.readFileSync(absPath, "utf-8")
    // Remove ESlint rule exclusions from parsed templates.
    .replace(/\s*\/\/\s*eslint-disable-line.*/g, "");
  const _template = template(templateStr);
  return opts => transform(_template(opts));
}
