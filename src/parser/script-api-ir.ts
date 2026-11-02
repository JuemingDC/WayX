// Modified: 2026-11-02 (chance). Lightweight API inventory reports runtime
// dispatch and boundaries; it never proves or rewrites concrete business values.
import ts from "typescript";
import crypto from "node:crypto";
import {
  scriptApiDefinitions,
  type ScriptClient,
  type ScriptApiIR,
  type ScriptApiOperation,
} from "../domain/script-api.ts";
export interface ScriptApiReference {
  api: string;
  node: ts.Node;
  access: ScriptApiOperation["source"]["access"];
  call?: ts.CallExpression | ts.NewExpression;
  members: string[];
}
function path(n: ts.Node): string | null {
  if (ts.isIdentifier(n)) return n.text;
  if (ts.isPropertyAccessExpression(n)) {
    const root = path(n.expression);
    return root ? root + "." + n.name.text : null;
  }
  if (ts.isElementAccessExpression(n)) {
    const root = path(n.expression);
    return root
      ? root +
          "." +
          (ts.isStringLiteralLike(n.argumentExpression)
            ? n.argumentExpression.text
            : "<runtime-key>")
      : null;
  }
  return null;
}
export function collectScriptApiReferences(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  _aliases = new Map<ts.Symbol, string>(),
) {
  const refs: ScriptApiReference[] = [];
  const walk = (n: ts.Node) => {
    if (
      ts.isIdentifier(n) &&
      !checker.getSymbolAtLocation(n) &&
      (/^\$[a-zA-Z]/.test(n.text) ||
        [
          "globalThis",
          "window",
          "global",
          "require",
          "WebAssembly",
          "TextEncoder",
          "TextDecoder",
          "atob",
          "btoa",
          "fetch",
          "URL",
          "URLSearchParams",
          "CompressionStream",
          "DecompressionStream",
        ].includes(n.text))
    ) {
      if (
        (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) ||
        (ts.isPropertyAssignment(n.parent) && n.parent.name === n)
      ) {
        ts.forEachChild(n, walk);
        return;
      }
      let outer: ts.Node = n;
      while (
        (ts.isPropertyAccessExpression(outer.parent) ||
          ts.isElementAccessExpression(outer.parent)) &&
        outer.parent.expression === outer
      )
        outer = outer.parent;
      const p = outer.parent,
        call =
          (ts.isCallExpression(p) || ts.isNewExpression(p)) &&
          p.expression === outer
            ? p
            : undefined;
      refs.push({
        api: path(outer) || n.text,
        node: call || outer,
        call,
        access: call
          ? "call"
          : ts.isDeleteExpression(p)
            ? "delete"
            : ts.isBinaryExpression(p) &&
                p.left === outer &&
                p.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
                p.operatorToken.kind <= ts.SyntaxKind.LastAssignment
              ? "write"
              : "read",
        members: (path(outer) || n.text).split("."),
      });
    }
    ts.forEachChild(n, walk);
  };
  walk(tree);
  return refs;
}
export function parseScriptApiIR(
  tree: ts.SourceFile,
  checker: ts.TypeChecker,
  aliases: Map<ts.Symbol, string>,
  from: ScriptClient,
  to: ScriptClient,
  _options: any,
  problems: any[] = [],
  _queries?: any,
): ScriptApiIR & { analysisSourceSha256: string } {
  const operations = collectScriptApiReferences(tree, checker, aliases).map(
    (r, index): ScriptApiOperation => {
      const rule = scriptApiDefinitions
        .filter(
          (d) =>
            !d.selector &&
            d.source[from] &&
            (r.api === d.source[from] ||
              r.api.startsWith(d.source[from] + ".")),
        )
        .sort(
          (a, b) =>
            (b.source[from]?.length || 0) - (a.source[from]?.length || 0),
        )[0];
      const start = r.node.getStart(tree),
        position = tree.getLineAndCharacterOfPosition(start);
      return {
        id: "api:" + index,
        rule: rule?.id || null,
        kind: rule?.kind || "unmapped",
        source: {
          api: r.api,
          start,
          end: r.node.end,
          line: position.line + 1,
          column: position.character + 1,
          access: r.access,
          memberPath: r.members.slice(1),
        },
        canonical: rule?.canonical || "runtime-member-dispatch",
        value: "runtime value",
        target: {
          api:
            rule?.target?.[to] ||
            rule?.source[to] ||
            "native engine / runtime capability",
          lowering:
            "Dispatch source API call through the shared runtime; validate values at invocation",
          proof: "API runtime contract tests; no author-program static proof",
        },
        decision: "runtime",
        diagnostics: [],
      };
    },
  );
  return {
    version: 1,
    sourceClient: from,
    targetClient: to,
    sourceView: "analysis-input",
    analysisSourceSha256: crypto
      .createHash("sha256")
      .update(tree.text)
      .digest("hex"),
    operations,
    diagnostics: problems,
  };
}
