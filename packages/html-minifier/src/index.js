import { minify } from "html-minifier";


export default function (opts = {}) {
  return (override, transform) => {
    transform("generateRawBundles", bundle => {
      if (bundle.type !== "html") { return bundle; }
      const raw = minify(bundle.raw, opts);
      return Object.assign({}, bundle, { raw });
    });
  };
}
