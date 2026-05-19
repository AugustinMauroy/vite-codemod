import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import { findPairByKey } from "./object-helpers";

function captureLeadingComments(startIndex: number, src: string, lineBreak: string) {
	let i = startIndex;
	const collected: string[] = [];
	while (true) {
		const prevNl = src.lastIndexOf(lineBreak, i - 1);
		const lineStart = prevNl === -1 ? 0 : prevNl + lineBreak.length;
		const line = src.slice(lineStart, i);
		if (/^\s*(\/\/|\/\*)/.test(line) || line.trim() === "") {
			collected.unshift(line);
			if (prevNl === -1) {
				i = -1;
				break;
			}
			i = prevNl;
			continue;
		}
		break;
	}
	if (collected.length === 0) return "";
	return collected.join(lineBreak) + lineBreak;
}

function sliceWithTrailingLineComment(node: SgNode<JS>, src: string, lineBreak: string) {
	const end = node.range().end.index;
	const nl = src.indexOf(lineBreak, end);
	if (nl === -1) return src.slice(node.range().start.index, end).trim();
	const after = src.slice(end, nl);
	if (after.includes("//") || after.includes("/*"))
		return src.slice(node.range().start.index, nl).trim();
	return src.slice(node.range().start.index, end).trim();
}

export function buildRolldownSnippetFromSource(
	esbuildObject: SgNode<JS>,
	src: string,
	lineBreak: string,
): string | null {
	const conditions = findPairByKey(esbuildObject, "conditions");
	const define = findPairByKey(esbuildObject, "define");
	const keepNames = findPairByKey(esbuildObject, "keepNames");
	const mainFields = findPairByKey(esbuildObject, "mainFields");
	const platform = findPairByKey(esbuildObject, "platform");
	const preserveSymlinks = findPairByKey(esbuildObject, "preserveSymlinks");
	const resolveExtensions = findPairByKey(esbuildObject, "resolveExtensions");

	const parts: string[] = [];

	if (keepNames) {
		const keyStart = keepNames.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			keepNames.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		parts.push(
			`${leading ? leading + lineBreak : ""}output: {${lineBreak}keepNames: ${val},${lineBreak}},`,
		);
	}

	if (platform) {
		const keyStart = platform.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			platform.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		parts.push(`${leading ? leading + lineBreak : ""}platform: ${val},`);
	}

	const resolveParts: string[] = [];
	if (conditions) {
		const keyStart = conditions.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			conditions.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		resolveParts.push(`${leading ? leading + lineBreak : ""}conditionNames: ${val},`);
	}
	if (resolveExtensions) {
		const keyStart = resolveExtensions.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			resolveExtensions.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		resolveParts.push(`${leading ? leading + lineBreak : ""}extensions: ${val},`);
	}
	if (mainFields) {
		const keyStart = mainFields.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			mainFields.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		resolveParts.push(`${leading ? leading + lineBreak : ""}mainFields: ${val},`);
	}
	if (preserveSymlinks) {
		const v = preserveSymlinks.field("value")?.text?.();
		if (v === "true") {
			resolveParts.push(`symlinks: false,`);
		} else if (v === "false") {
			resolveParts.push(`symlinks: true,`);
		}
	}
	if (resolveParts.length > 0) {
		parts.push(`resolve: {${lineBreak}${resolveParts.join(lineBreak)}${lineBreak}},`);
	}

	if (define) {
		const keyStart = define.range().start.index;
		const leading = captureLeadingComments(keyStart, src, lineBreak);
		const val = sliceWithTrailingLineComment(
			define.field("value") as SgNode<JS>,
			src,
			lineBreak,
		).replace(/,+\s*$/s, "");
		parts.push(
			`${leading ? leading + lineBreak : ""}transform: {${lineBreak}define: ${val},${lineBreak}},`,
		);
	}

	if (parts.length === 0) return null;
	return `rolldownOptions: {${lineBreak}${parts.join(lineBreak)}${lineBreak}},`;
}

export default buildRolldownSnippetFromSource;
