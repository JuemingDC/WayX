// Modified: 2026-11-02 (chance). Reuse typed source argument declarations;
// QX omits its unsupported argument input only when the default path is safe.
import ts from "typescript";
import {
  valueSymbol,
  safePresenceUse,
  absenceInsensitive,
} from "./script-analysis.ts";
export type ArgumentSchema =
  | {
      kind: "object";
      fields: Record<string, "boolean" | "number" | "string">;
      enumValues?: Record<string, string[]>;
    }
  | { kind: "string" };
const UNKNOWN = Symbol("unknown");
export function argumentContract(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  schema: ArgumentSchema | undefined,
  from: string,
  to: string,
) {
  let uses = 0,
    safe =
      !!schema &&
      ["loon", "surge"].includes(from) &&
      ["qx", "surge", "loon"].includes(to);
  const free = (n: ts.Node) =>
    ts.isIdentifier(n) && n.text === "$argument" && !valueSymbol(n, checker);
  function value(n: ts.Node): any {
    if (ts.isParenthesizedExpression(n)) return value(n.expression);
    if (free(n)) return undefined;
    if (
      ts.isIdentifier(n) &&
      n.text === "undefined" &&
      !valueSymbol(n, checker)?.declarations?.length
    )
      return undefined;
    if (ts.isStringLiteralLike(n)) return n.text;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (n.kind === ts.SyntaxKind.NullKeyword) return null;
    if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isTypeOfExpression(n) && free(n.expression)) return "undefined";
    if (
      (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) &&
      n.questionDotToken &&
      free(n.expression)
    )
      return undefined;
    if (
      ts.isPrefixUnaryExpression(n) &&
      n.operator === ts.SyntaxKind.ExclamationToken
    ) {
      const v = value(n.operand);
      return v === UNKNOWN ? UNKNOWN : !v;
    }
    if (ts.isConditionalExpression(n)) {
      const c = value(n.condition);
      return c === UNKNOWN ? UNKNOWN : value(c ? n.whenTrue : n.whenFalse);
    }
    if (ts.isBinaryExpression(n)) {
      const a = value(n.left),
        op = n.operatorToken.kind;
      if (a === UNKNOWN) return UNKNOWN;
      if (op === ts.SyntaxKind.BarBarToken) return a ? a : value(n.right);
      if (op === ts.SyntaxKind.AmpersandAmpersandToken)
        return a ? value(n.right) : a;
      if (op === ts.SyntaxKind.QuestionQuestionToken)
        return a == null ? value(n.right) : a;
      const b = value(n.right);
      if (b === UNKNOWN) return UNKNOWN;
      if (op === ts.SyntaxKind.EqualsEqualsEqualsToken) return a === b;
      if (op === ts.SyntaxKind.ExclamationEqualsEqualsToken) return a !== b;
      if (op === ts.SyntaxKind.EqualsEqualsToken) return a == b;
      if (op === ts.SyntaxKind.ExclamationEqualsToken) return a != b;
    }
    return UNKNOWN;
  }
  const dead = (n: ts.Node) => {
    let cur = n;
    while (cur.parent) {
      const p = cur.parent;
      if (ts.isConditionalExpression(p)) {
        const v = value(p.condition);
        if (
          v !== UNKNOWN &&
          ((!!v && p.whenFalse === cur) || (!v && p.whenTrue === cur))
        )
          return true;
      }
      if (ts.isIfStatement(p)) {
        const v = value(p.expression);
        if (
          v !== UNKNOWN &&
          ((!!v && p.elseStatement === cur) || (!v && p.thenStatement === cur))
        )
          return true;
      }
      if (ts.isBinaryExpression(p) && p.right === cur) {
        const v = value(p.left);
        if (
          v !== UNKNOWN &&
          ((p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
            !v) ||
            (p.operatorToken.kind === ts.SyntaxKind.BarBarToken && !!v) ||
            (p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken &&
              v != null))
        )
          return true;
      }
      cur = p;
    }
    return false;
  };
  const contains = (n: ts.Node): boolean => {
    if (free(n)) return true;
    let found = false;
    ts.forEachChild(n, (c) => {
      if (contains(c)) found = true;
    });
    return found;
  };
  const walk = (n: ts.Node) => {
    // Reject omission-derived unknown/object/null aliases until their downstream
    // consumers are proven. In particular, passing null into a decoder is not a
    // working adblock conversion merely because an outer catch swallows its error.
    if (to === "qx" && !dead(n)) {
      if (
        ts.isVariableDeclaration(n) &&
        n.initializer &&
        contains(n.initializer)
      ) {
        const v = value(n.initializer);
        if (v === UNKNOWN || v == null || typeof v === "object") safe = false;
      }
      if (ts.isReturnStatement(n) && n.expression && contains(n.expression)) {
        const v = value(n.expression);
        if (v === UNKNOWN || v == null || typeof v === "object") safe = false;
      }
      if (
        ts.isCallExpression(n) &&
        n.arguments.some(contains) &&
        !n.arguments.every((a) => !contains(a) || dead(a))
      ) {
        const api = n.expression.getText(tree);
        if (
          !["$done", "JSON.parse", "String", "Number", "Boolean"].includes(api)
        )
          safe = false;
      }
    }
    if (free(n)) {
      uses++;
      const p = n.parent;
      // Source inputs are read-only. Unknown properties may use ordinary JS default
      // logic, but cannot escape through writes or reflective calls.
      if (
        (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) &&
        p.expression === n
      ) {
        const key = ts.isPropertyAccessExpression(p)
          ? p.name.text
          : ts.isStringLiteralLike(p.argumentExpression)
            ? p.argumentExpression.text
            : null;
        const op = p.parent;
        if (
          !schema ||
          schema.kind !== "object" ||
          !key ||
          !Object.prototype.hasOwnProperty.call(schema.fields, key) ||
          (ts.isBinaryExpression(op) &&
            op.left === p &&
            op.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
            op.operatorToken.kind <= ts.SyntaxKind.LastAssignment) ||
          ts.isDeleteExpression(op) ||
          ts.isPostfixUnaryExpression(op) ||
          (ts.isCallExpression(op) && op.expression === p)
        )
          safe = false;
        if (to === "qx" && !p.questionDotToken && !dead(n)) safe = false;
      } else if (
        to === "qx" &&
        !dead(n) &&
        !safePresenceUse(n) &&
        !absenceInsensitive(n)
      ) {
        const comparison =
          ts.isBinaryExpression(p) &&
          [
            ts.SyntaxKind.EqualsEqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsEqualsToken,
            ts.SyntaxKind.EqualsEqualsToken,
            ts.SyntaxKind.ExclamationEqualsToken,
          ].includes(p.operatorToken.kind);
        if (!comparison) safe = false;
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(tree);
  return {
    ok: safe && uses > 0,
    uses,
    schema,
    ...(to === "qx" ? { omittedParameters: ["$argument"] } : {}),
  };
}
