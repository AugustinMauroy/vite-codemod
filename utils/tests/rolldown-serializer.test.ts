import { ok as assert } from "assert";
import { parse } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import buildRolldownSnippetFromSource from "../src/ast-grep/rolldown-serializer";

function parseProgram(src: string) {
    const root = parse<JS>("javascript", src);
    return root.root();
}

function testBasicPreserve() {
    const src = `const cfg = { optimizeDeps: { esbuildOptions: {\n        // feature flags\n        define: { __DEV__: \"true\" }, // inline comment\n        keepNames: true\n    } } };`;
    const root = parseProgram(src);
    const obj = root.findAll({ rule: { kind: "object" } })[0];
    const optimizeDeps = obj.findAll({ rule: { kind: "pair" } }).find((p) => p.field && p.field("key")?.text() === "optimizeDeps");
    if (!optimizeDeps) throw new Error("optimizeDeps not found");
    const esbuildPair = optimizeDeps.field!("value")!.findAll({ rule: { kind: "pair" } }).find((p) => p.field && p.field("key")?.text() === "esbuildOptions");
    if (!esbuildPair) throw new Error("esbuildOptions not found");
    const esbuildObject = esbuildPair.field!("value") as any;
    const snippet = buildRolldownSnippetFromSource(esbuildObject, root.text(), "\n");
    assert(snippet !== null, "Snippet should be produced");
    assert(snippet!.includes("// feature flags"), "Should preserve leading comment");
    assert(snippet!.includes("// inline comment"), "Should preserve trailing inline comment");
}

function run() {
    testBasicPreserve();
    console.log("rolldown-serializer.test.ts: all assertions passed");
}

try {
    run();
} catch (e) {
    console.error(e);
    process.exit(1);
}
