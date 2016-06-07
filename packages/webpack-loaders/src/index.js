import fs from "fs";
import path from "path";
import { assign } from "lodash";
import { runLoaders } from "loader-runner";
import combineLoaders from "webpack-combine-loaders";

process.env.NODE_PATH = __dirname;

function stringifyLoaders (loaderModule, queryString) {
  return `${require.resolve(loaderModule)}?${queryString}`;
}

function findValidLoaders (loaders, module) {
  const extension = path.extname(module.path);
  return loaders.map(loader => {
    if (!loader.test.test(extension)) {
      return null;
    }
    return loader;
  }).filter(x => x);
}

export default function (opts = {}) {
  return (override, transform) => {
    transform("setModuleType", module => {
      const validLoaders = findValidLoaders(opts.loaders, module);
      const loadersHaveTranspileTarget = validLoaders.some(
        loader => loader.transpileTarget
      );

      if (!loadersHaveTranspileTarget) {
        return module;
      }

      const targetExtension = validLoaders.reduce((prev, next) => {
        return prev.transpileTarget === next.transpileTarget
          ? next.transpileTarget : false;
      });

      if (!targetExtension) {
        throw new Error(
          `
          You have multiple loaders that apply to the same files,
          but specify different transpileTargets. Please check your
          configuration.
          `
        );
      }

      return assign({}, module, {
        type: targetExtension.transpileTarget
      });
    });

    transform("readSource", module => {
      const validLoaders = findValidLoaders(opts.loaders, module);

      if (!validLoaders.length) {
        return module;
      }

      const runnerOptions = {
        resource: module.path,
        loaders: validLoaders.map(loader => {
          if (typeof loader === "string") {
            const [loaderModule, queryString] = loader.split("?");
            return stringifyLoaders(loaderModule, queryString);
          }

          return combineLoaders([loader]);
        }),
        context: {
          get _compiler () {
            throw new Error(
              `
              This plugin does not currently support loaders that
              access the internal Webpack compiler.
              `
            );
          },
          emitFile () {
            throw new Error(
              `
              This plugin does not currently support loaders that
              use emitFile(). Interlock may support this in the future.`
            );
          },
          minimize: true,
          options: {
            resolve: {}
          }
        },
        readResource: fs.readFile.bind(fs)
      };

      return new Promise((resolve, reject) => {
        runLoaders(runnerOptions, (err, result) => {
          return err ? reject(err) : resolve(result);
        });
      }).then(result => {
        const rawSource = result.result[0];
        return {...module, rawSource};
      });
    });
  };
}
