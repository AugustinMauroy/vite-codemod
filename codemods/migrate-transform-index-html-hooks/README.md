# migrate-transform-index-html-hooks

See the Vite migration guide for more details: [Removed deprecated features](https://v7.vite.dev/guide/migration#removed-deprecated-features).

Migrate plugin `transformIndexHtml` hook metadata from legacy `html-hooks` plugins to the newer `handler`/`order` shape.

## What this codemod does

- Finds `plugins` entries with `name: "html-hooks"` and a `transformIndexHtml` object.
- Renames `transformIndexHtml.enforce` → `transformIndexHtml.order`.
- Renames `transformIndexHtml.transform` → `transformIndexHtml.handler`.
- Preserves hooks that already use the new `order`/`handler` shape.
- If the `transformIndexHtml` value is computed or an identifier (non-object), the file is left unchanged and a warning header is added.

The codemod uses AST-aware detection (including aliased `defineConfig` imports) and conservative in-place key renames to avoid formatting regressions.

## Example transformation

```diff
 export default defineConfig({
	 plugins: [
		 {
			 name: "html-hooks",
			 transformIndexHtml: {
-        enforce: "pre",
-        transform(html) { return html.replace("<title>Vite</title>", "<title>App</title>"); }
				order: "pre",
				handler(html) { return html.replace("<title>Vite</title>", "<title>App</title>"); }
			 },
		 },
	 ],
 });
```

### Warning example (no automated migration)

When `transformIndexHtml` is provided as a computed value (variable or function reference), the codemod cannot safely rewrite property names and will add a warning such as:

```ts
// Expected warning:
// Warning: Unable to safely migrate computed transformIndexHtml hook metadata.
```

## Limitations

- Only renames literal object property keys; computed or referenced hook values are flagged for manual review.
- The codemod is conservative about formatting to minimize diffs; complex object shapes may need manual cleanup.

## Usage

Run the codemod tests or use the codemod runner locally:

```bash
cd codemods/migrate-transform-index-html-hooks
```

## Migration guidance

- Run on a feature branch and review diffs in code review.
- Manually inspect any files annotated with the expected warning and migrate their hook shapes.
