import traverse from "babel-traverse";


export default function (/* opts = {} */) {
  const metadata = {};

  return (override, transform) => {

    /**
     * Record all ES6 exports and imports for each module.
     *
     * When an export is found, create a corresponding property in the
     * module's `exports` object, set to `false`.  These will later be
     * toggled to `true` for exports that are imported.
     *
     * When an import is found, create a corresponding property for the
     * _source_ module (whatever is in the import source string) in the
     * module's `imports` object.  The value of this property will be
     * an array containing all imported identifiers.
     */
    transform("parseModule", module => {
      const moduleMetadata = metadata[module.path] = { exports: {}, imports: {} };

      traverse.cheap(module.ast, node => {
        // Look for named exports.
        if (node.type === "ExportNamedDeclaration") {
          if (node.declaration && node.declaration.type === "FunctionDeclaration") {
            moduleMetadata.exports[node.declaration.id.name] = false;
          } else if (node.declaration && node.declaration.type === "VariableDeclaration") {
            node.declaration.declarations.forEach(decl => {
              moduleMetadata.exports[decl.id.name] = false;
            });
          }

        // Look for default export.
        } else if (node.type === "ExportDefaultDeclaration") {
          moduleMetadata.exports.default = false;

        // Look for imports.
        } else if (node.type === "ImportDeclaration") {
          const imports = moduleMetadata.imports[node.source.value] =
            moduleMetadata.imports[node.source.value] || [];

          node.specifiers.forEach(specifier => {
            imports.push(specifier.imported.name);
          });

        // Look for default imports.
        } else if (node.type === "ImportDefaultDeclaration") {
          const imports = moduleMetadata.imports[node.source.value] =
            moduleMetadata.imports[node.source.value] || [];
          imports.push("default");
        }
      });

      return module;
    });

    /**
     * First, iterate over each module's internal references (any import
     * sources or require() arguments).  Then, find the corresponding export
     * metadata for that dependency, and mark its exports as used if
     * they are imported in the current module.
     *
     * After this has happened for all modules, iterate over each module
     * again.  This time remove `exports.foo` for any "foo" that was unused.
     *
     * Any function/variable declarations that are 1) unexported, and
     * 2) unused elsewhere in the module, will be stripped out by a minifier.
     */
    transform("compileModules", modules => {
      // Mark used exports.
      modules.forEach(module => {
        const moduleMetadata = metadata[module.path];

        // Iterate over all dependencies.
        Object.keys(module.dependenciesByInternalRef).forEach(internalRef => {
          const dep = module.dependenciesByInternalRef[internalRef];
          const depMetadata = metadata[dep.path];

          // Iterate over all identifiers imported from this dependency, marking
          // _its_ export as used.
          moduleMetadata.imports[internalRef].forEach(identifier => {
            depMetadata.exports[identifier] = true;
          });
        });
      });

      // Remove `exports.foo` for any unused exports.
      modules.forEach(module => {
        const shouldExport = metadata[module.path].exports;

        traverse(module.ast, {
          noScope: true,
          enter: path => {
            if (
              path.node.type === "AssignmentExpression" &&
              path.node.left.type === "MemberExpression" &&
              path.node.left.object.name === "exports"
            ) {
              if (!shouldExport[path.node.left.property.name]) {
                // const thing = exports.thing = "thing";
                //   --> const thing = "thing";
                // export function foo () { /* ... */ };
                //   --> foo;
                //   --> function foo () { /* ... */ };
                // export default "default";
                //   --> "default";
                // 
                path.replaceWith(path.node.right);
              }
            }
          }
        });
      });

      return modules;
    });
  };
}
