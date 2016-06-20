import glob from "glob";
import chai from "chai";
import sinon from "sinon";

global.expect = chai.expect;
global.sinon = sinon;

const suites = glob.sync("./**/*.spec.js", { cwd: __dirname });
suites.forEach(require);
