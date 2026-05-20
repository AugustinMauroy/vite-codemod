import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { findPairByKey } from "@vitejs/codemod-utils/ast-grep/object-helpers";

const WARNING = "// Warning: Condition-order assumptions must be reviewed manually.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);

	const viteConfigs = getViteConfig(root);
	if (!viteConfigs || !viteConfigs.length) return null;

	let needsWarning = false;

	for (const configNode of viteConfigs) {
		const resolvePair = findPairByKey(configNode, "resolve");
		if (!resolvePair) continue;

		const resolveVal = resolvePair.field("value");
		if (!resolveVal || resolveVal.kind() !== "object") continue;

		const conditionsPair = findPairByKey(resolveVal, "conditions");
		if (!conditionsPair) continue;

		const val = conditionsPair.field("value");
		if (!val) continue;

		// If conditions is not an array literal, conservatively warn for manual review
		if (val.kind() !== "array") {
			needsWarning = true;
			break;
		}
	}

	if (!needsWarning) return null;

	if (source.startsWith("// Expected warning:")) return null;

	const warned = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${source}`;
	return warned;
};

export default workflow;
