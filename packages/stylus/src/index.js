const stylus = require("stylus");


const assign = Object.assign;


export default function (opts = {}) {
  let isStylusFile;
  if (opts.filter) {
    if (opts.filter.test) {
      isStylusFile = txt => opts.filter.test(txt);
    } else {
      isStylusFile = opts.filter;
    }
  } else {
    const defaultFilter = /\.styl$/;
    isStylusFile = txt => defaultFilter.test(txt);
  }


  return (override, transform) => {
    transform("setModuleType", module => {
      return isStylusFile(module.path) ?
        assign({}, module, { type: "css" }) :
        module;
    });

    transform("readSource", module => {
      if (!isStylusFile(module.path)) {
        return module;
      }

      return new Promise((resolve, reject) => {
        stylus.render(
          module.rawSource,
          { filename: module.path },
          (err, css) => {
            return err ?
              reject(err) :
              resolve(assign({}, module, { rawSource: css }));
          }
        );
      });
    });
  };
}
