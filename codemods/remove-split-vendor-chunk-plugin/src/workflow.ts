import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { applyTextEdits, findPairByKey } from "vitejs-codemod-utils/ast-grep/codemod-helpers";
import { getViteConfig } from "vitejs-codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "vitejs-codemod-utils/ast-grep/line-break";
import { findObjectProperty } from "vitejs-codemod-utils/ast-grep/object-helpers";

const WARNING =
	"// Warning: Unable to safely remove splitVendorChunkPlugin from conditional plugin logic.";

const pluginName = "splitVendorChunkPlugin";

function detectPluginAlias(source: string): string {
	const m = source.match(/import\s*\{([^}]*)\}\s*from\s*["']vite["']/);
	if (!m) return pluginName;
	const inside = m[1];
	const parts = inside.split(",").map((p: string) => p.trim());
	for (const p of parts) {
		// match `splitVendorChunkPlugin` or `splitVendorChunkPlugin as svc`
		const mm = p.match(/^splitVendorChunkPlugin(?:\s+as\s+(\w+))?$/);
		if (mm) return mm[1] ?? "splitVendorChunkPlugin";
	}
	return pluginName;
}

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const viteConfigs = getViteConfig(root);
	if (!viteConfigs?.length) return null;

	const edits: Array<{ start: number; end: number; text: string }> = [];
	let needsWarning = false;
	let removedPlugin = false;

	const pluginAlias = detectPluginAlias(source);

	for (const configNode of viteConfigs) {
		const pluginsPair = findPairByKey(configNode, "plugins");
		if (!pluginsPair) continue;
		const pluginsVal = pluginsPair.field("value");
		if (!pluginsVal) continue;

		// If plugins is not a bare array (e.g. `[...].filter(Boolean)`), be conservative
		// and annotate a warning if the plugin appears in the expression.
		if (pluginsVal.kind() !== "array") {
			const pluginsText = pluginsVal.text();
			if (pluginsText.includes(`${pluginAlias}(`)) {
				needsWarning = true;
				break;
			}
			continue;
		}

		// skip if manualChunks is present in build.rollupOptions.output
		const buildObj = findObjectProperty(configNode, "build");
		if (buildObj) {
			const rollupObj = findObjectProperty(buildObj.valueNode, "rollupOptions");
			if (rollupObj) {
				const outputObj = findObjectProperty(rollupObj.valueNode, "output");
				if (outputObj) {
					const manual = outputObj.valueNode.findAll({ rule: { kind: "pair" } }).find((p) => {
						const k = p.field("key");
						return k?.text() === "manualChunks";
					});
					if (manual) continue; // real-world no-op: manualChunks already configured
				}
			}
		}

		const pluginsText = pluginsVal.text();
		// If the plugin is used inside conditional expressions within the array, avoid unsafe removal and emit a warning.
		if (pluginsText.includes(`${pluginAlias}(`) && pluginsText.includes("?")) {
			needsWarning = true;
			break;
		}

		for (const child of pluginsVal.children()) {
			if (!child.isNamed()) continue;

			// direct call: splitVendorChunkPlugin()
			if (child.kind() === "call_expression") {
				const fn = child.field("function");
				if (fn && fn.kind() === "identifier" && fn.text() === pluginAlias) {
					// remove this element from the array, include trailing comma if present
					let start = child.range().start.index;
					let end = child.range().end.index;
					if (source[end] === ",") {
						end += 1;
					} else {
						// remove preceding comma and whitespace if present
						let i = start - 1;
						while (i >= 0 && /[ \t\n\r]/.test(source[i])) i--;
						if (i >= 0 && source[i] === ",") start = i;
					}
					edits.push({ start, end, text: "" });
					removedPlugin = true;
					continue;
				}
			}

			// if plugin appears inside element text (e.g. conditional), warn and skip
			const txt = child.text();
			if (txt.includes(`${pluginAlias}(`)) {
				needsWarning = true;
				break;
			}
		}
	}

	if (!edits.length && !needsWarning) return null;

	let updated = edits.length > 0 ? applyTextEdits(source, edits) : source;

	// Remove import specifier if plugin was removed
	if (removedPlugin) {
		// remove `splitVendorChunkPlugin` from named import from 'vite', preserving original quote style
		updated = updated.replace(/import\s*\{([^}]*)\}\s*from\s*(['"])vite\2/, (_m, inside, quote) => {
			const parts = inside
				.split(",")
				.map((p: string) => p.trim())
				.filter(Boolean);
			const kept = parts.filter((p: string) => !/^splitVendorChunkPlugin(?:\s+as\s+\w+)?$/.test(p));
			if (kept.length === 0) return ""; // remove whole import
			return `import { ${kept.join(", ")} } from ${quote}vite${quote}`;
		});
	}

	if (needsWarning && !updated.startsWith("// Expected warning:")) {
		updated = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updated}`;
	}

	if (updated === source) return null;
	return updated;
};

export default workflow;
