import crypto from "crypto";


const isExternalResource = /^(https?:)?\/\//;


const buildManifest = (paths, manifestHash) => `CACHE MANIFEST
# ${manifestHash}

CACHE:
${paths.join("\n")}

NETWORK:
*
`;


module.exports = (opts = {}) => {
  const manifestFilename = opts.filename || "site.manifest";
  const exclude = opts.exclude || [];
  const include = opts.include || [];
  const strip = opts.strip || null;
  const hash = opts.hash;

  const isIncluded = href => exclude.reduce((memo, re) => memo && !re.test(href), true);

  return (override, transform) => {
    let buildHash = "";
    let externalResources = [];

    transform("transformModule", module => {
      if (module.type !== "html") { return module; }

      const { $ } = module;
      externalResources = [];

      // Record all external resource for inclusion in the appcache manifest.
      $("script").each((idx, scriptTag) => {
        const $scriptTag = $(scriptTag);
        const src = $scriptTag.attr("src");
        if (src && isExternalResource.test(src) && isIncluded(src)) {
          externalResources.push(src);
        }
      });
      $("link").each((idx, linkTag) => {
        const $linkTag = $(linkTag);
        const href = $linkTag.attr("href");
        if (href && isExternalResource.test(href) && isIncluded(href)) {
          externalResources.push(href);
        }
      });

      // Add the `manifest` attr to the HTML root element.
      $("html").attr("manifest", `/${manifestFilename}`)

      return module;
    });

    transform("generateBundles", bundles => {
      buildHash = bundles
        .reduce((memo, bundle) => {
          if (bundle.hash) { memo.update(bundle.hash); }
          return memo;
        }, crypto.createHash("sha1"))
        .digest("base64");

      return bundles;
    });

    transform("buildOutput", output => {
      const { bundles: rawBundles } = output;
      const paths = Object.keys(rawBundles)
        .map(path => {
          return strip && strip.test(path) ?
            path.replace(strip, "") :
            path;
        })
        .concat(externalResources)
        .concat(include);

      const newBundles = Object.assign({}, rawBundles, {
        [manifestFilename]: {
          raw: buildManifest(paths, hash || buildHash)
        }
      });

      return Object.assign({}, output, { bundles: newBundles });
    });
  };
};
