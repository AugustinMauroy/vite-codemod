# Contributing to Vite codemods

Thank you for your interest in contributing to this project! We value contributions from the community and want to make the process as smooth as possible.

## Getting Started

> [!CAUTION]
> **Do NOT force-push to your PR branch** unless absolutely necessary. A force-push breaks the PR review and will cause significant delays to the review process. A clean branch history is not important for merging the PR: this repository uses squash-merge, so each PR is collapsed into a single commit using the PR's title.

### Prerequisites

Before you begin, ensure you have the current versions of the following installed:

- node (lts)
- npm

### Project Overview

Our codebase is organized as follows:

- `.github/`: Contains GitHub files like issue templates and workflows
- `codemods/`: Contains all the codemods

## Codemod Development

### Structure of a Codemod

Each codemod resides in its own directory under `codemods/` and should include:

| File | Purpose |
|------|---------|
| `README.md` | Description, purpose, and usage instructions |
| `package.json` | Package manifest |
| `src/workflow.ts` | Main entry point using the `jssg` codemod API |
| `codemod.yml` | Codemod manifest file |
| `workflow.yml` | Workflow definition file |
| `tests/` | Test suite using `jssg` testing utilities |
| `tsconfig.json` | TypeScript configuration |

> [!NOTE]
> The `workflow.ts` naming is conventional but can be changed as needed. Ensure to update the `workflow.yml` accordingly. We use `workflow` when there are one step codemods; for multi-step codemods, consider using `what-to-change.ts` or similar descriptive names.

#### Naming

For migrations that handle a from-to, please follow that pattern. For example `@nodejs/import-assertions-to-import-attributes` or `@<scope>/old-api-to-new-api` or `@<scope>/adopt-3rd-party-api` for non-deprecation facilitating adoptions. You can `@<scope>/vx-to-vy` if the migration is version-based.

#### Tests

Codemod leverages a `before` ("input") + `after` ("expected") snapshot comparison. Codemod supports 2 options:

* 👍 [**Single-file fixtures**](https://docs.codemod.com/jssg/testing#single-file-fixtures)
  ```
  tests/
    some-test-case-description/
      input.ts
      expected.ts
    another-test-case-description/
      input.ts
      expected.ts
  ```
* 👎 [Directory snapshot fixtures](https://docs.codemod.com/jssg/testing#directory-snapshot-fixtures)
  ```
  tests/
    input/
      some-test-case-description.ts
      another-test-case-description.ts
    expected
      some-test-case-description.ts
      another-test-case-description.ts
  ```

Use the _Single-file fixtures_ option.

### Example Files

**`src/workflow.ts` example:**
```ts
import type { Codemod, Edit } from "codemod:ast-grep";
import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

type ParentInfo = {
	parent: SgNode<TSX>;
	children: SgNode<TSX>[];
};

const workflow: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];

  // Function components nested inside another function component
  const innerFuncComponents = rootNode.findAll({
    rule: {
      kind: "function_declaration",
      has: {
        field: "name",
        kind: "identifier",
        regex: "^[A-Z]",
      },
      inside: {
        kind: "statement_block",
        inside: {
          kind: "function_declaration",
          has: {
            field: "name",
            kind: "identifier",
            regex: "^[A-Z]",
          },
        },
      },
    },
  });

  // `const Foo = () => { ... }` inside another component
  const innerArrowComponents = rootNode.findAll({
    rule: {
      kind: "lexical_declaration",
      has: {
        kind: "variable_declarator",
        has: {
          field: "name",
          kind: "identifier",
          regex: "^[A-Z]",
        },
      },
      inside: {
        kind: "statement_block",
        inside: {
          kind: "function_declaration",
          has: {
            field: "name",
            kind: "identifier",
            regex: "^[A-Z]",
          },
        },
      },
    },
  });

  if (innerFuncComponents.length === 0 && innerArrowComponents.length === 0) {
    return null;
  }

  const allInner = [...innerFuncComponents, ...innerArrowComponents];

  const parentMap = new Map<number, ParentInfo>();

  for (const inner of allInner) {
    const ancestors = inner.ancestors();
    const parentComponent = ancestors.find(
      (a) =>
        a.kind() === "function_declaration" &&
        a.field("name")?.matches({ rule: { regex: "^[A-Z]" } }),
    );
    if (!parentComponent) continue;

    const parentId = parentComponent.id();
    if (!parentMap.has(parentId)) {
      parentMap.set(parentId, { parent: parentComponent, children: [] });
    }

    parentMap.get(parentId)!.children.push(inner);
  }

  for (const { parent, children } of parentMap.values()) {
    const extractedParts: string[] = [];

    for (const child of children) {
      extractedParts.push(child.text());

      edits.push({
        startPos: child.range().start.index,
        endPos: child.range().end.index,
        insertedText: "",
      });
    }

    // Insert before the parent, or before `export function ...` if wrapped
    const parentParent = parent.parent();
    const insertTarget =
      parentParent && parentParent.kind() === "export_statement"
        ? parentParent
        : parent;

    const insertText = extractedParts.join("\n\n") + "\n\n";
    edits.push({
      startPos: insertTarget.range().start.index,
      endPos: insertTarget.range().start.index,
      insertedText: insertText,
    });
  }

	if (edits.length === 0) {
		return null;
	}

  return rootNode.commitEdits(edits);
};

export default workflow;
```

**`codemod.yml` example:**
```yaml
schema_version: "1.0"
name: "@<scope>/<codemod-name>"
version: 1.0.0
description: <Your codemod description>
author: <Your Name>
license: MIT
workflow: workflow.yaml
category: migration
repository: https://github.com/AugustinMauroy/vite-codemod

targets:
  languages:
    - javascript
    - typescript

keywords:
  - transformation
  - migration

registry:
  access: public
  visibility: public
```


**`workflow.yaml` example:**
```yaml
# yaml-language-server: $schema=https://raw.githubusercontent.com/codemod-com/codemod/refs/heads/main/schemas/workflow.json

version: "1"

nodes:
  - id: apply-transforms
    name: Apply AST Transformations
    type: automatic
    runtime:
      type: direct
    steps:
      - name: Run AST Transformations
        js-ast-grep:
          js_file: src/workflow.ts
          base_path: .
          include:
            - "**/*.cjs"
            - "**/*.js"
            - "**/*.jsx"
            - "**/*.mjs"
            - "**/*.cts"
            - "**/*.mts"
            - "**/*.ts"
            - "**/*.tsx"
          exclude:
            - "**/node_modules/**"
          language: typescript # use typescript parser for both .ts and .js files
```

**`readme.md` example:**
````md
# Migration from X to Y

## Overview

Describe the purpose of this codemod, what it does, and when it should be used.

## Supported Patterns

- A is supported
- B is supported
- C is supported
- ...

## Example

```diff
- // Before code example
+ // After code example
```

## Caveats

- Any known limitations or edge cases that users should be aware of when using this codemod.

```

## Useful Resources

- [Codemod CLI Reference](https://docs.codemod.com/cli/cli-reference)
- [Codemod Workflow Documentation](https://docs.codemod.com/cli/workflows)
- [Codemod Studio Documentation](https://docs.codemod.com/codemod-studio)
- [JS ast-grep (jssg) API reference](https://docs.codemod.com/jssg/reference)
- [JS ast-grep Testing Utilities](https://docs.codemod.com/jssg/testing)
- [JS ast-grep Semantic Analysis](https://docs.codemod.com/jssg/semantic-analysis)
- [ast-grep Documentation](https://ast-grep.github.io/)

> [!NOTE]
> For coding agent just add `.md` to link and you will get a markdown version of the documentation, which is easier to read for coding agents.

## Good Practices when Writing Codemods

They are serval thing to keep in mind when writing codemods:

## Warn when you cannot programmatically guarantee a safe transformation

If your codemod encounters a pattern that it cannot safely transform, it should emit a warning with a clear message about the issue and, if possible, guidance on how to manually address it. This helps users understand the limitations of the codemod and prevents unintended consequences.

```ts
if (/* some unsafe pattern or non migratable pattern */) {
	console.warn(
		"Warning: Detected an unsafe pattern that cannot be automatically migrated. Please review the code and apply the necessary changes manually.",
	);
}
```

> [!NOTE]
> Codemod display the exact file that emits the warning, so users can easily find and review the affected code.

## Write ast-based query instead of pattern-matching code


* Bad pattern-matching code example:
```
const match = node.find({
	rule: {
		pattern: "require($MODULE)",
	},
});
```
* Good ast-based query example:
```ts
const match = node.find({
	rule: {
		kind: "call_expression",
		has: {
			field: "callee",
			kind: "identifier",
			value: "require",
		},
	},
});
```

## Development Workflow

### Before Pushing a Commit

Run our comprehensive check suite:

```bash
node --run pre-commit
```

This will:
- Fix formatting and safe linting issues automatically
- Check types
- Run tests
Be sure to commit any changes resulting from these automated fixes.


### Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification for your commit messages. This helps with:

- Understanding the history of changes
- Semantic versioning

Format:
```
<type>(<scope>): <description>
```

- **`type`**: The type of change (e.g., `feat`, `fix`, `docs`, `chore`, etc.)
- **`scope`**: A short, description of the section of the codebase affected;
  - if introducing a migration handling
    - a non-deprecation, such as facilitating adoption of a node API from a 3rd party, `adopt`
  - if adjusting an existing migration, the migration's name (e.g. `tmpDir-to-tmpdir`)
- **`description`**: A concise summary of the change, citing relevant APIs (e.g. `jest-to-node-test-runner`)

Examples:
- ``fix(`tmpDir-to-tmpdir`): correct type checking in …``
- ``docs(`tmpDir-to-tmpdir`): correct usage example``
- `docs(CONTRIBUTING): improve good test examples`

## Pull Request Process

When submitting a pull request:

1. Ensure your changes are well-documented
2. Run all tests (`node --run pre-commit`)
3. Follow the project's coding standards
4. Use the [conventional commit](https://www.conventionalcommits.org/en/v1.0.0/) format in your PR title and description
5. Link to any related issues, using [GitHub keywords](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/using-keywords-in-issues-and-pull-requests) where applicable.

### Acceptance Criteria

For a pull request to be merged, it must:
- Receive approval from at least 2 reviewers with write access
- Receive no objections from reviewers with write access
- Pass all tests
- Be open for at least 48 hours to allow for review and discussion
  - except hotfixes and trivial corrections (like typos)

### Developer's Certificate of Origin 1.1

```
By contributing to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to
  submit it under the open source license indicated in the file; or
- (b) The contribution is based upon previous work that, to the best of my knowledge,
  is covered under an appropriate open source license and I have the right under that
  license to submit that work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am permitted to submit under a
  different license), as indicated in the file; or
- (c) The contribution was provided directly to me by some other person who certified
  (a), (b) or (c) and I have not modified it.
- (d) I understand and agree that this project and the contribution are public and that
  a record of the contribution (including all personal information I submit with it,
  including my sign-off) is maintained indefinitely and may be redistributed consistent
  with this project or the open source license(s) involved.
```
