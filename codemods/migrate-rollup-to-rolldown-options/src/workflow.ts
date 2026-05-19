import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { findPairByKey } from "@vitejs/codemod-utils/ast-grep/codemod-helpers";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";

const WARNING = "// Warning: resolve.alias customResolver must be rewritten as a plugin.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const viteConfigs = getViteConfig(root);

	if (!viteConfigs?.length) return null;

	let needsWarning = false;

	// detect resolve.alias customResolver via AST
	for (const configNode of viteConfigs) {
		for (const resolvePair of configNode.findAll({ rule: { kind: "pair" } })) {
			const keyNode = resolvePair.field("key");
			if (!keyNode || keyNode.text() !== "resolve") continue;

			const resolveVal = resolvePair.field("value");
			if (!resolveVal || resolveVal.kind() !== "object") continue;

			for (const aliasPair of resolveVal.findAll({ rule: { kind: "pair" } })) {
				const aliasKey = aliasPair.field("key");
				if (!aliasKey || aliasKey.text() !== "alias") continue;

				const aliasVal = aliasPair.field("value");
				if (!aliasVal || aliasVal.kind() !== "array") continue;

				for (const item of aliasVal.children()) {
					if (!item.isNamed() || item.kind() !== "object") continue;
					const custom = findPairByKey(item as SgNode<JS>, "customResolver");
					if (custom) {
						needsWarning = true;
						break;
					}
				}
			}
		}
	}

	let updated = source;
	// remove specific rollup-only blocks under build
	updated = updated.replace(/^\s*commonjsOptions:\s*\{[\s\S]*?\},?\r?\n/gm, "");
	updated = updated.replace(/^\s*dynamicImportVarsOptions:\s*\{[\s\S]*?\},?\r?\n/gm, "");
	// rename rollupOptions keys
	updated = updated.replace(/\brollupOptions\b/g, "rolldownOptions");

	if (needsWarning && !updated.startsWith("// Expected warning:")) {
		updated = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updated}`;
	}

	if (updated === source) return null;
	return updated;
};

export default workflow;
