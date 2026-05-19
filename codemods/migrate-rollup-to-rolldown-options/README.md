 # migrate-rollup-to-rolldown-options

Migrate projects to use Rolldown-native options by renaming legacy Rollup configuration keys.

## What this codemod does

- Renames `rollupOptions` to `rolldownOptions` inside `build` and `worker` config sections.
- Removes rollup-only top-level options that cannot be migrated automatically (e.g. `commonjsOptions`, `dynamicImportVarsOptions`).
- Emits a warning header when `resolve.alias` entries contain a `customResolver` method that cannot be automatically rewritten.

This codemod takes a conservative approach: it applies safe textual transformations for the common cases and uses AST detection to surface places that require manual intervention.

## Usage

Run the codemod with `npx codemod` or the included test runner:

```bash
npx codemod jssg run --language typescript ./codemods/migrate-rollup-to-rolldown-options/src/workflow.ts -- <file>

# run snapshot tests for the codemod
cd codemods/migrate-rollup-to-rolldown-options
npx codemod@1.9.3 jssg test -l typescript ./src/workflow.ts
```

## Examples

Input:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		commonjsOptions: { include: [/src/] },
		rollupOptions: { output: { format: "cjs" }, plugins: [] },
	},
});
```

Output:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	build: {
		rolldownOptions: { output: { format: "cjs" }, plugins: [] },
	},
});
```

## Tests

The codemod includes snapshot tests under `tests/`. They cover common scenarios:

- `preserves-rolldown-options`: leaves existing `rolldownOptions` alone.
- `renames-build-and-worker-rollup-options`: renames keys in both `build` and `worker`.
- `warns-on-custom-resolver`: prepends a warning when `resolve.alias` uses a `customResolver`.
- `converts-rollup-options-with-extras`: handles extra fields and removes `commonjsOptions`.
- `handles-multiple-defineconfigs`: applies transformations across multiple `defineConfig` calls.
- `skips-when-no-build`: leaves files without a `build` section unchanged.

## Limitations

- This codemod uses conservative string replacements for some edge cases to avoid risky AST edits. For complicated or heavily formatted configs, review changes manually.
- For more robust import/AST edits, consider using the `@jssg/utils` import helpers and object insertion utilities.

## Migration guidance

- Run the codemod on a feature branch and review diffs carefully.
- After changes, run your project's build and tests to ensure behavior is unchanged.

