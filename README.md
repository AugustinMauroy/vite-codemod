
Community Vite codemods to help users adopt new features and handle breaking changes with ease.

Community contributions are welcome and appreciated! Check open issues for codemods to build, or open a new one if something’s missing. See the [contribution guide](./CONTRIBUTING.md) for details.

## Running codemods

> [!CAUTION]
> Codemods modify code! Run them only on Git-tracked files, and commit or stash changes first.

### From the registry

Recommended for the best UX. This downloads the package from the [Registry](https://app.codemod.com/registry).

```bash
npx codemod@latest <codemod-name>
```

For example:

```bash
npx codemod@latest vitejs-v7-to-v8
```

### From source

```bash
npx codemod workflow run -w /path/to/folder/containing/workflow.yaml
```

> [!NOTE]
> By default, codemods run in the current folder. Add `-t /target/path` to change it.

See the [Codemod docs](https://go.codemod.com/cli-docs) for all CLI commands and options.

## License

MIT

## Unofficial note

Theses codemods are not officially maintained by the Vite team. It's was designed to help the community to migrate to new versions of Vite. Use at your own risk.

If you want to know more about the official Vite codemods, check the [`vitejs/ecosystem`](https://github.com/vitejs/ecosystem/issues/11) issues.
