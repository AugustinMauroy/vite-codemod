# Migrate CSS minify to Lightning CSS

Normalize Vite `build.cssMinify` usage by removing legacy `esbuild` fallbacks and preferring Lightning CSS defaults.

This codemod updates Vite configs to remove explicit `cssMinify: 'esbuild'` settings, allowing Vite to use `lightningcss` defaults. It preserves existing `cssMinify: 'lightningcss'` values and skips unsafe or dynamic patterns.

## Purpose

Use this codemod when migrating Vite projects away from `esbuild` CSS minification to `lightningcss`.

The codemod is intended to:

- remove `build.cssMinify: 'esbuild'` when it is a plain string literal
- preserve `build.cssMinify: 'lightningcss'`
- skip and warn for conditional, computed, or dynamic values
- be idempotent and keep diffs minimal

## Safety

- Prefers skipping with a clear warning over making risky changes
- Will not attempt to rewrite conditional expressions or identifiers
- Supports dry-run via the `DRY_RUN=1` environment variable

## Usage

Example transformation:

```diff
 export default defineConfig({
   build: {
-    cssMinify: 'esbuild',
   },
 })

 becomes

 export default defineConfig({
   build: {},
 })
```

If the `cssMinify` value is conditional or computed, the codemod emits a warning and skips the change.
