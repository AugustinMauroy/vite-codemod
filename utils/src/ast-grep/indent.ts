/**¨
 * @fileoverview not tested
 */
import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

/**
 * Detects the indentation style used in a JavaScript program.
 *
 * @param node - The root node of the JavaScript program to analyze.
 * @returns A string representing the indentation style (e.g., '\t' for tabs, '  ' for two spaces, etc.). Defaults to two spaces if no indentation is detected.
 */
export function getIdentStyle(node: SgNode<JS, "program">): string {
	const text = node.text();
	const crlfCount = (text.match(/\r\n/g) || []).length;
	const lfCount = (text.match(/(?<!\r)\n/g) || []).length;
	const crCount = (text.match(/\r(?!\n)/g) || []).length;

	if (crlfCount >= lfCount && crlfCount >= crCount) {
		return "\t";
	} else if (lfCount >= crCount) {
		return "  ";
	} else {
		return "  ";
	}
}
