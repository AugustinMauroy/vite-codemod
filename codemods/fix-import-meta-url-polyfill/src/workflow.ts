import dedent  from "dedent";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";

import type { SgNode } from "codemod:ast-grep";
import type { Codemod, Edit } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

const IMPORT_META_DEFINE = `'import.meta.url': '__vite_import_meta_url__'`;

const INTRO_SNIPPET =
	"intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src'";

function hasImportMetaPolyfill(configText: string): boolean {
	return configText.includes(IMPORT_META_DEFINE);
}

function hasIntroPolyfill(configText: string): boolean {
	return configText.includes("__vite_import_meta_url__");
}

function hasUmdOrIifeFormat(configText: string): boolean {
	return /formats\s*:\s*\[[^\]]*['"](?:umd|iife)['"][^\]]*\]/s.test(configText);
}

function hasLibraryFormats(configText: string): boolean {
	return /formats\s*:\s*\[[^\]]*\]/s.test(configText);
}

/**
 * Safer brace matching.
 * Handles:
 * - strings
 * - template literals
 * - line comments
 * - block comments
 */
function findMatchingBraceIndex(
text: string,
openBraceIndex: number,
): number {
	let depth = 0;

	let inSingleQuote = false;
	let inDoubleQuote = false;
	let inTemplateLiteral = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaped = false;

	for (let i = openBraceIndex; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (inLineComment) {
			if (ch === "\n") {
				inLineComment = false;
			}
			continue;
		}

		if (inBlockComment) {
			if (ch === "*" && next === "/") {
				inBlockComment = false;
				i++;
			}
			continue;
		}

		if (ch === "\\") {
			escaped = true;
			continue;
		}

		if (!inDoubleQuote && !inTemplateLiteral && ch === "'") {
			inSingleQuote = !inSingleQuote;
			continue;
		}

		if (!inSingleQuote && !inTemplateLiteral && ch === '"') {
			inDoubleQuote = !inDoubleQuote;
			continue;
		}

		if (!inSingleQuote && !inDoubleQuote && ch === "`") {
			inTemplateLiteral = !inTemplateLiteral;
			continue;
		}

		if (inSingleQuote || inDoubleQuote || inTemplateLiteral) {
			continue;
		}

		if (ch === "/" && next === "/") {
			inLineComment = true;
			i++;
			continue;
		}

		if (ch === "/" && next === "*") {
			inBlockComment = true;
			i++;
			continue;
		}

		if (ch === "{") {
			depth++;
			continue;
		}

		if (ch === "}") {
			depth--;

			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
}

function findObjectProperty(
source: string,
propertyName: string,
): { start: number; openBrace: number; closeBrace: number } | null {
	const regex = new RegExp(`\\b${propertyName}\\s*:\\s*\\{`);

	const match = regex.exec(source);

	// If we can't find the property at all, return null.
	if (!match) return null;

	const openBrace = source.indexOf("{", match.index);

	// If we can't find an opening brace after the property name, this is likely a malformed config.
	if (openBrace === -1) return null;

	const closeBrace = findMatchingBraceIndex(source, openBrace);

	// If we can't find a matching closing brace, this is likely a malformed config.
	if (closeBrace === -1) return null;

	return {
		start: match.index,
		openBrace,
		closeBrace,
	};
}

function insertIntoObject(
source: string,
objectName: string,
content: string,
indent: string,
lineBreak: string,
): string {
	const objectInfo = findObjectProperty(source, objectName);

	if (!objectInfo) return source;

	// Dedent the content to remove leading whitespace
	const dedented = dedent(content);

	const lines = dedented.split("\n");

	// Determine the base indentation for properties inside the object by
	// looking for the first non-empty line after the opening brace.
	const objectLineStart = source.lastIndexOf(lineBreak, objectInfo.openBrace) + 1;
	const objectLine = source.slice(objectLineStart, objectInfo.openBrace);
	const objectLineLeading = (objectLine.match(/^\s*/)?.[0]) || "";

	// Find first non-empty line inside the object to detect current property indent
	let propertyIndent = objectLineLeading + indent; // default fallback
	const innerRegion = source.slice(objectInfo.openBrace + 1, objectInfo.closeBrace);
	const innerLines = innerRegion.split(lineBreak);
	for (const l of innerLines) {
		if (l.trim().length === 0) continue;
		const m = l.match(/^\s*/);
		if (m) {
			propertyIndent = m[0];
			break;
		}
	}

	// Use the project's detected indent as the base for inserted properties.
	const innerIndent = indent + indent;

	// Add proper indentation to each line using the computed inner indent
	// Insert immediately before the object's closing brace '}' so we don't
	// disturb the existing close-brace line indentation.
	// Prefer inserting after the last property's trailing comma/newline so
	// the injected block appears as a sibling property aligned with others.
	const innerRegion2 = source.slice(objectInfo.openBrace + 1, objectInfo.closeBrace);
	const lastPropClose = innerRegion2.lastIndexOf("},");

	let insertionIndex = objectInfo.closeBrace;

	if (lastPropClose !== -1) {
		// position after the '},'
		const tentative = objectInfo.openBrace + 1 + lastPropClose + 2;
		// find the next newline after that comma
		const nl = source.indexOf(lineBreak, tentative - 1);
		if (nl !== -1) {
			insertionIndex = nl + 1;
		} else {
			insertionIndex = tentative;
		}
	}

	const needsLeadingLineBreak = !source.slice(0, insertionIndex).endsWith(lineBreak);

	// Compute indentation per-line based on nesting depth so nested blocks
	// receive the correct extra indent.
	let depth = 0;
	const indentedLines: string[] = [];

	for (const rawLine of lines) {
		const line = rawLine.trimStart();

		// If this line is a closing line, reduce depth first.
		if (line.startsWith("}")) {
			const closeCount = (line.match(/}/g) || []).length;
			depth = Math.max(0, depth - closeCount);
		}

		const prefix = innerIndent + indent.repeat(depth);

		const indented = line.length > 0 ? prefix + line : "";

		indentedLines.push(indented);

		// After printing, update depth for any opening braces on this line.
		const openCount = (line.match(/{/g) || []).length;
		const closeCount = (line.match(/}/g) || []).length;

		// If the line wasn't a leading-closing line, adjust depth normally.
		if (!line.startsWith("}")) {
			depth += openCount - closeCount;
		} else {
			// Already subtracted closeCount above; add any opens.
			depth += openCount;
		}
	}

	const injection = (needsLeadingLineBreak ? lineBreak : "") + indentedLines.join(lineBreak) + lineBreak;

	// Normalize the leading whitespace of the tail (the closing-brace line)
	// to the project's `indent` so the closing brace aligns with sibling props.
	const tail = source.slice(insertionIndex);
	const normalizedTail = tail.replace(/^[ \t]*/, indent);

	return source.slice(0, insertionIndex) + injection + normalizedTail;
}

function addRolldownIntro(
source: string,
indent: string,
lineBreak: string,
): string {
	if (source.includes("rolldownOptions")) return source;

	const content = dedent`
		rolldownOptions: {
		output: {
			${INTRO_SNIPPET},
		},
		},
	`;

	return insertIntoObject(source, "build", content, indent, lineBreak);
}

function addDefinePolyfill(
	source: string,
	indent: string,
	lineBreak: string
): string {
	// First check if there's already a define block
	const defineBlock = findObjectProperty(source, "define");

	if (defineBlock) {
		return (
		source.slice(0, defineBlock.closeBrace) +
		`${lineBreak}${indent}${IMPORT_META_DEFINE},` +
		source.slice(defineBlock.closeBrace)
		);
	}

	// Look for the root config object
	let configMatch = /defineConfig\s*\(\s*\{/.exec(source);
	let rootOpenBrace = -1;

	if (configMatch) {
		rootOpenBrace = source.indexOf("{", configMatch.index);
	} else {
		const firstBrace = source.indexOf("{");
		if (firstBrace !== -1) {
		rootOpenBrace = firstBrace;
		}
	}

	if (rootOpenBrace === -1) {
		return source;
	}

	const closeBrace = findMatchingBraceIndex(source, rootOpenBrace);

	if (closeBrace === -1) {
		return source;
	}

	const hasTrailingNewline = source
		.slice(0, closeBrace)
		.endsWith(lineBreak);

	const content = dedent`
		define: {
		${IMPORT_META_DEFINE},
		},
	`;

	const lines = content.split("\n");

	const injection =
		lines
		.map((line) => {
			const indented = line.length > 0 ? indent + line : "";
			return indented;
		})
		.join(lineBreak) + lineBreak;

	return (
		source.slice(0, closeBrace) +
		(hasTrailingNewline ? "" : lineBreak) +
		injection +
		source.slice(closeBrace)
	)
}

function normalizeObjectIndent(text: string, indent: string, lineBreak: string) {
	const lines = text.split(lineBreak);
	let depth = 0;
	const out: string[] = [];

	for (let raw of lines) {
		const line = raw.trim();

		if (line.length === 0) {
			out.push("");
			continue;
		}

		// If the line has leading closing braces, the prefix depth should
		// be reduced accordingly so the closing brace lines align.
		const leadingCloses = (line.match(/^\}+/) || [""])[0].length;
		const prefixDepth = Math.max(0, depth - leadingCloses);

		const prefix = indent.repeat(prefixDepth);
		out.push(prefix + line);

		// Count opens and closes to update depth for next lines
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

		if (!hasUmdOrIifeFormat(originalText)) {
			if (hasLibraryFormats(originalText)) shouldWarnNonUmd = true;

			continue;
		}

		if (
			hasImportMetaPolyfill(originalText) &&
			hasIntroPolyfill(originalText)
		) {
			continue;
		}

		let updatedText = originalText;

		if (!hasIntroPolyfill(updatedText)) {
			updatedText = addRolldownIntro(updatedText, indent, lineBreak);
		}

		if (!hasImportMetaPolyfill(updatedText)) {
			updatedText = addDefinePolyfill(updatedText, indent, lineBreak);
		}

		if (updatedText !== originalText) {
			// Detect the indentation style used inside this config (tabs or spaces)
			// so we preserve the original style when normalizing.
			const firstBrace = updatedText.indexOf("{");
			let detectedIndent = indent;
			if (firstBrace !== -1) {
				const inner = updatedText.slice(firstBrace + 1);
				const innerLines = inner.split(lineBreak);
				for (const l of innerLines) {
					if (l.trim().length === 0) continue;
					const m = l.match(/^\s+/);
					if (m) {
						detectedIndent = m[0];
					}
					break;
				}
			}

			// Normalize the object indentation using the detected style.
			updatedText = normalizeObjectIndent(updatedText, detectedIndent, lineBreak);

			// Ensure the updated text starts with a brace (no leading spaces)
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
