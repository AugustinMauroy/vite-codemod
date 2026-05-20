import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { applyTextEdits, findPairByKey } from "@vitejs/codemod-utils/ast-grep/codemod-helpers";

const WARNING = "// Warning: Unable to safely migrate dynamic Sass legacy API usage.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const viteConfigs = getViteConfig(root);
	if (!viteConfigs || !viteConfigs.length) return null;

	const edits: Array<{ start: number; end: number; text: string }> = [];
	let needsWarning = false;

	for (const configNode of viteConfigs) {
		const cssPair = findPairByKey(configNode, "css");
		if (!cssPair) continue;
		const cssVal = cssPair.field("value");
		if (!cssVal || cssVal.kind() !== "object") continue;

		const prePair = findPairByKey(cssVal, "preprocessorOptions");
		if (!prePair) continue;
		const preVal = prePair.field("value");
		if (!preVal || preVal.kind() !== "object") continue;

		for (const lang of ["sass", "scss"]) {
			const langPair = findPairByKey(preVal, lang);
			if (!langPair) continue;
			const langVal = langPair.field("value");
			if (!langVal || langVal.kind() !== "object") continue;

			const apiPair = findPairByKey(langVal, "api");
			if (!apiPair) continue;

			const apiVal = apiPair.field("value");
			if (!apiVal) continue;

			if (apiVal.kind() === "string") {
				const fragments = apiVal.findAll({ rule: { kind: "string_fragment" } });
				const text = fragments.map((f) => f.text()).join("");
				if (text === "legacy") {
					// remove the api pair
					let start = apiPair.range().start.index;
					let end = apiPair.range().end.index;
					// include trailing comma/newline if present
					if (source[end] === ",") {
						end += 1;
						if (source[end] === "\r" && source[end + 1] === "\n") end += 2;
						else if (source[end] === "\n") end += 1;
					} else {
						// include leading comma if present
						let i = start - 1;
						while (i >= 0 && /[ \t]/.test(source[i])) i--;
						if (i >= 0 && source[i] === ",") start = i;
					}

					edits.push({ start, end, text: "" });
				} else {
					needsWarning = true;
				}
			} else {
				needsWarning = true;
			}
		}
	}

	if (edits.length === 0 && !needsWarning) return null;

	let updated = edits.length > 0 ? applyTextEdits(source, edits) : source;
	// normalize empty objects left with whitespace into {}
	updated = updated.replace(/\{[ \t\r\n]*\}/g, "{}");
	if (needsWarning && !updated.startsWith("// Expected warning:")) {
		updated = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updated}`;
	}

	if (updated === source) return null;
	return updated;
};

export default workflow;
