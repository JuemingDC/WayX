// Modified: 2026-11-02 (chance). Case-independent request-header deletion
// and return are a closed operation, distinct from arbitrary dictionary writes.
import ts from "typescript";
import { valueSymbol } from "./script-analysis.ts";
export function requestHeaderDeletionContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  phase: string,
) {
  const outputs = new Set<ts.Expression>();
  const names: string[] = [];
  if (phase !== "request") return { ok: false, outputs, names };
  const walk = (n: ts.Node, f: (n: ts.Node) => void) => {
    f(n);
    ts.forEachChild(n, (c) => walk(c, f));
  };
  const declarations: ts.VariableDeclaration[] = [];
  walk(tree, (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer?.getText(tree) === "$request.headers" &&
      ts.isPropertyAccessExpression(n.initializer) &&
      !valueSymbol(n.initializer.expression, checker)
    )
      declarations.push(n);
  });
  if (declarations.length !== 1) return { ok: false, outputs, names };
  const d = declarations[0],
    symbol = valueSymbol(d.name, checker);
  let safe = true,
    mutations = 0;
  const allowed = new Set<ts.Node>([d.name, d.initializer!]);
  walk(tree, (n) => {
    if (
      !ts.isCallExpression(n) ||
      !ts.isPropertyAccessExpression(n.expression) ||
      n.expression.name.text !== "forEach" ||
      n.arguments.length !== 1
    )
      return;
    const keys = n.expression.expression,
      fn = n.arguments[0];
    if (
      !ts.isCallExpression(keys) ||
      keys.expression.getText(tree) !== "Object.keys" ||
      !ts.isPropertyAccessExpression(keys.expression) ||
      valueSymbol(keys.expression.expression, checker) ||
      keys.arguments.length !== 1 ||
      !ts.isIdentifier(keys.arguments[0]) ||
      valueSymbol(keys.arguments[0], checker) !== symbol ||
      !ts.isArrowFunction(fn) ||
      fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
      fn.parameters.length !== 1 ||
      !ts.isIdentifier(fn.parameters[0].name) ||
      fn.parameters[0].initializer ||
      fn.parameters[0].dotDotDotToken ||
      !ts.isBlock(fn.body) ||
      fn.body.statements.length !== 1
    )
      return;
    const stmt = fn.body.statements[0];
    if (!ts.isIfStatement(stmt) || stmt.elseStatement) return;
    const c = stmt.expression;
    if (
      !ts.isBinaryExpression(c) ||
      c.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken ||
      !ts.isStringLiteralLike(c.right)
    )
      return;
    const lower = c.left;
    if (
      !ts.isCallExpression(lower) ||
      lower.arguments.length ||
      !ts.isPropertyAccessExpression(lower.expression) ||
      lower.expression.name.text !== "toLowerCase" ||
      !ts.isIdentifier(lower.expression.expression) ||
      valueSymbol(lower.expression.expression, checker) !==
        valueSymbol(fn.parameters[0].name, checker)
    )
      return;
    const name = c.right.text;
    if (
      !/^[a-z0-9!#$%&'*+.^_`|~-]+$/.test(name) ||
      [
        "host",
        "content-length",
        "transfer-encoding",
        "content-encoding",
        "content-type",
        "connection",
        "trailer",
      ].includes(name)
    )
      return;
    let effect: ts.Statement = stmt.thenStatement;
    if (ts.isBlock(effect)) {
      if (effect.statements.length !== 1) return;
      effect = effect.statements[0];
    }
    if (
      !ts.isExpressionStatement(effect) ||
      !ts.isDeleteExpression(effect.expression) ||
      !ts.isElementAccessExpression(effect.expression.expression)
    )
      return;
    const access = effect.expression.expression;
    if (
      !ts.isIdentifier(access.expression) ||
      valueSymbol(access.expression, checker) !== symbol ||
      !ts.isIdentifier(access.argumentExpression) ||
      valueSymbol(access.argumentExpression, checker) !==
        valueSymbol(fn.parameters[0].name, checker)
    )
      return;
    // The callback key has exactly one predicate read and one delete read.
    let keyUses = 0;
    walk(fn.body, (r) => {
      if (
        ts.isIdentifier(r) &&
        valueSymbol(r, checker) === valueSymbol(fn.parameters[0].name, checker)
      )
        keyUses++;
    });
    if (keyUses !== 2) return;
    allowed.add(keys.arguments[0]);
    allowed.add(access.expression);
    names.push(name);
    mutations++;
  });
  walk(tree, (n) => {
    if (
      ts.isIdentifier(n) &&
      valueSymbol(n, checker) === symbol &&
      !allowed.has(n)
    ) {
      const p = n.parent;
      if (
        ts.isShorthandPropertyAssignment(p) &&
        p.name.text === "headers" &&
        ts.isObjectLiteralExpression(p.parent) &&
        p.parent.properties.length === 1 &&
        ts.isCallExpression(p.parent.parent) &&
        p.parent.parent.expression.getText(tree) === "$done" &&
        !valueSymbol(p.parent.parent.expression, checker) &&
        p.parent.parent.arguments.length === 1
      ) {
        outputs.add(n);
        return;
      }
      if (
        ts.isPropertyAssignment(p) &&
        p.name.getText(tree) === "headers" &&
        p.initializer === n &&
        ts.isObjectLiteralExpression(p.parent) &&
        p.parent.properties.length === 1 &&
        ts.isCallExpression(p.parent.parent) &&
        p.parent.parent.expression.getText(tree) === "$done" &&
        !valueSymbol(p.parent.parent.expression, checker) &&
        p.parent.parent.arguments.length === 1
      ) {
        outputs.add(n);
        return;
      }
      safe = false;
    }
    if (
      ts.isPropertyAccessExpression(n) &&
      n.name.text === "headers" &&
      n !== d.initializer
    )
      safe = false;
    if (
      ts.isIdentifier(n) &&
      n.text === "$request" &&
      !valueSymbol(n, checker) &&
      n !== (d.initializer as ts.PropertyAccessExpression).expression
    ) {
      const p = n.parent;
      if (
        !ts.isPropertyAccessExpression(p) ||
        p.expression !== n ||
        !["url", "method", "body"].includes(p.name.text)
      )
        safe = false;
    }
    if (
      ts.isIdentifier(n) &&
      ["Object", "Reflect"].includes(n.text) &&
      !valueSymbol(n, checker)
    ) {
      const p = n.parent;
      if (
        !(
          ts.isPropertyAccessExpression(p) &&
          p.expression === n &&
          p.name.text === "keys" &&
          ts.isCallExpression(p.parent) &&
          p.parent.expression === p
        )
      )
        safe = false;
    }
    if (
      ts.isPropertyAccessExpression(n) &&
      ["keys", "forEach", "toLowerCase", "prototype", "__proto__"].includes(
        n.name.text,
      )
    ) {
      const p = n.parent;
      if (ts.isBinaryExpression(p) && p.left === n) safe = false;
    }
  });
  // Modified: 2026-11-02 (chance). Computed intrinsic assignment can also
  // invalidate the keys/forEach/lowercase proof; reject unknown computed writes.
  walk(tree, (n) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      n.operatorToken.kind <= ts.SyntaxKind.LastAssignment &&
      ts.isElementAccessExpression(n.left)
    ) {
      const key = n.left.argumentExpression;
      if (
        !ts.isStringLiteralLike(key) ||
        ["keys", "forEach", "toLowerCase", "prototype", "__proto__"].includes(
          key.text,
        )
      )
        safe = false;
    }
  });
  return { ok: safe && mutations > 0 && outputs.size > 0, outputs, names };
}
