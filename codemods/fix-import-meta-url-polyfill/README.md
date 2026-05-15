# Fix import.meta.url polyfill

Adds the `import.meta.url` polyfill required for Vite library builds that target `umd` or `iife` output formats.

See the Vite migration guide for more details: [import.meta.url in UMD / IIFE](https://vite.dev/guide/migration#import-meta-url-in-umd-iife).

This codemod updates the Vite config by adding:

- `build.rolldownOptions.output.intro`
- `define['import.meta.url']`

It leaves existing polyfill settings intact and only applies the migration when the config uses `umd` or `iife` formats.

## Purpose

Use this codemod when migrating a Vite library build that relies on `import.meta.url` in environments where `umd` or `iife` bundles need a runtime polyfill.

The codemod is intended to:

- add the polyfill only when needed
- avoid duplicating existing `intro` or `define` entries
- warn when library formats do not include `umd` or `iife`

## Usage

Run the codemod against your Vite project configuration files with the codemod runner used in this repository.

```diff
 export default defineConfig({
	 build: {
		 lib: {
			 entry: 'src/main.ts',
			 formats: ['iife'],
		 },
+		 rolldownOptions: {
+			 output: {
+				 intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src',
+			 },
+		 },
	 },
+ 	define: {
+		 'import.meta.url': '__vite_import_meta_url__',
+ }
 })
```
