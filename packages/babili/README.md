# interlock-babili

## Description

Used to minify your bundles with [Babili](https://github.com/babel/babili).

## Usage

Make sure you have installed the plugin as a dependency in your project:

```
$ npm install --save-dev interlock-babili
```

Then, include it in your config:

```javascript
const babili = require("interlock-babili");

module.exports = {
  // ... config options
  plugins: [
    babili()
    // .. other plugins
  ]
};
```

## Options

At present, this plugin does not accept any options.
