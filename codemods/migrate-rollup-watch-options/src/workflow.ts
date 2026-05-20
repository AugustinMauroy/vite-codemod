import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { applyTextEdits, findPairByKey } from "@vitejs/codemod-utils/ast-grep/codemod-helpers";

const WARNING = "// Warning: Mixed watch settings require manual migration review.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const viteConfigs = getViteConfig(root);
	if (!viteConfigs || !viteConfigs.length) return null;

	const edits: Array<{ start: number; end: number; text: string }> = [];
	let needsWarning = false;

	for (const configNode of viteConfigs) {
		const buildPair = findPairByKey(configNode, "build");
		if (!buildPair) continue;
		const buildVal = buildPair.field("value");
		if (!buildVal || buildVal.kind() !== "object") continue;

		// skip if already has rolldownOptions
		const rolldownPair = findPairByKey(buildVal, "rolldownOptions");
		if (rolldownPair) continue;

		const rollupPair = findPairByKey(buildVal, "rollupOptions");
		if (!rollupPair) continue;
		const rollupVal = rollupPair.field("value");
		if (!rollupVal || rollupVal.kind() !== "object") continue;

		const watchPair = findPairByKey(rollupVal, "watch");
		if (!watchPair) continue;
		const watchVal = watchPair.field("value");
		if (!watchVal || watchVal.kind() !== "object") continue;

		// collect immediate child keys inside watch (avoid nested pairs)
		const pairs = watchVal.children().filter((c) => c.isNamed() && c.kind() === "pair");
		const keys = pairs.map((p) => {
			const k = p.field("key");
			return k ? k.text() : "";
		});

		// if mixed settings (chokidar plus others) -> warn and skip
		if (keys.includes("chokidar") && keys.length > 1) {
			needsWarning = true;
			continue;
		}

		// if only chokidar present, rename keys
		if (keys.includes("chokidar")) {
			// rename rollupOptions -> rolldownOptions (replace key node)
			const rollupKey = rollupPair.field("key");
			if (rollupKey) {
				edits.push({
					start: rollupKey.range().start.index,
					end: rollupKey.range().end.index,
					text: "rolldownOptions",
				});
			}

			// rename chokidar -> watcher
			const chokidarPair = findPairByKey(watchVal, "chokidar");
			const watcherKey = chokidarPair?.field("key");
			if (watcherKey) {
				edits.push({
					start: watcherKey.range().start.index,
					end: watcherKey.range().end.index,
					text: "watcher",
				});
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
