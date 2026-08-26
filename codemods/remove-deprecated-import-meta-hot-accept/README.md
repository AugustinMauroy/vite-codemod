# Remove deprecated import.meta.hot accept url

See the Vite migration guide for more details: [Removed Deprecated Features](https://vite.dev/guide/migration#removed-deprecated-features).

This codemod updates deprecated runtime usages of `import.meta.hot.accept(url)` to safer module-id forms when possible.

Behavior
- Rewrites absolute `/src/...` string arguments to relative ids: `/src/dep.ts` -> `./dep.ts`.
- Rewrites string literals inside arrays similarly: `accept(['/src/a','/src/b'], cb)` -> `accept(['./a','./b'], cb)`.
- Does not modify dynamic URL usages (e.g. `new URL(...).href`) — in those cases the file is left unchanged and a top-of-file warning comment is inserted.
- Does not modify Vite config files or any files under `codemods/*/src/workflow.ts` that edit Vite configs.

Examples

```diff
if (import.meta.hot) {
-	import.meta.hot.accept('/src/dep.ts', (mod) => {
+	import.meta.hot.accept('./dep.ts', (mod) => {
		console.log(mod);
	});
}
```

When the call uses a dynamic URL the codemod will not attempt a rewrite and will add a small warning comment at the top of the file explaining why.

Notes
- This codemod focuses on source-level usages and intentionally does not touch Vite configuration files.

