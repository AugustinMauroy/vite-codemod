import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

/**
 * Rewrite rules:
 * - `import.meta.hot.accept('/src/x')` -> `import.meta.hot.accept('./x')`
 * - preserve already-relative ids (`./` or `../`)
 * - do NOT modify dynamic URL usages (e.g. `new URL(...).href`) — emit a file-level warning comment
 * - preserve files with no changes (idempotent)
 */

const WARNING_COMMENT = `// Expected warning:\n// Warning: Unable to safely rewrite dynamic import.meta.hot.accept URL usage.`;

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const edits: Edit[] = [];

	const callNodes = root.findAll({ rule: { kind: "call_expression" } });

	let sawAmbiguous = false;

	for (const call of callNodes) {
		const fn = call.field("function");
		if (!fn || fn.kind() !== "member_expression") continue;

		const prop = fn.field("property");
		if (!prop || prop.text() !== "accept") continue;

		const hotExpr = fn.field("object");
		if (!hotExpr || hotExpr.kind() !== "member_expression") continue;

		const hotProp = hotExpr.field("property");
		if (!hotProp || hotProp.text() !== "hot") continue;

		const importMetaExpr = hotExpr.field("object");
		if (!importMetaExpr) continue;
		// coarse check for import.meta
		if (!importMetaExpr.text().includes("import.meta")) continue;

		const argsNode = call.field("arguments");
		if (!argsNode) continue;

		// If arguments include dynamic URL construction or .href usages, mark ambiguous
		const newExprs = argsNode.findAll({ rule: { kind: "new_expression" } });
		if (newExprs.some((n) => n.text().includes("new URL"))) {
			sawAmbiguous = true;
			continue;
		}

		const memberHref = argsNode.findAll({ rule: { kind: "member_expression" } }).some((m) => {
			const p = m.field("property");
			return !!p && p.text() === "href";
		});
		if (memberHref) {
			sawAmbiguous = true;
			continue;
		}

		// Handle array argument: update string literal elements
		const arrayNodes = argsNode.findAll({ rule: { kind: "array" } });
		if (arrayNodes.length > 0) {
			const arr = arrayNodes[0];
			const stringNodes = arr.findAll({ rule: { kind: "string" } });
			for (const s of stringNodes) {
				const txt = s.text();
				if (txt.length < 2) continue;
				const quote = txt[0];
				const inner = txt.slice(1, -1);
				if (inner.startsWith("/src/")) {
					const newInner = `./${inner.replace(/^\/src\//, "")}`;
					const newText = quote + newInner + quote;
					edits.push(s.replace(newText));
				}
			}
			continue;
		}

		// Otherwise, look for first string literal argument and rewrite if rooted at /src/
		const stringArgs = argsNode.findAll({ rule: { kind: "string" } });
		if (stringArgs.length === 0) {
			// no literal first arg -> ambiguous
			sawAmbiguous = true;
			continue;
		}

		// choose the string node that appears earliest within argsNode
		stringArgs.sort((a, b) => a.range().start.index - b.range().start.index);
		const firstString = stringArgs[0];
		const stxt = firstString.text();
		if (stxt.length < 2) continue;
		const quote = stxt[0];
		const inner = stxt.slice(1, -1);
		if (inner.startsWith("/src/")) {
			const newInner = `./${inner.replace(/^\/src\//, "")}`;
			const newText = quote + newInner + quote;
			edits.push(firstString.replace(newText));
		}
	}

	if (!edits.length && !sawAmbiguous) return null;

	if (sawAmbiguous) {
		const programText = root.text();
		if (!programText.startsWith("// Expected warning:")) {
			edits.push(root.replace(`${WARNING_COMMENT}\n${programText}`));
		}
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
