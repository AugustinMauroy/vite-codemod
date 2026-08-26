# migrate-manual-chunks-config

See the Vite migration guide for more details: [Removed object form build.rollupOptions.output.manualChunks](https://vite.dev/guide/migration#removed-object-form-buildrollupoptionsoutputmanualchunks-and-deprecate-function-form-one).

Migrate the removed object-form of `build.rollupOptions.output.manualChunks` into the new `rolldownOptions.output.codeSplitting.groups` shape.

## What this codemod does

- Converts object-form `manualChunks: { name: [..], ... }` into `rolldownOptions.output.codeSplitting.groups` with the same group arrays.
- Renames `rollupOptions` to `rolldownOptions` as part of the migration.
- Emits an expected warning and leaves the file unchanged when `manualChunks` uses the function form (manual review required).
- Preserves files that already use `rolldownOptions.output.codeSplitting.groups`.

## Examples

Object form -> groups:

```diff
import { defineConfig } from "vite";

export default defineConfig({
	build: {
-    rollupOptions: {
-      output: {
-        manualChunks: {
-          vendor: ["react"],
-        },
-      },
-    },
+    rolldownOptions: {
+      output: {
+        codeSplitting: {
+          groups: {
+            vendor: ["react"],
+          },
+        },
+      },
+    },
	},
});
```

Function form (warning):

```diff
// Expected warning:
// Warning: Function-form manualChunks with side effects needs manual review.
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					// function body -> manual review
				},
			},
		},
	},
});
```

## Usage

```bash
cd codemods/migrate-manual-chunks-config
```
