// Modified: 2026-11-02 (chance). Specialize only pure source-host predicates;
// never invent versions, execute author code, or lose dead-branch var hoisting.
import ts from "typescript";
import { scriptChecker, valueSymbol } from "./script-analysis.ts";
import type { ScriptPlatform } from "./script-api.ts";
const UNKNOWN = Symbol("unknown");
type Value = string | number | boolean | null | undefined | typeof UNKNOWN;
export function specializeScript(source: string, from: ScriptPlatform) {
  if (from === "egern")
    return { source, folds: 0, branches: 0, reason: "module source retained" };
  let folds = 0,
    branches = 0;
  // Function source text is observable. Such programs need a separate proof.
  if (/\.\s*toString\s*\(|Function\s*\.\s*prototype|\bString\s*\(/.test(source))
    return {
      source,
      folds,
      branches,
      reason: "source/text observations retained",
    };
  const presence: Record<string, string> = {
    $task: from === "qx" ? "object" : "undefined",
    $httpClient: from === "qx" ? "undefined" : "object",
    $loon: from === "loon" ? "string" : "undefined",
    $script: from === "qx" ? "undefined" : "object",
    $prefs: from === "qx" ? "object" : "undefined",
    $persistentStore: from === "qx" ? "undefined" : "object",
    $notify: from === "qx" ? "function" : "undefined",
    $notification: from === "qx" ? "undefined" : "object",
    $surge: from === "surge" ? "object" : "undefined",
    $rocket: "undefined",
  };
  for (let pass = 0; pass < 5; pass++) {
    const tree = ts.createSourceFile(
        "upstream.js",
        source,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      ),
      checker = scriptChecker(tree);
    if ((tree as any).parseDiagnostics?.length)
      return {
        source,
        folds,
        branches,
        reason: "invalid source syntax retained",
      };
    let changed = 0;
    let genericMutation = false;
    const scan = (n: ts.Node) => {
      if (
        ts.isCallExpression(n) &&
        /^(?:Object\.(?:assign|definePropert(?:y|ies))|Reflect\.)/.test(
          n.expression.getText(tree),
        )
      )
        genericMutation = true;
      ts.forEachChild(n, scan);
    };
    scan(tree);
    // Modified: 2026-11-02 (chance). Reject mutable host roots and const uses
    // outside the same sequential statement list: neither TDZ nor receiver effects
    // may disappear during host specialization. Class getters need a separate proof.
    const mutatedRoots = new Set<string>();
    const roots = (n: ts.Node) => {
      if (
        (ts.isBinaryExpression(n) &&
          n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ts.isDeleteExpression(n) ||
        ts.isPostfixUnaryExpression(n) ||
        (ts.isPrefixUnaryExpression(n) &&
          n.operator !== ts.SyntaxKind.ExclamationToken)
      ) {
        const operand = ts.isBinaryExpression(n)
          ? n.left
          : ts.isDeleteExpression(n)
            ? n.expression
            : n.operand;
        if (ts.isIdentifier(operand) && !valueSymbol(operand, checker))
          mutatedRoots.add(operand.text);
      }
      ts.forEachChild(n, roots);
    };
    roots(tree);
    const sequential = (decl: ts.Node, use: ts.Node) => {
      const statement = (node: ts.Node) => {
        let current = node;
        while (
          current.parent &&
          !ts.isBlock(current.parent) &&
          !ts.isSourceFile(current.parent)
        ) {
          if (ts.isFunctionLike(current) || ts.isClassLike(current))
            return null;
          current = current.parent;
        }
        return current;
      };
      const a = statement(decl),
        b = statement(use);
      return !!a && !!b && a.parent === b.parent && a.end <= b.pos;
    };
    const evaluating = new Set<ts.Symbol>();
    function evaluate(n: ts.Node): Value {
      if (ts.isParenthesizedExpression(n)) return evaluate(n.expression);
      if (ts.isStringLiteralLike(n)) return n.text;
      if (ts.isNumericLiteral(n)) return Number(n.text);
      if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
      if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
      if (n.kind === ts.SyntaxKind.NullKeyword) return null;
      if (
        ts.isTypeOfExpression(n) &&
        ts.isIdentifier(n.expression) &&
        !valueSymbol(n.expression, checker) &&
        !genericMutation &&
        !mutatedRoots.has(n.expression.text)
      )
        return presence[n.expression.text] ?? UNKNOWN;
      if (
        ts.isPrefixUnaryExpression(n) &&
        n.operator === ts.SyntaxKind.ExclamationToken
      ) {
        const v = evaluate(n.operand);
        return v === UNKNOWN ? UNKNOWN : !v;
      }
      if (
        ts.isIdentifier(n) &&
        n.text === "undefined" &&
        !valueSymbol(n, checker)
      )
        return undefined;
      if (ts.isIdentifier(n)) {
        const symbol = valueSymbol(n, checker),
          d = symbol?.valueDeclaration;
        if (
          !symbol ||
          evaluating.has(symbol) ||
          !d ||
          !ts.isVariableDeclaration(d) ||
          !d.initializer ||
          !ts.isVariableDeclarationList(d.parent) ||
          !(d.parent.flags & ts.NodeFlags.Const) ||
          !sequential(d, n)
        )
          return UNKNOWN;
        evaluating.add(symbol);
        const v = evaluate(d.initializer);
        evaluating.delete(symbol);
        return v;
      }
      if (ts.isBinaryExpression(n)) {
        const a = evaluate(n.left),
          op = n.operatorToken.kind;
        if (a === UNKNOWN) return UNKNOWN;
        if (op === ts.SyntaxKind.AmpersandAmpersandToken)
          return a ? evaluate(n.right) : a;
        if (op === ts.SyntaxKind.BarBarToken) return a ? a : evaluate(n.right);
        if (op === ts.SyntaxKind.QuestionQuestionToken)
          return a == null ? evaluate(n.right) : a;
        const b = evaluate(n.right);
        if (b === UNKNOWN) return UNKNOWN;
        if (op === ts.SyntaxKind.EqualsEqualsEqualsToken) return a === b;
        if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken) return a !== b;
        if (op === ts.SyntaxKind.EqualsEqualsToken) return a == b;
        if (op === ts.SyntaxKind.ExclamationEqualsToken) return a != b;
      }
      return UNKNOWN;
    }
    const literal = (v: Exclude<Value, typeof UNKNOWN>): ts.Expression =>
      v === undefined
        ? ts.factory.createVoidZero()
        : v === null
          ? ts.factory.createNull()
          : typeof v === "boolean"
            ? v
              ? ts.factory.createTrue()
              : ts.factory.createFalse()
            : typeof v === "number"
              ? ts.factory.createNumericLiteral(v)
              : ts.factory.createStringLiteral(v);
    function hoists(node: ts.Node | undefined): ts.Statement[] | null {
      const names = new Set<string>();
      let safe = true;
      const binding = (n: ts.BindingName) => {
        if (ts.isIdentifier(n)) names.add(n.text);
        else
          for (const e of n.elements)
            if (ts.isBindingElement(e)) binding(e.name);
      };
      const walk = (n: ts.Node) => {
        if (ts.isFunctionDeclaration(n)) {
          safe = false;
          return;
        }
        if (
          ts.isFunctionExpression(n) ||
          ts.isArrowFunction(n) ||
          ts.isClassDeclaration(n) ||
          ts.isClassExpression(n)
        )
          return;
        if (
          ts.isVariableDeclarationList(n) &&
          !(n.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))
        )
          for (const d of n.declarations) binding(d.name);
        ts.forEachChild(n, walk);
      };
      if (node) walk(node);
      return !safe
        ? null
        : names.size
          ? [
              ts.factory.createVariableStatement(
                undefined,
                ts.factory.createVariableDeclarationList(
                  [...names].map((n) =>
                    ts.factory.createVariableDeclaration(n),
                  ),
                  ts.NodeFlags.None,
                ),
              ),
            ]
          : [];
    }
    const transformed = ts.transform(tree, [
      (context) => {
        const visit: ts.Visitor = (n) => {
          if (ts.isIfStatement(n)) {
            const v = evaluate(n.expression);
            if (v !== UNKNOWN) {
              const selected = v ? n.thenStatement : n.elseStatement,
                dead = v ? n.elseStatement : n.thenStatement,
                vars = hoists(dead);
              if (vars && hoists(selected)) {
                changed++;
                branches++;
                return ts.factory.createBlock(
                  [
                    ...vars,
                    ...(selected
                      ? [ts.visitNode(selected, visit) as ts.Statement]
                      : []),
                  ],
                  true,
                );
              }
            }
          }
          if (ts.isConditionalExpression(n)) {
            const v = evaluate(n.condition);
            if (v !== UNKNOWN) {
              const chosen = v ? n.whenTrue : n.whenFalse;
              if (
                !ts.isFunctionExpression(chosen) &&
                !ts.isArrowFunction(chosen) &&
                !ts.isClassExpression(chosen)
              ) {
                changed++;
                branches++;
                // Conditional expressions produce values, never member references.
                // Preserve an unbound receiver (and indirect eval) with comma GetValue.
                return ts.factory.createParenthesizedExpression(
                  ts.factory.createComma(
                    ts.factory.createNumericLiteral(0),
                    ts.visitNode(chosen, visit) as ts.Expression,
                  ),
                );
              }
            }
          }
          if (
            ts.isTypeOfExpression(n) ||
            ts.isBinaryExpression(n) ||
            ts.isPrefixUnaryExpression(n)
          ) {
            const v = evaluate(n);
            if (v !== UNKNOWN) {
              changed++;
              return literal(v);
            }
          }
          return ts.visitEachChild(n, visit, context);
        };
        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
      },
    ]);
    if (!changed) {
      transformed.dispose();
      break;
    }
    source = ts
      .createPrinter({ newLine: ts.NewLineKind.LineFeed })
      .printFile(transformed.transformed[0]);
    transformed.dispose();
    folds += changed;
  }
  return {
    source,
    folds,
    branches,
    reason: folds
      ? "pure source-host specialization"
      : "no provable host branch",
  };
}
