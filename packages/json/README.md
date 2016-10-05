# interlock-json

## Description

With this plugin, you can require a `.json` file from your JavaScript.  Imported JSON will behave as a normal JS object.

## Usage

Make sure you have installed the plugin as a dependency in your project:

```
$ npm install --save-dev interlock-json
```

Then, include it in your config:

```javascript
const interlockJson = require("interlock-json");

module.exports = {
  // ... config options
  plugins: [
    interlockJson()
    // .. other plugins
  ]
};
```

## Options

- `filter` - A regular expression used to determine which files to import as JSON. _.(default: `/\.json$/`)_

## Example

**index.js:**

```javascript
const myData = require("./my-data.json");
console.log(myData.prop);
```

**my-data.json:**
```json
{
  "prop": "a string"
}
```
