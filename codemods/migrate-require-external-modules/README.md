# migrate-require-external-modules

Migrate projects to use `esmExternalRequirePlugin` for preserving `require()` imports when building ESM bundles.

## What this codemod does

- Adds `esmExternalRequirePlugin({ external: [...] })` to the `plugins` array inside a `defineConfig({ ... })` call when it is safe to do so.
- Adds `esmExternalRequirePlugin` to the named import from `vite` when the plugin is inserted.
- If an existing `esmExternalRequirePlugin(...)` call is already present, the codemod will not duplicate it.
- If an existing plugin call uses a non-array `external` value (dynamic or computed), the codemod will not attempt to normalize the value and will instead insert a warning comment at the top of the file.

## Usage

Run the codemod against a file or set of files using the project test/runner or `npx codemod`:

```bash
npx codemod jssg run -l typescript ./codemods/migrate-require-external-modules/src/workflow.ts -- <path/to/files>
```

Or run the snapshot tests locally from the codemod folder:

```bash
cd codemods/migrate-require-external-modules
npx codemod@1.9.3 jssg test -l typescript ./src/workflow.ts
```

## Examples

Input:

```ts
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [],
});
```

Output:

```ts
import { defineConfig, esmExternalRequirePlugin } from "vite";

export default defineConfig({
	plugins: [
		esmExternalRequirePlugin({
			external: ["react", "vue", /^node:/],
		}),
	],
});
```

## Notes and limitations

- The codemod inserts a default `external` list (`["react", "vue", /^node:/]`) as a sensible starting point. You should review and adjust this list for your project.
- When the codemod encounters a dynamic or non-array `external` value inside an existing `esmExternalRequirePlugin` call, it will add the following warning header to the file instead of trying to automatically normalize complex expressions:

```ts
// Expected warning:
// Warning: Dynamic external module lists cannot be normalized automatically.
```

- Import edits are currently implemented conservatively: the codemod will only modify the `vite` import to add `esmExternalRequirePlugin` when the plugin was actually inserted into `plugins`.
- Import manipulation by string replacement can be fragile in edge cases (multiple `vite` imports, unusual formatting). For more robust handling we may later switch to AST-aware import utilities (`@jssg/utils`'s `getAllImports` / import helpers).

## Tests

Snapshot tests are under `tests/` in this codemod folder. They cover:

- Adding the plugin when `plugins` is an array.
- Preserving an already-inserted plugin.
- Skipping files with no `plugins` property or when `plugins` is not an array.
- Emitting a warning when `external` is dynamic.

## Migration guidance

- Run this codemod on a branch and review every change before merging.
- After insertion, verify your build and run your test suite to ensure `require()`-related behavior is preserved.

## Related

- See discussion: https://github.com/codemod/codemod/issues/2070 (import handling edge cases)
