import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

export type TextEdit = { start: number; end: number; text: string };

export function applyTextEdits(source: string, edits: TextEdit[]): string {
	let next = source;
	for (const e of edits.sort((a, b) => b.start - a.start)) {
		next = next.slice(0, e.start) + e.text + next.slice(e.end);
	}
	return next;
}

export function findPairByKey(obj: SgNode<JS>, keyName: string): SgNode<JS> | null {
	const pairs = obj.findAll({ rule: { kind: "pair" } });
	for (const p of pairs) {
		const key = p.field("key");
		if (!key) continue;
		if (key.text() === keyName) return p;
	}
	// method definitions (shorthand methods)
	const methods = obj.findAll({ rule: { kind: "method_definition" } });
	for (const m of methods) {
		const name = m.field("name");
		if (!name) continue;
		if (name.text() === keyName) return m as unknown as SgNode<JS>;
	}
	return null;
}

export function getLeadingWhitespace(source: string, index: number): string {
	const lineStart = Math.max(0, source.lastIndexOf("\n", index - 1) + 1);
	return source.slice(lineStart, index).match(/^[ \t]*/)?.[0] ?? "";
}

export function getIndentUnit(leading: string): string {
	return leading.includes("\t") ? "\t" : "  ";
}

export default applyTextEdits;
