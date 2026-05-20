import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import fs from "node:fs";
import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import { getIdentStyle } from "@vitejs/codemod-utils/ast-grep/indent";
import { getLineBreak } from "@vitejs/codemod-utils/ast-grep/line-break";
import {
	findObjectProperty,
	findPairByKey,
	normalizeObjectIndent,
} from "@vitejs/codemod-utils/ast-grep/object-helpers";

const WARNING = "// Warning: Function-form manualChunks with side effects needs manual review.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = getLineBreak(root);
	const indent = getIdentStyle(root) || "\t";

	const viteConfigs = getViteConfig(root);
	if (!viteConfigs?.length) return null;

	// (fast-path removed) Rely on per-config AST-based transformation below which
	// robustly finds and replaces build.rollupOptions.output.manualChunks.

	const edits: Edit[] = [];
	let needsWarning = false;

	for (const configNode of viteConfigs) {
		const original = configNode.text();

		const buildProp = findObjectProperty(configNode, "build");
		if (!buildProp) continue;

		// Use AST-based transform (findPairByKey) below to build the replacement.
		// Removed the source-level regex fast-path to match other codemod patterns
		// like `migrate-rollup-watch-options` which operate directly on AST pairs.

		const rollupPair = findPairByKey(buildProp.valueNode, "rollupOptions");
		if (!rollupPair) continue;

		const outputProp = findObjectProperty(rollupPair.field("value"), "output");
		if (!outputProp) continue;

		// If output contains function-form manualChunks, warn conservatively
		if (outputProp.valueNode?.text().includes("manualChunks(")) {
			needsWarning = true;
			break;
		}

		const manualPair = findPairByKey(outputProp.valueNode, "manualChunks");
		if (!manualPair) continue;

		const manualText = manualPair.text();

		const val = manualPair.field("value");
		if (val && val.kind() === "object") {
			const entries: Array<{ key: string; text: string }> = [];
			for (const child of val.findAll({ rule: { kind: "pair" } })) {
				const k = child.field("key");
				const v = child.field("value");
				if (!k || !v) continue;
				const keyName = k.text();
				const valueText = v.text();
				entries.push({ key: keyName, text: valueText });
			}

			if (entries.length === 0) {
				// fallback: parse the object source text for simple key: [..] entries
				const src = val.text();
				const objMatch = src.match(/\{([\s\S]*?)\}\s*,?\s*$/);
				if (objMatch) {
					const inner = objMatch[1];
					const lines = inner
						.split(/\r?\n/)
						.map((l) => l.trim())
						.filter((l) => l.length > 0);
					for (const line of lines) {
						const m = line.match(/^([A-Za-z0-9_$]+)\s*:\s*(.+),?$/);
						if (!m) continue;
						entries.push({ key: m[1], text: m[2].trim().replace(/,$/, "") });
					}
				}
			}

			if (entries.length === 0) {
				try {
					const dbg = `--- DEBUG: configNode start:${configNode.range().start.index} manualPair:${manualPair.range().start.index}\nmanualText:\n${manualText}\nval.text:\n${val.text()}\noriginal:\n${original}\n`;
					fs.appendFileSync("/tmp/migrate-manual-debug.txt", dbg);
				} catch (_e) {
					// ignore
				}
				continue;
			}

			entries.sort((a, b) => a.key.localeCompare(b.key));

			// determine the property's leading indentation to preserve style
			const pairStart = rollupPair.range().start.index - configNode.range().start.index;
			const lineStart = original.lastIndexOf(lineBreak, pairStart - 1) + lineBreak.length;
			const propIndent = original.slice(lineStart, pairStart);
			const unit = propIndent || indent;

			const _innerIndent1 = propIndent + unit;
			const _innerIndent2 = propIndent + unit + unit;
			const _innerIndent3 = propIndent + unit + unit + unit;
			const _innerIndent4 = propIndent + unit + unit + unit + unit;

			// build replacement using detected indentation unit and property indent
			const base = propIndent;
			const u = unit;
			const lines: string[] = [];
			lines.push(`${base}rolldownOptions: {`);
			lines.push(`${base}${u}output: {`);
			lines.push(`${base}${u}${u}codeSplitting: {`);
			lines.push(`${base}${u}${u}${u}groups: {`);
			for (const e of entries) {
				lines.push(`${base}${u}${u}${u}${u}${e.key}: ${e.text},`);
			}
			lines.push(`${base}${u}${u}${u}},`);
			lines.push(`${base}${u}${u}},`);
			lines.push(`${base}${u}},`);
			const rawReplacement = lines.join(lineBreak);
			const replacement = normalizeObjectIndent(rawReplacement, unit, lineBreak);

			try {
				fs.appendFileSync("/tmp/migrate-manual-debug.txt", `REPLACEMENT:\n${replacement}\n----\n`);
			} catch (_e) {}

			const updated =
				original.slice(0, rollupPair.range().start.index - configNode.range().start.index) +
				replacement +
				original.slice(
					rollupPair.range().end.index -
						configNode.range().start.index +
						(original[rollupPair.range().end.index - configNode.range().start.index] === ","
							? 1
							: 0),
				);
			edits.push(configNode.replace(updated));
			continue;
		}
		// detect function-form manualChunks anywhere inside this config node
		if (original.includes("manualChunks(")) {
			needsWarning = true;
			break;
		}
	}

	if (!edits.length && !needsWarning) return null;

	if (needsWarning && !source.startsWith("// Expected warning:")) {
		const warned = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${source}`;
		return warned;
	}

	if (!edits.length) return null;

	return root.commitEdits(edits);
};

export default workflow;
