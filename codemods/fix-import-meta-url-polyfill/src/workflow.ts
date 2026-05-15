import dedent from "dedent";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";

import type { SgNode } from "codemod:ast-grep";
import type { Codemod, Edit } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

const IMPORT_META_DEFINE = `'import.meta.url': '__vite_import_meta_url__'`;

const INTRO_SNIPPET =
	"intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src'";

type ObjectNodeInfo = {
	valueNode: SgNode<JS>;
	openBrace: number;
	closeBrace: number;
};

type TextInsertion = {
	index: number;
	text: string;
};

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPairWithKey(
	node: SgNode<JS>,
	keyName: string,
	keyKind: "property_identifier" | "string",
	valuePredicate: (valueNode: SgNode<JS>) => boolean,
): boolean {
	return node
		.findAll({
			rule: { kind: "pair" },
		})
		.some((pairNode) => {
			const keyNode = pairNode.field("key");
			const valueNode = pairNode.field("value");

			if (!keyNode || !valueNode) return false;
			if (keyNode.kind() !== keyKind) return false;

			const keyMatches =
				keyKind === "string"
					? keyNode.findAll({
						rule: {
							kind: "string_fragment",
							regex: `^${escapeRegExp(keyName)}$`,
						},
					}).length > 0
					: keyNode.text() === keyName;

			if (!keyMatches) return false;

			return valuePredicate(valueNode);
		});
}

function hasImportMetaPolyfill(node: SgNode<JS>): boolean {
	return hasPairWithKey(node, "import.meta.url", "string", (valueNode) => {
		return (
			valueNode.kind() === "string" &&
			valueNode.findAll({
				rule: {
					kind: "string_fragment",
					regex: "^__vite_import_meta_url__$",
				},
			}).length > 0
		);
	});
}

function hasIntroPolyfill(node: SgNode<JS>): boolean {
	return hasPairWithKey(node, "intro", "property_identifier", (valueNode) => {
		return (
			valueNode.kind() === "string" &&
			valueNode.findAll({
				rule: {
					kind: "string_fragment",
					regex: "__vite_import_meta_url__",
				},
			}).length > 0
		);
	});
}

function hasUmdOrIifeFormat(node: SgNode<JS>): boolean {
	return hasPairWithKey(node, "formats", "property_identifier", (valueNode) => {
		return (
			valueNode.kind() === "array" &&
			valueNode.findAll({
				rule: {
					kind: "string_fragment",
					regex: "^(umd|iife)$",
				},
			}).length > 0
		);
	});
}

function hasLibraryFormats(node: SgNode<JS>): boolean {
	return hasPairWithKey(node, "formats", "property_identifier", (valueNode) => {
		return valueNode.kind() === "array";
	});
}

function findMatchingBraceIndex(node: SgNode<JS>): number {
	return node.range().end.index - 1;
}

function findObjectProperty(
	node: SgNode<JS>,
	propertyName: string,
): ObjectNodeInfo | null {
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

function buildObjectInsertion(
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
	const lastPropClose = innerRegion.lastIndexOf("},");

	let insertionIndex = closeBrace;

	if (lastPropClose !== -1) {
		const tentative = openBrace + 1 + lastPropClose + 2;
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
	const injection = (needsLeadingLineBreak ? lineBreak : "") + indentedLines.join(lineBreak) + lineBreak;

	return {
		index: insertionIndex,
		text: injection,
	};
}

function applyInsertions(source: string, insertions: TextInsertion[]): string {
	let nextSource = source;
	for (const insertion of insertions.sort((left, right) => right.index - left.index)) {
		nextSource = nextSource.slice(0, insertion.index) + insertion.text + nextSource.slice(insertion.index);
	}
	return nextSource;
}

function buildRolldownIntroInsertion(
	source: string,
	indent: string,
	lineBreak: string,
	configNode: SgNode<JS>,
): TextInsertion | null {
	if (source.includes("rolldownOptions")) return null;

	const buildObject = findObjectProperty(configNode, "build");
	if (!buildObject) return null;

	const content = dedent`
		rolldownOptions: {
		output: {
			${INTRO_SNIPPET},
		},
		},
	`;

	return buildObjectInsertion(
		source,
		buildObject.valueNode,
		content,
		indent,
		lineBreak,
		configNode.range().start.index,
	);
}

function buildDefinePolyfillInsertion(
	source: string,
	indent: string,
	lineBreak: string,
	configNode: SgNode<JS>,
): TextInsertion | null {
	const defineBlock = findObjectProperty(configNode, "define");

	if (defineBlock) {
		return buildObjectInsertion(source, defineBlock.valueNode, `${IMPORT_META_DEFINE},`, indent, lineBreak, configNode.range().start.index);
	}

	const content = dedent`
		define: {
		${IMPORT_META_DEFINE},
		},
	`;

	return buildObjectInsertion(source, configNode, content, indent, lineBreak, configNode.range().start.index);
}

function normalizeObjectIndent(text: string, indent: string, lineBreak: string) {
	const lines = text.split(lineBreak);
	let depth = 0;
	const out: string[] = [];

	for (const raw of lines) {
		const line = raw.trim();

		if (line.length === 0) {
			out.push("");
			continue;
		}

		const leadingCloses = (line.match(/^\}+/) || [""])[0].length;
		const prefixDepth = Math.max(0, depth - leadingCloses);

		const prefix = indent.repeat(prefixDepth);
		out.push(prefix + line);

		const opens = (line.match(/{/g) || []).length;
		const closes = (line.match(/}/g) || []).length;
		depth = Math.max(0, depth + opens - closes);
	}

	return out.join(lineBreak);
}

/**
 * @link https://vite.dev/guide/migration#import-meta-url-in-umd-iife
 */
const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;

	const edits: Edit[] = [];
	let shouldWarnNonUmd = false;

	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const viteConfigs = getViteConfig(root);

	if (!viteConfigs?.length) return null;

	for (const configNode of viteConfigs) {
		const originalText = configNode.text();

		if (!hasUmdOrIifeFormat(configNode)) {
			if (hasLibraryFormats(configNode)) shouldWarnNonUmd = true;
			continue;
		}

		if (hasImportMetaPolyfill(configNode) && hasIntroPolyfill(configNode)) {
			continue;
		}

		const insertions: TextInsertion[] = [];

		if (!hasIntroPolyfill(configNode)) {
			const introInsertion = buildRolldownIntroInsertion(originalText, indent, lineBreak, configNode);
			if (introInsertion) {
				insertions.push(introInsertion);
			}
		}

		if (!hasImportMetaPolyfill(configNode)) {
			const defineInsertion = buildDefinePolyfillInsertion(originalText, indent, lineBreak, configNode);
			if (defineInsertion) {
				insertions.push(defineInsertion);
			}
		}

		let updatedText = originalText;
		if (insertions.length > 0) {
			updatedText = applyInsertions(originalText, insertions);
		}

		if (updatedText !== originalText) {
			const firstBrace = updatedText.indexOf("{");
			let detectedIndent = indent;

			if (firstBrace !== -1) {
				const inner = updatedText.slice(firstBrace + 1);
				const innerLines = inner.split(lineBreak);
				for (const line of innerLines) {
					if (line.trim().length === 0) continue;
					const match = line.match(/^\s+/);
					if (match) {
						detectedIndent = match[0];
					}
					break;
				}
			}

			updatedText = normalizeObjectIndent(updatedText, detectedIndent, lineBreak);
			updatedText = updatedText.replace(/^\s*\{/, "{");
			edits.push(configNode.replace(updatedText));
		}
	}

	if (shouldWarnNonUmd) {
		console.warn(
			[
				"Warning: import.meta.url polyfills only apply to UMD/IIFE builds.",
				"Detected library formats without UMD/IIFE output.",
				"Please verify your Vite build configuration.",
			].join(" "),
		);
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
