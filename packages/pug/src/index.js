import pug from "pug";


const assign = Object.assign;


export default function (opts = {}) {
  const getLocals = opts.getLocals || (() => ({}));

  let isPugFile;
  if (opts.filter) {
    if (opts.filter.test) {
      isPugFile = filePath => opts.filter.test(filePath);
    } else {
      isPugFile = opts.filter;
    }
  } else {
    const defaultFilter = /\.pug$/;
    isPugFile = filePath => defaultFilter.test(filePath);
  }

  return (override, transform) => {
    transform("setModuleType", module => {
      return isPugFile(module.path) ?
        assign({}, module, { type: "html" }) :
        module;
    });

    transform("readSource", module => {
      if (!isPugFile(module.path)) { return module; }

      const locals = assign({}, getLocals(module), {
        filename: module.path,
        nsPath: module.nsPath
      });

      const html = pug.render(module.rawSource, locals);

      return assign({}, module, { rawSource: html });
    });
  };
}

