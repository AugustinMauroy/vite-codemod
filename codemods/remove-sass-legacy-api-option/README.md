# remove-sass-legacy-api-option

See the Vite migration guide for more details: [Removed Sass legacy API support](https://v7.vite.dev/guide/migration#removed-sass-legacy-api-support).

Remove legacy Sass API usage from `css.preprocessorOptions` in Vite configs.

## What this codemod does

- Removes `api: "legacy"` from `css.preprocessorOptions.sass` and `...scss` when it is a string literal.
- Emits a warning header and leaves the file untouched when the `api` value is dynamic or cannot be safely migrated.

The codemod detects `defineConfig` calls (including aliased imports) and performs conservative edits to preserve formatting.

## Example transformation

```diff
 export default defineConfig({
	 css: {
		 preprocessorOptions: {
-      sass: { api: "legacy" },
-      scss: { api: "legacy" },
			sass: {},
			scss: {},
		 },
	 },
 });
```

If the `api` value is not a string literal (for example, a variable or expression), the codemod will prepend a warning header and skip modifying the file:

```ts
// Expected warning:
// Warning: Unable to safely migrate dynamic Sass legacy API usage.
export default defineConfig({
	css: { preprocessorOptions: { sass: { api: legacyVar } } }
});
```

## Limitations

- Only removes literal `"legacy"` API values. Dynamic values are flagged for manual migration.
- Formatting changes are minimized, but review diffs to ensure no unintended formatting regressions.

## Usage

Run tests for this codemod with:

```bash
cd codemods/remove-sass-legacy-api-option
npx codemod@1.9.3 jssg test -l typescript ./src/workflow.ts
```

## Migration guidance

- Run the codemod on a feature branch and review diffs.
- For files that include the warning header, inspect and migrate the Sass API usage manually.
