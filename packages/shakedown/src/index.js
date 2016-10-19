import traverse from "babel-traverse";
import * as t from "babel-types";


// *********** HELPER FUNCTIONS ***********

// Object.defineProperty(exports, "__esModule", {
//   value: true
// });
const isEsModuleDefinition = node =>
  node.type === "ExpressionStatement" &&
  node.expression.type === "CallExpression" &&
  node.expression.callee.type === "MemberExpression" &&
  node.expression.callee.object.name === "Object" &&
  node.expression.callee.property.name === "defineProperty" &&
  node.expression.arguments.length === 3 &&
  node.expression.arguments[0].type === "Identifier" &&
  node.expression.arguments[0].name === "exports" &&
  node.expression.arguments[1].type === "StringLiteral" &&
  node.expression.arguments[1].value === "__esModule" &&
  node.expression.arguments[2].type === "ObjectExpression" &&
  node.expression.arguments[2].properties.length === 1 &&
  node.expression.arguments[2].properties[0].key.name === "value" &&
  node.expression.arguments[2].properties[0].value.value === true;


// exports.default = SOMETHING
const isExportDefinition = node =>
  node.type === "AssignmentExpression" &&
  node.left.object.type === "Identifier" &&
  node.left.object.name === "exports";

// var thing = exports.thing = SOMETHING;
const isVariableExportDefinition = node =>
  node.type === "VariableDeclaration" &&
  node.declarations.length === 1 &&
  isExportDefinition(node.declarations[0].init);

// Used to avoid variable name conflicts between modules, now that they
// all share the same scope.  This will also be the name that is referenced
// from other modules for any exported values.
const generateUniqueVariableName = (moduleHash, exportName) => {
  exportName = exportName || "default";
  const moduleIdentifier = moduleHash.replace(/-/g, "_");
  return `$${moduleIdentifier}_${exportName}`;
};

const buildIife = functionBody =>
  t.expressionStatement(
    t.callExpression(
      t.functionExpression(
        null,
        [],
        t.blockStatement(functionBody)
      ),
      []
    )
  );


// *********** **************** ***********


export default (/* opts = {} */) => (override, transform) => {
  let exportVariables;
  let localVariables;

  override("compile", () => {
    exportVariables = {};
    localVariables = {};
    return override.CONTINUE;
  });


  // At this point, all ES6 imports and exports have been transformed
  // into regular, synchronous require statements.  For that reason,
  // we'll be looking specificallly for `module.exports.X` values and
  // `var VARIABLE_NAME = X` values.
  override("updateReferences", module => {
    const moduleHash = module.hash;
    const moduleExportsDict = exportVariables[moduleHash] = {};
    const localVariablesDict = localVariables[moduleHash] = {};

    const getReplacementExportNode = (node, exportName, assignmentValue) => {
      const globalVariableName = generateUniqueVariableName(moduleHash, exportName);

      moduleExportsDict[exportName] = globalVariableName;
      localVariablesDict[exportName] = globalVariableName;

      // return t.expressionStatement(
      return t.variableDeclaration("var", [
        t.variableDeclarator(
          t.identifier(globalVariableName),
          assignmentValue
        )
      ]);
    };

    // All Babel AST transformations are actually mutations for performance reasons, so
    // we'll do the same here.
    module.ast.body = module.ast.body.map(node => {
      if (isEsModuleDefinition(node)) { return null; }

      if (
        node.type === "ExpressionStatement" &&
        isExportDefinition(node.expression)
      ) {
        // Replace:
        //   exports.myExport = thing;
        // with:
        //   var GLOBALLY_UNIQUE_VAR = thing;

        return getReplacementExportNode(
          node,
          node.expression.left.property.name,
          node.expression.right
        );
      }

      if (isVariableExportDefinition(node)) {
        // Replace:
        //   var myExport = exports.myExport = thing;
        // with:
        //   var GLOBALLY_UNIQUE_VAR = thing;

        return getReplacementExportNode(
          node,
          node.declarations[0].id.name,
          node.declarations[0].init.right
        );
      }

      if (t.isVariableDeclaration(node)) {
        // Replace:
        //   var mything = "thing";
        //   var thing;
        // with:
        //   var GLOBALLY_UNIQUE = "thing";
        //   var GLOBALLY_UNIQUE_B;

        // All Babel AST transformations are actually mutations for performance reasons,
        // so we'll do the same here.
        node.declarations.forEach(declaration => {
          const originalName = declaration.id.name;
          const globalVariableName = generateUniqueVariableName(moduleHash, originalName);
          localVariablesDict[originalName] = globalVariableName;
          declaration.id.name = globalVariableName;
        });

        return node;
      }

      return node;
    }).filter(node => node);

    return module;
  });

  transform("compileModules", modules => {
    modules.forEach(module => {
      const localVariablesDict = localVariables[module.hash];
      const importedModules = {};

      // Detect all imported ES6 modules, remove the variable assignment / require-
      // expression, and track the name of the variable so that we can look for
      // MemberExpressions later that have this variable as the `object`.
      module.ast.body = module.ast.body.map(node => {
        if (
          node.type === "VariableDeclaration" &&
          node.declarations.length === 1 &&
          node.declarations[0].init &&
          node.declarations[0].init.type === "CallExpression" &&
          node.declarations[0].init.callee.name === "require"
        ) {

          const requireStr = node.declarations[0].init.arguments[0].value;
          const dependency = module.dependenciesByInternalRef[requireStr];

          // If the dependency is not an ES6 module or its exports were not tracked
          // in the previous steps, we don't want to remove the `require` or
          // transform references to the required value.
          if (exportVariables[dependency.hash]) {
            importedModules[node.declarations[0].id.name] = exportVariables[dependency.hash];
            return null;
          }

        }
        return node;
      }).filter(node => node);


      const nodesToSkipForLocalTransform = [];
      traverse.cheap(module.ast, node => {
        // Transform the references to imported values;
        if (
          node.type === "MemberExpression" &&
          node.object.type === "Identifier" &&
          importedModules[node.object.name]
        ) {
          const importedModuleExports = importedModules[node.object.name];
          const globalVariableName = importedModuleExports[node.property.name];
          // This is kind of hacky, but it is way faster than spinning up a normal Babel traverse
          // and using `path.replace`.
          Object.assign(node, t.identifier(globalVariableName));
        }

        // Transform the reference to root-level local variables that have been renamed at
        // the point of their declaration.
        if (
          node.type === "Identifier" &&
          node.name in localVariablesDict &&
          // TODO: Come up with something better than this is a potentially costly solution...
          !nodesToSkipForLocalTransform.includes(node)
        ) {
          node.name = localVariablesDict[node.name];
        }

        // Keep track of the property of all MemberExpressions that we encounter, to ensure that
        // they are not transformed as local variables turned global variables.
        if (node.type === "MemberExpression") {
          nodesToSkipForLocalTransform.push(node.property);
        }
      });
    });

    return modules;
  });

  override("partitionBundles", moduleSeeds => {
    const jsBundleNum = Object.keys(moduleSeeds)
      .map(relPath => moduleSeeds[relPath].type)
      .filter(moduleType => moduleType === "javascript")
      .length;
    if (jsBundleNum > 1) {
      //
      //  TODO: To change this, we'll need to kill all de-duping that occurs when modules
      //        are imported from more than one place.  De-duping will have to be a separate
      //        and manual effort that occurs in an isolated dependency sub-graph for each
      //        entry file.
      //
      //        Or... maybe not?  If the variable name substitution is deterministic, we
      //        will really be including everything, and allowing the minifier to remove
      //        dead code.
      //
      throw new Error(
        "The interlock-shakedown plugin does not currently support more than one JS bundle."
      );
    }

    return override.CONTINUE;
  });

  override("constructBundleAst", ({ modules }) => {
    // All transformations to cross-module references and local variables should be
    // complete at this stage.  The remaining task is to concatenate their AST bodies
    // _in the correct order_, such that any dependencies are emitted before the
    // code that depends on it.

    // TODO: Fix this. The order here may be incorrect, but this may be enough to prove the concept?
    const bigBody = modules.slice().reverse().reduce((memo, module) => {
      return memo.concat(module.ast.body);
    }, []);

    return t.program([ buildIife(bigBody) ]);
  });
};
