// Modified: 2026-11-02 (chance). Family priorities are descriptive; concrete
// API surfaces are derived from the executable semantic catalog.
import { scriptApiDefinitions } from "../domain/script-api.ts";
// Modified: 2026-11-02 (chance). Keep API correspondence separate from proven
// implementation and rank source-level blocker coverage without claiming unlocks.
const scriptApiPriorityCatalog = [
  "context",
  "completion",
  "http",
  "headers",
  "storage",
  "arguments",
  "codecs",
  "environment",
  "profile",
  "engine",
  "other",
].map((id) => ({
  id,
  priority: id === "profile" ? "declaration" : "runtime",
  support: "api-runtime-contract",
  next: "Maintain source/target API contract vectors and native capability boundaries",
  dependsOn: [] as string[],
}));
export const scriptApiMapping = scriptApiPriorityCatalog.map((family) => {
  const related = scriptApiDefinitions.filter((rule) =>
    family.id === "headers"
      ? rule.kind === "header"
      : family.id === "binary"
        ? rule.id.endsWith(".bytes")
        : family.id === "arguments"
          ? rule.kind === "argument"
          : family.id === "codecs"
            ? rule.kind === "codec"
            : family.id === "environment"
              ? rule.kind === "environment"
              : rule.kind === family.id,
  );
  const surface = (client: "qx" | "surge" | "loon") =>
    [
      ...new Set(related.map((rule) => rule.source[client]).filter(Boolean)),
    ].join(", ") || "No direct SDK surface; see semantic operation plan";
  return {
    ...family,
    qx: surface("qx"),
    surge: surface("surge"),
    loon: surface("loon"),
    ruleIds: related.map((rule) => rule.id),
  };
});
export function scriptApiFamily(api: string): string {
  if (/headers/i.test(api)) return "headers";
  if (/^\$done$/.test(api)) return "completion";
  if (/^\$(?:task|httpClient)(?:\.|$)|^fetch$/.test(api)) return "http";
  if (/^\$(?:persistentStore|prefs)(?:\.|$)/.test(api)) return "storage";
  if (/argument/i.test(api)) return "arguments";
  if (/^(?:TextEncoder|TextDecoder|atob|btoa)$/.test(api)) return "codecs";
  if (/binary|bodyBytes/i.test(api)) return "binary";
  if (/^\$(?:notify|notification)(?:\.|$)/.test(api)) return "notification";
  if (/^\$(?:environment|loon|script)(?:\.|$)/.test(api)) return "environment";
  if (
    /WebAssembly|WASM|Compression|Decompression|^require$|^Buffer$|^\$(?:utils|crypto|dns)(?:\.|$)/.test(
      api,
    )
  )
    return "engine";
  if (/profile|syntax|opaque|source-byte/i.test(api)) return "profile";
  if (
    /^(?:this|globalThis|global|window|Function|eval|dynamic-module|reflection|constructor)$|^\$(?:request|response)(?:\.|$)/.test(
      api,
    )
  )
    return "flow";
  return "other";
}
export function scriptConversionPriorities(
  diagnostics: readonly {
    status: string;
    sourceUrl?: string;
    artifact?: string;
    problems: readonly { api: string }[];
  }[],
) {
  const sources = new Map<string, Set<string>>();
  for (const d of diagnostics) {
    if (d.status !== "blocked") continue;
    const key = d.sourceUrl || `artifact:${d.artifact || "unknown"}`;
    const families = sources.get(key) || new Set<string>();
    for (const p of d.problems) families.add(scriptApiFamily(p.api));
    if (!d.problems.length) families.add("other");
    sources.set(key, families);
  }
  return {
    basis:
      "Distinct blocked source URLs across every registered target/profile; family counts overlap. Single-family candidates still require implementation, runtime API support and valid declaration metadata, not guaranteed unlocks.",
    blockedSources: sources.size,
    families: scriptApiMapping.map((m) => {
      const touched = [...sources].filter(([, f]) => f.has(m.id));
      const coBlockers = new Map<string, number>();
      for (const [, f] of touched)
        for (const other of f)
          if (other !== m.id)
            coBlockers.set(other, (coBlockers.get(other) || 0) + 1);
      return {
        family: m.id,
        priority: m.priority,
        affectedSources: touched.length,
        singleFamilyCandidates: touched
          .filter(([, f]) => f.size === 1)
          .map(([url]) => url)
          .sort(),
        coBlockers: Object.fromEntries(
          [...coBlockers].sort(([a], [b]) => a.localeCompare(b)),
        ),
      };
    }),
  };
}
