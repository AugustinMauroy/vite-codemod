import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { applyTextEdits, findPairByKey } from "@vitejs/codemod-utils/ast-grep/codemod-helpers";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";

const WARNING = "// Warning: Unable to safely migrate computed transformIndexHtml hook metadata.";

function keyNodeForPair(pair: SgNode<JS> | null) {
	if (!pair) return null;
	const key = pair.field("key");
	if (key) return key;
	const name = pair.field("name");
	if (name) return name;
	return null;
}

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const viteConfigs = getViteConfig(root);
	if (!viteConfigs?.length) return null;

	const edits: Array<{ start: number; end: number; text: string }> = [];
	let needsWarning = false;

	for (const configNode of viteConfigs) {
		const pluginsPair = findPairByKey(configNode, "plugins");
		if (!pluginsPair) continue;
		const pluginsVal = pluginsPair.field("value");
		if (!pluginsVal || pluginsVal.kind() !== "array") continue;

		for (const child of pluginsVal.children()) {
			if (!child.isNamed() || child.kind() !== "object") continue;
			const pluginObj = child as SgNode<JS>;

			const namePair = findPairByKey(pluginObj, "name");
			if (!namePair) continue;
			const nameVal = namePair.field("value");
			if (!nameVal) continue;
			const fragments = nameVal.findAll({ rule: { kind: "string_fragment" } });
			const nameText = fragments.map((f) => f.text()).join("");
			if (nameText !== "html-hooks") continue;

			const hookPair = findPairByKey(pluginObj, "transformIndexHtml");
			if (!hookPair) continue;
			const hookVal = hookPair.field("value");
			if (!hookVal) continue;

			if (hookVal.kind() !== "object") {
				needsWarning = true;
				continue;
			}

			// rename enforce -> order
			const enforcePair = findPairByKey(hookVal, "enforce");
			if (enforcePair) {
				const k = keyNodeForPair(enforcePair);
				if (k) {
					edits.push({ start: k.range().start.index, end: k.range().end.index, text: "order" });
				}
			}

			// rename transform -> handler
			const transformPair = findPairByKey(hookVal, "transform");
			if (transformPair) {
				const k = keyNodeForPair(transformPair);
				if (k) {
					edits.push({ start: k.range().start.index, end: k.range().end.index, text: "handler" });
				}
			}
		}
	}

	if (edits.length === 0 && !needsWarning) return null;

	let updated = edits.length > 0 ? applyTextEdits(source, edits) : source;
	if (needsWarning && !updated.startsWith("// Expected warning:")) {
		updated = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updated}`;
	}

	if (updated === source) return null;
	return updated;
};

export default workflow;
