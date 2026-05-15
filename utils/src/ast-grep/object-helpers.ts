/**¨
 * @fileoverview not tested
 */
import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

export type ObjectNodeInfo = {
	valueNode: SgNode<JS>;
	openBrace: number;
	closeBrace: number;
};

export type TextInsertion = {
	// `index` is used by callers that apply insertions by position.
	index?: number;
	// `start`/`end` are provided by callers that expect TextEdit-like objects.
	start?: number;
	end?: number;
	text: string;
};

export function findMatchingBraceIndex(node: SgNode<JS>): number {
	return node.range().end.index - 1;
}

export function findObjectProperty(node: SgNode<JS>, propertyName: string): ObjectNodeInfo | null {
	const objectPair = node
		.findAll({
			rule: { kind: "pair" },
		})
		.find((candidate) => {
			const keyNode = candidate.field("key");
			const valueNode = candidate.field("value");

			return (
				keyNode?.kind() === "property_identifier" &&
				keyNode.text() === propertyName &&
				valueNode?.kind() === "object"
			);
		});

	if (!objectPair) return null;

	const valueNode = objectPair.field("value");
	if (!valueNode) return null;

	return {
		valueNode,
		openBrace: valueNode.range().start.index,
		closeBrace: findMatchingBraceIndex(valueNode),
	};
}

export function normalizeObjectIndent(text: string, indent: string, lineBreak: string) {
	const lines = text.split(lineBreak);
	let depth = 0;
	const out: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		const raw = lines[i];
		const rawTrimmed = raw.trim();
		const line = rawTrimmed.startsWith("}") ? rawTrimmed.replace(/,+$/g, "") : rawTrimmed;

		if (line.length === 0) {
			out.push("");
			continue;
		}

		const leadingCloses = (line.match(/^\}+/) || [""])[0].length;
		let prefixDepth = Math.max(0, depth - leadingCloses);
		if (line.startsWith("}")) {
			const remaining = lines.slice(i + 1);
			const nextTrimmed = remaining.find((l) => l.trim().length > 0)?.trim();
			if (nextTrimmed === "}") {
				if (prefixDepth > 1) prefixDepth = prefixDepth - 1;
			}
		}

		const prefix = indent.repeat(prefixDepth);
		out.push(prefix + line);

		const opens = (line.match(/\{/g) || []).length;
		const closes = (line.match(/\}/g) || []).length;
		depth = Math.max(0, depth + opens - closes);

		// If this closing brace is immediately followed by another closing brace,
		// reduce the depth one extra level so subsequent closings align as expected.
		if (line.startsWith("}")) {
			const remaining = lines.slice(i + 1);
			const nextTrimmed = remaining.find((l) => l.trim().length > 0)?.trim();
			if (nextTrimmed === "}") {
				depth = Math.max(0, depth - 1);
			}
		}
	}

	return out.join(lineBreak);
}

export function applyInsertions(source: string, insertions: TextInsertion[]): string {
	let nextSource = source;
	const indices = insertions.map((i) => i.index ?? 0).sort((a, b) => a - b);
	const isConsecutive =
		indices.length > 1 && indices.every((v, i) => (i === 0 ? true : v === indices[i - 1] + 1));

	if (isConsecutive) {
		// Apply in given order, interpreting indices against the current string
		for (const insertion of insertions) {
			const idx = insertion.index ?? 0;
			nextSource = nextSource.slice(0, idx) + insertion.text + nextSource.slice(idx);
		}
		return nextSource;
	}

	// Default: apply insertions from highest index to lowest so indices refer to original source
	for (const insertion of insertions.slice().sort((a, b) => (b.index ?? 0) - (a.index ?? 0))) {
		const idx = insertion.index ?? 0;
		nextSource = nextSource.slice(0, idx) + insertion.text + nextSource.slice(idx);
	}
	return nextSource;
}

export function findPairByKey(objectNode: SgNode<JS>, keyName: string): SgNode<JS> | null {
	const pairs = objectNode.findAll({ rule: { kind: "pair" } });

	for (const pair of pairs) {
		const key = pair.field("key");
		if (!key) continue;
		if (key.kind() !== "property_identifier") continue;
		if (key.text() !== keyName) continue;
		return pair;
	}

	return null;
}

export function removePairFromSource(
	source: string,
	pairNode: SgNode<JS>,
	baseOffset: number,
): string | null {
	const start = pairNode.range().start.index - baseOffset;
	let end = pairNode.range().end.index - baseOffset;
	if (start < 0 || end < 0) return null;

	// Include a trailing comma if present
	if (end < source.length && source[end] === ",") {
		end += 1;
	} else if (start - 1 >= 0 && source[start - 1] === ",") {
		// Or include a leading comma
		return source.slice(0, start - 1) + source.slice(end);
	}

	return source.slice(0, start) + source.slice(end);
}

import dedent from "dedent";

export function buildObjectInsertion(
	source: string,
	objectNode: SgNode<JS>,
	content: string,
	indent: string,
	lineBreak: string,
	baseOffset: number,
): TextInsertion | null {
	const openBrace = objectNode.range().start.index - baseOffset;
	const closeBrace = findMatchingBraceIndex(objectNode) - baseOffset;

	if (openBrace === -1 || closeBrace === -1) return null;

	const dedented = dedent(content);
	const lines = dedented.split("\n");
	const innerRegion = source.slice(openBrace + 1, closeBrace);
	const lastPropClose = innerRegion.lastIndexOf(",");

	let insertionIndex = closeBrace;

	if (lastPropClose !== -1) {
		const tentative = openBrace + 1 + lastPropClose + 1;
		const nl = source.indexOf(lineBreak, tentative - 1);
		insertionIndex = nl !== -1 ? nl + 1 : tentative;
	}

	const innerIndent = indent + indent;
	let depth = 0;
	const indentedLines: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trimStart();

		if (line.startsWith("}")) {
			const closeCount = (line.match(/}/g) || []).length;
			depth = Math.max(0, depth - closeCount);
		}

		const prefix = innerIndent + indent.repeat(depth);
		indentedLines.push(line.length > 0 ? prefix + line : "");

		const openCount = (line.match(/{/g) || []).length;
		const closeCount = (line.match(/}/g) || []).length;
		if (!line.startsWith("}")) {
			depth += openCount - closeCount;
		} else {
			depth += openCount;
		}
	}

	const needsLeadingLineBreak = !source.slice(0, insertionIndex).endsWith(lineBreak);
	const injection =
		(needsLeadingLineBreak ? lineBreak : "") + indentedLines.join(lineBreak) + lineBreak;

	return {
		start: insertionIndex,
		end: insertionIndex,
		text: injection,
	};
}
