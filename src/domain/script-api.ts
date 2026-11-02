// Modified: 2026-11-02 (chance). One semantic catalog supplies parsing,
// target lowering, runtime layouts and per-operation publication evidence.
export type ScriptClient = "qx" | "loon" | "surge";
export const scriptHttpMethods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "PATCH",
] as const;
export interface ScriptHostLayout {
  responseStatus: string;
  scriptStartTime: "date" | "epoch-seconds" | "absent";
  binaryField: "body" | "bodyBytes";
  store: {
    style: "prefs" | "store";
    read: string;
    write: string;
    remove: string | null;
    undefinedDeletes: boolean;
  };
  http: {
    style: "promise" | "callback";
    root: string;
    optionsRoot: string | null;
    redirect: string;
    cookie: string;
    tls: string;
    policy: string;
    timeoutMs: number | null;
    directPolicy: string;
    defaults: { redirect: boolean; cookie: boolean; tls: boolean };
  };
  notification: {
    root: string;
    open: string | null;
    media: string | null;
    action: string | null;
    openAction: string | null;
    stringLink: boolean;
    delay: boolean;
  };
  completion: {
    statusEncoding: "line" | "number";
    synthetic: "flat" | "response";
  };
  argument: "absent" | "string" | "typed";
}
export const scriptHostLayouts: Record<ScriptClient, ScriptHostLayout> = {
  qx: {
    responseStatus: "statusCode",
    scriptStartTime: "absent",
    binaryField: "bodyBytes",
    store: {
      style: "prefs",
      read: "valueForKey",
      write: "setValueForKey",
      remove: "removeValueForKey",
      undefinedDeletes: false,
    },
    http: {
      style: "promise",
      root: "$task.fetch",
      optionsRoot: "opts",
      redirect: "redirection",
      cookie: "auto-cookie",
      tls: "skip-cert-verify",
      policy: "policy",
      timeoutMs: null,
      directPolicy: "direct",
      defaults: { redirect: true, cookie: false, tls: false },
    },
    notification: {
      root: "$notify",
      open: null,
      media: null,
      action: null,
      openAction: null,
      stringLink: false,
      delay: false,
    },
    completion: { statusEncoding: "line", synthetic: "flat" },
    argument: "absent",
  },
  loon: {
    responseStatus: "status",
    scriptStartTime: "date",
    binaryField: "body",
    store: {
      style: "store",
      read: "read",
      write: "write",
      remove: null,
      undefinedDeletes: true,
    },
    http: {
      style: "callback",
      root: "$httpClient",
      optionsRoot: null,
      redirect: "auto-redirect",
      cookie: "auto-cookie",
      tls: "insecure",
      // Modified: 2026-11-02 (chance). Loon HTTP SDK names routing selection
      // node; this controls one fetch and does not change application settings.
      policy: "node",
      timeoutMs: 1,
      directPolicy: "DIRECT",
      defaults: { redirect: true, cookie: true, tls: true },
    },
    notification: {
      root: "$notification.post",
      open: "openUrl",
      media: "mediaUrl",
      action: null,
      openAction: null,
      stringLink: true,
      delay: true,
    },
    completion: { statusEncoding: "number", synthetic: "response" },
    argument: "typed",
  },
  surge: {
    responseStatus: "status",
    scriptStartTime: "epoch-seconds",
    binaryField: "body",
    store: {
      style: "store",
      read: "read",
      write: "write",
      remove: null,
      undefinedDeletes: false,
    },
    http: {
      style: "callback",
      root: "$httpClient",
      optionsRoot: null,
      redirect: "auto-redirect",
      cookie: "auto-cookie",
      tls: "insecure",
      policy: "policy",
      timeoutMs: 1000,
      directPolicy: "DIRECT",
      defaults: { redirect: true, cookie: true, tls: false },
    },
    notification: {
      root: "$notification.post",
      open: "url",
      media: "media-url",
      action: "action",
      openAction: "open-url",
      stringLink: false,
      delay: false,
    },
    completion: { statusEncoding: "number", synthetic: "response" },
    argument: "string",
  },
};
export interface ScriptApiDefinition {
  id: string;
  kind:
    | "context"
    | "header"
    | "completion"
    | "storage"
    | "http"
    | "notification"
    | "argument"
    | "codec"
    | "environment";
  source: Partial<Record<ScriptClient, string>>;
  canonical: string;
  selector?: "deletion-marker" | "original-context";
  value: string;
  lowering: string;
  target?: Partial<Record<ScriptClient, string>>;
  // Modified: 2026-11-02 (chance). Describe absent/native-only capabilities
  // without rejecting an author program whose guarded branch may never run.
  availability?: Partial<
    Record<ScriptClient, "runtime" | "native-only" | "unavailable">
  >;
  solution?: string;
  proof: string;
}
const same = (api: string) => ({ qx: api, loon: api, surge: api });
export const scriptApiDefinitions: ScriptApiDefinition[] = [
  ...(["request", "response"] as const).map((role) => ({
    id: role + ".context",
    kind: "context" as const,
    source: same("$" + role),
    canonical: role + ".context",
    value: "runtime context object / presence",
    lowering:
      "source-shaped context view; ordinary aliases, functions and object flow remain JavaScript",
    proof: "closed-context-proof",
  })),
  ...(["url", "method", "headers", "body"] as const).map((field) => ({
    id: "request." + field,
    kind: "context" as const,
    source: same("$request." + field),
    canonical: "request." + field,
    value:
      field === "headers"
        ? "header-dictionary"
        : field === "body"
          ? "String or declared bytes"
          : "String",
    lowering:
      "identity; dictionary operations require their own case/duplicate/framing contract",
    proof:
      field === "headers" ? "header-operation-proof" : "context-field-proof",
  })),
  ...(["headers", "body"] as const).map((field) => ({
    id: "response." + field,
    kind: "context" as const,
    source: same("$response." + field),
    canonical: "response." + field,
    value:
      field === "headers" ? "header-dictionary" : "String or declared bytes",
    lowering: "identity; declaration controls whether body is available",
    proof: field === "headers" ? "header-operation-proof" : "body-mode-proof",
  })),
  ...(["request", "response"] as const).flatMap((role) =>
    (["lookup", "write", "delete"] as const).map((operation) => ({
      id: role + ".header." + operation,
      kind: "header" as const,
      source: same("$" + role + ".headers"),
      canonical: role + ".header." + operation,
      value:
        operation === "lookup"
          ? "header String / missing"
          : "header dictionary mutation",
      lowering:
        "ScriptHub-derived case-insensitive Header facade; delete/has/Symbol traps repaired",
      proof: "runtime-header-api-contract",
    })),
  ),
  {
    id: "response.status",
    kind: "context",
    source: {
      qx: "$response.statusCode",
      loon: "$response.status",
      surge: "$response.status",
    },
    canonical: "response.status",
    value: "HTTP status Number",
    lowering: "source/target responseStatus field from host layout",
    proof: "numeric-status-contract",
  },
  ...(["request", "response"] as const).map((role) => ({
    id: role + ".bytes",
    kind: "context" as const,
    source: {
      qx: "$" + role + ".bodyBytes",
      loon: "$" + role + ".body",
      surge: "$" + role + ".body",
    },
    canonical: role + ".bytes",
    value: "exact byte view",
    lowering: "ArrayBuffer <-> Uint8Array preserving byteOffset/byteLength",
    proof: "explicit-binary-declaration",
  })),
  {
    id: "complete",
    kind: "completion",
    source: same("$done"),
    canonical: "complete(pass|modify|respond)",
    value: "phase-specific result",
    lowering:
      "canonical status Number and byte view; target status line/Number and synthetic flat/response layout",
    proof: "result-field-and-phase-proof",
  },
  {
    id: "storage.remove-by-write",
    kind: "storage",
    selector: "deletion-marker",
    source: { loon: "$persistentStore.write", surge: "$persistentStore.write" },
    target: {
      qx: "$prefs.removeValueForKey",
      loon: "$persistentStore.write",
      surge: "$persistentStore.write",
    },
    canonical: "storage.remove",
    value: "explicit null / source-supported undefined deletion marker + key",
    lowering:
      "normalize deletion marker; QX receives only key, callback hosts receive null,key",
    proof: "explicit-key-and-deletion-marker-proof",
  },
  ...(["read", "write", "remove"] as const).map((op) => ({
    id: "storage." + op,
    kind: "storage" as const,
    source: {
      qx:
        "$prefs." +
        (op === "read"
          ? "valueForKey"
          : op === "write"
            ? "setValueForKey"
            : "removeValueForKey"),
      ...(op === "remove"
        ? {}
        : { loon: "$persistentStore." + op, surge: "$persistentStore." + op }),
    },
    canonical: "storage." + op,
    value:
      op === "read"
        ? "String or source absence"
        : op === "write"
          ? "String / explicit deletion; Boolean result"
          : "explicit deletion; Boolean result",
    lowering:
      "target store layout; missing and deletion semantics remain separate",
    proof: "explicit-key-value-and-observation-proof",
  })),
  {
    id: "storage.removeAll",
    kind: "storage",
    source: { qx: "$prefs.removeAllValues" },
    canonical: "storage.removeAll",
    value: "clear the source application store",
    lowering: "native QX only; Surge has no enumerating/clear-all store API",
    availability: { qx: "native-only", surge: "unavailable" },
    solution:
      "Preserve native QX removeAllValues; do not simulate global deletion with a partial generated-key registry",
    proof: "native store boundary",
  },
  {
    id: "http.request",
    kind: "http",
    source: { qx: "$task.fetch", loon: "$httpClient", surge: "$httpClient" },
    canonical: "http.request -> success(status,body)|failure",
    value: "Promise or callback",
    lowering:
      "seven methods; source defaults, option names, timeout units and error representation from layouts; QX undocumented options omitted",
    proof: "request-response-error-flow-proof",
  },
  {
    id: "notify",
    kind: "notification",
    source: {
      qx: "$notify",
      loon: "$notification.post",
      surge: "$notification.post",
    },
    canonical: "notify(title,subtitle,body,openURL?,mediaURL?)",
    value: "notification request; delivery is not guaranteed",
    lowering:
      "explicit option fields from layouts; QX optional arguments omitted; no delay/clipboard invention",
    proof: "notification-option-proof",
  },
  {
    id: "argument",
    kind: "argument",
    source: { loon: "$argument", surge: "$argument" },
    canonical: "script.argument",
    value: "declared typed object or String",
    lowering:
      "actual source schema + target payload; QX argument is absent and author JavaScript handles it",
    proof: "source-schema-and-default-flow-proof",
  },
  ...(["TextEncoder", "TextDecoder", "atob", "btoa"] as const).map((api) => ({
    id: "codec." + api,
    kind: "codec" as const,
    source: same(api),
    canonical: "codec." + api,
    value: "UTF-8/Base64",
    lowering: "shared scoped standard implementation",
    proof: "closed-codec-and-pristine-intrinsics-proof",
  })),
  // Modified: 2026-11-02 (chance). Compression is a source API contract,
  // backed by native Loon or the pinned Pako provider, independent of author code.
  ...(["gzip", "ungzip"] as const).map((api) => ({
    id: "compression." + api,
    kind: "codec" as const,
    source: { loon: "$utils." + api },
    target: {
      loon: "$utils." + api,
      qx: "WayX.Pako." + api,
      surge: "WayX.Pako." + api,
    },
    canonical: "compression." + api,
    value: "synchronous Uint8Array -> Uint8Array",
    lowering:
      "native source first; lazy Pako gzip provider with exact views and explicit compression/decompression errors",
    proof:
      "independent gzip vectors, CRC/trailer failures and native dispatch API contracts",
  })),
  ...(["encrypt", "decrypt"] as const).map((api) => ({
    id: "crypto.aes." + api,
    kind: "codec" as const,
    source: { loon: "$crypto.aes." + api },
    canonical: "crypto.aes." + api,
    value: "synchronous Uint8Array AES; separate GCM tag",
    lowering: "native Loon only; no cross-client AES provider yet",
    availability: {
      loon: "native-only" as const,
      qx: "unavailable" as const,
      surge: "unavailable" as const,
    },
    solution:
      "Integrate pinned noble-ciphers synchronous ECB/CBC/CTR/GCM, explicit padding and separate authenticated tag; verify independent vectors before enabling",
    proof: "capability boundary, not an implemented mapping",
  })),
  ...(["geoip", "ipasn", "ipaso"] as const).map((api) => ({
    id: "ip." + api,
    kind: "environment" as const,
    source: { loon: "$utils." + api },
    canonical: "ip." + api,
    value: "synchronous local-database lookup",
    lowering:
      "retain native Loon implementation; source database cannot be reconstructed",
    availability: {
      loon: "native-only" as const,
      qx: "unavailable" as const,
      surge: "unavailable" as const,
    },
    solution:
      "Use a real equivalent native database only after return/absence contracts are established; alternate database or remote lookup requires explicit semantic policy",
    proof: "native database boundary",
  })),
  {
    id: "dns.query",
    kind: "http",
    source: { loon: "$dns.query" },
    canonical: "dns.query",
    value:
      "callback resolver with protocol/server/timeout/answers/cache metadata",
    lowering: "native Loon only; HTTP fetch is not a system DNS substitute",
    availability: {
      loon: "native-only",
      qx: "unavailable",
      surge: "unavailable",
    },
    solution:
      "Map only an equivalent native resolver; an explicit DoH-only provider may be added separately without claiming UDP/DoQ/system-cache equivalence",
    proof: "native resolver boundary",
  },
  ...(["URL", "URLSearchParams"] as const).map((api) => ({
    id: "standard." + api,
    kind: "codec" as const,
    source: same(api),
    canonical: "standard." + api,
    value: "WHATWG URL standard class",
    lowering: "actual native engine global; no bundled fallback yet",
    availability: {
      loon: "native-only" as const,
      qx: "native-only" as const,
      surge: "native-only" as const,
    },
    solution:
      "Evaluate a pinned whatwg-url bundle with URL/URLSearchParams together, WPT vectors, IDNA dependencies, ES compatibility and bundle-size budget",
    proof: "native global boundary",
  })),
  {
    id: "script.name",
    kind: "environment",
    target: {
      qx: "binding.sourceScript.name",
      loon: "$script.name",
      surge: "binding.sourceScript.name",
    },
    source: { loon: "$script.name", surge: "$script.name" },
    canonical: "source.script.name",
    value: "String",
    lowering: "bind original source declaration name, not generated filename",
    proof: "unique-source-name",
  },
  {
    id: "script.startTime",
    kind: "environment",
    source: { loon: "$script.startTime", surge: "$script.startTime" },
    canonical: "source.script.startTime",
    value: "Date / epoch seconds",
    lowering: "requires actual source timing origin; never invent one on QX",
    proof: "actual-timestamp-contract",
  },
];
export interface ScriptApiOperation {
  id: string;
  rule: string | null;
  kind: string;
  source: {
    api: string;
    start: number;
    end: number;
    line: number;
    column: number;
    access: "read" | "write" | "delete" | "call" | "construct";
    memberPath?: string[];
  };
  canonical: string | null;
  value: string | null;
  target: {
    api: string | null;
    lowering: string;
    proof: string;
    capability?: "runtime" | "native-only" | "unavailable" | "unclassified";
  };
  fields?: {
    source: string;
    canonical: string;
    target: string | null;
    action: "map" | "omit" | "unresolved";
    transform?: string;
    cases?: { when: string; target: string; transform: string }[];
  }[];
  decision:
    | "native"
    | "mapped"
    | "omitted"
    | "requires-proof"
    | "unmapped"
    | "runtime";
  diagnostics: { api: string; reason: string; solution: string }[];
}
export interface ScriptApiIR {
  version: 1;
  sourceClient: ScriptClient;
  targetClient: ScriptClient;
  sourceView: "analysis-input";
  operations: ScriptApiOperation[];
  diagnostics: { api: string; reason: string; solution: string }[];
}

// Modified: 2026-11-02 (chance). Published plans cannot mutate the global
// rule catalog through shared nested references; extensions edit definitions.
for (const layout of Object.values(scriptHostLayouts)) {
  Object.freeze(layout.store);
  Object.freeze(layout.http.defaults);
  Object.freeze(layout.http);
  Object.freeze(layout.notification);
  Object.freeze(layout.completion);
  Object.freeze(layout);
}
Object.freeze(scriptHostLayouts);
Object.freeze(scriptHttpMethods);
for (const definition of scriptApiDefinitions) {
  definition.proof = definition.availability
    ? "explicit capability boundary; provider proposal is not implemented support"
    : "runtime API contract; author values are validated at invocation";
  Object.freeze(definition.source);
  if (definition.target) Object.freeze(definition.target);
  if (definition.availability) Object.freeze(definition.availability);
  Object.freeze(definition);
}
Object.freeze(scriptApiDefinitions);

// Modified: 2026-11-02 (chance). Undocumented QX notification parameters
// are omitted on source and destination branches; expression effects stay intact.
export function omitScriptNotificationOptions(
  from: ScriptClient,
  to: ScriptClient,
) {
  return (
    scriptHostLayouts[from].notification.root === "$notify" ||
    scriptHostLayouts[to].notification.root === "$notify"
  );
}
