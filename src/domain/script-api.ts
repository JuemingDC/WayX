// Modified: 2026-11-02 (chance). One semantic catalog supplies parsing,
// target lowering, runtime layouts and per-operation publication evidence.
export type ScriptClient = "qx" | "loon" | "surge";
// Modified: 2026-11-02 (chance). Shared provider composition and scope revision.
// Modified: 2026-11-05 (chance). Target-specific execution, optional provenance and selective providers.
// Modified: 2026-11-10 (chance). Official QX path/scheme context and request-result lowering.
export const scriptRuntimePolicyVersion = 6;
// Modified: 2026-11-02 (chance). User excludes resolver and IP-database APIs
// from adblock conversion, inventories and remaining-work priorities.
export const excludedAdblockScriptApis = Object.freeze([
  "$dns",
  "$utils.geoip",
  "$utils.ipasn",
  "$utils.ipaso",
] as const);
export function isExcludedAdblockScriptApi(api: string): boolean {
  const name = api.replace(/^(?:globalThis|window|global)\./, "");
  return excludedAdblockScriptApis.some(
    (root) => name === root || name.startsWith(root + "."),
  );
}
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
// Modified: 2026-11-03 (chance). Define current contracts once; do not overwrite retired static-proof declarations.
const definitions: Omit<ScriptApiDefinition, "proof">[] = [
  ...(["request", "response"] as const).map((role) => ({
    id: role + ".context",
    kind: "context" as const,
    source: same("$" + role),
    canonical: role + ".context",
    value: "runtime context object / presence",
    lowering:
      "source-shaped context view; ordinary aliases, functions and object flow remain JavaScript",
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
  })),
  // Modified: 2026-11-10 (chance). Derive documented QX request fields from the actual target URL.
  ...(["scheme", "path"] as const).map((field) => ({
    id: "request." + field,
    kind: "context" as const,
    source: { qx: "$request." + field },
    canonical: "request." + field,
    value: "String",
    lowering: "actual HTTP URL scheme and raw path/query; QX path results become Surge url",
  })),
  ...(["headers", "body"] as const).map((field) => ({
    id: "response." + field,
    kind: "context" as const,
    source: same("$response." + field),
    canonical: "response." + field,
    value:
      field === "headers" ? "header-dictionary" : "String or declared bytes",
    lowering: "identity; declaration controls whether body is available",
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
  })),
  {
    id: "complete",
    kind: "completion",
    source: same("$done"),
    canonical: "complete(pass|modify|respond)",
    value: "phase-specific result",
    lowering:
      "canonical status Number and byte view; target status line/Number and synthetic flat/response layout",
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
  })),
  {
    id: "storage.removeAll",
    kind: "storage",
    source: { qx: "$prefs.removeAllValues", loon: "$persistentStore.remove" },
    target: { qx: "$prefs.removeAllValues", loon: "$persistentStore.remove" },
    canonical: "storage.removeAll",
    value: "clear the source application store",
    lowering:
      "Loon clear-all maps to actual QX removeAllValues or native Loon; Surge clear-all is omitted under explicit user policy",
    availability: { qx: "runtime", loon: "native-only", surge: "runtime" },
    solution:
      "Use actual QX/native Loon clear-all; Surge ignores the operation without deleting partial keys",
  },
  {
    id: "http.request",
    kind: "http",
    source: { qx: "$task.fetch", loon: "$httpClient", surge: "$httpClient" },
    canonical: "http.request -> success(status,body)|failure",
    value: "Promise or callback",
    lowering:
      "seven methods; source defaults, option names, timeout units and error representation from layouts; QX undocumented options omitted",
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
  },
  {
    id: "argument",
    kind: "argument",
    source: { loon: "$argument", surge: "$argument" },
    canonical: "script.argument",
    value: "declared typed object or String",
    lowering:
      "actual source schema + target payload; QX argument is absent and author JavaScript handles it",
  },
  ...(["TextEncoder", "TextDecoder", "atob", "btoa"] as const).map((api) => ({
    id: "codec." + api,
    kind: "codec" as const,
    source: same(api),
    canonical: "codec." + api,
    value: "UTF-8, standard legacy decoder labels and Base64",
    lowering:
      "native decoding first, pinned Exodus legacy decoder fallback; scoped UTF-8/Base64",
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
  })),
  ...(["encrypt", "decrypt"] as const).map((api) => ({
    id: "crypto.aes." + api,
    kind: "codec" as const,
    source: { loon: "$crypto.aes." + api },
    canonical: "crypto.aes." + api,
    value: "synchronous Uint8Array AES; separate GCM tag",
    target: {
      loon: "$crypto.aes." + api,
      qx: "WayX.noble." + api,
      surge: "WayX.noble." + api,
    },
    lowering:
      "native Loon first; lazy noble-ciphers 2.4.0 synchronous ECB/CBC/CTR/GCM, padding and separate authenticated tag",
  })),
  ...(["URL", "URLSearchParams"] as const).map((api) => ({
    id: "standard." + api,
    kind: "codec" as const,
    source: same(api),
    canonical: "standard." + api,
    value: "WHATWG URL standard class",
    target: same(api),
    lowering:
      "native URL/URLSearchParams pair first; otherwise lazy pinned whatwg-url 14.2.0 with linked query state and IDNA",
  })),
  // Modified: 2026-11-02 (chance). Loon timers are one-shot; record source
  // semantics explicitly instead of treating target interval names as equivalent.
  ...(["setTimeout", "setInterval"] as const).map((api) => ({
    id: "timer." + api,
    kind: "environment" as const,
    source: { loon: api, ...(api === "setTimeout" ? { qx: api } : {}) },
    target: { loon: api, qx: "setTimeout", surge: "setTimeout" },
    canonical: "timer.once",
    value: "callback, milliseconds and unchanged arguments",
    lowering:
      "actual native setTimeout; Loon setInterval is documented as one-shot",
  })),
  ...(["request", "response"] as const).map((role) => ({
    id: role + ".trailers",
    kind: "context" as const,
    source: { loon: "$" + role + ".h2_trailers" },
    canonical: role + ".trailers",
    value: "HTTP/2 trailer dictionary",
    lowering:
      "preserve native source fields when present; QX completion ignores undocumented fields; Surge completion has no trailer result field",
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
  },
  {
    id: "script.startTime",
    kind: "environment",
    source: { loon: "$script.startTime", surge: "$script.startTime" },
    canonical: "source.script.startTime",
    value: "Date / epoch seconds",
    lowering: "requires actual source timing origin; never invent one on QX",
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
  decision: "runtime";
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
export const scriptApiDefinitions: readonly ScriptApiDefinition[] =
  Object.freeze(
    definitions.map((definition) => {
      Object.freeze(definition.source);
      if (definition.target) Object.freeze(definition.target);
      if (definition.availability) Object.freeze(definition.availability);
      return Object.freeze({
        ...definition,
        proof: definition.availability
          ? "explicit capability boundary; provider proposal is not implemented support"
          : "runtime API contract; author values are validated at invocation",
      });
    }),
  );

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
