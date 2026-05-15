import { ok as assert } from "assert";
import { parse } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";
import {
	findMatchingBraceIndex,
	findObjectProperty,
	normalizeObjectIndent,
	applyInsertions,
	findPairByKey,
	removePairFromSource,
	type TextInsertion,
} from "../src/ast-grep/object-helpers";

function parseProgram(src: string) {
	const root = parse<JS>("javascript", src);
	return root.root();
}

// ============================================================================
// findMatchingBraceIndex Tests
// ============================================================================

function testFindMatchingBraceIndexSimpleObject() {
	const program = parseProgram("const obj = { a: 1 };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const closeBraceIndex = findMatchingBraceIndex(objectNode);
	const fullText = program.text();

	// closeBraceIndex is relative to the full source, not the node
	assert(fullText[closeBraceIndex] === "}", "Expected closing brace at calculated index");
}

function testFindMatchingBraceIndexNestedObject() {
	const program = parseProgram("const obj = { nested: { inner: 2 } };");
	const objectNodes = program.findAll({ rule: { kind: "object" } });

	// Find the outer object (first one)
	const outerObject = objectNodes[0];
	if (!outerObject) throw new Error("No outer object found");

	const closeBraceIndex = findMatchingBraceIndex(outerObject);
	const fullText = program.text();

	assert(fullText[closeBraceIndex] === "}", "Expected closing brace for outer object");
}

function testFindMatchingBraceIndexEmptyObject() {
	const program = parseProgram("const obj = {};");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const closeBraceIndex = findMatchingBraceIndex(objectNode);
	const fullText = program.text();

	assert(fullText[closeBraceIndex] === "}", "Expected closing brace");
}

// ============================================================================
// findObjectProperty Tests
// ============================================================================

function testFindObjectPropertySimpleProperty() {
	const program = parseProgram("const obj = { server: { port: 5173 } };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const result = findObjectProperty(objectNode, "server");

	assert(result !== null, "Should find 'server' property");
	assert(result.valueNode.kind() === "object", "Property value should be an object");
	assert(result.valueNode.text() === "{ port: 5173 }", "Property value text should match");
}

function testFindObjectPropertyNotFound() {
	const program = parseProgram("const obj = { server: { port: 5173 } };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const result = findObjectProperty(objectNode, "nonexistent");

	assert(result === null, "Should return null when property not found");
}

function testFindObjectPropertyValueNotObject() {
	const program = parseProgram("const obj = { port: 5173 };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const result = findObjectProperty(objectNode, "port");

	assert(result === null, "Should return null when property value is not an object");
}

function testFindObjectPropertyMultipleProperties() {
	const program = parseProgram("const obj = { a: { x: 1 }, b: { y: 2 }, c: 3 };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const resultA = findObjectProperty(objectNode, "a");
	const resultB = findObjectProperty(objectNode, "b");
	const resultC = findObjectProperty(objectNode, "c");

	assert(resultA !== null, "Should find property 'a'");
	assert(resultB !== null, "Should find property 'b'");
	assert(resultC === null, "Property 'c' is not an object");
	assert(resultA.valueNode.text() === "{ x: 1 }", "Property 'a' value should match");
	assert(resultB.valueNode.text() === "{ y: 2 }", "Property 'b' value should match");
}

function testFindObjectPropertyBraceIndices() {
	const program = parseProgram("const obj = { server: { port: 5173 } };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const result = findObjectProperty(objectNode, "server");

	assert(result !== null, "Should find property");
	assert(result.openBrace >= 0, "openBrace should be non-negative");
	assert(result.closeBrace > result.openBrace, "closeBrace should be after openBrace");
	const fullText = program.text();
	assert(fullText[result.openBrace] === "{", "Character at openBrace should be '{'");
	assert(fullText[result.closeBrace] === "}", "Character at closeBrace should be '}'");
}

// ============================================================================
// normalizeObjectIndent Tests
// ============================================================================

function testNormalizeObjectIndentWithSpaces() {
	const input = `{
    a: 1,
    b: 2
  }`;
	const result = normalizeObjectIndent(input, "  ", "\n");
	const lines = result.split("\n");

	assert(lines[0] === "{", "First line should be opening brace");
	assert(lines[1] === "  a: 1,", "Second line should have 2-space indent");
	assert(lines[2] === "  b: 2", "Third line should have 2-space indent");
	assert(lines[3] === "}", "Last line should be closing brace");
}

function testNormalizeObjectIndentWithTabs() {
	const input = `{
    a: 1,
    b: 2
  }`;
	const result = normalizeObjectIndent(input, "\t", "\n");
	const lines = result.split("\n");

	assert(lines[0] === "{", "First line should be opening brace");
	assert(lines[1] === "\ta: 1,", "Second line should have tab indent");
	assert(lines[2] === "\tb: 2", "Third line should have tab indent");
	assert(lines[3] === "}", "Last line should be closing brace");
}

function testNormalizeObjectIndentNested() {
	const input = `{
  a: {
    b: 1
  }
}`;
	const result = normalizeObjectIndent(input, "  ", "\n");
	const lines = result.split("\n");

	assert(lines[1] === "  a: {", "Nested property should have 2-space indent");
	assert(lines[2] === "    b: 1", "Nested value should have 4-space indent");
	assert(lines[3] === "  }", "Closing brace of nested object should have 2-space indent");
}

function testNormalizeObjectIndentMultipleClosingBraces() {
	const input = `{
  a: {
    b: {
      c: 1
    }
  }
}`;
	const result = normalizeObjectIndent(input, "  ", "\n");
	const lines = result.split("\n");

	assert(lines[4] === "  }", "First closing brace should have 2-space indent");
	assert(lines[5] === "}", "Final closing brace should have no indent");
}

function testNormalizeObjectIndentEmptyLines() {
	const input = `{
  a: 1,

  b: 2
}`;
	const result = normalizeObjectIndent(input, "  ", "\n");
	const lines = result.split("\n");

	assert(lines[2] === "", "Empty lines should be preserved as empty");
	assert(lines[3] === "  b: 2", "Line after empty line should be properly indented");
}

function testNormalizeObjectIndentCRLFLineBreaks() {
	const input = `{\r\n  a: 1,\r\n  b: 2\r\n}`;
	const result = normalizeObjectIndent(input, "  ", "\r\n");

	assert(result.includes("\r\n"), "Should preserve CRLF line breaks");
	const lines = result.split("\r\n");
	assert(lines[1] === "  a: 1,", "Should normalize indentation with CRLF");
}

function testNormalizeObjectIndentComplexStructure() {
	const input = `{
x: {
y: 1,
z: {
w: 2
}
},
a: 3
}`;
	const result = normalizeObjectIndent(input, "  ", "\n");
	const lines = result.split("\n");

	// Verify structure is correct
	assert(lines[0] === "{", "Opening brace");
	assert(lines[1] === "  x: {", "First property");
	assert(lines[2] === "    y: 1,", "Nested property");
	assert(lines[3] === "    z: {", "Second nested object");
	assert(lines[4] === "      w: 2", "Double nested property");
	assert(lines[5] === "    }", "Close nested object");
	assert(lines[6] === "  }", "Close first object");
	assert(lines[7] === "  a: 3", "Second top-level property");
	assert(lines[8] === "}", "Closing brace");
}

// ============================================================================
// applyInsertions Tests
// ============================================================================

function testApplyInsertionsSingleInsertion() {
	const source = "const x = 1;";
	const insertions: TextInsertion[] = [{ index: 6, text: "y = " }];
	const result = applyInsertions(source, insertions);

	assert(result === "const y = x = 1;", "Should insert text at correct position");
}

function testApplyInsertionsMultipleInsertions() {
	const source = "abc";
	const insertions: TextInsertion[] = [
		{ index: 1, text: "X" },
		{ index: 2, text: "Y" },
	];
	const result = applyInsertions(source, insertions);

	// Insertions should be applied in reverse order (highest index first)
	assert(result === "aXYbc", "Should apply insertions in correct order");
}

function testApplyInsertionsAtBeginning() {
	const source = "world";
	const insertions: TextInsertion[] = [{ index: 0, text: "hello " }];
	const result = applyInsertions(source, insertions);

	assert(result === "hello world", "Should insert at beginning");
}

function testApplyInsertionsAtEnd() {
	const source = "hello";
	const insertions: TextInsertion[] = [{ index: 5, text: " world" }];
	const result = applyInsertions(source, insertions);

	assert(result === "hello world", "Should insert at end");
}

function testApplyInsertionsEmptyInsertions() {
	const source = "hello";
	const insertions: TextInsertion[] = [];
	const result = applyInsertions(source, insertions);

	assert(result === "hello", "Should return source unchanged when no insertions");
}

function testApplyInsertionsManyInsertions() {
	const source = "0123456789";
	const insertions: TextInsertion[] = [
		{ index: 2, text: "X" },
		{ index: 5, text: "Y" },
		{ index: 8, text: "Z" },
	];
	const result = applyInsertions(source, insertions);

	// Applied in reverse: Z first, then Y, then X
	assert(result === "01X234Y567Z89", "Should apply multiple insertions correctly");
}

// ============================================================================
// findPairByKey Tests
// ============================================================================

function testFindPairByKeySimple() {
	const program = parseProgram("const obj = { server: { port: 5173 } };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pair = findPairByKey(objectNode, "server");

	assert(pair !== null, "Should find pair with key 'server'");
	assert(pair.kind() === "pair", "Result should be a pair node");
}

function testFindPairByKeyNotFound() {
	const program = parseProgram("const obj = { server: { port: 5173 } };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pair = findPairByKey(objectNode, "nonexistent");

	assert(pair === null, "Should return null when key not found");
}

function testFindPairByKeyMultipleProperties() {
	const program = parseProgram("const obj = { a: 1, b: 2, c: 3 };");
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pairA = findPairByKey(objectNode, "a");
	const pairB = findPairByKey(objectNode, "b");
	const pairC = findPairByKey(objectNode, "c");

	assert(pairA !== null, "Should find pair 'a'");
	assert(pairB !== null, "Should find pair 'b'");
	assert(pairC !== null, "Should find pair 'c'");
}

function testFindPairByKeyComplex() {
	const program = parseProgram(`const obj = {
		plugins: [],
		server: { port: 5173 },
		build: { target: 'es2020' }
	};`);
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const buildPair = findPairByKey(objectNode, "build");

	assert(buildPair !== null, "Should find 'build' pair");
	assert(buildPair.text().includes("target"), "Pair should contain 'target'");
}

// ============================================================================
// removePairFromSource Tests
// ============================================================================

function testRemovePairFromSourceTrailingComma() {
	const source = `{
  a: 1,
  b: 2,
  c: 3
}`;
	const program = parseProgram(`const obj = ${source};`);
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pairB = findPairByKey(objectNode, "b");
	if (!pairB) throw new Error("Pair 'b' not found");

	// Get the offset of the object node
	const baseOffset = objectNode.range().start.index;
	const result = removePairFromSource(source, pairB, baseOffset);

	assert(result !== null, "Should remove pair with trailing comma");
	assert(!result.includes("b: 2"), "Result should not contain 'b: 2'");
	assert(result.includes("a: 1"), "Result should still contain 'a: 1'");
	assert(result.includes("c: 3"), "Result should still contain 'c: 3'");
}

function testRemovePairFromSourceLeadingComma() {
	const source = `{
  a: 1,
  b: 2
}`;
	const program = parseProgram(`const obj = ${source};`);
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pairB = findPairByKey(objectNode, "b");
	if (!pairB) throw new Error("Pair 'b' not found");

	const baseOffset = objectNode.range().start.index;
	const result = removePairFromSource(source, pairB, baseOffset);

	assert(result !== null, "Should remove pair with leading comma");
	assert(!result.includes("b: 2"), "Result should not contain 'b: 2'");
	assert(result.includes("a: 1"), "Result should still contain 'a: 1'");
}

function testRemovePairFromSourceFirstElement() {
	const source = `{
  a: 1,
  b: 2
}`;
	const program = parseProgram(`const obj = ${source};`);
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pairA = findPairByKey(objectNode, "a");
	if (!pairA) throw new Error("Pair 'a' not found");

	const baseOffset = objectNode.range().start.index;
	const result = removePairFromSource(source, pairA, baseOffset);

	assert(result !== null, "Should remove first pair");
	assert(!result.includes("a: 1"), "Result should not contain 'a: 1'");
	assert(result.includes("b: 2"), "Result should still contain 'b: 2'");
}

function testRemovePairFromSourceInvalidOffset() {
	const source = "{ a: 1 }";
	const program = parseProgram(`const obj = ${source};`);
	const objectNode = program.findAll({ rule: { kind: "object" } })[0];
	if (!objectNode) throw new Error("No object node found");

	const pairA = findPairByKey(objectNode, "a");
	if (!pairA) throw new Error("Pair 'a' not found");

	// Use an offset that makes the indices negative
	const result = removePairFromSource(source, pairA, 1000);

	assert(result === null, "Should return null when indices are invalid");
}

// ============================================================================
// Test Runner
// ============================================================================

function run() {
	// findMatchingBraceIndex tests
	testFindMatchingBraceIndexSimpleObject();
	testFindMatchingBraceIndexNestedObject();
	testFindMatchingBraceIndexEmptyObject();

	// findObjectProperty tests
	testFindObjectPropertySimpleProperty();
	testFindObjectPropertyNotFound();
	testFindObjectPropertyValueNotObject();
	testFindObjectPropertyMultipleProperties();
	testFindObjectPropertyBraceIndices();

	// normalizeObjectIndent tests
	testNormalizeObjectIndentWithSpaces();
	testNormalizeObjectIndentWithTabs();
	testNormalizeObjectIndentNested();
	testNormalizeObjectIndentMultipleClosingBraces();
	testNormalizeObjectIndentEmptyLines();
	testNormalizeObjectIndentCRLFLineBreaks();
	testNormalizeObjectIndentComplexStructure();

	// applyInsertions tests
	testApplyInsertionsSingleInsertion();
	testApplyInsertionsMultipleInsertions();
	testApplyInsertionsAtBeginning();
	testApplyInsertionsAtEnd();
	testApplyInsertionsEmptyInsertions();
	testApplyInsertionsManyInsertions();

	// findPairByKey tests
	testFindPairByKeySimple();
	testFindPairByKeyNotFound();
	testFindPairByKeyMultipleProperties();
	testFindPairByKeyComplex();

	// removePairFromSource tests
	testRemovePairFromSourceTrailingComma();
	testRemovePairFromSourceLeadingComma();
	testRemovePairFromSourceFirstElement();
	testRemovePairFromSourceInvalidOffset();

	console.log("object-helpers.test.ts: all assertions passed");
}

try {
	run();
} catch (error) {
	console.error(error);
	process.exit(1);
}
