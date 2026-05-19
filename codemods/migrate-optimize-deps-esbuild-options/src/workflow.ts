import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import {
	findObjectProperty,
	findPairByKey,
	removePairFromSource,
	normalizeObjectIndent,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";
import { buildRolldownSnippetFromSource } from "@vitejs/codemod-utils/ast-grep/rolldown-serializer";

const WARNING = "// Warning: esbuild plugin support under optimizeDeps requires manual review.";

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

	for (const configNode of root.findAll({ rule: { kind: "object" } })) push(configNode);
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

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const sourceText = root.text();
	const configs = collectViteConfigObjects(root).sort(
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
