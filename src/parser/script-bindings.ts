// Modified: 2026-11-02 (chance). Closed context aliases and constant string
// bindings are analysis facts only; author evaluation order and text stay intact.
import ts from "typescript";
import { valueSymbol, safePresenceUse } from "./script-analysis.ts";
export function constantString(
  node: ts.Expression,
  checker: ts.TypeChecker,
  seen = new Set<ts.Symbol>(),
): string | null {
  if (ts.isParenthesizedExpression(node))
    return constantString(node.expression, checker, seen);
  if (ts.isStringLiteralLike(node)) return node.text;
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  ) {
    const a = constantString(node.left, checker, seen),
      b = constantString(node.right, checker, seen);
    return a !== null && b !== null ? a + b : null;
  }
  // Modified: 2026-11-02 (chance). Resolve an immutable literal string table
  // without executing an obfuscator. Every table use must be a direct index read.
  if (
    ts.isElementAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    ts.isNumericLiteral(node.argumentExpression)
  ) {
    const symbol = valueSymbol(node.expression, checker),
      d = symbol?.valueDeclaration;
    if (
      !symbol ||
      seen.has(symbol) ||
      !d ||
      !ts.isVariableDeclaration(d) ||
      !d.initializer ||
      !ts.isArrayLiteralExpression(d.initializer) ||
      d.end >= node.pos
    )
      return null;
    const index = Number(node.argumentExpression.text),
      items = d.initializer.elements;
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= items.length ||
      !items.every(ts.isStringLiteralLike)
    )
      return null;
    // Modified: 2026-11-02 (chance). Only the queried read needs a proven
    // top-level initialization order. Other closed indexed reads in functions
    // cannot modify this table and must not invalidate the top-level fact.
    let ancestor: ts.Node = node;
    while (ancestor.parent) {
      ancestor = ancestor.parent;
      if (ts.isFunctionLike(ancestor)) return null;
    }
    // Modified: 2026-11-02 (chance). Assignment patterns and loop targets
    // can mutate an indexed slot without a direct binary parent.
    const written = (access: ts.Node) => {
      let current = access;
      while (current.parent) {
        const parent = current.parent;
        if (
          ts.isParenthesizedExpression(parent) ||
          ts.isArrayLiteralExpression(parent) ||
          ts.isObjectLiteralExpression(parent) ||
          ts.isSpreadElement(parent) ||
          ts.isSpreadAssignment(parent) ||
          (ts.isPropertyAssignment(parent) && parent.initializer === current)
        ) {
          current = parent;
          continue;
        }
        return (
          (ts.isBinaryExpression(parent) &&
            parent.left === current &&
            parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ((ts.isForOfStatement(parent) || ts.isForInStatement(parent)) &&
            parent.initializer === current) ||
          ts.isDeleteExpression(parent) ||
          ts.isPrefixUnaryExpression(parent) ||
          ts.isPostfixUnaryExpression(parent)
        );
      }
      return false;
    };
    let safe = true;
    const scan = (n: ts.Node) => {
      if (
        ts.isIdentifier(n) &&
        valueSymbol(n, checker) === symbol &&
        n !== d.name
      ) {
        const p = n.parent;
        if (
          !ts.isElementAccessExpression(p) ||
          p.expression !== n ||
          !ts.isNumericLiteral(p.argumentExpression) ||
          written(p)
        )
          safe = false;
      }
      ts.forEachChild(n, scan);
    };
    scan(d.getSourceFile());
    return safe ? (items[index] as ts.StringLiteralLike).text : null;
  }
  if (!ts.isIdentifier(node)) return null;
  const symbol = valueSymbol(node, checker),
    d = symbol?.valueDeclaration;
  if (
    !symbol ||
    seen.has(symbol) ||
    !d ||
    !ts.isVariableDeclaration(d) ||
    !d.initializer ||
    !ts.isVariableDeclarationList(d.parent) ||
    !(d.parent.flags & ts.NodeFlags.Const)
  )
    return null;
  seen.add(symbol);
  const result = constantString(d.initializer, checker, seen);
  seen.delete(symbol);
  return result;
}
export function contextAliases(tree: ts.SourceFile, checker: ts.TypeChecker) {
  const aliases = new Map<ts.Symbol, string>(),
    initializers = new Set<ts.Node>();
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  walk(tree, (n) => {
    if (
      !ts.isVariableDeclaration(n) ||
      !ts.isIdentifier(n.name) ||
      !n.initializer ||
      !ts.isIdentifier(n.initializer) ||
      !["$request", "$response", "$script"].includes(n.initializer.text) ||
      valueSymbol(n.initializer, checker) ||
      !ts.isVariableDeclarationList(n.parent) ||
      !(n.parent.flags & ts.NodeFlags.Const)
    )
      return;
    const symbol = checker.getSymbolAtLocation(n.name);
    if (!symbol) return;
    let safe = true;
    walk(tree, (ref) => {
      if (
        !ts.isIdentifier(ref) ||
        valueSymbol(ref, checker) !== symbol ||
        ref === n.name
      )
        return;
      if (safePresenceUse(ref)) return;
      const p = ref.parent;
      if (
        (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
        p.expression === ref
      ) {
        if (
          ts.isElementAccessExpression(p) &&
          !ts.isStringLiteralLike(p.argumentExpression)
        ) {
          safe = false;
          return;
        }
        const next = p.parent;
        if (
          (ts.isBinaryExpression(next) &&
            next.left === p &&
            next.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            next.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ts.isDeleteExpression(next) ||
          ts.isPostfixUnaryExpression(next) ||
          (ts.isPrefixUnaryExpression(next) &&
            next.operator !== ts.SyntaxKind.ExclamationToken)
        )
          safe = false;
        return;
      }
      safe = false;
    });
    if (safe) {
      aliases.set(symbol, n.initializer.text);
      initializers.add(n.initializer);
    }
  });
  return { aliases, initializers };
}
export function resolvedPath(
  node: ts.Node,
  checker: ts.TypeChecker,
  aliases: Map<ts.Symbol, string>,
): string | null {
  if (ts.isIdentifier(node))
    return aliases.get(valueSymbol(node, checker)!) ?? node.text;
  if (ts.isPropertyAccessExpression(node)) {
    const root = resolvedPath(node.expression, checker, aliases);
    return root ? root + "." + node.name.text : null;
  }
  if (ts.isElementAccessExpression(node)) {
    const key = constantString(node.argumentExpression, checker);
    const root = resolvedPath(node.expression, checker, aliases);
    return root && key !== null ? root + "." + key : null;
  }
  return null;
}
// Modified: 2026-11-02 (chance). Pristine JSON.stringify returns a nonempty
// String or undefined (deletion on Loon); its failures still propagate normally.
export function pristineStringify(
  node: ts.Expression,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
): node is ts.CallExpression {
  if (
    !ts.isCallExpression(node) ||
    node.expression.getText(tree) !== "JSON.stringify" ||
    !ts.isPropertyAccessExpression(node.expression) ||
    valueSymbol(node.expression.expression, checker)
  )
    return false;
  let pure = true;
  const scan = (n: ts.Node) => {
    if (ts.isIdentifier(n) && n.text === "JSON" && !valueSymbol(n, checker)) {
      const p = n.parent;
      if (
        !ts.isPropertyAccessExpression(p) ||
        !["parse", "stringify"].includes(p.name.text) ||
        !ts.isCallExpression(p.parent) ||
        p.parent.expression !== p
      )
        pure = false;
    }
    ts.forEachChild(n, scan);
  };
  scan(tree);
  return pure;
}
export function storageString(
  node: ts.Expression,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
) {
  const text = constantString(node, checker);
  if (text !== null)
    return { known: true, nonempty: text !== "", mayDelete: false };
  if (!pristineStringify(node, tree, checker))
    return { known: false, nonempty: false, mayDelete: false };
  const mayDelete = true;
  if (
    node.arguments.length !== 1 ||
    /toJSON|__proto__|\bprototype\b|\b(?:get|set)PrototypeOf\b/.test(tree.text)
  )
    return { known: false, nonempty: false, mayDelete };
  const arg = node.arguments[0];
  const root = (v: ts.Expression): boolean => {
    if (ts.isParenthesizedExpression(v)) return root(v.expression);
    if (
      ts.isStringLiteralLike(v) ||
      ts.isNumericLiteral(v) ||
      [
        ts.SyntaxKind.TrueKeyword,
        ts.SyntaxKind.FalseKeyword,
        ts.SyntaxKind.NullKeyword,
      ].includes(v.kind)
    )
      return true;
    if (ts.isObjectLiteralExpression(v))
      return v.properties.every(
        (p) => ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name),
      );
    if (ts.isArrayLiteralExpression(v))
      return !v.elements.some(ts.isSpreadElement);
    return (
      ts.isCallExpression(v) &&
      v.arguments.length === 1 &&
      v.expression.getText(tree) === "JSON.parse" &&
      ts.isPropertyAccessExpression(v.expression) &&
      !valueSymbol(v.expression.expression, checker)
    );
  };
  return { known: root(arg), nonempty: root(arg), mayDelete };
}
