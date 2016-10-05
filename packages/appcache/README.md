# interlock-appcache

## Description

Used to enable [appcache](https://developer.mozilla.org/en-US/docs/Web/HTML/Using_the_application_cache) for your application.

All compiled assets will be recorded in the application cache manifest, including JS bundles, CSS files, HTML, and other files, so long as you have the correct plugins installed for the file-types in use.  All HTML files will be modified to reference the generated manifest.

Additionally, a "build hash" will be added to the manifest.  This hash is deterministically generated from the output of your build, and its inclusion in the manifest output will indicate that browsers need to update its internal cache for the page.


## Usage

Make sure you have installed the plugin as a dependency in your project:

```
$ npm install --save-dev interlock-appcache
```

Then, include it in your config:

```javascript
const appcache = require("interlock-appcache");

module.exports = {
  // ... config options
  plugins: [
    appcache({
      // ... your options here
    })
    // .. other plugins
  ]
};
```

## Options

- `filename` - A string.  The filename to use for your application manifest. Defaults to `site.manifest`.
- `exclude` - An array of regular expressions.  If any regexp matches the pathname of a generated resource, it will be omitted from the manifest.  Defaults to an empty array.
- `include` - An array of strings. Used to xplicitly include resources that are not part of your build (external fonts, for example).  Defaults to an empty array.
- `strip` - A regular expression.  Used to match and remove parts of filenames.  This can be used, for example, to remove `index.html` from the cache entry if all links point to the parent directory.  Defaults to `null`.
- `hash` - A string.  Used to override the generated build hash.  Defaults to `null`.
