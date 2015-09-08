import fs from "fs";
import path from "path";

import _ from "lodash";
import most from "most";
import Promise from "bluebird";


const readFilePromise = Promise.promisify(fs.readFile, fs);

function isFile (absPath) {
  let stat;
  try { stat = fs.statSync(absPath); } catch (e) { return false; }
  return stat.isFile() || stat.isFIFO();
}

/**
 * Given a directory and file in that directory, return a promise
 * that resolves to a bundle that contains the filename and raw
 * content.
 *
 * @param   {String}  dir       Valid path to directory containing Interlock bundles.
 * @param   {String}  filename  Filename of bundle in dir.
 *
 * @returns {Promise}           Resolves to bundle matching input file.
 */
function rawBundleFromFile (dir, filename) {
  return readFilePromise(path.join(dir, filename))
    .then(content => {
      return { dest: filename, raw: content };
    });
}

module.exports = function (manifestPath, bundlesPath) {
  return function (override, transform) {
    // Throw an error at the _beginning of compilation_ if the specified manifest
    // file does not exist.  This check occurs here (instead of when the plugins
    // options are originally passed) because the specified manifest file may
    // not yet exist prior to the beginning of compilation (see example builds).
    if (!isFile(manifestPath)) {
      throw new Error("You must supply a path to a valid manifest.");
    }

    const manifest = require(manifestPath);
    bundlesPath = bundlesPath || path.dirname(manifestPath);

    // Keep track of which module hashes are both 1) in the current build, and 2) in
    // the shared build.  These module hashes will be removed from the current build
    // and the hash will be used to identify what extra bundles and URL entries
    // to include in the current build.
    const moduleHashHits = _.chain(manifest.moduleHashToBundleFn)
      .keys()
      .map(key => [key, false])
      .object()
      .value();

    transform("dedupeImplicit", function (bundles) {
      return bundles
        // Remove and record any modules that are present in the shared build.
        .map(bundle => {
          const filteredModuleHashes = bundle.moduleHashes.filter(hash => {
            if (manifest.moduleHashToBundleFn[hash]) {
              // Mark module as removed from local build in favor of shared bundle.
              moduleHashHits[hash] = true;
              return false;
            }
            return true;
          });

          return Object.assign({}, bundle, {
            moduleHashes: filteredModuleHashes
          });
        })
        // Remove any bundles which now do not contain any module hashes.
        .filter(bundle => !!bundle.moduleHashes.length);
    });

    transform("getUrls", function (urlsHash) {
      // Generate URL-hash entries for all modules that were removed from the
      // build but should point to the shared build.
      const sharedUrlEntries = _.chain(moduleHashHits)
        .map((wasHit, hash) => wasHit && [hash, manifest.moduleHashToBundleFn[hash]])
        .filter(x => x)
        .object()
        .value();
      return Object.assign({}, urlsHash, sharedUrlEntries);
    });

    transform("emitRawBundles", function (bundles) {
      // Generate list of shared bundle filenames to include in this build.
      const bundlesToEmit = _.chain(moduleHashHits)
        .map((wasHit, moduleHash) => wasHit && moduleHash)
        .filter(x => x)
        .map(moduleHash => manifest.moduleHashToBundleFn[moduleHash])
        .uniq()
        .value();

      // Emit the utilized shared-bundles along with the rest of the compilation.
      const extraBundles = most.from(bundlesToEmit)
        .map(fpath => rawBundleFromFile(bundlesPath, fpath))
        .await();
      return bundles.concat(extraBundles);
    });
  };
};
