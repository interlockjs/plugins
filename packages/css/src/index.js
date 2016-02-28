import postcss from "postcss";

export default function (opts = {}) {
  const isCssFile = opts.filter || /\.css$/;
  const processor = postcss(opts.plugins || []);

  return (override, transform, shared) => {
    const cssModuleHashes = {};

    /**
     * Assign input files that match the filter a module type of `css`. This
     * will trigger the alternate pipeline defined in this plugin.
     */
    transform("setModuleType", function (module) {
      return isCssFile.test(module.path) ?
        Object.assign({}, module, { type: "css" }) :
        module;
    })

    override("parseModule", function (module) {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return Object.assign({}, module, {
        ast: postcss.parse(module.rawSource)
      });
    });

    override("transformModule", function (module) {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return processor.process(module.ast).then(result => {
        return Object.assign({}, module, {
          ast: result.root,
          synchronousRequires: []  
        });
      });
    });

    // TODO: Verify `generateDependencies` works unmodified.
    // TODO: Verify `hashModule` works unmodified.

    override("updateRequires", function (module) {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      // CSS modules themselves will not be dependent on anything.  So it is
      // unnecessary to modify `module.ast` with `module.dependenciesByInternalRef`.
      return module;
    });

    /**
     * CSS modules will require special treatment during the bundling process.
     * Record the hashes of the modules here, now that compilation has completed.
     */
    transform("compileModules", function (modules) {
      modules.forEach(module => {
        if (module.type === "css") {
          cssModuleHashes[module.hash] = true;
        }
      })
      return modules;
    })

    override("initBundle", function (bundleDef, module, isEntryPt) {
      if (module.type !== "css") {
        return override.CONTINUE;
      }
      return {
        module,
        type: "css",
        dest: bundleDef.dest
      };
    });

    // TODO "dedupeImplicit":
    //  - remove CSS modules from bundles (curently done below with populateBundleModules)
    //  - create individual bundles for each CSS module that is referenced
    //  - replace CSS module reference in JS with some other type of module, optionally:
    //    - postcss-processed CSS string
    //    - module that creates a new <style> tag referencing the CSS output bundle
    //    - module that creates a new <style> tag with CSS text content

    transform("populateBundleModules", function (bundle) {
      if (bundle.type === "css") {
        return bundle;
      }

      return Object.assign({}, bundle, {
        modules: bundle.modules.filter(module => !cssModuleHashes[module.hash])
      });
    });

    override("constructBundle", function (bundle, urls) {
      if (bundle.type !== "css") {
        return override.CONTINUE;
      }
      return Object.assign({}, bundle, {
        moduleRootNodes: bundle.modules.map(module => module.ast)
      });
    });

    override("generateRawBundles", function (bundle) {
      if (bundle.type !== "css") {
        return override.CONTINUE;
      }
      console.log("cool thing!!! ", bundle.moduleRootNodes);
      return Object.assign({}, bundle, {
        raw: bundle.moduleRootNodes.map(node => node.toString()).join("\n")
      });
    })
  };
}
