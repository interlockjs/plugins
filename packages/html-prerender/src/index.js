import path from "path";


export default function (opts = {}) {
  const { elementName = "PreRender" } = opts;

  return (override, transform) => {
    transform("transformModule", module => {
      if (module.type !== "html") { return module; }

      const { $ } = module;
      const moduleDir = path.dirname(module.path);
      const preRenderEls = $(elementName);
      const preRenderSrcs = preRenderEls
        .map((idx, el) => $(el).attr("src"))
        .get()
        .map(relPath => path.resolve(moduleDir, relPath));

      // eslint-disable-next-line global-require
      return Promise.all(preRenderSrcs.map(srcPath => require(srcPath)()))
        .then(htmlSegments => {
          preRenderEls.each((idx, el) => {
            $(el).replaceWith($(htmlSegments[idx]));
          });
          return module;
        });
    });
  };
}
