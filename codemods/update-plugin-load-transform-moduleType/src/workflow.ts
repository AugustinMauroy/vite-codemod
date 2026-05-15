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
	const indent = getIdentStyle(root) || "\t";

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

		// AST-driven detection: prefer inspecting node kinds rather than raw text.
		const valueKind = valueNode.kind();

		let isJs = false;
		let shouldWarn = false;

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
				shouldWarn = true;
			} else {
				shouldWarn = true;
			}
		} else {
			shouldWarn = true;
		}

		if (shouldWarn) {
			// signal a warning and stop scanning further pairs
			return root.commitEdits([root.replace(`${WARNING}${lineBreak}${src}`)]);
		}

		if (isJs) {
			const openBrace = obj.range().start.index;
			const closeBrace = obj.range().end.index - 1;
			const innerRegion = src.slice(openBrace + 1, closeBrace);
			const lastPropClose = innerRegion.lastIndexOf(",");

			let insertionIndex = closeBrace;
			if (lastPropClose !== -1) {
				const tentative = openBrace + 1 + lastPropClose + 1;
				const nl = src.indexOf(lineBreak, tentative - 1);
				insertionIndex = nl !== -1 ? nl + lineBreak.length : tentative;
			}

			// Determine whether we need a leading comma before the insertion.
			const beforeSlice = src.slice(openBrace + 1, insertionIndex).replace(/\s+$/g, "");
			const needsComma = beforeSlice.length > 0 && !beforeSlice.endsWith(",");

			// Indentation: reuse the `code` property's leading whitespace.
			const lineStart = src.lastIndexOf(lineBreak, pairStart) + 1;
			const leading = src.slice(lineStart, pairStart).match(/^(\s*)/);
			const leadingWs = leading?.[1] || indent;

			const needsLeadingLineBreak = !src.slice(0, insertionIndex).endsWith(lineBreak);
			const insertText =
				(needsComma ? "," : "") +
				(needsLeadingLineBreak ? lineBreak : "") +
				leadingWs +
				`moduleType: "js",` +
				lineBreak;

			const newSrc = src.slice(0, insertionIndex) + insertText + src.slice(insertionIndex);
			return root.commitEdits([root.replace(newSrc)]);
		}
	}

	return null;
};

export default workflow;
