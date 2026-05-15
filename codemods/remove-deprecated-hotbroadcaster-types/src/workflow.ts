import { removeImport } from "@jssg/utils/javascript/imports";
import type { Codemod, Edit } from "codemod:ast-grep";
import type TS from "codemod:ast-grep/langs/typescript";

const DEPRECATED = new Set([
	"HMRBroadcaster",
	"HMRBroadcasterClient",
	"HMRChannel",
	"ServerHMRChannel",
]);

const RUNTIME_WARNING =
	"// Expected warning:\n// Warning: Deprecated HotBroadcaster runtime-facing types require manual cleanup.";

const workflow: Codemod<TS> = async (rootNode) => {
	const root = rootNode.root();
	const edits: Edit[] = [];

	// 1) If any variable declarator has a type annotation referencing a deprecated
	// runtime type and also has an initializer, treat as runtime-facing and warn
	// without making replacements.
	for (const varDecl of root.findAll({ rule: { kind: "variable_declarator" } })) {
		const typeIds = varDecl.findAll({ rule: { kind: "type_identifier" } });
		const hasDeprecated = typeIds.some((t) => DEPRECATED.has(t.text()));
		if (!hasDeprecated) continue;

		// presence of initializer/value indicates runtime value
		const init = varDecl.field("value");
		if (init) {
			return root.commitEdits([root.replace(`${RUNTIME_WARNING}\n${root.text()}`)]);
		}
	}

	// 2) Replace deprecated type identifiers with `any` in type positions
	const typeIdNodes = root.findAll({ rule: { kind: "type_identifier" } });
	for (const t of typeIdNodes) {
		if (!DEPRECATED.has(t.text())) continue;
		edits.push(t.replace("any"));
	}

	// 3) Clean up import type specifiers from "vite"
	for (const imp of root.findAll({ rule: { kind: "import_statement" } })) {
		const src = imp.findAll({ rule: { kind: "string_fragment" } })[0];
		if (!src) continue;
		if (!src.text().includes("vite")) continue;

		const impText = imp.text();
		// only process `import type { ... } from "vite"` style imports
		if (!impText.startsWith("import type")) continue;

		// Try using the helper from @jssg/utils/javascript/imports.
		// The helper's exact signature may vary across versions, so cast to
		// any and accept a string result. If the helper produces a new import
		// string, use it; otherwise fall back to the local regex-based logic.
		const removeEdit = removeImport<TS>(root, {
			type: "named",
			specifiers: Array.from(DEPRECATED),
			from: "vite",
		});
		if (removeEdit != null) {
			edits.push(removeEdit);
			continue;
		}

		// next par is a fallback need to be removed
		// once https://github.com/codemod/codemod/issues/2215 is resolved

		const m = impText.match(/\{([\s\S]*?)\}/);
		if (!m) continue;
		const inside = m[1];
		const parts = inside
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		const remaining = parts.filter((p) => {
			// handle `A as B` or plain `A`
			const name = p.split(" as ")[0].trim();
			return !DEPRECATED.has(name);
		});

		if (remaining.length === 0) {
			edits.push(imp.replace(""));
		} else if (remaining.length !== parts.length) {
			const newBrace = `{ ${remaining.join(", ")} }`;
			const newText = impText.replace(/\{[\s\S]*?\}/, newBrace);
			edits.push(imp.replace(newText));
		}
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
