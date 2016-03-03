import path from "path";
import fs from "fs";

import {
  exec,
  log,
  getPackagesDir,
  getPackageNames,
  getArgs,
  includes,
  isDirOrSymlink
} from "./_util";


function linkPackage (packageName, realNames, packageDeps, opts) {
  const realNamesKeys = Object.keys(realNames);
  const linkingPackageNodeModules = path.join(opts.packagesDir, packageName, "node_modules");

  if (!isDirOrSymlink(linkingPackageNodeModules)) {
    fs.mkdirSync(linkingPackageNodeModules);
  }

  return packageDeps.reduce((pChain, packageDep) => {
    return pChain.then(() => {
      if (!includes(realNamesKeys, packageDep)) {
        return Promise.resolve();
      }

      const linkPath = path.join(linkingPackageNodeModules, packageDep);
      const linkTarget = path.join(opts.packagesDir, realNames[packageDep]);
      const relLinkTarget = path.relative(linkingPackageNodeModules, linkTarget);

      // New symlink operation will fail if link (or directory) already exists.
      if (isDirOrSymlink(linkPath)) {
        if (opts.verbose) {
          log(`Removing old "${packageDep}" directory/symlink from "${packageName}".`);
        }
        fs.unlink(linkPath);
      }

      if (opts.verbose) {
        log(`Linking "${realNames[packageDep]}" to "${packageName}" as "${packageDep}".`);
      }

      return exec(`ln -s ${relLinkTarget} ${packageDep}`, {
        cwd: linkingPackageNodeModules
      });
    });
  }, Promise.resolve());
}

function linkPackages (packageNames, opts) {
  const { deps, realNames } = packageNames.reduce((info, packageName) => {
    const packageJson = require(path.join(opts.packagesDir, packageName, "package.json"));
    const packageDeps = Object.assign({}, packageJson.devDependencies, packageJson.dependencies);

    return {
      deps: Object.assign(info.deps, {
        [packageName]: Object.keys(packageDeps)
      }),
      realNames: Object.assign(info.realNames, {
        [packageJson.name]: packageName
      })
    };
  }, { deps: {}, realNames: {} });

  return packageNames.reduce((pChain, packageName) => {
    return pChain.then(() =>
      linkPackage(packageName, realNames, deps[packageName], opts));
  }, Promise.resolve());
}

export default function link (opts = {}) {
  const packagesDir = getPackagesDir(opts);
  const packageNames = getPackageNames(packagesDir);

  linkPackages(packageNames, Object.assign({ packagesDir }, opts))
    .catch(err => opts.verbose && log("An error occurred:", err));
}


if (require.main === module) {
  link(getArgs());
}
