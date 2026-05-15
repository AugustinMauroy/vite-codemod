/**¨
 * @fileoverview not tested
 */
import type { SgNode } from "codemod:ast-grep";
import type JS from "codemod:ast-grep/langs/javascript";

export type ObjectNodeInfo = {
  valueNode: SgNode<JS>;
  openBrace: number;
  closeBrace: number;
};

export type TextInsertion = {
  index: number;
  text: string;
};

export function findMatchingBraceIndex(node: SgNode<JS>): number {
  return node.range().end.index - 1;
}

export function findObjectProperty(node: SgNode<JS>, propertyName: string): ObjectNodeInfo | null {
  const objectPair = node
    .findAll({
      rule: { kind: "pair" },
    })
    .find((candidate) => {
      const keyNode = candidate.field("key");
      const valueNode = candidate.field("value");

      return (
        keyNode?.kind() === "property_identifier" &&
        keyNode.text() === propertyName &&
        valueNode?.kind() === "object"
      );
    });

  if (!objectPair) return null;

  const valueNode = objectPair.field("value");
  if (!valueNode) return null;

  return {
    valueNode,
    openBrace: valueNode.range().start.index,
    closeBrace: findMatchingBraceIndex(valueNode),
  };
}

export function normalizeObjectIndent(text: string, indent: string, lineBreak: string) {
  const lines = text.split(lineBreak);
  let depth = 0;
  const out: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();

    if (line.length === 0) {
      out.push("");
      continue;
    }

    const leadingCloses = (line.match(/^\}+/) || [""])[0].length;
    const prefixDepth = Math.max(0, depth - leadingCloses);

    const prefix = indent.repeat(prefixDepth);
    out.push(prefix + line);

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    depth = Math.max(0, depth + opens - closes);
  }

  return out.join(lineBreak);
}

export function applyInsertions(source: string, insertions: TextInsertion[]): string {
  let nextSource = source;
  for (const insertion of insertions.sort((l, r) => r.index - l.index)) {
    nextSource = nextSource.slice(0, insertion.index) + insertion.text + nextSource.slice(insertion.index);
  }
  return nextSource;
}

export function findPairByKey(objectNode: SgNode<JS>, keyName: string): SgNode<JS> | null {
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

export function removePairFromSource(source: string, pairNode: SgNode<JS>, baseOffset: number): string | null {
  const start = pairNode.range().start.index - baseOffset;
  let end = pairNode.range().end.index - baseOffset;
  if (start < 0 || end < 0) return null;

  // Include a trailing comma if present
  if (end < source.length && source[end] === ",") {
    end += 1;
  } else if (start - 1 >= 0 && source[start - 1] === ",") {
    // Or include a leading comma
    return source.slice(0, start - 1) + source.slice(end);
  }

  return source.slice(0, start) + source.slice(end);
}
