# interlock-h2

## Description

Enables an HTTP/2-optimized output for your build.

Instead of bundling X input files into Y bundles (where Y often equals 1), emit X bundles - one for each input file.


## Usage

Make sure you have installed the plugin as a dependency in your project:

```
$ npm install --save-dev interlock-h2
```

Then, include it in your config:

```javascript
const h2 = require("interlock-h2");

module.exports = {
  // ... config options
  plugins: [
    h2({
      // ... your options here
    })
    // .. other plugins
  ]
};
```

## Options

- `baseUrl` - A string.  Defaults to `/`.
- `pushManifest` - A string.  The filename to use for the completed push manifest file.  Defaults to `push-manifest.json`.
- `pushManifestPretty` - A boolean.  Determines whether the JSON is emitted in a condensed or indented form.  Defaults to `false` (condensed).
