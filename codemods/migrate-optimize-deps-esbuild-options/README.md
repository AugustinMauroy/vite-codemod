# Migrate optimizeDeps esbuild options

Migrate legacy `optimizeDeps.esbuildOptions` settings to Rolldown's `optimizeDeps.rolldownOptions` configuration.

See the Vite migration guide for more details: [JavaScript minification by Oxc](https://vite.dev/guide/migration#javascript-minification-by-oxc).

This codemod updates the Vite config by moving:

- `optimizeDeps.esbuildOptions.keepNames` -> `optimizeDeps.rolldownOptions.output.keepNames`
- `optimizeDeps.esbuildOptions.platform` -> `optimizeDeps.rolldownOptions.platform`
- `optimizeDeps.esbuildOptions.conditions` -> `optimizeDeps.rolldownOptions.resolve.conditionNames`
- `optimizeDeps.esbuildOptions.resolveExtensions` -> `optimizeDeps.rolldownOptions.resolve.extensions`
- `optimizeDeps.esbuildOptions.mainFields` -> `optimizeDeps.rolldownOptions.resolve.mainFields`
- `optimizeDeps.esbuildOptions.preserveSymlinks` -> `optimizeDeps.rolldownOptions.resolve.symlinks`
- `optimizeDeps.esbuildOptions.define` -> `optimizeDeps.rolldownOptions.transform.define`

It preserves existing `optimizeDeps` settings, warns when `optimizeDeps.plugins` is present, and only migrates the supported esbuild options listed above.

## Purpose

Use this codemod when migrating a Vite config away from legacy `optimizeDeps.esbuildOptions` settings.

The codemod is intended to:

- move supported optimizeDeps esbuild options into Rolldown's optimizeDeps options
- preserve unrelated `optimizeDeps` properties
- warn when `optimizeDeps.plugins` is present so the config can be reviewed manually
- leave the file unchanged when there is nothing to migrate

## Usage

Example transformation:

```diff
 export default defineConfig({
	 optimizeDeps: {
		 esbuildOptions: {
			 conditions: ['browser'],
			 define: {
				 __DEV__: 'true',
			 },
			 keepNames: true,
			 mainFields: ['browser', 'module'],
			 platform: 'browser',
		 },
	 },
 })

 becomes

 export default defineConfig({
	 optimizeDeps: {
		 rolldownOptions: {
			 output: {
				 keepNames: true,
			 },
			 platform: 'browser',
			 resolve: {
				 conditionNames: ['browser'],
				 mainFields: ['browser', 'module'],
			 },
			 transform: {
				 define: {
					 __DEV__: 'true',
				 },
			 },
		 },
	 },
 })
```

If `optimizeDeps.plugins` is present, the codemod keeps the migration result but adds a warning comment for manual review.
