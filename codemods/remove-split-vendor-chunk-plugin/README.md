# remove-split-vendor-chunk-plugin

Remove usages of Vite's `splitVendorChunkPlugin` helper from plugin arrays where it is safe to do so.

## What this codemod does

- Removes direct uses of `splitVendorChunkPlugin()` from `plugins` arrays in `defineConfig` calls.
- Removes the `splitVendorChunkPlugin` named import from `vite` when it is no longer referenced.
- If the configuration already defines `manualChunks` under `build.rollupOptions.output`, the codemod is a no-op (manual chunking is already configured).
- If the plugin appears in conditional or computed plugin logic (ternaries, `.filter(Boolean)`, etc.), the codemod will not attempt an automated removal and will prepend a warning header for manual review.

This codemod is conservative: it uses AST detection to find `defineConfig` usages (including aliased imports) and only performs safe removals to avoid changing developer intent.

## Example

```diff
 import { defineConfig, splitVendorChunkPlugin } from "vite";

 export default defineConfig({
-  plugins: [splitVendorChunkPlugin()],
-});
+ export default defineConfig({
+  plugins: [],
+});
```

## Real-world no-op

If your config already configures chunking via `manualChunks`, the codemod will preserve the config and not remove the plugin:

```js
export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) { return id.includes('node_modules') ? 'vendor' : undefined }
			}
		}
	}
})
```

## Limitations

- The codemod will not modify conditional or computed plugin expressions and instead emits a warning comment.
- It only removes literal `splitVendorChunkPlugin()` call sites; more complex usages require manual migration.

## Usage

Run tests for this codemod:

```bash
cd codemods/remove-split-vendor-chunk-plugin
npx codemod@1.9.3 jssg test -l typescript ./src/workflow.ts
```

## Migration guidance

- Run on a feature branch and review diffs.
- Inspect any files annotated with the expected warning and migrate manually.
