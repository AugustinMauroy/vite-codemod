import type { Codemod, SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

type TextEdit = {
	start: number;
	end: number;
	text: string;
};

const WARNING = "// Warning: Dynamic external module lists cannot be normalized automatically.";

function applyTextEdits(source: string, edits: TextEdit[]): string {
	let nextSource = source;
	for (const edit of edits.sort((left, right) => right.start - left.start)) {
		nextSource = nextSource.slice(0, edit.start) + edit.text + nextSource.slice(edit.end);
	}
	return nextSource;
}

function findPairByKey(objectNode: SgNode<JS>, keyName: string): SgNode<JS> | null {
	const pairs = objectNode.findAll({ rule: { kind: "pair" } });
	for (const pair of pairs) {
		const key = pair.field("key");
		if (!key) continue;
		if (key.kind() !== "property_identifier") continue;
		if (key.text() !== keyName) continue;
		return pair;
	}
	return null;
}

function getLeadingWhitespace(source: string, index: number): string {
	const lineStart = Math.max(0, source.lastIndexOf("\n", index - 1) + 1);
	return source.slice(lineStart, index).match(/^[ \t]*/)?.[0] ?? "";
}

function getIndentUnit(leading: string): string {
	return leading.includes("\t") ? "\t" : "  ";
}

const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root() as SgNode<JS, "program">;
	const sourceText = root.text();
	const lineBreak = sourceText.includes("\r\n") ? "\r\n" : "\n";
	const edits: TextEdit[] = [];
	let didInsertPlugin = false;

	const pluginCalls = root
		.findAll({ rule: { kind: "call_expression" } })
		.filter((call) => call.field("function")?.text() === "esmExternalRequirePlugin");
	const hasPluginCall = pluginCalls.length > 0;

	let needsWarning = false;
	for (const call of pluginCalls) {
		const argsNode = call.field("arguments");
		if (!argsNode) continue;
		const objectArg = argsNode
			.children()
			.find((child) => child.isNamed() && child.kind() === "object") as SgNode<JS> | undefined;
		if (!objectArg) continue;

		const externalPair = findPairByKey(objectArg, "external");
		if (!externalPair) continue;

		const externalValue = externalPair.field("value");
		if (!externalValue || externalValue.kind() !== "array") {
			needsWarning = true;
		}
	}

	if (!hasPluginCall) {
		for (const configCall of root.findAll({ rule: { kind: "call_expression" } })) {
			if (configCall.field("function")?.text() !== "defineConfig") continue;
			const argsNode = configCall.field("arguments");
			if (!argsNode) continue;

			const configObject = argsNode
				.children()
				.find((child) => child.isNamed() && child.kind() === "object") as SgNode<JS> | undefined;
			if (!configObject) continue;

			const pluginsPair = findPairByKey(configObject, "plugins");
			if (!pluginsPair) continue;

			const pluginsValue = pluginsPair.field("value");
			if (!pluginsValue || pluginsValue.kind() !== "array") continue;

			const arrayStart = pluginsValue.range().start.index;
			const arrayEnd = pluginsValue.range().end.index;
			const pluginsText = sourceText.slice(arrayStart, arrayEnd);
			if (pluginsText.includes("esmExternalRequirePlugin(")) break;

			const propIndent = getLeadingWhitespace(sourceText, pluginsPair.range().start.index);
			const indentUnit = getIndentUnit(propIndent);
			const itemIndent = `${propIndent}${indentUnit}`;
			const fieldIndent = `${itemIndent}${indentUnit}`;

			const pluginSnippet = [
				"[",
				`${itemIndent}esmExternalRequirePlugin({`,
				`${fieldIndent}external: ["react", "vue", /^node:/],`,
				`${itemIndent}}),`,
				`${propIndent}]`,
			].join(lineBreak);

			edits.push({
				start: arrayStart,
				end: arrayEnd,
				text: pluginSnippet,
			});
			didInsertPlugin = true;
			break;
		}

		if (didInsertPlugin) {
		for (const importNode of root.findAll({ rule: { kind: "import_statement" } })) {
			const sourceFragment = importNode.findAll({ rule: { kind: "string_fragment" } })[0];
			if (!sourceFragment || sourceFragment.text() !== "vite") continue;

			const importText = importNode.text();
			if (!importText.startsWith("import")) continue;
			if (!importText.includes("{") || !importText.includes("}")) continue;
			if (importText.includes("esmExternalRequirePlugin")) break;

			const match = importText.match(/\{([\s\S]*?)\}/);
			if (!match) continue;

			const specifiers = match[1]
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean);
			specifiers.push("esmExternalRequirePlugin");

			const updatedImport = importText.replace(/\{[\s\S]*?\}/, `{ ${specifiers.join(", ")} }`);
			edits.push({
				start: importNode.range().start.index,
				end: importNode.range().end.index,
				text: updatedImport,
			});
			break;
		}
		}
	}

	let updatedText = edits.length > 0 ? applyTextEdits(sourceText, edits) : sourceText;

	if (needsWarning && !updatedText.startsWith("// Expected warning:")) {
		updatedText = `// Expected warning:${lineBreak}${WARNING}${lineBreak}${updatedText}`;
	}

	if (updatedText === sourceText) return null;
	return updatedText;
};

export default workflow;
