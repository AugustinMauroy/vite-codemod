# update-plugin-load-transform-moduleType

See the Vite migration guide for more details: [Module Type Support and Auto Detection](https://vite.dev/guide/migration#module-type-support-and-auto-detection).

Add explicit `moduleType` for plugin `load`/`transform` outputs that are JavaScript.

## What this codemod does

- Scans plugin `load`/`transform` return objects for a `code` property.
- If the `code` value is clearly JavaScript (e.g. starts with `export`), inserts `moduleType: "js"` into the returned object.
- If the `code` value is ambiguous (non-string, uses runtime calls, or computed values), the codemod emits an expected warning and leaves the source unchanged.
- Preserves existing `moduleType` values.

The codemod is conservative to avoid misclassifying non-JS outputs.

## Examples

Before:

```js
export default {
	name: 'txt-loader',
	load(id) {
		return { code: `export default ${JSON.stringify(content)}` };
	}
}
```

After:

```js
export default {
	name: 'txt-loader',
	load(id) {
		return {
			code: `export default ${JSON.stringify(content)}`,
			moduleType: 'js',
		};
	}
}
```

## Tests

This codemod includes tests for aliased `defineConfig` usage and real-world preservation of existing `moduleType`.

Run tests:

```bash
cd codemods/update-plugin-load-transform-moduleType
```

## Limitations

- Only inserts `moduleType` when the `code` appears to be JS by simple AST checks.
- Emits a warning (prepended comment) when the output can't be analyzed safely.

