# Migrate esbuild minify options

Migrate legacy `esbuild` minification flags to Rolldown's `build.rolldownOptions.output.minify` configuration.

See the Vite migration guide for more details: [JavaScript minification by Oxc](https://vite.dev/guide/migration#javascript-minification-by-oxc).

This codemod updates the Vite config by moving:

- `esbuild.drop` -> `build.rolldownOptions.output.minify.compress.dropConsole` and `dropDebugger`
- `esbuild.minifyIdentifiers` -> `build.rolldownOptions.output.minify.identifiers`
- `esbuild.minifySyntax` -> `build.rolldownOptions.output.minify.syntax`
- `esbuild.minifyWhitespace` -> `build.rolldownOptions.output.minify.whitespace`

It keeps unrelated `esbuild` options intact and skips configs that use unsupported property mangling.

## Purpose

Use this codemod when migrating a Vite config away from legacy `esbuild` minification options.

The codemod is intended to:

- move supported minify flags into Rolldown's minify options
- preserve existing unrelated `esbuild` properties
- avoid duplicating work when `build.rolldownOptions.output.minify` already exists
- skip unsafe property-mangling cases with a clear warning

## Usage

Example transformation:

```diff
export default defineConfig({
  build: {
-    esbuild: {
-      drop: ['console', 'debugger'],
-      minifyIdentifiers: true,
-      minifySyntax: true,
-      minifyWhitespace: true,
-    },
+    rolldownOptions: {
+      output: {
+        minify: {
+          compress: {
+            dropConsole: true,
+            dropDebugger: true,
+          },
+          identifiers: true,
+          syntax: true,
+          whitespace: true,
+        },
+      },
+    },
  },
})

If the config uses unsupported property mangling, the codemod emits a warning and leaves the file unchanged.
