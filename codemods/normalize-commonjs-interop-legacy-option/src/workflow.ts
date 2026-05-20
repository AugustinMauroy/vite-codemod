import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import {
	findObjectProperty,
	findPairByKey,
	normalizeObjectIndent,
	removePairFromSource,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";

const WARNING = "// Warning: Ambiguous CJS default import semantics require manual review.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();

	const edits: Edit[] = [];
	let annotateWarning = false;

	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "  ";
	const viteConfigs = getViteConfig(root);

	// Handle legacy.inconsistentCjsInterop removal inside defineConfig
	if (viteConfigs?.length) {
		for (const configNode of viteConfigs) {
			const originalText = configNode.text();

			const legacyObj = findObjectProperty(configNode, "legacy");
			if (!legacyObj) continue;

			const pair = findPairByKey(legacyObj.valueNode, "inconsistentCjsInterop");
			if (!pair) continue;
			const valueNode = pair.field("value");
			if (!valueNode) continue;

			if (valueNode.kind() === "true") {
				const legacyText = originalText.slice(
					legacyObj.openBrace - configNode.range().start.index,
					legacyObj.closeBrace - configNode.range().start.index + 1,
				);

				const updated = removePairFromSource(
					legacyText,
					pair,
					legacyObj.valueNode.range().start.index,
				);
				if (updated === null) continue;

				// Normalize indentation
				let normalized = normalizeObjectIndent(updated, indent, lineBreak);

				// If legacy object is now empty, remove the entire `legacy` pair
				const inner = normalized.replace(/^\s*\{/, "{").replace(/\}\s*$/, "}");
				const between = inner.slice(inner.indexOf("{") + 1, inner.lastIndexOf("}"));
				if (between.trim().length === 0) {
					const legacyPair = findPairByKey(configNode, "legacy");
					if (legacyPair) {
						const removed = removePairFromSource(
							originalText,
							legacyPair,
							configNode.range().start.index,
						);
						if (removed !== null) {
							let finalText = normalizeObjectIndent(removed, indent, lineBreak);
							const inner2 = finalText.replace(/^\s*\{/, "{").replace(/\}\s*$/, "}");
							const between2 = inner2.slice(inner2.indexOf("{") + 1, inner2.lastIndexOf("}"));
							if (between2.trim().length === 0) finalText = "{}";
							if (finalText !== originalText) edits.push(configNode.replace(finalText));
							continue;
						}
					}
					// Fallback: collapse to empty object
					normalized = "{}";
				}

				const updatedConfigText =
					originalText.slice(0, legacyObj.openBrace - configNode.range().start.index) +
					normalized +
					originalText.slice(legacyObj.closeBrace - configNode.range().start.index + 1);

				if (updatedConfigText !== originalText) {
					edits.push(configNode.replace(updatedConfigText));
				}
			} else {
				// Non-literal or dynamic value -> annotate warning
				annotateWarning = true;
			}
		}
	}

	// Detect ambiguous CJS default imports (e.g., import x from './file.cjs') at program level
	// Use a simple regex over the source to avoid AST node kind mismatches in rules.
	const importDefaultCjsRegex = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"](.+\.cjs)['"];?/m;
	if (importDefaultCjsRegex.test(source)) {
		annotateWarning = true;
	}

	if (!edits.length && !annotateWarning) return null;

	if (annotateWarning && edits.length === 0) {
		const warningComment = ["// Expected warning:", `// ${WARNING.replace("// ", "")}`, ""].join(
			"\n",
		);
		edits.unshift(root.replace(warningComment + root.text()));
	}

	if (process.env.DRY_RUN === "1") return null;

	return root.commitEdits(edits);
};

export default workflow;
