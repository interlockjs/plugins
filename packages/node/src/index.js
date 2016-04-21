import { chain, assign } from "lodash";
import * as t from "babel-types";


const isRelativeImport = /^(\.\.?)?\//


export default function (opts = {}) {
  return (override, transform) => {

    // Filter out any require strings that aren't relative paths.
    transform("transformModule", module => {
      const synchronousRequires = module.synchronousRequires.filter(
        requireStr => isRelativeImport.test(requireStr)
      );

      return assign({}, module, {
        synchronousRequires
      });
    });

    // All require strings should still be valid; relative requires should work
    // in the destination directory, and node_module package references should be
    // resolved by Node at run-time.
    override("updateRequires", module => module);

    // Most of what happens here with bundle partitioning does not need to happen.
    // However, we need access to the `initBundle` pluggable, which we can get at
    // via `getBundleSeeds`.
    override("partitionBundles", function (moduleSeeds, moduleMaps) {
      return this.getBundleSeeds(moduleSeeds, moduleMaps.byAbsPath);
    });

    // Define an output bundle for each input module, defining an output path relative
    // to the output dir identical to the input module's path relative to the source
    // root.
    override("getBundleSeeds", function (moduleSeeds, modulesByPath) {
      return Promise.all(Object.keys(modulesByPath).map(modulePath => this.initBundle({
        dest: modulesByPath[modulePath].nsPath,
        module: modulesByPath[modulePath],
        moduleHashes: [modulesByPath[modulePath].hash],
        isEntryPt: false,
        type: modulesByPath[modulePath].type,
        // This is not strictly necessary, but might help compatibility with other plugins.
        excludeRuntime: true
      })));
    });

    // We don't need to generate a URL hash, since all modules will be referenced
    // by their relative (or node_modules) paths.
    override("getUrls", () => ({}));

    // No need to do anything fancy here - a bundle's AST should match its input
    // module's transformed AST exactly.
    override("constructBundle", bundle => {
      return assign({}, bundle, {
        ast: bundle.module.ast
      })
    });
  };
}
