import { ok as assert } from "assert";
import { parse } from "codemod:ast-grep";
import type { SgNode } from "codemod:ast-grep";
import type JS from "@codemod.com/jssg-types/langs/javascript";
import { getViteConfig } from "../src/ast-grep/get-vite-config";

function parseProgram(src: string) {
	const root = parse<JS>("javascript", src);
	return root.root();
}

function assertConfigTexts(result: Array<SgNode<JS>> | null, expected: string[]) {
	assert(result !== null, "Expected non-null result");
	const texts = result.map((node) => node.text());
	assert(
		texts.length === expected.length,
		`Expected ${expected.length} config argument(s), got ${texts.length}`,
	);

	for (let i = 0; i < expected.length; i++) {
		assert(
			texts[i] === expected[i],
			`Expected argument ${i} to be ${expected[i]}, got ${texts[i]}`,
		);
	}
}

function testReturnsNullWhenNoViteImport() {
	const program = parseProgram("const x = 1;\nconsole.log(x);\n");
	const res = getViteConfig(program);
	assert(res === null, "Should return null when defineConfig from vite is not imported");
}

function testReturnsNullWhenDefineConfigImportedFromOtherModule() {
	const program = parseProgram(
		["import { defineConfig } from 'other-lib';", "export default defineConfig({ a: 1 });"].join(
			"\n",
		),
	);

	const res = getViteConfig(program);
	assert(res === null, "Should return null when defineConfig is not imported from vite");
}

function testFindsDefineConfigArgumentFromVite() {
	const program = parseProgram(
		[
			"import { defineConfig } from 'vite';",
			"export default defineConfig({ server: { port: 5173 } });",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ server: { port: 5173 } }"]);
}

function testFindsDefineConfigArgumentFromAliasedViteImport() {
	const program = parseProgram(
		["import { defineConfig as cfg } from 'vite';", "export default cfg({ plugins: [] });"].join(
			"\n",
		),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ plugins: [] }"]);
}

function testAliasMatchCollectsCallsByIdentifierText() {
	const program = parseProgram(
		[
			"import { defineConfig as cfg } from 'vite';",
			"function test() {",
			"  const cfg = (x) => x;",
			"  return cfg({ local: true });",
			"}",
			"export default cfg({ exported: true });",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ local: true }", "{ exported: true }"]);
}

function testReturnsAllCallsBoundToViteImport() {
	const program = parseProgram(
		[
			"import { defineConfig } from 'vite';",
			"const a = defineConfig({ one: 1 });",
			"const b = defineConfig({ two: 2 });",
			"export default b;",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ one: 1 }", "{ two: 2 }"]);
}

function testFindsDynamicImportDestructuredDefineConfig() {
	const program = parseProgram(
		[
			"async function load() {",
			"  const { defineConfig } = await import('vite');",
			"  return defineConfig({ dyn: true, level: 1 });",
			"}",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ dyn: true, level: 1 }"]);
}

function testFindsDynamicImportAliasedDefineConfig() {
	const program = parseProgram(
		[
			"async function loadA() {",
			"  const { defineConfig: crazyCfg } = await import('vite');",
			"  return crazyCfg({ dynAlias: 'yes' });",
			"}",
			"async function loadB() {",
			"  const { defineConfig: crazyCfg } = await import('vite');",
			"  return crazyCfg({ dynAlias: 'double' });",
			"}",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assertConfigTexts(res, ["{ dynAlias: 'yes' }", "{ dynAlias: 'double' }"]);
}

function testIgnoresDynamicImportFromOtherModule() {
	const program = parseProgram(
		[
			"async function load() {",
			"  const { defineConfig } = await import('not-vite');",
			"  return defineConfig({ shouldNotMatch: true });",
			"}",
		].join("\n"),
	);

	const res = getViteConfig(program);
	assert(res === null, "Should return null for dynamic imports not coming from vite");
}

function run() {
	testReturnsNullWhenNoViteImport();
	testReturnsNullWhenDefineConfigImportedFromOtherModule();
	testFindsDefineConfigArgumentFromVite();
	testFindsDefineConfigArgumentFromAliasedViteImport();
	testAliasMatchCollectsCallsByIdentifierText();
	testReturnsAllCallsBoundToViteImport();
	testFindsDynamicImportDestructuredDefineConfig();
	testFindsDynamicImportAliasedDefineConfig();
	testIgnoresDynamicImportFromOtherModule();

	console.log("utils/tests/get-vite-config.test.ts: all assertions passed");
}

try {
	run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
