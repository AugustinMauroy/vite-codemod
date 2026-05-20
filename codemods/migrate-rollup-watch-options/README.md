# migrate-rollup-watch-options

See the Vite migration guide for more details: [Removed build.rollupOptions.watch.chokidar option](https://vite.dev/guide/migration#removed-buildrollupoptionswatchchokidar-option).

Migrate watch settings inside Rollup/Vite configs by renaming legacy keys to Rolldown equivalents.

## What this codemod does

- Renames `rollupOptions` → `rolldownOptions` when present under `build`.
- Renames `watch.chokidar` → `watch.watcher` inside `rollupOptions`.
- Preserves configs that already use `rolldownOptions` / `watch.watcher`.
- Emits a warning header when mixed watch settings are detected (e.g. `chokidar` plus other watch keys) and leaves those files untouched for manual review.

This codemod uses AST detection to find `defineConfig` usages (including aliased imports) and applies conservative edits to avoid formatting regressions.

## Example transformation

```diff
 export default defineConfig({
	 build: {
-    rollupOptions: {
-      watch: { chokidar: { usePolling: true } },
-    },
		rolldownOptions: {
			watch: { watcher: { usePolling: true } },
		},
	 },
 });
```

## Limitations

- The codemod will not attempt automated migration when `watch` contains mixed settings (multiple top-level watch keys); it inserts a warning header instead.
- Formatting is kept conservative — in some complex cases manual adjustments may be required after the codemod runs.

## Usage

Run the codemod locally via the repository test runner or use it as part of an automation workflow. Always run on a feature branch and review diffs before merging.

## Testing

This codemod includes unit-style jssg tests under `tests/`. Run them with:

```bash
cd codemods/migrate-rollup-watch-options
npx codemod@1.9.3 jssg test -l typescript ./src/workflow.ts
```

## Migration guidance

- Run the codemod, review changes, then run your project's build and tests.
- For any file the codemod flagged with a warning, inspect and migrate manually.
