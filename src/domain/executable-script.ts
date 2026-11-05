// Modified: 2026-11-05 (chance). Publish executable JavaScript without install
// declarations/development banners; retain legally required license notices.
import ts from "typescript";

export function executableScript(source: string): string {
  const input = source
    .replace(/^\uFEFF/, "")
    .replace(/^#![^\r\n]*(?:\r?\n|$)/gm, "");
  const tree = ts.createSourceFile(
    "target.js",
    input,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const licenses = new Set<string>();
  const visit = (node: ts.Node) => {
    for (const range of ts.getLeadingCommentRanges(input, node.pos) ?? []) {
      const comment = input.slice(range.pos, range.end);
      if (
        /SPDX-License-Identifier|@license|@preserve|copyright|permission is hereby granted|redistribution and use/i.test(
          comment,
        )
      )
        licenses.add(comment);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  const body = ts
    .createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
    .printFile(tree);
  return [...licenses, body.trim()].join("\n") + "\n";
}
