// Modified: 2026-11-02 (chance). Family priorities are descriptive; concrete
// API surfaces are derived from the executable semantic catalog.
import { scriptApiDefinitions } from "../domain/script-api.ts";
// Modified: 2026-11-02 (chance). Keep API correspondence separate from proven
// implementation and rank source-level blocker coverage without claiming unlocks.
const scriptApiPriorityCatalog = [
  {
    id: "flow",
    priority: "P0",
    support: "bounded",
    next: "Resolve closed framework receivers, aliases and computed constant members; reject reflection and escapes",
    dependsOn: [],
  },
  {
    id: "completion",
    priority: "P1",
    support: "bounded-with-fresh-object-assign",
    next: "Prove dynamic result construction, phase and pass-through/synthetic branches before lowering",
    dependsOn: ["flow"],
  },
  {
    id: "http",
    priority: "P1",
    support: "bounded-with-closed-response-aliases",
    next: "Expand closed Promise/request/error flows; keep seven methods and defaults; omit QX-undocumented parameters without errors",
    dependsOn: ["flow", "headers"],
  },
  {
    id: "headers",
    priority: "P1",
    support: "readonly-singleton-exact-and-prefix",
    next: "Prove each read/write, duplicate-field and framing operation; never lowercase the whole dictionary",
    dependsOn: ["flow", "completion"],
  },
  {
    id: "storage",
    priority: "P1",
    support: "bounded",
    next: "Resolve explicit key expressions, missing-value observations and String/deletion flows; no invented shared namespace",
    dependsOn: ["flow"],
  },
  {
    id: "arguments",
    priority: "P1",
    support: "typed-with-qx-omission",
    next: "Prove safe author defaults after omission; distinguish fragment inputs from saved plugin settings; reject unsafe macro escaping",
    dependsOn: ["flow"],
  },
  {
    id: "codecs",
    priority: "P1",
    support: "closed-direct-use-and-const-aliases",
    next: "Prove constant codec aliases without reflection; legacy encodings/compression require independent algorithms and vectors",
    dependsOn: ["flow"],
  },
  {
    id: "binary",
    priority: "P1",
    support: "declared-exact-views",
    next: "Keep exact offsets and declaration provenance; distinguish bytes from unflagged String body",
    dependsOn: ["flow", "completion"],
  },
  {
    id: "notification",
    priority: "P2",
    support: "three-text-fields-plus-bounded-url-media-and-qx-omission",
    next: "Map optional fields individually using author evidence; omit QX-undocumented parameters while retaining expression side effects",
    dependsOn: ["flow"],
  },
  {
    id: "environment",
    priority: "P2",
    support: "source-presence-and-name-subset",
    next: "Separate presence checks from version/device reads; normalize timestamp units only from actual input, never fabricate source identity",
    dependsOn: ["flow"],
  },
  {
    id: "lifecycle",
    priority: "P2",
    support: "no-portable-repeating-or-cancel-contract",
    next: "Audit observed callback counts, cancellation and completion lifetime; never no-op timers or invent request cancellation",
    dependsOn: ["flow"],
  },
  {
    id: "engine",
    priority: "P3",
    support: "inspection-only-for-wasm",
    next: "Group exact module hashes/ABI, independently implement actual operations or certify the required source/destination engines; no fake exports/require",
    dependsOn: ["codecs", "binary"],
  },
  {
    id: "profile",
    priority: "P0",
    support: "declaration-specific",
    next: "Resolve ambiguous observable profiles and missing bytes before API work; no inference from a filename alone",
    dependsOn: [],
  },
  {
    id: "other",
    priority: "review",
    support: "unproven",
    next: "Inspect source-invalid and remaining operations separately; never silently discard unknown blockers",
    dependsOn: [],
  },
] as const;
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
      "Distinct blocked source URLs across every registered target/profile; family counts overlap. Single-family candidates still require implementation, all API proofs and runtime checks, not guaranteed unlocks.",
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
