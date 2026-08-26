# normalize-commonjs-interop-legacy-option

See the Vite migration guide for more details: [Consistent CommonJS Interop](https://vite.dev/guide/migration#consistent-commonjs-interop).

Normalize legacy CommonJS interop settings introduced by older Vite `legacy` configs.

## What this codemod does

- Removes `legacy.inconsistentCjsInterop` when it is the literal `true` (it is no longer needed).
- If the `legacy` object becomes empty after removal, the whole `legacy` pair is removed.
- Detects ambiguous default imports from `.cjs` files (e.g. `import x from './foo.cjs'`) and prepends a warning header because those imports require manual review.

This codemod uses AST-aware detection (including aliased `defineConfig` imports) and conservative edits to avoid formatting regressions.

## Example transformation

```diff
 export default defineConfig({
-  legacy: {
-    inconsistentCjsInterop: true,
-  },
-});
+});
```

### Warning example (no automated migration)

If the codemod detects a default import from a `.cjs` module, it will annotate the file with a warning instead of attempting a risky transformation:

```ts
// Expected warning:
// Warning: Ambiguous CJS default import semantics require manual review.
import value from "./legacy.cjs";
```

## Limitations

- Only removes `inconsistentCjsInterop` when the value is the literal `true`.
- Dynamic or computed `legacy` values are left untouched and flagged with a warning comment.
- Detection of ambiguous `.cjs` default imports is conservative — review warnings manually.

## Usage

Run the codemod tests or use the codemod runner locally:

```bash
cd codemods/normalize-commonjs-interop-legacy-option
```

To run the codemod against files, integrate with your repo tooling or run the codemod harness used by this project.

## Migration guidance

- Run the codemod on a feature branch and review diffs in code review.
- For any file annotated with a warning, inspect the `.cjs` imports or dynamic `legacy` usage and migrate manually.
- After migration, run your project's build and tests to confirm behavior.
