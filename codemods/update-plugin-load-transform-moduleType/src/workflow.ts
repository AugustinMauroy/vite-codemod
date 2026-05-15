import type { Codemod } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { findPairByKey } from "@vitejs/codemod-utils/ast-grep/object-helpers";
import dedent from "dedent";

const WARNING = dedent`
	// Expected warning:
	// Warning: Non-JavaScript loader output needs a manual moduleType decision.
`;

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root();
	const src = root.text();

	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root);

	const pairs = root.findAll({ rule: { kind: "pair" } });

	for (const pair of pairs) {
		const key = pair.field("key");
		if (!key || key.kind() !== "property_identifier") continue;
		if (key.text() !== "code") continue;

		const obj = pair.parent();
		if (!obj || obj.kind() !== "object") continue;

		// ensure the containing object is part of a return statement
		let parent = obj.parent();
		let foundReturn = false;
		while (parent) {
			if (parent.kind() === "return_statement") {
				foundReturn = true;
				break;
			}
			parent = parent.parent ? parent.parent() : null;
		}
		if (!foundReturn) continue;

		const codePair = pair;
		const modulePair = findPairByKey(obj, "moduleType");
		if (modulePair) continue;

		const valueNode = codePair.field("value");
		if (!valueNode) continue;

		const pairStart = codePair.range().start.index;
		const pairEnd = codePair.range().end.index;

		// AST-driven detection: prefer inspecting node kinds rather than raw text.
		const valueKind = valueNode.kind();

		let isJs = false;

		if (valueKind === "string") {
			const frags = valueNode.findAll({ rule: { kind: "string_fragment" } });
			const text = frags.map((f) => f.text()).join("");
			if (text.trim().startsWith("export") || text.includes("export ")) isJs = true;
		} else if (valueKind === "template_string") {
			if (valueNode.text().includes("export")) isJs = true;
		} else if (valueKind === "call_expression") {
			const callee = valueNode.field("function");
			const calleeText = callee ? callee.text() : valueNode.text();
			if (calleeText.includes("JSON.stringify")) {
				return root.commitEdits([root.replace(`${WARNING}${lineBreak}${src}`)]);
			}
			return root.commitEdits([root.replace(`${WARNING}${lineBreak}${src}`)]);
		} else {
			return root.commitEdits([root.replace(`${WARNING}${lineBreak}${src}`)]);
		}

		if (isJs) {
			// Compute insertion point using AST: after the `code` pair's line break
			const codeLineEnd = src.indexOf(lineBreak, pairEnd);
			const insertPos = codeLineEnd !== -1 ? codeLineEnd + lineBreak.length : pairEnd;

			// Determine exact property indentation from the `code` line
			const lineStart = src.lastIndexOf(lineBreak, pairStart) + 1;
			const leading = src.slice(lineStart, pairStart).match(/^(\s*)/);
			const leadingWs = leading?.[1] || indent;

			const insertText = `${leadingWs}moduleType: "js",${lineBreak}`;
			const newSrc = src.slice(0, insertPos) + insertText + src.slice(insertPos);

			return root.commitEdits([root.replace(newSrc)]);
		}
	}

	return null;
};

export default workflow;
