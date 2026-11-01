// Modified: 2026-11-02 (chance). Inspect embedded WASM per source without
// instantiating modules, running start functions or inventing target engine support.
import ts from "typescript";
import crypto from "node:crypto";
export function inspectEmbeddedWasm(source: string) {
  if (!/\bWebAssembly\b/.test(source)) return null;
  const tree = ts.createSourceFile(
    "wasm-inspection.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const modules: any[] = [];
  const visit = (n: ts.Node) => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      /wasm.*base64|base64.*wasm/i.test(n.name.text) &&
      n.initializer &&
      ts.isStringLiteralLike(n.initializer)
    ) {
      const encoded = n.initializer.text;
      if (
        encoded.length > 2800000 ||
        encoded.length % 4 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)
      ) {
        modules.push({
          binding: n.name.text,
          status: "invalid-or-too-large-base64",
        });
        return;
      }
      const bytes = Buffer.from(encoded, "base64"),
        sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
      try {
        const module = new WebAssembly.Module(bytes);
        modules.push({
          binding: n.name.text,
          status: "compiled-without-instantiation",
          sha256,
          size: bytes.length,
          imports: WebAssembly.Module.imports(module),
          exports: WebAssembly.Module.exports(module),
        });
      } catch (error: any) {
        modules.push({
          binding: n.name.text,
          status: "invalid-module",
          sha256,
          size: bytes.length,
          error: error.message,
        });
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(tree);
  return {
    status: "target-engine-unverified",
    execution: "none",
    modules,
    remaining: modules.length
      ? "Verify these exact module hashes, imports, memory and operations on all three clients; otherwise implement the observed exports in pure JS with byte vectors."
      : "No supported literal embedding found; trace the actual module bytes and import/export ABI before choosing a backend.",
  };
}
export function scriptProblemCategory(api: string): string {
  if (api === "syntax" || api === "opaque-script") return "source-invalid";
  if (
    /WebAssembly|WASM|httpClient|\$task|fetch|timeout|binary|headers/i.test(api)
  )
    return "target-contract-unverified";
  if (
    /done|source-profile|argument|scope|global|this|dynamic|reflection|constructor/i.test(
      api,
    )
  )
    return "analysis-unresolved";
  return "mapping-missing";
}
