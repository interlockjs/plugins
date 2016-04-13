import path from "path";
import fs from "fs";
import { exec as execP } from "child_process";

import minimist from "minimist";


const BASE_DIR = path.join(__dirname, "..");


export function log () {
  console.log(...arguments); //eslint-disable-line no-console
}

export function getArgs () {
  return minimist(process.argv.slice(2)); // eslint-disable-line no-magic-numbers
}

export function exec (command, opts = {}) {
  const cwd = opts.cwd || process.cwd();
  return new Promise((resolve, reject) =>
    execP(command, { cwd }, (err, stdout, stderr) => {
      if (err) {
        reject(`Process failed with exit code ${err.code}: ${stdout}\n\n${stderr}`);
      } else {
        resolve(stdout);
      }
    })
  );
}

export function getBaseDir (opts = {}) {
  return opts.root || BASE_DIR;
}

export function getBinDir (opts = {}) {
  return path.join(getBaseDir(opts), "node_modules/.bin");
}

export function getPackagesDir (opts = {}) {
  return path.join(getBaseDir(opts), "packages");
}

export function getTestsRootPath (opts = {}) {
  return path.join(getBaseDir(opts), "tests");
}

export function getPackageNames (packagesDir) {
  return fs.readdirSync(packagesDir)
    .filter(pkgName => fs.existsSync(path.join(packagesDir, pkgName, "package.json")));
}

export function includes (array, val) {
  return array.reduce((found, el) => {
    return found || el === val;
  }, false);
}

export function isDirOrSymlink (_path) {
  let yepItIs = true;

  try {
    const nodeModulesStats = fs.lstatSync(_path);
    if (!nodeModulesStats.isSymbolicLink() && !nodeModulesStats.isDirectory()) {
      yepItIs = false;
    }
  } catch (err) {
    if (err.code === "ENOENT") {
      yepItIs = false;
    } else {
      throw err;
    }
  }
  return yepItIs;
}
