import fs from "fs";
import path from "path";

import _ from "lodash";

import { fromObject } from "interlock/lib/util/ast";
import { bodyTmpl } from "interlock/lib/ast/template";

const tmplStr =
  fs.readFileSync(path.join(__dirname, "../templates/requirejs-interop.jst"), "utf-8");
const tmpl = bodyTmpl(tmplStr);

module.exports = function (opts = {}) {
  const stripExtensions = opts.stripExtensions || [".js"];

  return function (override, transform) {
    const uriToModuleHash = {};
    const keyFn = opts.keyFn || function (module) {
      let nsPath = module.nsPath;
      const extension = path.extname(module.nsPath);
      if (_.contains(stripExtensions, extension)) {
        nsPath = nsPath.substr(0, nsPath.lastIndexOf(extension));
      }
      return `${module.ns}/${nsPath}`;
    };

    transform("compileModules", modules => {
      modules.forEach(module => uriToModuleHash[keyFn(module)] = module.hash);
      return modules;
    });

    transform("constructBundleBody", (body, [{ includeRuntime }]) => {
      if (!includeRuntime) {
        return body;
      }
      const runtimeNodes = tmpl({
        identifier: {
          "REQUIRE_JS_HASH": fromObject(uriToModuleHash)
        }
      });

      const loadIndex = _.findIndex(body, node =>
        node.type === "ExpressionStatement" &&
          node.expression.type === "CallExpression" &&
          node.expression.callee.type === "MemberExpression" &&
          node.expression.callee.property.name === "load"
      );
      return [].concat(body.slice(0, loadIndex), runtimeNodes, body.slice(loadIndex));
    });

  };
};
