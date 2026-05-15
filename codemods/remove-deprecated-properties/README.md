# Remove deprecated properties

This codemod removes reads of deprecated no-op properties that were deleted in Vite 7.

Behavior
- Replaces direct reads of these properties with `undefined` so surrounding expressions stay valid:
	- `ModuleRunnerOptions.root`
	- `ViteDevServer._importGlobMap`
	- `ResolvePluginOptions.isFromTsImporter`
	- `ResolvePluginOptions.getDepsOptimizer`
	- `ResolvePluginOptions.shouldExternalize`
	- `ResolvePluginOptions.ssrConfig`
	- `server.config.legacy?.proxySsrExternalModules`
- Emits a warning for reflective access patterns such as `Object.keys(server.config.legacy ?? {})`, because those cannot be migrated safely.

Examples

```diff
- export const root = options.root;
+ export const root = undefined;
```

```diff
- export const keys = Object.keys(server.config.legacy ?? {});
+ // Warning: Reflective access to deprecated properties cannot be migrated safely.
+ export const keys = Object.keys(server.config.legacy ?? {});
```

Note: this codemod only updates source files and does not modify Vite config files.
