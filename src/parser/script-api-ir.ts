// Modified: 2026-11-02 (chance). Lightweight API inventory reports runtime
// dispatch and boundaries; it never proves or rewrites concrete business values.
import ts from "typescript";
import crypto from "node:crypto";
import {
  scriptApiDefinitions,
  isExcludedAdblockScriptApi,
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
          "setTimeout",
          "setInterval",
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
  // Modified: 2026-11-02 (chance). Out-of-scope DNS/IP utilities are neither
  // conversion operations nor missing adblock capabilities; author bytes remain.
  return refs.filter((ref) => !isExcludedAdblockScriptApi(ref.api));
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
      // Modified: 2026-11-02 (chance). A mixed native-boundary rule may still
      // be implemented on this destination; diagnose the selected target only.
      const capability =
        rule?.availability?.[to] || (rule ? "runtime" : "unclassified");
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
          // Modified: 2026-11-02 (chance). An inventory entry is not a support
          // certificate. Report provider/native/absent contracts explicitly.
          capability,
          api:
            rule?.availability?.[to] === "unavailable"
              ? null
              : rule?.target?.[to] ||
                rule?.source[to] ||
                "native engine / runtime capability",
          lowering:
            rule?.lowering ||
            "Unclassified reference; depends on the actual runtime member and host capability",
          proof:
            capability === "runtime"
              ? "API runtime contract tests; no author-program static proof"
              : "Capability boundary; no cross-host provider equivalence claim",
        },
        decision: "runtime",
        diagnostics:
          rule && (capability === "native-only" || capability === "unavailable")
            ? [
                {
                  api: r.api,
                  reason: rule.lowering,
                  solution: rule.solution || "Use actual native capability",
                },
              ]
            : [],
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
