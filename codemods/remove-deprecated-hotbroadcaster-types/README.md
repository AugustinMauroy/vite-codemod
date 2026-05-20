# Remove deprecated HotBroadcaster types

See the Vite migration guide for more details: [Advanced: deprecated HotBroadcaster types](https://v7.vite.dev/guide/migration#advanced).

This codemod replaces deprecated HotBroadcaster-related TypeScript type identifiers with a safer fallback and cleans up type-only imports from `vite`.

## What it does

- Replaces occurrences of the following type identifiers with `any` in TypeScript code: `HMRBroadcaster`, `HMRBroadcasterClient`, `HMRChannel`, `ServerHMRChannel`.
- Removes deprecated specifiers from `import type { ... } from "vite"` imports. If the import becomes empty it will be removed.
- If a deprecated type is used in a runtime-facing initializer (for example a variable declaration that includes an initializer), the codemod does not attempt an unsafe replacement and leaves the code unchanged (the codemod emits a warning).

## Why?

These types were removed/renamed in newer Vite releases and codebases may still reference them in type positions. Replacing them with `any` reduces friction for automated upgrades while avoiding unsafe edits where the type name is used at runtime.

## Examples

- Simple replacement

```diff
-import type { HMRChannel } from "vite";

-type Channels = HMRChannel[];
+type Channels = any[];
```

- Nested generics

The codemod will correctly replace nested uses like `Promise<Array<HMRChannel>>` and `Wrapper<Wrapper<HMRChannel>>`.

- Aliased imports

If the deprecated type is imported under an alias (for example `import type { HMRChannel as Channel } from "vite"`), the codemod conservatively preserves the import and local alias to avoid breaking code. See tests/preserve-aliased-import for an example.

## Caveats and notes

- The codemod targets TypeScript AST nodes; it intentionally avoids editing comment-only JSDoc types.
- When a deprecated type is used in a runtime initializer, the codemod deliberately leaves the code unchanged and emits a warning, because replacing a runtime-facing reference with `any` could be unsafe.

