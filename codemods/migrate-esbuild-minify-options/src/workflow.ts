import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import {
	buildObjectInsertion,
	findObjectProperty,
	findPairByKey,
	normalizeObjectIndent,
	removePairFromSource,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";
import dedent from "dedent";

type TextEdit = {
	start: number;
	end: number;
	text: string;
};

type MinifyFlags = {
	dropConsole: boolean;
	dropDebugger: boolean;
	identifiers: boolean;
	syntax: boolean;
	whitespace: boolean;
};

function applyTextEdits(source: string, edits: TextEdit[]): string {
	let nextSource = source;

	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		nextSource = nextSource.slice(0, edit.start) + edit.text + nextSource.slice(edit.end);
	}

	return nextSource;
}

// `buildObjectInsertion` is provided by utils to keep insertion behavior consistent.

function buildRemovalEdit(
	source: string,
	pairNode: SgNode<JS>,
	baseOffset: number,
): TextEdit | null {
	const start = pairNode.range().start.index - baseOffset;
	let end = pairNode.range().end.index - baseOffset;

	if (start < 0 || end < 0) return null;

	if (end < source.length && source[end] === ",") {
		end += 1;
	} else if (start - 1 >= 0 && source[start - 1] === ",") {
		return {
			start: start - 1,
			end,
			text: "",
		};
	}

	return {
		start,
		end,
		text: "",
	};
}

function buildReplacementEdit(node: SgNode<JS>, baseOffset: number, text: string): TextEdit | null {
	const start = node.range().start.index - baseOffset;
	const end = node.range().end.index - baseOffset;

	if (start < 0 || end < 0) return null;

	return { start, end, text };
}

function hasUnsupportedMangleOptions(esbuildNode: SgNode<JS>): boolean {
	return ["mangleProps", "reserveProps", "mangleQuoted", "mangleCache"].some(
		(name) => findPairByKey(esbuildNode, name) !== null,
	);
}

function getMinifyFlags(esbuildNode: SgNode<JS>): MinifyFlags | null {
	const flags: MinifyFlags = {
		dropConsole: false,
		dropDebugger: false,
		identifiers: false,
		syntax: false,
		whitespace: false,
	};

	const dropPair = findPairByKey(esbuildNode, "drop");
	if (dropPair) {
		const dropValue = dropPair.field("value");
		if (!dropValue || dropValue.kind() !== "array") return null;

		for (const child of dropValue.children()) {
			if (!child.isNamed()) continue;
			if (child.kind() !== "string") continue;

			const fragments = child.findAll({ rule: { kind: "string_fragment" } });
			const value = fragments.map((fragment) => fragment.text()).join("");

			if (value === "console") {
				flags.dropConsole = true;
			} else if (value === "debugger") {
				flags.dropDebugger = true;
			}
		}
	}

	const identifiersPair = findPairByKey(esbuildNode, "minifyIdentifiers");
	if (identifiersPair?.field("value")?.text() === "true") {
		flags.identifiers = true;
	}

	const syntaxPair = findPairByKey(esbuildNode, "minifySyntax");
	if (syntaxPair?.field("value")?.text() === "true") {
		flags.syntax = true;
	}

	const whitespacePair = findPairByKey(esbuildNode, "minifyWhitespace");
	if (whitespacePair?.field("value")?.text() === "true") {
		flags.whitespace = true;
	}

	return flags.dropConsole ||
		flags.dropDebugger ||
		flags.identifiers ||
		flags.syntax ||
		flags.whitespace
		? flags
		: null;
}

function buildMinifyContent(flags: MinifyFlags): string {
	const parts: string[] = [];

	if (flags.dropConsole || flags.dropDebugger) {
		parts.push(dedent`
      compress: {
        ${flags.dropConsole ? "dropConsole: true," : ""}
        ${flags.dropDebugger ? "dropDebugger: true," : ""}
      },
    `);
	}

	if (flags.identifiers) parts.push("identifiers: true,");
	if (flags.syntax) parts.push("syntax: true,");
	if (flags.whitespace) parts.push("whitespace: true,");

	return dedent`
    minify: {
    ${parts.join("\n")}
    },
  `;
}

function buildRolldownContent(flags: MinifyFlags): string {
	return dedent`
    rolldownOptions: {
      output: {
        ${buildMinifyContent(flags)}
      },
    },
  `;
}

function buildOutputContent(flags: MinifyFlags): string {
	return dedent`
    output: {
      ${buildMinifyContent(flags)}
    },
  `;
}

function buildBuildContent(flags: MinifyFlags): string {
	return dedent`
    build: {
      ${buildRolldownContent(flags)}
    },
  `;
}

function buildWarningText(root: SgNode<JS>): string {
	return [
		"// Expected warning:",
		"// Warning: Property mangling cannot be migrated to Rolldown minify options.",
		root.text(),
	].join("\n");
}

/**
 * Migrate esbuild minify options to `build.rolldownOptions.output.minify`.
 */
const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;

	const edits: Edit[] = [];
	let shouldWarnMangle = false;

	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const viteConfigs = getViteConfig(root);

	if (!viteConfigs?.length) return null;

	for (const configNode of viteConfigs) {
		const originalText = configNode.text();
		const baseOffset = configNode.range().start.index;
		const textEdits: TextEdit[] = [];

		const esbuildProperty = findObjectProperty(configNode, "esbuild");
		if (!esbuildProperty) continue;
		const esbuildPair = findPairByKey(configNode, "esbuild");
		if (!esbuildPair) continue;

		if (hasUnsupportedMangleOptions(esbuildProperty.valueNode)) {
			shouldWarnMangle = true;
			continue;
		}

		const flags = getMinifyFlags(esbuildProperty.valueNode);
		if (!flags) continue;

		const buildObject = findObjectProperty(configNode, "build");
		const rolldownOptions = buildObject
			? findObjectProperty(buildObject.valueNode, "rolldownOptions")
			: null;
		const outputObject = rolldownOptions
			? findObjectProperty(rolldownOptions.valueNode, "output")
			: null;
		const minifyObject = outputObject ? findObjectProperty(outputObject.valueNode, "minify") : null;

		if (minifyObject) {
			continue;
		}

		if (!buildObject) {
			const insertion = buildObjectInsertion(
				originalText,
				configNode,
				buildBuildContent(flags),
				indent,
				lineBreak,
				baseOffset,
			);
			if (insertion) {
				const start = configNode.range().start.index - baseOffset + 1;
				insertion.start = start;
				insertion.end = start;
				const doubleIndent = indent.repeat(2);
				insertion.text =
					lineBreak + insertion.text.replace(new RegExp(`^${doubleIndent}`, "gm"), indent);
				textEdits.push(insertion as unknown as TextEdit);
			}
		} else if (!rolldownOptions) {
			const insertion = buildObjectInsertion(
				originalText,
				buildObject.valueNode,
				buildRolldownContent(flags),
				indent,
				lineBreak,
				baseOffset,
			);
			if (insertion) textEdits.push(insertion as unknown as TextEdit);
		} else if (!outputObject) {
			const insertion = buildObjectInsertion(
				originalText,
				rolldownOptions.valueNode,
				buildOutputContent(flags),
				indent,
				lineBreak,
				baseOffset,
			);
			if (insertion) textEdits.push(insertion as unknown as TextEdit);
		} else {
			const insertion = buildObjectInsertion(
				originalText,
				outputObject.valueNode,
				buildMinifyContent(flags),
				indent,
				lineBreak,
				baseOffset,
			);
			if (insertion) textEdits.push(insertion as unknown as TextEdit);
		}

		const esbuildPairsToRemove: Array<SgNode<JS>> = [];
		for (const key of ["drop", "minifyIdentifiers", "minifySyntax", "minifyWhitespace"]) {
			const pair = findPairByKey(esbuildProperty.valueNode, key);
			if (pair) esbuildPairsToRemove.push(pair);
		}

		esbuildPairsToRemove.sort(
			(left, right) => right.range().start.index - left.range().start.index,
		);

		const objectText = originalText.slice(
			esbuildProperty.valueNode.range().start.index - baseOffset,
			esbuildProperty.valueNode.range().end.index - baseOffset,
		);

		let updatedObjectText = objectText;
		for (const pair of esbuildPairsToRemove) {
			const updated = removePairFromSource(
				updatedObjectText,
				pair,
				esbuildProperty.valueNode.range().start.index,
			);
			if (updated !== null) {
				updatedObjectText = updated;
			}
		}

		const innerText = updatedObjectText.replace(/^\s*\{/, "{").replace(/\}\s*$/, "}");
		const innerContent = innerText.slice(innerText.indexOf("{") + 1, innerText.lastIndexOf("}"));

		if (innerContent.trim().length === 0) {
			const removal = buildRemovalEdit(originalText, esbuildPair, baseOffset);
			if (removal) textEdits.push(removal);
		} else {
			const normalized = normalizeObjectIndent(updatedObjectText, indent, lineBreak);
			const replacement = buildReplacementEdit(esbuildProperty.valueNode, baseOffset, normalized);
			if (replacement) textEdits.push(replacement);
		}

		let updatedText = applyTextEdits(originalText, textEdits);
		// Normalize excess blank lines and remove blank lines immediately before closing braces
		updatedText = updatedText.replace(/\n{3,}/g, "\n\n");
		updatedText = updatedText.replace(/\n\s*\n(\s*\})/g, "\n$1");
		// Ensure top-level `esbuild` remains at two-space indent with a blank line before it
		updatedText = updatedText.replace(/\n\s*\n\s*(esbuild:\s*\{)/, "\n\n  $1");
		// Ensure inner lines of `esbuild` are indented by an extra level
		updatedText = updatedText.replace(/\n {2}esbuild: \{\n {2}([^\n])/g, "\n  esbuild: {\n    $1");
		// Indent the closing brace of the `esbuild` block to match top-level indentation
		updatedText = updatedText.replace(/(\n {2}esbuild: \{[\s\S]*?)\n\},(\s*\n)/, "$1\n  },$2");
		// Ensure a blank line separates a closing `build` block and the next `esbuild` property
		updatedText = updatedText.replace(/\},\n {2}esbuild:/g, "},\n\n  esbuild:");
		if (updatedText !== originalText) {
			edits.push(configNode.replace(updatedText));
		}
	}

	if (shouldWarnMangle && edits.length === 0) {
		return root.commitEdits([root.replace(buildWarningText(root))]);
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
