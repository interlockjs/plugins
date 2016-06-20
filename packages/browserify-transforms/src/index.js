import { Readable } from "stream";
import concat from "concat-stream";

export default function (definitions = []) {
  const transforms = definitions.map(definition => {
    if (typeof definition === "string") {
      definition = { transform: require(definition) }; // eslint-disable-line global-require
    } else if (typeof definition === "function") {
      definition = { transform: definition };
    }

    if (typeof definition !== "object" || typeof definition.transform !== "function") {
      throw new Error("You have supplied an invalid option to interlock-browserify-transform.");
    }

    return definition;
  });

  return (override, transform) => {
    transform("loadModule", module => {
      let stream = new Readable();
      stream.push(module.rawSource);
      stream.push(null);

      let _moduleType;
      transforms.forEach(({ transform: transformFn, opts, filter, moduleType }) => {
        if (!filter || filter.test(module.path)) {
          if (moduleType) { _moduleType = moduleType; }
          stream = stream.pipe(transformFn(module.path, opts));
        }
      });

      return new Promise((resolve, reject) => {
        stream.pipe(concat(rawSource => {
          rawSource = rawSource.toString();
          const newProps = { rawSource };
          if (_moduleType) { newProps.type = _moduleType; }
          resolve(Object.assign({}, module, newProps));
        }));

        stream.on("error", err => {
          reject(err);
        });
      });
    });
  };
}
