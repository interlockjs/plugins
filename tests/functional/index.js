import path from "path";
import fs from "fs";

import glob from "glob";
import chai from "chai";
import Interlock from "interlock";

import { copyDirRecursiveSync } from "./util";


const expect = chai.expect;


function compareDirs (actual, expected) {
  const actualFiles = glob.sync(path.join(actual, "**/*"));
  const expectedFiles = glob.sync(path.join(expected, "**/*"));
  const actualFilesRel = actualFiles.map(fpath => path.relative(actual, fpath));
  const expectedFilesRel = expectedFiles.map(fpath => path.relative(expected, fpath));

  if (!expectedFiles.length) {
    copyDirRecursiveSync(actual, expected);
    return;
  }

  expect(actualFilesRel).to.eql(expectedFilesRel, "Test output files do not match expected.");

  actualFiles.forEach(actualPath => {
    const basename = path.basename(actualPath);
    const expectedPath = path.join(expected, basename);
    const actualSrc = fs.readFileSync(actualPath, { encoding: "utf-8" });
    const expectedSrc = fs.readFileSync(expectedPath, { encoding: "utf-8" });

    expect(actualSrc).to.equal(
      expectedSrc,
      `Actual output for "${basename}" does not match expected.`
    );
  });
}

const configs = glob.sync("./**/ilk.config.js", { cwd: __dirname });
configs.forEach(configRelPath => {
  const configAbsPath = path.join(__dirname, configRelPath);
  const testBasePath = path.dirname(configAbsPath);
  const testActualPath = path.join(testBasePath, "actual");
  const testExpectedPath = path.join(testBasePath, "expected");

  const testSegments = path.dirname(configRelPath).slice(2).split("/");
  (function buildDescribe (remainingSegments) {
    if (remainingSegments.length === 1) {
      return it(remainingSegments[0], () => {
        const config = require(configAbsPath);
        const ilk = new Interlock(config);
        return ilk.build().then(() => compareDirs(testActualPath, testExpectedPath));
      });
    }
    return describe(`${remainingSegments[0]}/`, () => {
      buildDescribe(remainingSegments.slice(1));
    });
  })(testSegments);

});
