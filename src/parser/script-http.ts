// Modified: 2026-11-02 (chance). A deliberately bounded callback transport
// contract maps all seven methods with explicit defaults; QX cancellation is unproven.
import ts from "typescript";
import { safePresenceUse, valueSymbol } from "./script-analysis.ts";
export const callbackMethods = [
  "get",
  "post",
  "put",
  "delete",
  "head",
  "options",
  "patch",
] as const;
export function callbackHttpContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  from: string,
  to: string,
) {
  let uses = 0,
    ok = ["surge", "loon"].includes(from) && ["surge", "loon"].includes(to);
  const fields = (o: ts.Expression) => {
    if (!ts.isObjectLiteralExpression(o)) return null;
    const map = new Map<string, ts.Expression>();
    for (const p of o.properties) {
      if (
        !ts.isPropertyAssignment(p) ||
        (!ts.isIdentifier(p.name) && !ts.isStringLiteralLike(p.name)) ||
        map.has(p.name.text)
      )
        return null;
      map.set(p.name.text, p.initializer);
    }
    return map;
  };
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  walk(tree, (n) => {
    if (
      !ts.isIdentifier(n) ||
      n.text !== "$httpClient" ||
      valueSymbol(n, checker)
    )
      return;
    uses++;
    const member = n.parent,
      call = member.parent;
    if (
      !ts.isPropertyAccessExpression(member) ||
      !callbackMethods.includes(member.name.text as any) ||
      !ts.isCallExpression(call) ||
      call.expression !== member ||
      call.arguments.length !== 2 ||
      !ts.isExpressionStatement(call.parent)
    ) {
      ok = false;
      return;
    }
    const opts = fields(call.arguments[0]),
      fn = call.arguments[1];
    if (
      !opts ||
      [...opts.keys()].some(
        (k) =>
          ![
            "url",
            "headers",
            "body",
            "timeout",
            "auto-cookie",
            "auto-redirect",
          ].includes(k),
      )
    ) {
      ok = false;
      return;
    }
    const url = opts.get("url"),
      timeout = opts.get("timeout");
    if (
      !url ||
      !ts.isStringLiteralLike(url) ||
      !/^http:\/\//.test(url.text) ||
      !timeout ||
      !ts.isNumericLiteral(timeout) ||
      !(Number(timeout.text) > 0) ||
      Number(timeout.text) > 60000 ||
      opts.get("auto-cookie")?.kind !== ts.SyntaxKind.FalseKeyword ||
      opts.get("auto-redirect")?.kind !== ts.SyntaxKind.FalseKeyword
    ) {
      ok = false;
      return;
    }
    const h = opts.get("headers"),
      headers = h && fields(h),
      names = new Map<string, string>();
    if (!headers) {
      ok = false;
      return;
    }
    for (const [key, value] of headers) {
      const lower = key.toLowerCase();
      if (
        names.has(lower) ||
        !ts.isStringLiteralLike(value) ||
        /[\r\n\u0080-\uffff]/.test(value.text) ||
        [
          "content-length",
          "transfer-encoding",
          "connection",
          "cookie",
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
      names.get("accept-encoding") !== "identity"
    ) {
      ok = false;
      return;
    }
    const body = opts.get("body");
    if (
      body &&
      (!ts.isStringLiteralLike(body) ||
        body.text.length > 65536 ||
        /[^\x00-\x7f]/.test(body.text) ||
        !names.has("content-type") ||
        ["get", "head"].includes(member.name.text))
    ) {
      ok = false;
      return;
    }
    if (
      (!ts.isArrowFunction(fn) && !ts.isFunctionExpression(fn)) ||
      fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword) ||
      fn.parameters.length !== 3 ||
      fn.parameters.some(
        (p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken,
      )
    ) {
      ok = false;
      return;
    }
    const err = checker.getSymbolAtLocation(fn.parameters[0].name),
      res = checker.getSymbolAtLocation(fn.parameters[1].name);
    const dataSymbol = checker.getSymbolAtLocation(fn.parameters[2].name);
    // Modified: 2026-11-02 (chance). Error-response/data shapes are not
    // documented equivalently. Permit them only in a proven success branch.
    const onSuccess = (node: ts.Node) => {
      let current = node;
      while (current.parent && current.parent !== fn.body) {
        const p = current.parent;
        if (ts.isIfStatement(p)) {
          const c = p.expression,
            negative =
              ts.isPrefixUnaryExpression(c) &&
              c.operator === ts.SyntaxKind.ExclamationToken;
          const probe = negative ? (c as ts.PrefixUnaryExpression).operand : c;
          if (
            ts.isIdentifier(probe) &&
            valueSymbol(probe, checker) === err &&
            ((negative && p.thenStatement === current) ||
              (!negative && p.elseStatement === current))
          )
            return true;
        }
        current = p;
      }
      return false;
    };
    walk(fn.body, (node) => {
      if (ts.isIdentifier(node) && node.text === "arguments") ok = false;
      if (!ts.isIdentifier(node)) return;
      const sym = valueSymbol(node, checker),
        p = node.parent;
      if ((sym === res || sym === dataSymbol) && !onSuccess(node)) ok = false;
      if (sym === err && (!safePresenceUse(node) || ts.isTypeOfExpression(p)))
        ok = false;
      if (
        sym === res &&
        (!safePresenceUse(node) || ts.isTypeOfExpression(p)) &&
        !(
          ts.isPropertyAccessExpression(p) &&
          p.expression === node &&
          p.name.text === "status" &&
          !(
            (ts.isBinaryExpression(p.parent) && p.parent.left === p) ||
            ts.isPrefixUnaryExpression(p.parent) ||
            ts.isPostfixUnaryExpression(p.parent) ||
            ts.isDeleteExpression(p.parent)
          )
        )
      )
        ok = false;
    });
  });
  return { ok: ok && uses > 0, uses };
}
