# Migrate esbuild to oxc options

Migrate Vite config options that still live under `esbuild` and now belong to `oxc` in the JavaScript transforms by Oxc migration.

See the Vite migration guide: [JavaScript transforms by Oxc](https://vite.dev/guide/migration#javascript-transforms-by-oxc).

## What this codemod changes

It moves safe transform-related options from `esbuild` to `oxc`:

- `esbuild.define` -> `oxc.define`
- `esbuild.include` -> `oxc.include`
- `esbuild.exclude` -> `oxc.exclude`
- `esbuild.jsxInject` -> `oxc.jsxInject`
- `esbuild.jsx: 'preserve'` -> `oxc.jsx: 'preserve'`
- `esbuild.jsx: 'automatic'` -> `oxc.jsx: { runtime: 'automatic' }`
- `esbuild.jsx: 'transform'` -> `oxc.jsx: { runtime: 'classic' }`
- `esbuild.jsxImportSource` -> `oxc.jsx.importSource`
- `esbuild.jsxFactory` -> `oxc.jsx.pragma`
- `esbuild.jsxFragment` -> `oxc.jsx.pragmaFrag`
- `esbuild.jsxDev` -> `oxc.jsx.development`
- `esbuild.jsxSideEffects` -> `oxc.jsx.pure`

It preserves minification settings such as:

- `esbuild.minify`
- `build.minify: 'esbuild'`

It leaves unsupported transform-related options in place and adds a TODO comment when manual review is needed:

- `esbuild.banner`
- `esbuild.footer`
- `esbuild.supported`
- `esbuild.tsconfigRaw`

## Example

Before:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	esbuild: {
		define: {
			__DEV__: "true",
		},
		jsx: "automatic",
		jsxImportSource: "react",
	},
});
```

After:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	oxc: {
		define: {
			__DEV__: "true",
		},
		jsx: {
			importSource: "react",
			runtime: "automatic",
		},
	},
});
```

## Notes

- The codemod is idempotent.
- It supports `defineConfig(...)`, direct object exports, `module.exports`, and common identifier indirections.
- It preserves unrelated `esbuild` options and removes the `esbuild` property when it becomes empty.
