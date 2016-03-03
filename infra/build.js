import path from "path";

import {
  exec,
  log,
  getPackagesDir,
  getPackageNames,
  getArgs,
  getBaseDir,
  getBinDir
} from "./_util";


function buildPackage (packageName, opts) {
  if (opts.verbose) { log(`Building "${packageName}".`); }
  const packageRoot = path.join(opts.packagesDir, packageName);
  return exec(`${opts.binDir}/babel -d ${packageRoot}/lib ${packageRoot}/src`, {
    cwd: opts.baseDir
  });
}

function buildPackages (packageNames, opts) {
  return packageNames.reduce((pChain, packageName) => {
    return pChain.then(() => buildPackage(packageName, opts));
  }, Promise.resolve());
}

export default function build (opts = {}) {
  const packagesDir = getPackagesDir(opts);
  const baseDir = getBaseDir(opts);
  const binDir = getBinDir(opts);
  const packageNames = getPackageNames(packagesDir);

  return buildPackages(packageNames, Object.assign({ packagesDir, baseDir, binDir }, opts))
    .catch(err => opts.verbose && log("An error occurred:", err));
}


if (require.main === module) {
  build(getArgs());
}
