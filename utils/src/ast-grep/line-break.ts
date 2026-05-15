/**¨
 * @fileoverview not tested
 */
import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

/**
 * Determines the most common line break sequence used in the given program node.
 * **Note**: That the line break of the file not the OS one !
 *
 * @param node The root node of the program to analyze for line breaks.
 * @returns The most common line break sequence found in the program ("\r\n", "\n", or "\r"). Defaults to "\n" if no line breaks are found.
 */
export function getLineBreak(node: SgNode<JS, "program">): string {
	const text = node.text();
	const crlfCount = (text.match(/\r\n/g) || []).length;
	const lfCount = (text.match(/(?<!\r)\n/g) || []).length;
	const crCount = (text.match(/\r(?!\n)/g) || []).length;

	if (crlfCount >= lfCount && crlfCount >= crCount) {
		return "\r\n";
	} else if (lfCount >= crCount) {
		return "\n";
	} else {
		return "\r";
	}
}
