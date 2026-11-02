// Modified: 2026-11-02 (chance). Specialize only pure source-host predicates;
// never invent versions, execute author code, or lose dead-branch var hoisting.
import ts from "typescript";
import { closedFunctionCalls } from "./script-closed-functions.ts";
// Modified: 2026-11-02 (chance). Presence branches and field lowering share
// one source-host contract; no independent client capability table lives here.
import { scriptHostPresence } from "../domain/script-api.ts";
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
  const presence = scriptHostPresence(from);
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
      // Modified: 2026-11-02 (chance). Pure zero-argument Env helper functions
      // can expose the same source-host predicate as their inline equivalent.
      if (
        ts.isCallExpression(n) &&
        ts.isIdentifier(n.expression) &&
        !n.arguments.length
      ) {
        const symbol = valueSymbol(n.expression, checker),
          d = symbol?.valueDeclaration;
        const fn =
          d && ts.isFunctionDeclaration(d)
            ? d
            : d &&
                ts.isVariableDeclaration(d) &&
                d.initializer &&
                (ts.isArrowFunction(d.initializer) ||
                  ts.isFunctionExpression(d.initializer))
              ? d.initializer
              : null;
        if (
          symbol &&
          fn &&
          !evaluating.has(symbol) &&
          closedFunctionCalls(fn, checker) &&
          (!ts.isVariableDeclaration(d!) || sequential(d!, n))
        ) {
          const body = fn.body;
          const expr =
            body && ts.isBlock(body)
              ? body.statements.length === 1 &&
                ts.isReturnStatement(body.statements[0])
                ? body.statements[0].expression
                : null
              : body;
          if (expr) {
            evaluating.add(symbol);
            const value = evaluate(expr);
            evaluating.delete(symbol);
            return value;
          }
        }
      }

      if (ts.isParenthesizedExpression(n)) return evaluate(n.expression);
      if (ts.isStringLiteralLike(n)) return n.text;
      if (ts.isNumericLiteral(n))
        return Number.isFinite(Number(n.text)) ? Number(n.text) : UNKNOWN;
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
    // Modified: 2026-11-02 (chance). Apply localized text edits instead of
    // reprinting author functions. Skip function bodies whose value may escape;
    // an unknown caller may observe Function#toString or implicit coercion.
    const safeFunction = (n: ts.Node) => {
      if (
        !ts.isFunctionDeclaration(n) &&
        !ts.isFunctionExpression(n) &&
        !ts.isArrowFunction(n)
      )
        return false;
      let current: ts.Node = n;
      while (ts.isParenthesizedExpression(current.parent))
        current = current.parent;
      if (
        ts.isCallExpression(current.parent) &&
        current.parent.expression === current
      )
        return true;
      const p = n.parent;
      let symbol: ts.Symbol | undefined;
      if (ts.isFunctionDeclaration(n) && n.name)
        symbol = checker.getSymbolAtLocation(n.name);
      else if (
        ts.isVariableDeclaration(p) &&
        p.initializer === n &&
        ts.isIdentifier(p.name) &&
        ts.isVariableDeclarationList(p.parent) &&
        p.parent.flags & ts.NodeFlags.Const
      )
        symbol = checker.getSymbolAtLocation(p.name);
      if (!symbol) return false;
      let safe = true;
      const refs = (node: ts.Node) => {
        if (ts.isIdentifier(node) && valueSymbol(node, checker) === symbol) {
          const p = node.parent;
          if (
            (ts.isFunctionDeclaration(p) && p.name === node) ||
            (ts.isVariableDeclaration(p) && p.name === node)
          ) {
          } else if (!ts.isCallExpression(p) || p.expression !== node)
            safe = false;
        }
        ts.forEachChild(node, refs);
      };
      refs(tree);
      return safe;
    };
    const printer = ts.createPrinter();
    function rewrite(n: ts.Node): string {
      const start = ts.isSourceFile(n) ? 0 : n.getStart(tree),
        end = n.end;
      if (ts.isClassLike(n) || (ts.isFunctionLike(n) && !safeFunction(n)))
        return source.slice(start, end);
      if (ts.isIfStatement(n)) {
        const v = evaluate(n.expression);
        if (v !== UNKNOWN) {
          const selected = v ? n.thenStatement : n.elseStatement,
            dead = v ? n.elseStatement : n.thenStatement,
            vars = hoists(dead);
          if (vars && hoists(selected)) {
            changed++;
            branches++;
            return (
              "{" +
              vars
                .map((s) => printer.printNode(ts.EmitHint.Unspecified, s, tree))
                .join("\n") +
              "\n" +
              (selected ? rewrite(selected) : "") +
              "\n}"
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
            // GetValue retains an unbound callee and suppresses name inference.
            return "(0," + rewrite(chosen) + ")";
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
          return v === undefined ? "(void 0)" : JSON.stringify(v);
        }
      }
      let text = "",
        cursor = start;
      ts.forEachChild(n, (child) => {
        const pos = child.getStart(tree);
        if (pos < cursor || child.end > end) return;
        text += source.slice(cursor, pos) + rewrite(child);
        cursor = child.end;
      });
      return text + source.slice(cursor, end);
    }
    const next = rewrite(tree);
    if (!changed) break;
    source = next;
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
