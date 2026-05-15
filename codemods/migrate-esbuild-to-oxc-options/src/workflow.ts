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
} from "@vitejs/codemod-utils/ast-grep/object-helpers";
import dedent from "dedent";

type TextEdit = {
	start: number;
	end: number;
	text: string;
};

const TODO_COMMENT =
	"// TODO(vite): Review this esbuild option. JavaScript transforms are now handled by OXC.";

const TOP_LEVEL_MAPPABLE_KEYS = ["define", "include", "exclude", "jsxInject"] as const;
const MANUAL_REVIEW_KEYS = ["banner", "footer", "supported", "tsconfigRaw"] as const;

function toTextEdit(edit: { start?: number; end?: number; index?: number; text: string }): TextEdit {
	const start = edit.start ?? edit.index ?? 0;
	const end = edit.end ?? start;
	return { start, end, text: edit.text };
}

function buildRemovalEdit(sourceText: string, pairNode: SgNode<JS>, baseOffset: number): TextEdit | null {
	const start = pairNode.range().start.index - baseOffset;
	let end = pairNode.range().end.index - baseOffset;

	if (start < 0 || end < 0) return null;

	if (sourceText[baseOffset + end] === ",") {
		end += 1;
	} else if (start - 1 >= 0 && sourceText[baseOffset + start - 1] === ",") {
		return { start: start - 1, end, text: "" };
	}

	return { start, end, text: "" };
}

function buildReplacementEdit(node: SgNode<JS>, baseOffset: number, text: string): TextEdit | null {
	const start = node.range().start.index - baseOffset;
	const end = node.range().end.index - baseOffset;

	if (start < 0 || end < 0) return null;

	return { start, end, text };
}

function readStringValue(node: SgNode<JS> | null | undefined): string | null {
	if (!node || node.kind() !== "string") return null;
	const fragments = node.findAll({ rule: { kind: "string_fragment" } });
	return fragments.map((fragment) => fragment.text()).join("");
}

function buildPropertySnippet(key: string, valueText: string): string {
	return `${key}: ${valueText},`;
}

function buildJsxObjectSnippet(parts: string[]): string {
	return dedent`
		jsx: {
		${parts.join("\n")}
		},
	`;
}

function zeroIndent(text: string, lineBreak: string): string {
	return text
		.split(lineBreak)
		.map((line) => line.trimStart())
		.join(lineBreak)
		.trim();
}

function buildObjectText(parts: string[], lineBreak: string): string {
	return `{${lineBreak}${parts.join(lineBreak)}${lineBreak}}`;
}


function collectViteConfigObjects(root: SgNode<JS>): Array<SgNode<JS>> {
	const configs: Array<SgNode<JS>> = [];
	const seen = new Set<string>();
	const push = (node: SgNode<JS> | null | undefined) => {
		if (!node || node.kind() !== "object") return;
		const key = `${node.range().start.index}:${node.range().end.index}`;
		if (seen.has(key)) return;
		seen.add(key);
		configs.push(node);
	};

	const variableInitializers = new Map<string, SgNode<JS>>();
	for (const declarator of root.findAll({ rule: { kind: "variable_declarator" } })) {
		const namedChildren = declarator.children().filter((child) => child.isNamed());
		if (namedChildren.length < 2) continue;

		const nameNode = namedChildren[0];
		const initNode = namedChildren[namedChildren.length - 1];
		if (nameNode.kind() !== "identifier") continue;

		if (initNode.kind() === "object") {
			variableInitializers.set(nameNode.text(), initNode);
			continue;
		}

		if (initNode.kind() !== "call_expression") continue;
		const functionNode = initNode.field("function");
		if (!functionNode || functionNode.kind() !== "identifier") continue;
		if (functionNode.text() !== "defineConfig") continue;

		const args = initNode.field("arguments");
		if (!args) continue;
		const objectArg = args.children().find((child) => child.isNamed() && child.kind() === "object");
		if (objectArg) variableInitializers.set(nameNode.text(), objectArg);
	}

	for (const configNode of getViteConfig(root) ?? []) {
		push(configNode);
	}

	for (const callExpression of root.findAll({ rule: { kind: "call_expression" } })) {
		const functionNode = callExpression.field("function");
		if (!functionNode || functionNode.kind() !== "identifier") continue;
		if (functionNode.text() !== "defineConfig") continue;

		const args = callExpression.field("arguments");
		if (!args) continue;
		for (const arg of args.children()) {
			if (!arg.isNamed()) continue;
			if (arg.kind() === "object") {
				push(arg);
				continue;
			}
			if (arg.kind() === "identifier") {
				push(variableInitializers.get(arg.text()));
			}
		}
	}

	for (const exportStatement of root.findAll({ rule: { kind: "export_statement" } })) {
		const exportedValue = exportStatement
			.children()
			.filter((child) => child.isNamed())
			.find((child) => child.kind() === "object" || child.kind() === "identifier");
		if (!exportedValue) continue;

		if (exportedValue.kind() === "object") {
			push(exportedValue);
			continue;
		}

		if (exportedValue.kind() === "identifier") {
			push(variableInitializers.get(exportedValue.text()));
		}
	}

	for (const assignmentExpression of root.findAll({ rule: { kind: "assignment_expression" } })) {
		const namedChildren = assignmentExpression.children().filter((child) => child.isNamed());
		if (namedChildren.length < 2) continue;

		const left = namedChildren[0];
		const right = namedChildren[namedChildren.length - 1];
		if (left.kind() !== "member_expression" || left.text() !== "module.exports") continue;

		if (right.kind() === "object") {
			push(right);
			continue;
		}

		if (right.kind() === "identifier") {
			push(variableInitializers.get(right.text()));
		}
	}

	return configs;
}

function buildCommentInsertion(
	configNode: SgNode<JS>,
	esbuildPair: SgNode<JS>,
	lineBreak: string,
	indent: string,
): TextEdit | null {
	if (configNode.text().includes(TODO_COMMENT)) return null;

	const pairStart = esbuildPair.range().start.index - configNode.range().start.index;
	const lineStart = configNode.text().lastIndexOf(lineBreak, pairStart) + lineBreak.length;
	const pairIndent = configNode.text().slice(lineStart, pairStart).match(/^\s*/)?.[0] ?? indent;

	return {
		start: pairStart,
		end: pairStart,
		text: `${pairIndent}${TODO_COMMENT}${lineBreak}`,
	};
}

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const edits: Edit[] = [];
	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const viteConfigs = collectViteConfigObjects(root);

	if (!viteConfigs.length) return null;

	for (const configNode of viteConfigs) {
		const originalText = configNode.text();
		const configOffset = configNode.range().start.index;
		const effectiveIndent = originalText.match(/\n([ \t]+)/)?.[1] ?? indent;
		const esbuildProperty = findObjectProperty(configNode, "esbuild");
		const esbuildPair = findPairByKey(configNode, "esbuild");
		if (!esbuildProperty || !esbuildPair) continue;

		const oxcProperty = findObjectProperty(configNode, "oxc");
		const esbuildObject = esbuildProperty.valueNode;
		const rootSnippets: string[] = [];
		const removalPairs: Array<SgNode<JS>> = [];
		let jsxReplacement: TextEdit | null = null;
		let commentInsertion: TextEdit | null = null;
		let needsManualComment = false;

		const oxcJsxProperty = oxcProperty ? findObjectProperty(oxcProperty.valueNode, "jsx") : null;
		const oxcJsxPair = oxcJsxProperty ? findPairByKey(oxcProperty.valueNode, "jsx") : null;
		const textEdits: TextEdit[] = [];

		for (const key of MANUAL_REVIEW_KEYS) {
			if (findPairByKey(esbuildObject, key)) {
				needsManualComment = true;
			}
		}

		for (const key of TOP_LEVEL_MAPPABLE_KEYS) {
			const pair = findPairByKey(esbuildObject, key);
			if (!pair) continue;
			const valueNode = pair.field("value");
			if (!valueNode) continue;

			const existingPair = oxcProperty ? findPairByKey(oxcProperty.valueNode, key) : null;
			if (!existingPair) {
				rootSnippets.push(buildPropertySnippet(key, valueNode.text()));
			}

			removalPairs.push(pair);
		}

		const jsxPair = findPairByKey(esbuildObject, "jsx");
		const jsxValue = jsxPair?.field("value");
		const jsxValueText = readStringValue(jsxValue);
		const jsxFragments: string[] = [];
		let jsxRuntime: "automatic" | "classic" | null = null;
		let jsxMode: "string" | "object" | null = null;
		let jsxManual = false;

		if (jsxPair && jsxValue) {
			if (jsxValue.kind() === "string") {
				switch (jsxValueText) {
					case "preserve":
						jsxMode = "string";
						break;
					case "automatic":
						jsxMode = "object";
						jsxRuntime = "automatic";
						break;
					case "transform":
						jsxMode = "object";
						jsxRuntime = "classic";
						break;
					default:
						jsxManual = true;
				}
			} else {
				jsxManual = true;
			}

			const jsxImportSource = findPairByKey(esbuildObject, "jsxImportSource");
			if (jsxImportSource?.field("value")) {
				removalPairs.push(jsxImportSource);
				const valueNode = jsxImportSource.field("value");
				if (valueNode) jsxFragments.push(buildPropertySnippet("importSource", valueNode.text()));
				if (!jsxRuntime) jsxRuntime = "automatic";
				if (jsxMode === null) jsxMode = "object";
			}

			const jsxFactory = findPairByKey(esbuildObject, "jsxFactory");
			if (jsxFactory?.field("value")) {
				removalPairs.push(jsxFactory);
				const valueNode = jsxFactory.field("value");
				if (valueNode) jsxFragments.push(buildPropertySnippet("pragma", valueNode.text()));
				jsxRuntime = "classic";
				jsxMode = "object";
			}

			const jsxFragment = findPairByKey(esbuildObject, "jsxFragment");
			if (jsxFragment?.field("value")) {
				removalPairs.push(jsxFragment);
				const valueNode = jsxFragment.field("value");
				if (valueNode) jsxFragments.push(buildPropertySnippet("pragmaFrag", valueNode.text()));
				jsxRuntime = "classic";
				jsxMode = "object";
			}

			const jsxDev = findPairByKey(esbuildObject, "jsxDev");
			if (jsxDev?.field("value")) {
				removalPairs.push(jsxDev);
				const valueNode = jsxDev.field("value");
				if (valueNode) jsxFragments.push(buildPropertySnippet("development", valueNode.text()));
				if (jsxMode === null) jsxMode = "object";
			}

			const jsxSideEffects = findPairByKey(esbuildObject, "jsxSideEffects");
			if (jsxSideEffects?.field("value")) {
				removalPairs.push(jsxSideEffects);
				const valueNode = jsxSideEffects.field("value");
				if (valueNode) jsxFragments.push(buildPropertySnippet("pure", valueNode.text()));
				if (jsxMode === null) jsxMode = "object";
			}

			if (jsxMode === "string") {
				removalPairs.push(jsxPair);
				const existingValue = oxcJsxPair?.field("value");
				if (!existingValue || existingValue.text() !== jsxValue.text()) {
					const jsxSnippet = `jsx: ${jsxValue.text()},`;
					if (oxcProperty) {
						rootSnippets.push(jsxSnippet);
					} else {
						rootSnippets.push(jsxSnippet);
					}
				}
			} else if (jsxMode === "object") {
				removalPairs.push(jsxPair);
				const jsxParts: string[] = [];
				if (jsxRuntime) {
					jsxParts.push(buildPropertySnippet("runtime", JSON.stringify(jsxRuntime)));
				}
				jsxParts.push(...jsxFragments);

				if (oxcJsxProperty) {
					const existingValue = oxcJsxPair?.field("value");
					if (existingValue && existingValue.kind() === "object") {
						const existingKeys = new Set(
							existingValue
								.findAll({ rule: { kind: "pair" } })
								.map((pair) => pair.field("key"))
								.filter((key): key is SgNode<JS> => !!key && key.kind() === "property_identifier")
								.map((key) => key.text()),
						);
						const missingParts = jsxParts.filter((part) => {
							const key = part.slice(0, part.indexOf(":"));
							return !existingKeys.has(key);
						});
						if (missingParts.length > 0) {
							const insertion = buildObjectInsertion(
								originalText,
								existingValue,
								missingParts.join("\n"),
								indent,
								lineBreak,
								configOffset,
							);
							if (insertion) {
								jsxReplacement = toTextEdit(insertion);
							}
						}
					} else if (existingValue && existingValue.kind() === "string") {
						jsxReplacement = buildReplacementEdit(
							existingValue,
							configOffset,
							`{\n${jsxParts.join("\n")}\n}`,
						);
					} else {
						rootSnippets.push(buildJsxObjectSnippet(jsxParts));
					}
				} else {
					rootSnippets.push(buildJsxObjectSnippet(jsxParts));
				}
			} else if (!jsxManual && jsxFragments.length > 0) {
				removalPairs.push(jsxPair);
				const jsxParts = [...jsxFragments];
				if (oxcJsxProperty) {
					const existingValue = oxcJsxPair?.field("value");
					if (existingValue && existingValue.kind() === "object") {
						const existingKeys = new Set(
							existingValue
								.findAll({ rule: { kind: "pair" } })
								.map((pair) => pair.field("key"))
								.filter((key): key is SgNode<JS> => !!key && key.kind() === "property_identifier")
								.map((key) => key.text()),
						);
						const missingParts = jsxParts.filter((part) => {
							const key = part.slice(0, part.indexOf(":"));
							return !existingKeys.has(key);
						});
						if (missingParts.length > 0) {
							const insertion = buildObjectInsertion(
								originalText,
								existingValue,
								missingParts.join("\n"),
								indent,
								lineBreak,
								configOffset,
							);
							if (insertion) {
								jsxReplacement = toTextEdit(insertion);
							}
						}
					} else if (existingValue && existingValue.kind() === "string") {
						jsxReplacement = buildReplacementEdit(
							existingValue,
							configOffset,
							`{\n${jsxParts.join("\n")}\n}`,
						);
					} else {
						rootSnippets.push(buildJsxObjectSnippet(jsxParts));
					}
				} else {
					rootSnippets.push(buildJsxObjectSnippet(jsxParts));
				}
			}

			if (jsxManual) {
				needsManualComment = true;
			}
		}

		if (needsManualComment) {
			commentInsertion = buildCommentInsertion(configNode, esbuildPair, lineBreak, effectiveIndent);
			if (commentInsertion) {
				textEdits.push(toTextEdit(commentInsertion));
			}
		}

        

		if (jsxReplacement) {
			textEdits.push(jsxReplacement);
		}

		// Assemble updated esbuild object by removing the collected removalPairs
		if (removalPairs.length > 0) {
			const esbuildPairs = esbuildObject
				.children()
				.filter((c) => c.isNamed() && c.kind() === "pair")
				.map((p) => p as SgNode<JS>);

			const removalStarts = new Set(removalPairs.map((p) => p.range().start.index));
			const keptPairs = esbuildPairs.filter((p) => !removalStarts.has(p.range().start.index));

			if (keptPairs.length === 0) {
				const removal = buildRemovalEdit(root.text(), esbuildPair, configOffset);
				if (removal) textEdits.push(removal);
			} else {
				const keptTexts = keptPairs.map((p) => p.text());
				const replacementText = "{" + "\n" + keptTexts.join("\n") + "\n" + "}";
				const replacement = buildReplacementEdit(
					esbuildProperty.valueNode,
					configOffset,
					normalizeObjectIndent(replacementText, effectiveIndent, lineBreak),
				);
				if (replacement) textEdits.push(replacement);
			}
		}

		// Build or update `oxc` object from existing `oxc` pairs plus rootSnippets
		if (rootSnippets.length > 0) {
			if (oxcProperty) {
				const existingPairs = oxcProperty.valueNode
					.children()
					.filter((c) => c.isNamed() && c.kind() === "pair")
					.map((p) => p as SgNode<JS>);
				const existingTexts = existingPairs.map((p) => p.text());
				const combined = existingTexts.concat(rootSnippets);
				const oxcText = "{" + "\n" + combined.join("\n") + "\n" + "}";
				const replacement = buildReplacementEdit(
					oxcProperty.valueNode,
					configOffset,
					normalizeObjectIndent(oxcText, effectiveIndent, lineBreak),
				);
				if (replacement) textEdits.push(replacement);
			} else {
				// Insert a new `oxc` property into the config
				const insertion = buildObjectInsertion(
					originalText,
					configNode,
					`oxc: {\n${rootSnippets.join("\n")}\n},`,
					effectiveIndent,
					lineBreak,
					configOffset,
				);
				if (insertion) textEdits.push(toTextEdit(insertion));
			}
		}
		if (rootSnippets.length === 0 && removalPairs.length === 0 && !jsxReplacement && !commentInsertion) {
			continue;
		}

		if (rootSnippets.length > 0 || removalPairs.length > 0 || jsxReplacement || commentInsertion) {
			const removalStarts = new Set(removalPairs.map((pair) => pair.range().start.index));
			const topLevelPairs = configNode
				.children()
				.filter((child) => child.isNamed() && child.kind() === "pair")
				.map((pair) => pair as SgNode<JS>);
			const rebuiltParts: string[] = [];

			for (const pair of topLevelPairs) {
				const keyNode = pair.field("key");
				const keyName = keyNode && keyNode.kind() === "property_identifier" ? keyNode.text() : null;

				if (keyName === "esbuild") {
					const esbuildPairs = esbuildObject
						.children()
						.filter((child) => child.isNamed() && child.kind() === "pair")
						.map((child) => child as SgNode<JS>)
						.filter((child) => !removalStarts.has(child.range().start.index));

					if (esbuildPairs.length === 0) {
						if (commentInsertion) rebuiltParts.push(zeroIndent(commentInsertion.text, lineBreak));
						continue;
					}

					const esbuildText = buildObjectText(esbuildPairs.map((child) => zeroIndent(child.text(), lineBreak)), lineBreak);
					if (commentInsertion) rebuiltParts.push(zeroIndent(commentInsertion.text, lineBreak));
					rebuiltParts.push(`esbuild: ${esbuildText},`);
					continue;
				}

				if (keyName === "oxc") {
					continue;
				}

				rebuiltParts.push(zeroIndent(pair.text(), lineBreak));
			}

			if (rootSnippets.length > 0) {
				const oxcInnerParts: string[] = [];
				if (oxcProperty) {
					const existingOxcPairs = oxcProperty.valueNode
						.children()
						.filter((child) => child.isNamed() && child.kind() === "pair")
						.map((child) => child as SgNode<JS>)
						.map((child) => zeroIndent(child.text(), lineBreak));
						oxcInnerParts.push(...existingOxcPairs);
				}
					oxcInnerParts.push(...rootSnippets.map((snippet) => zeroIndent(snippet, lineBreak)));
				rebuiltParts.push(`oxc: ${buildObjectText(oxcInnerParts, lineBreak)},`);
			}

			const rebuilt = buildObjectText(rebuiltParts, lineBreak);
			edits.push(configNode.replace(rebuilt));
		}
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
