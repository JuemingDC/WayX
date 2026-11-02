// Modified: 2026-11-02 (chance). Keep API correspondence separate from proven
// implementation and rank source-level blocker coverage without claiming unlocks.
export const scriptApiMapping = [
  {
    id: "flow",
    priority: "P0",
    qx: "lexical JavaScript",
    surge: "lexical JavaScript",
    loon: "lexical JavaScript",
    support: "bounded",
    next: "Resolve closed framework receivers, aliases and computed constant members; reject reflection and escapes",
    dependsOn: [],
  },
  {
    id: "completion",
    priority: "P1",
    qx: "$done({body,bodyBytes,status,...}); proven response-body String",
    surge: "$done({body,status,...}); request synthetic response wrapper",
    loon: "$done({body,status,...}); request synthetic response wrapper",
    support: "bounded",
    next: "Prove dynamic result construction, phase and pass-through/synthetic branches before lowering",
    dependsOn: ["flow"],
  },
  {
    id: "http",
    priority: "P1",
    qx: "$task.fetch(options) -> Promise",
    surge: "$httpClient.<method>(options,callback)",
    loon: "$httpClient.<method>(options,callback)",
    support: "bounded",
    next: "Expand closed Promise/request/error flows; keep seven methods and defaults; omit QX-undocumented parameters without errors",
    dependsOn: ["flow", "headers"],
  },
  {
    id: "headers",
    priority: "P1",
    qx: "$request/$response.headers; body-script output restrictions",
    surge: "$request/$response.headers",
    loon: "$request/$response.headers",
    support: "readonly-singleton-exact-and-prefix",
    next: "Prove each read/write, duplicate-field and framing operation; never lowercase the whole dictionary",
    dependsOn: ["flow", "completion"],
  },
  {
    id: "storage",
    priority: "P1",
    qx: "$prefs.valueForKey/setValueForKey/removeValueForKey",
    surge: "$persistentStore.read/write",
    loon: "$persistentStore.read/write",
    support: "bounded",
    next: "Resolve explicit key expressions, missing-value observations and String/deletion flows; no invented shared namespace",
    dependsOn: ["flow"],
  },
  {
    id: "arguments",
    priority: "P1",
    qx: "omit unsupported $argument; $environment.variables is a separate fragment input",
    surge: "$argument String; typed JSON only with actual declaration payload",
    loon: "$argument String/PluginObject; schema from Script v2 and [Argument]",
    support: "typed-with-qx-omission",
    next: "Prove safe author defaults after omission; distinguish fragment inputs from saved plugin settings; reject unsafe macro escaping",
    dependsOn: ["flow"],
  },
  {
    id: "codecs",
    priority: "P1",
    qx: "scoped UTF-8 TextEncoder/Decoder and atob/btoa",
    surge: "same scoped implementation",
    loon: "same scoped implementation",
    support: "closed-direct-use-and-const-aliases",
    next: "Prove constant codec aliases without reflection; legacy encodings/compression require independent algorithms and vectors",
    dependsOn: ["flow"],
  },
  {
    id: "binary",
    priority: "P1",
    qx: "ArrayBuffer bodyBytes",
    surge: "Uint8Array body in binary-body-mode",
    loon: "Uint8Array body in binary_body_mode",
    support: "declared-exact-views",
    next: "Keep exact offsets and declaration provenance; distinguish bytes from unflagged String body",
    dependsOn: ["flow", "completion"],
  },
  {
    id: "notification",
    priority: "P2",
    qx: "$notify(title,subtitle,body[,options])",
    surge: "$notification.post(title,subtitle,body[,options])",
    loon: "$notification.post(title,subtitle,body[,options])",
    support: "three-text-fields-plus-bounded-url-media-and-qx-omission",
    next: "Map optional fields individually using author evidence; omit QX-undocumented parameters while retaining expression side effects",
    dependsOn: ["flow"],
  },
  {
    id: "environment",
    priority: "P2",
    qx: "$environment; actual target identity",
    surge: "$environment; $script.name/startTime",
    loon: "$loon String; $script.name/startTime Date",
    support: "source-presence-and-name-subset",
    next: "Separate presence checks from version/device reads; normalize timestamp units only from actual input, never fabricate source identity",
    dependsOn: ["flow"],
  },
  {
    id: "lifecycle",
    priority: "P2",
    qx: "setTimeout; other scheduling contracts need author evidence",
    surge: "verify timer/cancellation and post-$done lifetime individually",
    loon: "setTimeout; documented setInterval is one-shot; no reliable clear pair",
    support: "no-portable-repeating-or-cancel-contract",
    next: "Audit observed callback counts, cancellation and completion lifetime; never no-op timers or invent request cancellation",
    dependsOn: ["flow"],
  },
  {
    id: "engine",
    priority: "P3",
    qx: "no blanket WASM/compression/Node module contract",
    surge: "verify engine/API mode per operation",
    loon: "verify engine; $utils.gzip / $crypto.aes have separate contracts",
    support: "inspection-only-for-wasm",
    next: "Group exact module hashes/ABI, independently implement actual operations or certify the required source/destination engines; no fake exports/require",
    dependsOn: ["codecs", "binary"],
  },
  {
    id: "profile",
    priority: "P0",
    qx: "rewrite phase/body/echo declarations",
    surge: "http-request/response and requires-body",
    loon: "Script v2 request/response, requires_body and binary_body_mode",
    support: "declaration-specific",
    next: "Resolve ambiguous observable profiles and missing bytes before API work; no inference from a filename alone",
    dependsOn: [],
  },
  {
    id: "other",
    priority: "review",
    qx: "unclassified",
    surge: "unclassified",
    loon: "unclassified",
    support: "unproven",
    next: "Inspect source-invalid and remaining operations separately; never silently discard unknown blockers",
    dependsOn: [],
  },
] as const;
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
