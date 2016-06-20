# interlock-browserify-transforms

Apply Browserify transforms to your source modules.

## Definitions

This plugin takes a single argument: an array of `definition`s.  These `definition`s can take the following forms:

- `string`: Assumed to be a transform in the form of a require-able module.
- `function`: A valid browserify transform.
- `object`: An object with some or all of the following options:
	- `transform`: _(required)_ A valid browserify transform.
	- `opts`: _(optional)_ Options to pass to the browserify transform.
	- `filter`: _(optional)_ A regular expression, used to filter source files on which the transform will operate.
	- `moduleType`: _(optional)_ The target Interlock module type (e.g. `css`).  This setting can be used for interoperability with Interlock plugins that expect it.
