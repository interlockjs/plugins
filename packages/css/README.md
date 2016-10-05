# interlock-css

## Description

Enables CSS as a first-class module-type.  It allows you to require, transform and emit CSS with the same power that you have for JavaScript.

Under the hood, this parses CSS into AST using [PostCSS](https://github.com/postcss/postcss).

This plugin may be required for other plugins to function correctly.

## Usage

Make sure you have installed the plugin as a dependency in your project:

```
$ npm install --save-dev interlock-css
```

Then, include it in your config:

```javascript
const css = require("interlock-css");

module.exports = {
  // ... config options
  plugins: [
    css({
      // ... your options here
    })
    // .. other plugins
  ]
};
```

## Options

- `mode` - One of three strings: `bundle`, `insert`, or `object`.  Defaults to `insert`.
    + When in `bundle` mode...
        * all CSS, whether included as an entry point or `require`d from JavaScript, will be gathered together into one or more aggregate CSS files and emitted with the rest of the build;
        * CSS bundles formed from JS `require` expressions will have a 1:1 correspondence with the JS bundles that required them.
    + When in `insert` mode...
        * all CSS that was `require`d from JavaScript will be automatically inserted into the DOM as a `<style>` tag when required at run-time;
        * all CSS defined as an entry point will be emitted as a CSS bundle with the rest of the build.
    + When in `object` mode...
        * all CSS that was `require`d from JavaScript will be accessible as an object literal in the JS run-time environment;
        * all CSS defined as an entry point will be emitted as a CSS bundle with the rest of the build.
- `modules` - A boolean.  When enabled, treats all required CSS as [CSS Modules](https://github.com/css-modules/postcss-modules).  This setting has no effect when plugin is in `object` mode.  Defaults to `false`.
- `filter` - A regular expression.  This setting determines which input files will be treated as CSS.  Defaults to `/\.css$/`.
- `plugins` - An array of PostCSS plugins.
