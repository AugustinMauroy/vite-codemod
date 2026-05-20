# Migrate CSS minify to Lightning CSS

Normalize Vite `build.cssMinify` usage by removing legacy `esbuild` fallbacks and preferring Lightning CSS defaults.

This codemod updates Vite configs to remove explicit `cssMinify: 'esbuild'` settings, allowing Vite to use `lightningcss` defaults. It preserves existing `cssMinify: 'lightningcss'` values and skips unsafe or dynamic patterns.

## Purpose

Use this codemod when migrating Vite projects away from `esbuild` CSS minification to `lightningcss`.

The codemod is intended to:


## Safety


## Usage

Example transformation:

```diff
 export default defineConfig({
   build: {
   },
 })
```

If the `cssMinify` value is conditional or computed, the codemod emits a warning and skips the change.

See the Vite migration guide for more details: [CSS Minification by Lightning CSS](https://vite.dev/guide/migration#css-minification-by-lightning-css).
-    cssMinify: 'esbuild',
