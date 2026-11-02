// Modified: 2026-11-02 (chance). Prove QX fetch Promise/await consumers and
// author-documented fields; optional undocumented parameters are omitted, not errors.
import ts from "typescript";
import { valueSymbol, safePresenceUse } from "./script-analysis.ts";
import { constantString } from "./script-bindings.ts";
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
  // Modified: 2026-11-02 (chance). Audit every lexical response alias and
  // destructuring use; String/bytes may leave the object but the object may not.
  const responseFields = (pattern: ts.ObjectBindingPattern) => {
    const seen = new Set<string>();
    for (const e of pattern.elements) {
      const property = e.propertyName ?? e.name;
      if (
        e.dotDotDotToken ||
        e.initializer ||
        !ts.isIdentifier(e.name) ||
        !(ts.isIdentifier(property) || ts.isStringLiteralLike(property)) ||
        seen.has(property.text) ||
        !["statusCode", "body", "bodyBytes"].includes(property.text)
      )
        return false;
      seen.add(property.text);
      if (property.text === "body") text = true;
      if (property.text === "bodyBytes") binary = true;
    }
    return true;
  };
  const isWrite = (node: ts.Node) => {
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
        ((ts.isForInStatement(p) || ts.isForOfStatement(p)) &&
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
  let responseAliasBudget = 64;
  const responseBinding = (
    symbol: ts.Symbol | undefined,
    seen = new Set<ts.Symbol>(),
  ): boolean => {
    if (
      !symbol ||
      seen.has(symbol) ||
      seen.size >= 16 ||
      --responseAliasBudget < 0
    )
      return false;
    const next = new Set(seen).add(symbol);
    let valid = true;
    walk(tree, (n) => {
      if (!ts.isIdentifier(n) || valueSymbol(n, checker) !== symbol) return;
      const p = n.parent;
      if ((ts.isParameter(p) || ts.isVariableDeclaration(p)) && p.name === n)
        return;
      if (safePresenceUse(n) && !ts.isTypeOfExpression(p)) return;
      if (
        ts.isVariableDeclaration(p) &&
        p.initializer === n &&
        ts.isVariableDeclarationList(p.parent) &&
        p.parent.flags & ts.NodeFlags.Const
      ) {
        if (ts.isIdentifier(p.name))
          valid =
            responseBinding(checker.getSymbolAtLocation(p.name), next) && valid;
        else if (ts.isObjectBindingPattern(p.name))
          valid = responseFields(p.name) && valid;
        else valid = false;
        return;
      }
      if (
        (!ts.isPropertyAccessExpression(p) &&
          !ts.isElementAccessExpression(p)) ||
        p.expression !== n ||
        isWrite(p)
      ) {
        valid = false;
        return;
      }
      const field = ts.isPropertyAccessExpression(p)
        ? p.name.text
        : constantString(p.argumentExpression, checker);
      if (!field || !["statusCode", "body", "bodyBytes"].includes(field)) {
        valid = false;
        return;
      }
      if (field === "body") text = true;
      if (field === "bodyBytes") binary = true;
    });
    return valid;
  };
  const consumer = (
    fn: ts.ArrowFunction | ts.FunctionExpression,
    kind: "success" | "error",
  ) => {
    // Modified: 2026-11-02 (chance). A closed success destructuring observes
    // only the same scalar/byte fields as direct reads, with no rest or defaults.
    if (
      kind === "success" &&
      fn.parameters.length === 1 &&
      ts.isObjectBindingPattern(fn.parameters[0].name) &&
      !fn.parameters[0].initializer
    ) {
      if (!responseFields(fn.parameters[0].name as ts.ObjectBindingPattern))
        return false;
      let observesArguments = false;
      walk(fn.body, (n) => {
        if (ts.isIdentifier(n) && n.text === "arguments")
          observesArguments = true;
      });
      return !observesArguments;
    }
    if (
      fn.parameters.length > 1 ||
      fn.parameters.some(
        (p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken,
      )
    )
      return false;
    if (!fn.parameters.length) return true;
    const sym = checker.getSymbolAtLocation(fn.parameters[0].name);
    if (kind === "success") {
      let noArguments = true;
      walk(fn.body, (n) => {
        if (ts.isIdentifier(n) && n.text === "arguments") noArguments = false;
      });
      return noArguments && responseBinding(sym);
    }
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
      if (
        p.name.text !== "error" ||
        !safePresenceUse(p) ||
        ts.isTypeOfExpression(p.parent)
      )
        valid = false;
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
    // Modified: 2026-11-02 (chance). Resolve literal/closed const String
    // values only; keep runtime request construction and side effects unchanged.
    const urlValue = url ? constantString(url, checker) : null;
    const methodValue = method ? constantString(method, checker) : "GET";
    const bodyValue = body ? constantString(body, checker) : null;
    if (
      urlValue === null ||
      !/^https?:\/\//.test(urlValue) ||
      methodValue === null ||
      !methods.has(methodValue)
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
      const lower = key.toLowerCase(),
        string = constantString(value, checker);
      if (
        names.has(lower) ||
        string === null ||
        /[\r\n\u0080-\uffff]/.test(string) ||
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
      names.set(lower, string);
    }
    if (
      !names.has("user-agent") ||
      !names.has("accept") ||
      names.get("accept-encoding") !== "identity" ||
      (body &&
        (bodyValue === null ||
          /[^\x00-\x7f]/.test(bodyValue) ||
          bodyValue.length > 65536 ||
          !names.has("content-type") ||
          ["GET", "HEAD"].includes(methodValue)))
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
          ? constantString(value, checker) === null
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
      // The same alias/field proof applies after a locally caught await.
      if (!responseBinding(sym)) ok = false;
    } else ok = false;
  });
  return {
    ok: ok && uses > 0 && !(binary && text),
    uses,
    binary,
    ignoredOptions: [...ignored].sort(),
  };
}
