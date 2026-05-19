import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

type TextEdit = { start: number; end: number; text: string };

function applyTextEdits(source: string, edits: TextEdit[]): string {
	let next = source;
	for (const e of edits.sort((a, b) => b.start - a.start)) {
		next = next.slice(0, e.start) + e.text + next.slice(e.end);
	}
	return next;
}

function findPairByKey(obj: SgNode<JS>, keyName: string): SgNode<JS> | null {
	// search for plain pairs
	const pairs = obj.findAll({ rule: { kind: "pair" } });
	for (const p of pairs) {
		const key = p.field("key");
		if (!key) continue;
		if (key.text() === keyName) return p;
	}
	// also search for method definitions (shorthand methods like `customResolver() {}`)
	const methods = obj.findAll({ rule: { kind: "method_definition" } });
	for (const m of methods) {
		const name = m.field("name");
		if (!name) continue;
		if (name.text() === keyName) return m as unknown as SgNode<JS>;
	}
	return null;
}

const WARNING = "// Warning: resolve.alias customResolver must be rewritten as a plugin.";

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const source = root.text();
	const lineBreak = source.includes("\r\n") ? "\r\n" : "\n";
	// use conservative string-based transforms for this codemod's cases
	let needsWarning = false;

	// detect resolve.alias customResolver via AST
	for (const call of root.findAll({ rule: { kind: "call_expression" } })) {
		if (call.field("function")?.text() !== "defineConfig") continue;
		const args = call.field("arguments");
		if (!args) continue;
		const cfg = args.children().find((c) => c.isNamed() && c.kind() === "object") as
			| SgNode<JS>
			| undefined;
		if (!cfg) continue;

		const resolvePair = findPairByKey(cfg, "resolve");
		if (resolvePair) {
			const resolveObj = resolvePair.field("value");
			if (resolveObj && resolveObj.kind() === "object") {
				const aliasPair = findPairByKey(resolveObj, "alias");
				if (aliasPair) {
					const aliasVal = aliasPair.field("value");
					if (aliasVal && aliasVal.kind() === "array") {
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
