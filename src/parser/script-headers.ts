// Modified: 2026-11-02 (chance). Prove readonly case-independent singleton
// header lookups; never lowercase dictionaries, copy output headers or drop Host.
import ts from "typescript";
import { resolvedPath } from "./script-bindings.ts";
import { valueSymbol, safePresenceUse } from "./script-analysis.ts";
export function readonlyHeaderContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  contexts = new Map<ts.Symbol, string>(),
) {
  const bases: ts.Node[] = [],
    aliases = new Map<ts.Symbol, string>(),
    keys = new Map<
      ts.Symbol,
      { role: string; name: string; mode: "exact" | "prefix" }
    >();
  const role = (n: ts.Node): string | null => {
    if (ts.isParenthesizedExpression(n)) return role(n.expression);
    if (ts.isIdentifier(n))
      return aliases.get(valueSymbol(n, checker)!) ?? null;
    if (ts.isPropertyAccessExpression(n) && n.name.text === "headers") {
      const root = resolvedPath(n.expression, checker, contexts);
      if (
        root &&
        ["$request", "$response"].includes(root) &&
        ts.isIdentifier(n.expression) &&
        (contexts.has(valueSymbol(n.expression, checker)!) ||
          !valueSymbol(n.expression, checker))
      )
        return root.slice(1);
    }
    return null;
  };
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  // Modified: 2026-11-02 (chance). A let binding is accepted only when all
  // uses remain audited readonly accesses; reassignment is rejected below.
  const isConst = (n: ts.Node): n is ts.VariableDeclaration =>
    ts.isVariableDeclaration(n) &&
    ts.isIdentifier(n.name) &&
    ts.isVariableDeclarationList(n.parent) &&
    !!(n.parent.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let));
  walk(tree, (n) => {
    if (role(n) && !ts.isIdentifier(n)) bases.push(n);
  });
  // Only direct lexical aliases; chained aliases are intentionally outside the proof.
  for (const n of bases)
    if (isConst(n.parent) && n.parent.initializer === n)
      aliases.set(checker.getSymbolAtLocation(n.parent.name)!, role(n)!);
  const allowed = new Set<ts.Node>(),
    reads: Record<string, string[]> = {},
    prefixes: Record<string, string[]> = {};
  let ok = true;
  walk(tree, (n) => {
    const r = role(n);
    if (!r) return;
    const p = n.parent;
    if (
      isConst(p) &&
      p.initializer === n &&
      aliases.has(checker.getSymbolAtLocation(p.name)!)
    ) {
      allowed.add(n);
      return;
    }
    if (ts.isIdentifier(n) && isConst(p) && p.name === n) {
      allowed.add(n);
      return;
    }
    if (safePresenceUse(n)) {
      allowed.add(n);
      return;
    }
    if (
      !ts.isCallExpression(p) ||
      p.arguments[0] !== n ||
      p.arguments.length !== 1 ||
      p.expression.getText(tree) !== "Object.keys" ||
      checker.getSymbolAtLocation(
        (p.expression as ts.PropertyAccessExpression).expression,
      )
    )
      return;
    const member = p.parent,
      call = member.parent;
    if (
      !ts.isPropertyAccessExpression(member) ||
      member.name.text !== "find" ||
      !ts.isCallExpression(call) ||
      call.expression !== member ||
      call.arguments.length !== 1
    )
      return;
    const fn = call.arguments[0];
    if (
      !ts.isArrowFunction(fn) ||
      fn.parameters.length !== 1 ||
      !ts.isIdentifier(fn.parameters[0].name) ||
      fn.parameters[0].dotDotDotToken ||
      fn.parameters[0].initializer ||
      fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
      ts.isBlock(fn.body)
    )
      return;
    const expr = fn.body;
    let name: string | null = null,
      prefix = false;
    // Modified: 2026-11-02 (chance). Recognize exact/prefix case-insensitive
    // literal predicates; preserve original find order and reject multiple hits.
    if (
      ts.isBinaryExpression(expr) &&
      expr.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
      ts.isStringLiteralLike(expr.right)
    ) {
      const lower = expr.left;
      if (
        ts.isCallExpression(lower) &&
        !lower.arguments.length &&
        ts.isPropertyAccessExpression(lower.expression) &&
        lower.expression.name.text === "toLowerCase" &&
        ts.isIdentifier(lower.expression.expression) &&
        valueSymbol(lower.expression.expression, checker) ===
          checker.getSymbolAtLocation(fn.parameters[0].name)
      )
        name = expr.right.text;
    } else if (
      ts.isCallExpression(expr) &&
      expr.arguments.length === 1 &&
      ts.isIdentifier(expr.arguments[0]) &&
      valueSymbol(expr.arguments[0], checker) ===
        checker.getSymbolAtLocation(fn.parameters[0].name) &&
      ts.isPropertyAccessExpression(expr.expression) &&
      expr.expression.name.text === "test" &&
      ts.isRegularExpressionLiteral(expr.expression.expression)
    ) {
      const match = /^\/\^([!#%&',:;=@_`~0-9a-z-]+)(\$)?\/i$/.exec(
        expr.expression.expression.text,
      );
      let pristine = true;
      walk(tree, (n) => {
        if (
          (ts.isIdentifier(n) &&
            ["RegExp", "Reflect"].includes(n.text) &&
            !valueSymbol(n, checker)) ||
          (ts.isPropertyAccessExpression(n) &&
            [
              "prototype",
              "__proto__",
              "getPrototypeOf",
              "setPrototypeOf",
              "defineProperty",
              "defineProperties",
            ].includes(n.name.text)) ||
          (ts.isElementAccessExpression(n) &&
            ((!ts.isStringLiteralLike(n.argumentExpression) &&
              !role(n.expression)) ||
              (ts.isStringLiteralLike(n.argumentExpression) &&
                [
                  "prototype",
                  "__proto__",
                  "getPrototypeOf",
                  "setPrototypeOf",
                  "defineProperty",
                  "defineProperties",
                ].includes(n.argumentExpression.text))))
        )
          pristine = false;
      });
      if (match && pristine) {
        name = match[1];
        prefix = !match[2];
      }
    }
    if (
      !name ||
      name !== name.toLowerCase() ||
      !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(name)
    )
      return;
    const d = call.parent;
    if (!isConst(d) || d.initializer !== call) return;
    const sym = checker.getSymbolAtLocation(d.name)!;
    keys.set(sym, { role: r, name, mode: prefix ? "prefix" : "exact" });
    allowed.add(n);
    const target = prefix ? prefixes : reads;
    target[r] = [...new Set([...(target[r] ?? []), name])];
  });
  walk(tree, (n) => {
    if (ts.isIdentifier(n) && keys.has(valueSymbol(n, checker)!)) {
      const p = n.parent,
        key = keys.get(valueSymbol(n, checker)!)!;
      if (isConst(p) && p.name === n) return;
      if (safePresenceUse(n)) return;
      if (
        ts.isBinaryExpression(p) &&
        [
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken,
        ].includes(p.operatorToken.kind)
      ) {
        const other = p.left === n ? p.right : p.left;
        if (
          ts.isIdentifier(other) &&
          other.text === "undefined" &&
          !valueSymbol(other, checker)?.declarations?.length
        )
          return;
      }
      if (
        ts.isElementAccessExpression(p) &&
        p.argumentExpression === n &&
        role(p.expression) === key.role
      ) {
        // A missing key must be guarded, so a literal header named "undefined"
        // cannot be accidentally read when find() has no match.
        const q = p.parent;
        if (ts.isConditionalExpression(q)) {
          const c = q.condition;
          if (
            ts.isIdentifier(c) &&
            valueSymbol(c, checker) === valueSymbol(n, checker) &&
            q.whenTrue === p
          ) {
            allowed.add(p.expression);
            return;
          }
          if (
            ts.isBinaryExpression(c) &&
            ts.isIdentifier(c.left) &&
            valueSymbol(c.left, checker) === valueSymbol(n, checker) &&
            ts.isIdentifier(c.right) &&
            c.right.text === "undefined" &&
            !valueSymbol(c.right, checker)?.declarations?.length &&
            ((c.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
              q.whenFalse === p) ||
              (c.operatorToken.kind ===
                ts.SyntaxKind.ExclamationEqualsEqualsToken &&
                q.whenTrue === p))
          ) {
            allowed.add(p.expression);
            return;
          }
        }
      }
      ok = false;
    }
  });
  walk(tree, (n) => {
    if (role(n) && !allowed.has(n)) ok = false;
  });
  // Modified: 2026-11-02 (chance). Predicate proofs require unmodified
  // lookup intrinsics; async/rest callbacks and monkey-patched methods differ.
  walk(tree, (n) => {
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const lhs = n.left;
      const member = ts.isPropertyAccessExpression(lhs)
        ? lhs.name.text
        : ts.isElementAccessExpression(lhs) &&
            ts.isStringLiteralLike(lhs.argumentExpression)
          ? lhs.argumentExpression.text
          : null;
      if (
        member &&
        [
          "keys",
          "find",
          "toLowerCase",
          "test",
          "prototype",
          "__proto__",
        ].includes(member)
      )
        ok = false;
    }
  });
  return { ok, reads, prefixes, queries: keys };
}
