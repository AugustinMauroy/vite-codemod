import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import {
	findObjectProperty,
	findPairByKey,
	normalizeObjectIndent,
	removePairFromSource,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";
import { buildRolldownSnippetFromSource } from "@vitejs/codemod-utils/ast-grep/rolldown-serializer";

const WARNING = "// Warning: esbuild plugin support under optimizeDeps requires manual review.";

// use getViteConfig to resolve defineConfig imports (handles aliased imports)

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const sourceText = root.text();
	const configs = (getViteConfig(root) ?? []).sort(
		(left, right) => right.range().start.index - left.range().start.index,
	);
	let updatedText = sourceText;
	let needsFileWarning = false;

	for (const config of configs) {
		const optimizeDepsProp = findObjectProperty(config, "optimizeDeps");
		if (!optimizeDepsProp) continue;

		const optimizeDepsObject = optimizeDepsProp.valueNode;
		if (findPairByKey(optimizeDepsObject, "plugins")) needsFileWarning = true;

		const esbuildPair = findPairByKey(optimizeDepsObject, "esbuildOptions");
		if (!esbuildPair) continue;

		const esbuildValue = esbuildPair.field("value");
		if (!esbuildValue || esbuildValue.kind() !== "object") continue;

		const rolldownSnippet = buildRolldownSnippetFromSource(esbuildValue, updatedText, lineBreak);
		if (!rolldownSnippet) continue;

		const optimizeDepsStart = optimizeDepsProp.openBrace;
		const optimizeDepsEnd = optimizeDepsProp.closeBrace + 1;
		const optimizeDepsText = updatedText.slice(optimizeDepsStart, optimizeDepsEnd);
		const removed = removePairFromSource(optimizeDepsText, esbuildPair, optimizeDepsStart);
		if (removed === null) continue;

		const inner = removed.slice(1, -1).trimEnd();
		const body =
			inner.length > 0 ? `${inner}${lineBreak}${lineBreak}${rolldownSnippet}` : rolldownSnippet;
		const replacement = normalizeObjectIndent(
			`{${lineBreak}${body}${lineBreak}}`,
			indent,
			lineBreak,
		);

		updatedText =
			updatedText.slice(0, optimizeDepsStart) + replacement + updatedText.slice(optimizeDepsEnd);
	}

	if (needsFileWarning && !updatedText.includes(WARNING)) {
		updatedText = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updatedText}`;
	}

	if (updatedText === sourceText) return null;
	return updatedText;
};

export default workflow;
