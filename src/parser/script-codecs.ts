// Modified: 2026-11-02 (chance). Bundle only direct standard codec use with
// closed instances; presence probes, reflection and legacy encodings stay unproven.
import ts from "typescript";
import { valueSymbol } from "./script-analysis.ts";
import { constantString } from "./script-bindings.ts";
export const codecNames = [
  "TextEncoder",
  "TextDecoder",
  "atob",
  "btoa",
] as const;
export function codecContract(tree: ts.SourceFile, checker: ts.TypeChecker) {
  const needed = new Set<string>();
  let ok = true;
  const builtins = new Set([
    "Object",
    "Array",
    "String",
    "ArrayBuffer",
    "Uint8Array",
    "WeakMap",
    "WeakSet",
    "Error",
    "TypeError",
    "RangeError",
  ]);
  const methods = new Set([
    "replace",
    "toLowerCase",
    "join",
    "push",
    "includes",
    "set",
    "get",
    "has",
    "add",
    "charCodeAt",
    "fromCharCode",
    "isView",
    "defineProperties",
  ]);
  const walk = (n: ts.Node, fn: (n: ts.Node) => void) => {
    fn(n);
    ts.forEachChild(n, (c) => walk(c, fn));
  };
  const validUse = (n: ts.NewExpression, name: string) => {
    const allowed =
      name === "TextEncoder"
        ? new Set(["encode", "encodeInto", "encoding"])
        : new Set(["decode", "encoding", "fatal", "ignoreBOM"]);
    const memberUse = (p: ts.Node) => {
      if (!ts.isPropertyAccessExpression(p) || !allowed.has(p.name.text))
        return false;
      const owner = p.parent;
      if (["encode", "decode", "encodeInto"].includes(p.name.text)) {
        if (
          !ts.isCallExpression(owner) ||
          owner.expression !== p ||
          owner.arguments.some(ts.isSpreadElement)
        )
          return false;
        return p.name.text === "encodeInto"
          ? owner.arguments.length === 2
          : p.name.text === "decode"
            ? owner.arguments.length <= 2
            : owner.arguments.length <= 1;
      }
      return !(
        (ts.isBinaryExpression(owner) &&
          owner.left === p &&
          owner.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
          owner.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
        ts.isPrefixUnaryExpression(owner) ||
        ts.isPostfixUnaryExpression(owner) ||
        ts.isDeleteExpression(owner)
      );
    };
    if (ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n)
      return memberUse(n.parent);
    const d = n.parent;
    if (
      !ts.isVariableDeclaration(d) ||
      !ts.isIdentifier(d.name) ||
      d.initializer !== n ||
      !ts.isVariableDeclarationList(d.parent) ||
      !(d.parent.flags & ts.NodeFlags.Const)
    )
      return false;
    const symbol = checker.getSymbolAtLocation(d.name);
    let closed = true;
    walk(tree, (ref) => {
      if (
        !ts.isIdentifier(ref) ||
        valueSymbol(ref, checker) !== symbol ||
        ref === d.name
      )
        return;
      if (!memberUse(ref.parent)) closed = false;
    });
    return closed;
  };
  walk(tree, (n) => {
    // Scoped standard algorithms assume pristine intrinsics. Do not let unknown
    // aliases or prototype writes turn a native operation into an author override.
    if (
      ts.isIdentifier(n) &&
      builtins.has(n.text) &&
      !valueSymbol(n, checker)
    ) {
      const p = n.parent;
      if (ts.isPropertyAccessExpression(p) && p.expression === n) {
        const next = p.parent;
        if (
          p.name.text === "prototype" ||
          (ts.isBinaryExpression(next) &&
            next.left === p &&
            next.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            next.operatorToken.kind <= ts.SyntaxKind.LastAssignment)
        )
          ok = false;
      } else if (
        !(
          (ts.isNewExpression(p) || ts.isCallExpression(p)) &&
          p.expression === n
        ) &&
        !ts.isTypeOfExpression(p) &&
        !(
          ts.isBinaryExpression(p) &&
          p.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
          p.right === n
        )
      )
        ok = false;
    }
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
      n.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    ) {
      const left = n.left;
      if (
        (ts.isElementAccessExpression(left) &&
          !ts.isStringLiteralLike(left.argumentExpression)) ||
        (ts.isPropertyAccessExpression(left) && methods.has(left.name.text)) ||
        (ts.isElementAccessExpression(left) &&
          ts.isStringLiteralLike(left.argumentExpression) &&
          methods.has(left.argumentExpression.text))
      )
        ok = false;
    }
    if (
      (ts.isPropertyAccessExpression(n) &&
        ["__proto__", "prototype"].includes(n.name.text)) ||
      (ts.isElementAccessExpression(n) &&
        ts.isStringLiteralLike(n.argumentExpression) &&
        ["__proto__", "prototype"].includes(n.argumentExpression.text))
    )
      ok = false;
    if (
      ts.isCallExpression(n) &&
      /^(?:Object\.(?:assign|definePropert|getPrototypeOf|setPrototypeOf)|Reflect\.)/.test(
        n.expression.getText(tree),
      )
    )
      ok = false;
    if (
      !ts.isIdentifier(n) ||
      !(codecNames as readonly string[]).includes(n.text) ||
      valueSymbol(n, checker)
    )
      return;
    // Ignore object/property names rather than inventing a free host dependency.
    if (
      (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
      (ts.isPropertyAssignment(n.parent) && n.parent.name === n)
    )
      return;
    needed.add(n.text);
    const p = n.parent;
    if (n.text === "atob" || n.text === "btoa") {
      if (
        !ts.isCallExpression(p) ||
        p.expression !== n ||
        p.arguments.length !== 1 ||
        p.arguments.some(ts.isSpreadElement)
      )
        ok = false;
      return;
    }
    if (!ts.isNewExpression(p) || p.expression !== n || !validUse(p, n.text)) {
      ok = false;
      return;
    }
    if (n.text === "TextDecoder" && p.arguments?.length) {
      const label = constantString(p.arguments[0], checker);
      if (
        label === null ||
        ![
          "utf-8",
          "utf8",
          "unicode-1-1-utf-8",
          "unicode11utf8",
          "unicode20utf8",
          "x-unicode20utf8",
        ].includes(
          label.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "").toLowerCase(),
        )
      )
        ok = false;
    }
    if (p.arguments?.some(ts.isSpreadElement)) ok = false;
  });
  return { ok: ok && needed.size > 0, names: [...needed].sort() };
}
