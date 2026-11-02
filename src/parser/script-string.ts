// Modified: 2026-11-02 (chance). Prove QX response-body string completions
// without coercing unknown objects or changing author assignments and exceptions.
import ts from "typescript";
import { valueSymbol } from "./script-analysis.ts";
import { constantString, resolvedPath } from "./script-bindings.ts";
type Kind = "string" | "optional" | false;
export function completionString(
  node: ts.Expression,
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  aliases: Map<ts.Symbol, string>,
  assumed = new Map<ts.Symbol, Kind>(),
): Kind {
  const exact = constantString(node, checker);
  if (exact !== null) return "string";
  if (ts.isParenthesizedExpression(node))
    return completionString(node.expression, tree, checker, aliases, assumed);
  const path = resolvedPath(node, checker, aliases);
  if (path && /^\$(?:request|response)\.body$/.test(path)) return "optional";
  if (path && /^\$request\.(?:url|method)$/.test(path)) return "string";
  const infer = (expr: ts.Expression) =>
    completionString(expr, tree, checker, aliases, assumed);
  if (ts.isConditionalExpression(node)) {
    const a = infer(node.whenTrue),
      b = infer(node.whenFalse);
    return a && b
      ? a === "string" && b === "string"
        ? "string"
        : "optional"
      : false;
  }
  if (ts.isBinaryExpression(node)) {
    const a = infer(node.left),
      b = infer(node.right);
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return a === "string" || b === "string" ? "string" : false;
    if (
      [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(
        node.operatorToken.kind,
      )
    )
      return a && b ? (b === "string" ? "string" : "optional") : false;
  }
  let nativeMethods = true;
  const audit = (n: ts.Node) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const left = n.left;
      if (
        ts.isElementAccessExpression(left) &&
        !ts.isStringLiteralLike(left.argumentExpression)
      )
        nativeMethods = false;
      if (
        ts.isPropertyAccessExpression(left) &&
        [
          "replace",
          "replaceAll",
          "slice",
          "substring",
          "substr",
          "toLowerCase",
          "toUpperCase",
          "trim",
          "trimStart",
          "trimEnd",
          "normalize",
          "concat",
          "repeat",
          "padStart",
          "padEnd",
        ].includes(left.name.text)
      )
        nativeMethods = false;
    }
    if (
      ts.isCallExpression(n) &&
      /^(?:Object\.(?:assign|definePropert|setPrototypeOf|getPrototypeOf)|Reflect\.)/.test(
        n.expression.getText(tree),
      )
    )
      nativeMethods = false;
    ts.forEachChild(n, audit);
  };
  audit(tree);
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression)
  ) {
    const member = node.expression;
    if (
      [
        "replace",
        "replaceAll",
        "slice",
        "substring",
        "substr",
        "toLowerCase",
        "toUpperCase",
        "trim",
        "trimStart",
        "trimEnd",
        "normalize",
        "concat",
        "repeat",
        "padStart",
        "padEnd",
      ].includes(member.name.text) &&
      infer(member.expression) &&
      nativeMethods &&
      !/\bprototype\b|__proto__|\b(?:get|set)PrototypeOf\b/.test(tree.text)
    )
      return "string";
    if (
      member.getText(tree) === "JSON.stringify" &&
      !valueSymbol(member.expression, checker)
    ) {
      let pristine = true;
      const scan = (n: ts.Node) => {
        if (
          ts.isIdentifier(n) &&
          n.text === "JSON" &&
          !valueSymbol(n, checker)
        ) {
          const p = n.parent;
          if (
            !ts.isPropertyAccessExpression(p) ||
            !["parse", "stringify"].includes(p.name.text) ||
            !ts.isCallExpression(p.parent) ||
            p.parent.expression !== p
          )
            pristine = false;
        }
        ts.forEachChild(n, scan);
      };
      scan(tree);
      if (pristine) return "optional";
    }
  }
  if (!ts.isIdentifier(node)) return false;
  const symbol = valueSymbol(node, checker),
    d = symbol?.valueDeclaration;
  if (!symbol || !d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name))
    return false;
  if (assumed.has(symbol)) return assumed.get(symbol)!;
  const next = new Map(assumed);
  next.set(symbol, false);
  const initial = d.initializer
    ? completionString(d.initializer, tree, checker, aliases, next)
    : "optional";
  if (!initial) return false;
  next.set(symbol, initial);
  let valid = true,
    optional = initial === "optional";
  const value = (expr: ts.Expression) => {
    const kind = completionString(expr, tree, checker, aliases, next);
    if (!kind) valid = false;
    if (kind === "optional") optional = true;
  };
  const scan = (n: ts.Node) => {
    if (ts.isIdentifier(n) && valueSymbol(n, checker) === symbol) {
      const p = n.parent;
      if (ts.isVariableDeclaration(p) && p.name === n) {
        if (p.initializer) value(p.initializer);
        if (
          ts.isVariableDeclarationList(p.parent) &&
          (ts.isForInStatement(p.parent.parent) ||
            ts.isForOfStatement(p.parent.parent))
        )
          valid = false;
      } else if (
        ts.isBinaryExpression(p) &&
        p.left === n &&
        p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        if (p.operatorToken.kind === ts.SyntaxKind.EqualsToken) value(p.right);
        else if (p.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken) {
          const rhs = completionString(p.right, tree, checker, aliases, next);
          if (next.get(symbol) !== "string" && rhs !== "string") valid = false;
        } else valid = false;
      } else if (
        ts.isPostfixUnaryExpression(p) ||
        (ts.isPrefixUnaryExpression(p) &&
          [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(
            p.operator,
          )) ||
        ((ts.isForOfStatement(p) || ts.isForInStatement(p)) &&
          p.initializer === n)
      )
        valid = false;
    }
    ts.forEachChild(n, scan);
  };
  scan(tree);
  if (valid && optional && next.get(symbol) !== "optional") {
    next.set(symbol, "optional");
    scan(tree);
  }
  return valid ? (optional ? "optional" : "string") : false;
}
