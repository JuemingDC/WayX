// Modified: 2026-11-02 (chance). An untouched Loon/QX response returned directly
// to $done is a pass-through, not an arbitrary completion/header dictionary.
import ts from "typescript";
import { scriptHostLayouts, type ScriptClient } from "../domain/script-api.ts";
import { valueSymbol, safePresenceUse } from "./script-analysis.ts";
export function originalContextCompletionContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  options: {
    from: string;
    phase: string;
    binary?: boolean;
    responseBody?: boolean;
  },
) {
  const calls = new Set<ts.CallExpression>();
  const role = "$response";
  if (
    !["qx", "loon"].includes(options.from) ||
    options.phase !== "response" ||
    options.binary ||
    options.responseBody !== true
  )
    return { calls, roots: new Set<string>() };
  // Modified: 2026-11-02 (chance). The registered source, not the filename,
  // selects the status field for the same immutable response proof.
  const statusField =
    scriptHostLayouts[options.from as ScriptClient].responseStatus;
  const unparen = (n: ts.Node): ts.Node =>
    ts.isParenthesizedExpression(n) ? unparen(n.expression) : n;
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  // Modified: 2026-11-02 (chance). Assignment patterns, parentheses and loop
  // targets can write scalar fields without an immediate assignment parent.
  const written = (node: ts.Node): boolean => {
    let current = node;
    while (current.parent) {
      const p = current.parent;
      if (
        ts.isParenthesizedExpression(p) ||
        ts.isArrayLiteralExpression(p) ||
        ts.isObjectLiteralExpression(p) ||
        ts.isSpreadElement(p) ||
        ts.isSpreadAssignment(p) ||
        (ts.isPropertyAssignment(p) && p.initializer === current)
      ) {
        current = p;
        continue;
      }
      return (
        (ts.isBinaryExpression(p) &&
          p.left === current &&
          p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          p.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ((ts.isForOfStatement(p) || ts.isForInStatement(p)) &&
          p.initializer === current) ||
        ts.isDeleteExpression(p) ||
        ts.isPostfixUnaryExpression(p) ||
        (ts.isPrefixUnaryExpression(p) &&
          [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(
            p.operator,
          ))
      );
    }
    return false;
  };
  let safe = true;
  walk(tree, (n) => {
    if (ts.isIdentifier(n) && n.text === "$done" && !valueSymbol(n, checker)) {
      if (
        (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
        (ts.isPropertyAssignment(n.parent) && n.parent.name === n)
      )
        return;
      let reference: ts.Node = n;
      while (ts.isParenthesizedExpression(reference.parent))
        reference = reference.parent;
      if (
        !ts.isCallExpression(reference.parent) ||
        reference.parent.expression !== reference
      )
        safe = false;
    }
    if (!ts.isIdentifier(n) || n.text !== role || valueSymbol(n, checker))
      return;
    // Ignore a property name rather than a free SDK binding.
    if (
      (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
      (ts.isPropertyAssignment(n.parent) && n.parent.name === n)
    )
      return;
    let outer: ts.Node = n;
    while (ts.isParenthesizedExpression(outer.parent)) outer = outer.parent;
    const p = outer.parent;
    if (
      ts.isCallExpression(p) &&
      p.arguments.length === 1 &&
      p.arguments[0] === outer &&
      ts.isIdentifier(unparen(p.expression)) &&
      (unparen(p.expression) as ts.Identifier).text === "$done" &&
      !valueSymbol(unparen(p.expression), checker)
    ) {
      calls.add(p);
      return;
    }
    if (safePresenceUse(outer)) return;
    // Only immutable scalar fields are observed; no headers, binary buffers,
    // aliases, reflection or field writes can hide a mutation of the context.
    const field =
      ts.isPropertyAccessExpression(p) && p.expression === outer
        ? p.name.text
        : ts.isElementAccessExpression(p) &&
            p.expression === outer &&
            ts.isStringLiteralLike(p.argumentExpression)
          ? p.argumentExpression.text
          : null;
    if (!field || !["body", statusField].includes(field)) {
      safe = false;
      return;
    }
    let access: ts.Node = p;
    while (
      (ts.isPropertyAccessExpression(access.parent) ||
        ts.isElementAccessExpression(access.parent)) &&
      access.parent.expression === access
    )
      access = access.parent;
    if (written(access)) safe = false;
  });
  if (!safe) calls.clear();
  return { calls, roots: new Set(calls.size ? [role] : []) };
}
