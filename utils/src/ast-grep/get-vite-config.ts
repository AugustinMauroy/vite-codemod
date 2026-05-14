import type { SgNode } from 'codemod:ast-grep';
import type JS from "codemod:ast-grep/langs/javascript";
import { getImport } from '@jssg/utils/javascript/imports';

export function getViteConfig(node: SgNode<JS>): Array<SgNode<JS>> | null {
	const program =
		node.is("program")
			? (node as SgNode<JS, "program">)
			: (node.getRoot().root() as SgNode<JS, "program">);

	const defineConfigImport = getImport(program, {
		type: "named",
		name: "defineConfig",
		from: "vite",
	});

	if (!defineConfigImport || defineConfigImport.isNamespace) {
		return null;
	}

	const importedAlias = defineConfigImport.alias;
	const configs: Array<SgNode<JS>> = [];

	for (const callExpression of program.findAll({
		rule: {
			kind: "call_expression",
			has: {
				field: "function",
				kind: "identifier",
			},
		},
	})) {
		const functionNode = callExpression.field("function");
		if (!functionNode || functionNode.kind() !== "identifier" || functionNode.text() !== importedAlias) {
			continue;
		}

		const args = callExpression.field("arguments");
		if (!args) {
			continue;
		}

		for (const arg of args.children()) {
			if (arg.isNamed()) {
				configs.push(arg as SgNode<JS>);
			}
		}
	}

	return configs.length > 0 ? configs : null;
}

