 # migrate-rollup-to-rolldown-options

Migrate projects to use Rolldown-native options by renaming legacy Rollup configuration keys.

## What this codemod does

- Renames `rollupOptions` to `rolldownOptions` inside `build` and `worker` config sections.
- Removes rollup-only top-level options that cannot be migrated automatically (e.g. `commonjsOptions`, `dynamicImportVarsOptions`).
- Emits a warning header when `resolve.alias` entries contain a `customResolver` method that cannot be automatically rewritten.

This codemod takes a conservative approach: it applies safe textual transformations for the common cases and uses AST detection to surface places that require manual intervention.

## Usage

Example transformation:

```diff
 export default defineConfig({
 	build: {
-		commonjsOptions: { include: [/src/] },
-		rollupOptions: { output: { format: "cjs" }, plugins: [] },
+		rolldownOptions: { output: { format: "cjs" }, plugins: [] },
 	},
 });
```

## Limitations

- This codemod uses conservative string replacements for some edge cases to avoid risky AST edits. For complicated or heavily formatted configs, review changes manually.
- For more robust import/AST edits, consider using the `@jssg/utils` import helpers and object insertion utilities.

## Migration guidance

- Run the codemod on a feature branch and review diffs carefully.
- After changes, run your project's build and tests to ensure behavior is unchanged.

