// Modified: 2026-11-02 (chance). Prove QX fetch Promise/await consumers and
// author-documented fields; optional undocumented parameters are omitted, not errors.
import ts from "typescript";
import { valueSymbol, safePresenceUse } from "./script-analysis.ts";
import { qxHttpOptions } from "./qx-http-options.ts";
const methods = new Set([
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "PATCH",
]);
export function qxTaskContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  from: string,
  to: string,
) {
  let ok = from === "qx" && ["qx", "surge", "loon"].includes(to),
    uses = 0,
    binary = false,
    text = false;
  const ignored = new Set<string>();
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  const fields = (expr: ts.Expression): Map<string, ts.Expression> | null => {
    let value = expr;
    if (ts.isIdentifier(value)) {
      const symbol = valueSymbol(value, checker),
        d = symbol?.valueDeclaration;
      if (
        !symbol ||
        !d ||
        !ts.isVariableDeclaration(d) ||
        !d.initializer ||
        !ts.isVariableDeclarationList(d.parent) ||
        !(d.parent.flags & ts.NodeFlags.Const)
      )
        return null;
      let closed = true;
      walk(tree, (n) => {
        if (
          ts.isIdentifier(n) &&
          valueSymbol(n, checker) === symbol &&
          n !== d.name &&
          n !== expr
        )
          closed = false;
      });
      if (!closed) return null;
      value = d.initializer;
    }
    if (!ts.isObjectLiteralExpression(value)) return null;
    const result = new Map<string, ts.Expression>();
    for (const p of value.properties) {
      if (
        !ts.isPropertyAssignment(p) ||
        (!ts.isIdentifier(p.name) && !ts.isStringLiteralLike(p.name)) ||
        result.has(p.name.text)
      )
        return null;
      result.set(p.name.text, p.initializer);
    }
    return result;
  };
  const functionNode = (n: ts.Expression | undefined) =>
    n &&
    (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) &&
    !n.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) &&
    !n.asteriskToken
      ? n
      : null;
  const consumer = (
    fn: ts.ArrowFunction | ts.FunctionExpression,
    kind: "success" | "error",
  ) => {
    if (
      fn.parameters.length > 1 ||
      fn.parameters.some(
        (p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken,
      )
    )
      return false;
    if (!fn.parameters.length) return true;
    const sym = checker.getSymbolAtLocation(fn.parameters[0].name);
    let valid = true;
    walk(fn.body, (n) => {
      if (ts.isIdentifier(n) && n.text === "arguments") valid = false;
      if (!ts.isIdentifier(n) || valueSymbol(n, checker) !== sym) return;
      if (safePresenceUse(n) && !ts.isTypeOfExpression(n.parent)) return;
      const p = n.parent;
      if (!ts.isPropertyAccessExpression(p) || p.expression !== n) {
        valid = false;
        return;
      }
      if (kind === "error") {
        if (
          p.name.text !== "error" ||
          !safePresenceUse(p) ||
          ts.isTypeOfExpression(p.parent)
        )
          valid = false;
        return;
      }
      const op = p.parent;
      if (
        (ts.isBinaryExpression(op) &&
          op.left === p &&
          op.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          op.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ts.isPostfixUnaryExpression(op) ||
        ts.isDeleteExpression(op) ||
        (ts.isPrefixUnaryExpression(op) &&
          op.operator !== ts.SyntaxKind.ExclamationToken)
      ) {
        valid = false;
        return;
      }
      if (!["statusCode", "body", "bodyBytes"].includes(p.name.text))
        valid = false;
      if (p.name.text === "body") text = true;
      if (p.name.text === "bodyBytes") binary = true;
    });
    return valid;
  };
  walk(tree, (n) => {
    if (!ts.isIdentifier(n) || n.text !== "$task" || valueSymbol(n, checker))
      return;
    uses++;
    const member = n.parent,
      call = member.parent;
    if (
      !ts.isPropertyAccessExpression(member) ||
      member.name.text !== "fetch" ||
      !ts.isCallExpression(call) ||
      call.expression !== member ||
      call.arguments.length !== 1
    ) {
      ok = false;
      return;
    }
    const request = fields(call.arguments[0]);
    if (!request) {
      ok = false;
      return;
    }
    for (const key of request.keys())
      if (!(qxHttpOptions.request as readonly string[]).includes(key))
        ignored.add(key);
    const url = request.get("url"),
      method = request.get("method"),
      headers = request.get("headers"),
      body = request.get("body");
    if (
      !url ||
      !ts.isStringLiteralLike(url) ||
      !/^https?:\/\//.test(url.text) ||
      (method && (!ts.isStringLiteralLike(method) || !methods.has(method.text)))
    ) {
      ok = false;
      return;
    }
    const h = headers && fields(headers),
      names = new Map<string, string>();
    if (!h) {
      ok = false;
      return;
    }
    for (const [key, value] of h) {
      const lower = key.toLowerCase();
      if (
        names.has(lower) ||
        !ts.isStringLiteralLike(value) ||
        /[\r\n\u0080-\uffff]/.test(value.text) ||
        [
          "cookie",
          "connection",
          "content-length",
          "transfer-encoding",
        ].includes(lower)
      ) {
        ok = false;
        return;
      }
      names.set(lower, value.text);
    }
    if (
      !names.has("user-agent") ||
      !names.has("accept") ||
      names.get("accept-encoding") !== "identity" ||
      (body &&
        (!ts.isStringLiteralLike(body) ||
          /[^\x00-\x7f]/.test(body.text) ||
          body.text.length > 65536 ||
          !names.has("content-type") ||
          ["GET", "HEAD"].includes(
            method && ts.isStringLiteralLike(method)
              ? method.text.toUpperCase()
              : "GET",
          )))
    ) {
      ok = false;
      return;
    }
    const opts = request.get("opts"),
      options = opts ? fields(opts) : new Map<string, ts.Expression>();
    if (!options) {
      ok = false;
      return;
    }
    for (const [key, value] of options) {
      if (!(qxHttpOptions.opts as readonly string[]).includes(key)) {
        ignored.add("opts." + key);
        continue;
      }
      if (
        key === "policy"
          ? !ts.isStringLiteralLike(value)
          : ![ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword].includes(
              value.kind,
            )
      )
        ok = false;
    }
    const p = call.parent;
    if (
      ts.isPropertyAccessExpression(p) &&
      p.name.text === "then" &&
      ts.isCallExpression(p.parent) &&
      p.parent.expression === p &&
      p.parent.arguments.length >= 1 &&
      p.parent.arguments.length <= 2
    ) {
      const then = p.parent,
        success = functionNode(then.arguments[0]),
        error = then.arguments[1] && functionNode(then.arguments[1]);
      if (
        !success ||
        !consumer(success, "success") ||
        (then.arguments[1] && (!error || !consumer(error, "error")))
      ) {
        ok = false;
        return;
      }
      const tail = then.parent;
      if (
        then.arguments.length === 1 &&
        !ts.isExpressionStatement(tail) &&
        !(ts.isPropertyAccessExpression(tail) && tail.name.text === "catch")
      )
        ok = false;
      if (
        ts.isPropertyAccessExpression(tail) &&
        tail.name.text === "catch" &&
        ts.isCallExpression(tail.parent) &&
        tail.parent.expression === tail
      ) {
        const handler =
          tail.parent.arguments.length === 1 &&
          functionNode(tail.parent.arguments[0]);
        if (!handler || !consumer(handler, "error")) ok = false;
      }
    } else if (
      ts.isAwaitExpression(p) &&
      ts.isVariableDeclaration(p.parent) &&
      p.parent.initializer === p &&
      ts.isIdentifier(p.parent.name) &&
      ts.isVariableDeclarationList(p.parent.parent) &&
      p.parent.parent.flags & ts.NodeFlags.Const
    ) {
      const d = p.parent,
        sym = checker.getSymbolAtLocation(d.name);
      // Modified: 2026-11-02 (chance). Awaited native failures must terminate in
      // a locally audited catch, not escape to an uninspected Promise consumer.
      let current: ts.Node = p,
        handled = false;
      while (current.parent && !ts.isFunctionLike(current.parent)) {
        const parent = current.parent;
        if (
          ts.isTryStatement(parent) &&
          parent.tryBlock === current &&
          parent.catchClause
        ) {
          const clause = parent.catchClause,
            decl = clause.variableDeclaration;
          if (!decl) {
            handled = true;
            break;
          }
          if (!ts.isIdentifier(decl.name)) break;
          const error = checker.getSymbolAtLocation(decl.name);
          handled = true;
          walk(clause.block, (ref) => {
            if (!ts.isIdentifier(ref) || valueSymbol(ref, checker) !== error)
              return;
            const q = ref.parent;
            if (safePresenceUse(ref) && !ts.isTypeOfExpression(q)) return;
            if (
              ts.isPropertyAccessExpression(q) &&
              q.expression === ref &&
              q.name.text === "error" &&
              safePresenceUse(q) &&
              !ts.isTypeOfExpression(q.parent)
            )
              return;
            handled = false;
          });
          break;
        }
        current = parent;
      }
      if (!handled) ok = false;
      // Audit the awaited alias throughout its lexical binding; it cannot escape.
      walk(tree, (ref) => {
        if (
          !ts.isIdentifier(ref) ||
          valueSymbol(ref, checker) !== sym ||
          ref === d.name
        )
          return;
        const parent = ref.parent;
        if (
          !ts.isPropertyAccessExpression(parent) ||
          parent.expression !== ref ||
          !["statusCode", "body", "bodyBytes"].includes(parent.name.text)
        ) {
          ok = false;
          return;
        }
        const op = parent.parent;
        if (
          (ts.isBinaryExpression(op) &&
            op.left === parent &&
            op.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            op.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ts.isDeleteExpression(op) ||
          ts.isPostfixUnaryExpression(op) ||
          ts.isPrefixUnaryExpression(op)
        ) {
          ok = false;
          return;
        }
        if (parent.name.text === "body") text = true;
        if (parent.name.text === "bodyBytes") binary = true;
      });
    } else ok = false;
  });
  return {
    ok: ok && uses > 0 && !(binary && text),
    uses,
    binary,
    ignoredOptions: [...ignored].sort(),
  };
}
