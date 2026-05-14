import type { SgNode } from 'codemod:ast-grep';
import type JS from "codemod:ast-grep/langs/javascript";

export function getIdentStyle(node: SgNode<JS, "program">): string {
	const text = node.text();
	if (text.includes("\t")) return '\t';

	const lines = text.split("\n");
	const indentCounts: Record<string, number> = {};
	for (const line of lines) {
		const match = line.match(/^( +)/);
		if (match) {
			const indent = match[1];
			indentCounts[indent] = (indentCounts[indent] || 0) + 1;
		}
	}

	let mostCommonIndent = "  ";
	let maxCount = 0;
	for (const indent in indentCounts) {
		if (indentCounts[indent] > maxCount) {
			maxCount = indentCounts[indent];
			mostCommonIndent = indent;
		}
	}

	return mostCommonIndent;
}
