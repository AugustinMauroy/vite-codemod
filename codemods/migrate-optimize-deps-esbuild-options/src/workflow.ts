import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import {
	findObjectProperty,
	findPairByKey,
	normalizeObjectIndent,
	removePairFromSource,
	buildObjectInsertion,
	applyInsertions,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";

const WARNING = "// Warning: esbuild plugin support under optimizeDeps requires manual review.";

function serializePairNode(
	pair: SgNode<JS>,
	level: number,
	indent: string,
	lineBreak: string,
): string | null {
	const keyNode = pair.field("key");
	const valueNode = pair.field("value");
	if (!keyNode || !valueNode) return null;

	if (valueNode.kind() === "object") {
		const inner = valueNode
			.children()
			.filter((child) => child.isNamed() && child.kind() === "pair")
			.map((child) => serializePairNode(child as SgNode<JS>, level + 1, indent, lineBreak))
			.filter((line): line is string => line !== null)
			.join(lineBreak);

		return `${indent.repeat(level)}${keyNode.text()}: {${lineBreak}${inner}${lineBreak}${indent.repeat(level)}},`;
	}

	return `${indent.repeat(level)}${keyNode.text()}: ${valueNode.text()},`;
}

function prefixBlock(text: string, prefix: string, lineBreak: string): string {
	return text
		.split(lineBreak)
		.map((line) => (line.trim().length === 0 ? line : prefix + line))
		.join(lineBreak)
		.trimEnd();
}

function formatObjectSyntax(text: string, indent: string, lineBreak: string): string {
	const lines = text.split(lineBreak);
	let depth = 0;
	const formatted: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.length === 0) {
			formatted.push("");
			continue;
		}

		if (trimmed.startsWith("}")) {
			depth = Math.max(0, depth - 1);
		}

		formatted.push(`${indent.repeat(depth)}${trimmed}`);

		const openCount = (trimmed.match(/\{/g) || []).length;
		const closeCount = (trimmed.match(/\}/g) || []).length;
		depth = Math.max(0, depth + openCount - closeCount);
	}

	return formatted.join(lineBreak);
}

function serializeSnippet(snippet: string, indent: string, level: number, lineBreak: string): string {
	return prefixBlock(formatObjectSyntax(snippet, indent, lineBreak), indent.repeat(level), lineBreak);
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
		if (objectArg) variableInitializers.set(nameNode.text(), objectArg as SgNode<JS>);
	}

	for (const configNode of getViteConfig(root) ?? []) push(configNode);

	for (const callExpression of root.findAll({ rule: { kind: "call_expression" } })) {
		const functionNode = callExpression.field("function");
		if (!functionNode || functionNode.kind() !== "identifier") continue;
		if (functionNode.text() !== "defineConfig") continue;
		const args = callExpression.field("arguments");
		if (!args) continue;
		for (const arg of args.children()) {
			if (!arg.isNamed()) continue;
			if (arg.kind() === "object") push(arg);
			if (arg.kind() === "identifier") push(variableInitializers.get(arg.text()));
		}
	}

	for (const exportStatement of root.findAll({ rule: { kind: "export_statement" } })) {
		const exportedValue = exportStatement
			.children()
			.filter((child) => child.isNamed())
			.find((child) => child.kind() === "object" || child.kind() === "identifier");
		if (!exportedValue) continue;
		if (exportedValue.kind() === "object") push(exportedValue);
		if (exportedValue.kind() === "identifier") push(variableInitializers.get(exportedValue.text()));
	}

	for (const assignmentExpression of root.findAll({ rule: { kind: "assignment_expression" } })) {
		const namedChildren = assignmentExpression.children().filter((child) => child.isNamed());
		if (namedChildren.length < 2) continue;
		const left = namedChildren[0];
		const right = namedChildren[namedChildren.length - 1];
		if (left.kind() !== "member_expression" || left.text() !== "module.exports") continue;
		if (right.kind() === "object") push(right);
		if (right.kind() === "identifier") push(variableInitializers.get(right.text()));
	}

	return configs;
}

function buildRolldownSnippet(esbuildObject: SgNode<JS>, lineBreak: string): string | null {
	const conditions = findPairByKey(esbuildObject, "conditions");
	const define = findPairByKey(esbuildObject, "define");
	const keepNames = findPairByKey(esbuildObject, "keepNames");
	const mainFields = findPairByKey(esbuildObject, "mainFields");
	const platform = findPairByKey(esbuildObject, "platform");
	const preserveSymlinks = findPairByKey(esbuildObject, "preserveSymlinks");
	const resolveExtensions = findPairByKey(esbuildObject, "resolveExtensions");

	const parts: string[] = [];

	const keepNamesValue = keepNames?.field("value");
	if (keepNamesValue) {
		parts.push(`output: {${lineBreak}keepNames: ${keepNamesValue.text()},${lineBreak}},`);
	}

	const platformValue = platform?.field("value");
	if (platformValue) {
		parts.push(`platform: ${platformValue.text()},`);
	}

	const resolveParts: string[] = [];
	const conditionsValue = conditions?.field("value");
	if (conditionsValue) {
		resolveParts.push(`conditionNames: ${conditionsValue.text()},`);
	}
	const resolveExtensionsValue = resolveExtensions?.field("value");
	if (resolveExtensionsValue) {
		resolveParts.push(`extensions: ${resolveExtensionsValue.text()},`);
	}
	const mainFieldsValue = mainFields?.field("value");
	if (mainFieldsValue) {
		resolveParts.push(`mainFields: ${mainFieldsValue.text()},`);
	}
	const preserveSymlinksValue = preserveSymlinks?.field("value");
	if (preserveSymlinksValue) {
		resolveParts.push(`symlinks: ${preserveSymlinksValue.text() === "true" ? "false" : "true"},`);
	}
	if (resolveParts.length > 0) {
		parts.push(`resolve: {${lineBreak}${resolveParts.join(lineBreak)}${lineBreak}},`);
	}

	const defineValue = define?.field("value");
	if (defineValue) {
		parts.push(`transform: {${lineBreak}define: ${defineValue.text()},${lineBreak}},`);
	}

	if (parts.length === 0) return null;

	return `rolldownOptions: {${lineBreak}${parts.join(lineBreak)}${lineBreak}},`;
}

const workflow: Codemod<JS> = async (rootNode) => {
  const root = rootNode.root() as SgNode<JS, "program">;
  const lineBreak = getLineBreak(root);
  const indent = getIdentStyle(root) || "  ";
  const sourceText = root.text();
  const viteConfigs = collectViteConfigObjects(root);
  const edits: Edit[] = [];

  if (!viteConfigs.length) return null;

  for (const config of viteConfigs) {
    try {
      const optimizeDepsProp = findObjectProperty(config, "optimizeDeps");
      if (!optimizeDepsProp) continue;

      const esbuildObject = optimizeDepsProp.valueNode;
      const originalText = config.text();
      const effectiveIndent = originalText.match(/\n([ \t]+)/)?.[1] ?? indent;

      const plugins = findPairByKey(esbuildObject, "plugins");
      const needsFileWarning = !!plugins;

			const esbuildPair = findPairByKey(esbuildObject, "esbuildOptions");
			if (esbuildPair) {
				const esbuildValue = esbuildPair.field("value");
				if (esbuildValue && esbuildValue.kind() === "object") {
					let rolldownSnippet = buildRolldownSnippet(esbuildValue, lineBreak);
					if (rolldownSnippet) {
						// First try a content-only edit: remove the original pair from the
						// `config` text and insert the new snippet inside the optimizeDeps
						// object. This preserves surrounding formatting.
						try {
							const configText = config.text();
							const removed = removePairFromSource(configText, esbuildPair, config.range().start.index);
							if (removed !== null) {
								const insertion = buildObjectInsertion(
									removed,
									optimizeDepsProp.valueNode,
									rolldownSnippet,
									effectiveIndent,
									lineBreak,
									config.range().start.index,
								);
								if (insertion) {
									const newConfig = applyInsertions(removed, [insertion]);
									edits.push(config.replace(newConfig));
									continue;
								}
							}
						} catch {}

						// Fallback: replace the pair node in-place (best-effort, preserves
						// most of the local formatting).
						try {
							const full = root.text();
							const after = full[esbuildPair.range().end.index];
							if (after === "," && rolldownSnippet.trimEnd().endsWith(",")) {
								rolldownSnippet = rolldownSnippet.replace(/,+\s*$/s, "");
							}

							const pairStart = esbuildPair.range().start.index;
							const lineStart = Math.max(0, full.lastIndexOf(lineBreak, pairStart - 1) + 1);
							const leading = (full.slice(lineStart, pairStart).match(/^[ \t]*/)?.[0]) ?? effectiveIndent;

							const rawLines = rolldownSnippet.split(lineBreak);
							let depth = 0;
							const outLines: string[] = [];
							for (const rawLine of rawLines) {
								const trimmed = rawLine.trim();
								if (trimmed.length === 0) {
									outLines.push("");
									continue;
								}

								if (trimmed.startsWith("}")) {
									depth = Math.max(0, depth - 1);
								}

								const prefix = leading + effectiveIndent.repeat(depth);
								outLines.push(prefix + trimmed);

								const opens = (trimmed.match(/\{/g) || []).length;
								const closes = (trimmed.match(/\}/g) || []).length;
								depth = Math.max(0, depth + opens - closes);
							}

							const prefixed = outLines.join(lineBreak);
							edits.push(esbuildPair.replace(prefixed));
						} catch {}
			        }
			        }
			      }
      if (needsFileWarning && !root.text().includes(WARNING)) {
        const heading = "// Expected warning:";
        edits.unshift(root.replace(`${heading}${lineBreak}${WARNING}${lineBreak}${root.text()}`));
      }
    } catch {
      continue;
    }
  }

  if (!edits.length) return null;
  return root.commitEdits(edits);
};

export default workflow;
