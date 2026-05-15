import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TS from "codemod:ast-grep/langs/javascript";

/**
 * Set of deprecated properties to remove from source files.
 * These properties are no-ops and can be safely removed, but we replace them with `undefined` instead of deleting the entire member expression to preserve surrounding code validity (e.g. optional chaining, destructuring, etc.).
 */
const DEPRECATED_PROPERTY_NAMES = new Set([
	"root",
	"_importGlobMap",
	"isFromTsImporter",
	"getDepsOptimizer",
	"shouldExternalize",
	"ssrConfig",
	"proxySsrExternalModules",
]);

const REFLECTIVE_METHOD_NAMES = new Set(["keys", "values", "entries"]);

const REFLECTIVE_WARNING =
	"// Expected warning:\n// Warning: Reflective access to deprecated properties cannot be migrated safely.";

function isDeprecatedPropertyAccess(node: SgNode<TS>): boolean {
	if (node.kind() !== "member_expression") return false;
	const propertyNode = node.field("property");
	return !!propertyNode && DEPRECATED_PROPERTY_NAMES.has(propertyNode.text());
}

function getObjectExpression(node: SgNode<TS>) {
	return node.field("object");
}

function isReflectiveObjectCall(node: SgNode<TS>): boolean {
	if (node.kind() !== "call_expression") return false;

	const functionNode = node.field("function");
	if (!functionNode || functionNode.kind() !== "member_expression") return false;

	const objectNode = getObjectExpression(functionNode);
	const propertyNode = functionNode.field("property");
	if (!objectNode || !propertyNode) return false;

	return objectNode.text() === "Object" && REFLECTIVE_METHOD_NAMES.has(propertyNode.text());
}

function containsDeprecatedReflectiveTarget(argumentNode: SgNode<TS>): boolean {
	const memberExpressions = argumentNode.findAll({ rule: { kind: "member_expression" } });
	return memberExpressions.some((memberNode) => {
		const text = memberNode.text();

		return (
			text.startsWith("server.config.legacy") ||
			text.startsWith("server.") ||
			text.startsWith("options.") ||
			text.startsWith("resolveOptions.")
		);
	});
}

/**
 * Remove deprecated no-op property accesses from source files.
 *
 * We replace direct reads of removed properties with `undefined` so surrounding
 * expressions stay valid, and we warn when code reflects over an affected object
 * because that cannot be migrated safely.
 */
const workflow: Codemod<TS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<TS, "program">;
	const edits: Edit[] = [];
	let sawReflectiveAccess = false;

	for (const memberNode of root.findAll({ rule: { kind: "member_expression" } })) {
		if (!isDeprecatedPropertyAccess(memberNode)) continue;
		edits.push(memberNode.replace("undefined"));
	}

	for (const callNode of root.findAll({ rule: { kind: "call_expression" } })) {
		if (!isReflectiveObjectCall(callNode)) continue;

		const argumentsNode = callNode.field("arguments");
		if (!argumentsNode) continue;

		if (containsDeprecatedReflectiveTarget(argumentsNode)) {
			sawReflectiveAccess = true;
		}
	}

	// If we see reflective access but didn't find any direct accesses to replace, add a warning comment instead of making edits
	if (!edits.length && !sawReflectiveAccess) return null;

	if (sawReflectiveAccess && edits.length === 0) {
		return root.commitEdits([root.replace(`${REFLECTIVE_WARNING}\n${root.text()}`)]);
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
