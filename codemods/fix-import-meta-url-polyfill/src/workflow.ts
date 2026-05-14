import { getViteConfig } from "@vitejs/codemod-utils/ast-grep/get-vite-config";
import type { Codemod } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

const WARNING_COMMENT =
	"// Expected warning:\n// Warning: import.meta.url polyfills are only applicable to UMD/IIFE output.\n";

const INTRO_LINE =
	"intro: 'var __vite_import_meta_url__ = document.currentScript && document.currentScript.src',";

const DEFINE_BLOCK = "define: {\n    'import.meta.url': '__vite_import_meta_url__',\n  },";

function hasImportMetaPolyfill(configText: string): boolean {
	return (
		configText.includes("'import.meta.url': '__vite_import_meta_url__'") ||
		configText.includes('"import.meta.url": "__vite_import_meta_url__"')
	);
}

function hasIntroPolyfill(configText: string): boolean {
	return configText.includes("__vite_import_meta_url__ = document.currentScript && document.currentScript.src");
}

function isUmdOrIifeLibraryBuild(configText: string): boolean {
	return /formats\s*:\s*\[[^\]]*['"](?:umd|iife)['"][^\]]*\]/s.test(configText);
}

function hasLibraryFormats(configText: string): boolean {
	return /formats\s*:\s*\[[^\]]*\]/s.test(configText);
}

function findMatchingBraceIndex(text: string, openBraceIndex: number): number {
	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	let inTemplate = false;
	let escaped = false;

	for (let i = openBraceIndex; i < text.length; i++) {
		const ch = text[i];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (ch === "\\") {
			escaped = true;
			continue;
		}

		if (!inDouble && !inTemplate && ch === "'") {
			inSingle = !inSingle;
			continue;
		}

		if (!inSingle && !inTemplate && ch === '"') {
			inDouble = !inDouble;
			continue;
		}

		if (!inSingle && !inDouble && ch === "`") {
			inTemplate = !inTemplate;
			continue;
		}

		if (inSingle || inDouble || inTemplate) {
			continue;
		}

		if (ch === "{") {
			depth++;
			continue;
		}

		if (ch === "}") {
			depth--;
			if (depth === 0) {
				return i;
			}
		}
	}

	return -1;
}

function addRolldownIntroToBuild(configText: string): string {
	const buildMatch = /\bbuild\s*:\s*\{/.exec(configText);
	if (!buildMatch) {
		return configText;
	}

	const buildOpenBraceIndex = configText.indexOf("{", buildMatch.index);
	if (buildOpenBraceIndex < 0) {
		return configText;
	}

	const buildCloseBraceIndex = findMatchingBraceIndex(configText, buildOpenBraceIndex);
	if (buildCloseBraceIndex < 0) {
		return configText;
	}

	const injection =
		"  rolldownOptions: {\n      output: {\n        " +
		INTRO_LINE +
		"\n      },\n    },\n  ";

	return `${configText.slice(0, buildCloseBraceIndex)}${injection}${configText.slice(buildCloseBraceIndex)}`;
}

function addDefinePolyfill(configText: string): string {
	const lastCloseBraceIndex = configText.lastIndexOf("}");
	if (lastCloseBraceIndex < 0) {
		return configText;
	}

	const injection = `  ${DEFINE_BLOCK}\n`;
	return `${configText.slice(0, lastCloseBraceIndex)}${injection}${configText.slice(lastCloseBraceIndex)}`;
}

/**
 * @link https://vite.dev/guide/migration#import-meta-url-in-umd-iife
 */
const workflow: Codemod<JS> = async (rootNode) => {
	const root = rootNode.root();
	const viteConfigs = getViteConfig(root);

	if (!viteConfigs?.length) {
		return null;
	}

	const edits = [];
	let shouldWarnNonUmd = false;

	for (const configNode of viteConfigs) {
		const configText = configNode.text();

		if (!isUmdOrIifeLibraryBuild(configText)) {
			if (hasLibraryFormats(configText)) {
				shouldWarnNonUmd = true;
			}
			continue;
		}

		if (hasImportMetaPolyfill(configText) && hasIntroPolyfill(configText)) {
			continue;
		}

		let nextConfigText = configText;

		if (!hasIntroPolyfill(nextConfigText)) {
			nextConfigText = addRolldownIntroToBuild(nextConfigText);
		}

		if (!hasImportMetaPolyfill(nextConfigText)) {
			nextConfigText = addDefinePolyfill(nextConfigText);
		}

		if (nextConfigText !== configText) {
			edits.push(configNode.replace(nextConfigText));
		}
	}

	let result = edits.length ? root.commitEdits(edits) : root.text();

	if (shouldWarnNonUmd && !result.startsWith(WARNING_COMMENT)) {
		result = `${WARNING_COMMENT}${result}`;
	}

	return result === root.text() ? null : result;
};

export default workflow;
