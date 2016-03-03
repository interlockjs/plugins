import path from "path";

import {
  exec,
  log,
  getPackagesDir,
  getPackageNames,
  getArgs
} from "./_util";


function installPackage (packageName, opts) {
  if (opts.verbose) { log(`Installing dependencies for "${packageName}".`); }
  return exec("npm install", { cwd: path.join(opts.packagesDir, packageName) });
}

function installPackages (packageNames, opts) {
  return packageNames.reduce((pChain, packageName) => {
    return pChain.then(() => installPackage(packageName, opts));
  }, Promise.resolve());
}

export default function install (opts = {}) {
  const packagesDir = getPackagesDir(opts);
  const packageNames = getPackageNames(packagesDir);

  return installPackages(packageNames, Object.assign({ packagesDir }, opts))
    .catch(err => log("An error occurred:", err));
}

if (require.main === module) {
  install(getArgs());
}
