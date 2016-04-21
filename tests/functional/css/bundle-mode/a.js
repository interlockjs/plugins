/* eslint-env browser */

const cssDep = require("./c.css");

const link = document.createElement("link");
link.rel = "stylesheet";
link.type = "text/css";
link.href = cssDep._path;
link.addEventListener("load", () => window.testResult(null, cssDep));

document.head.appendChild(link);
