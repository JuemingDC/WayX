// Modified: 2026-11-02 (chance). QX parameter omission is a user-authorized exception backed by the author repository.
import { qxHttpOptions } from "./qx-http-options.ts";
// Modified: 2026-11-02 (chance). Publish capability evidence with every API
// report, separating proven subsets, precise boundaries and out-of-scope controls.
export const scriptCapabilityBoundaries = {
  revision: "2026-11-02",
  scriptHub: {
    repository: "Script-Hub-Org/Script-Hub",
    commit: "b943361f11be5795b3eb10f9cc4e5497642922fc",
    file: "script-converter.js",
    observed: [
      "global lowercase header proxies",
      "GET/POST-only QX fetch emulation",
      "missing response resolved as null",
      "timer no-ops",
      "text replacement of $done(",
    ],
    reusedCode: false,
  },
  remoteScriptEcho: {
    status: "supported",
    domain:
      "HTTP(S) operands with js/mjs/cjs pathname or a verified WayX shared-script namespace, including MIME echo delimiters, query and fragment",
    outside:
      "Local resources and remote JSON/data are not reclassified; extensionless resources need source-byte classification",
  },
  lexicalBindings: {
    status: "supported",
    domain:
      "TypeScript-resolved local bindings, capture-free generated bindings, closed const request/response/script aliases, guarded same-context scalar && reads, immutable literal keys/string tables without decoder execution, Boolean-only logical guards, mapped context-presence guards, unused pure host-presence probes and pure source-host typeof/const branches with var-hoist preservation, localized source edits and nonescaping function proofs",
    outside:
      "Escaping platform aliases, class-getter receiver identity, nonsequential const/TDZ uses, dynamic receivers, eval and Function construction remain blocked",
  },
  completion: {
    status: "conditional",
    domain:
      "Literal/conditional/spread result objects, closed object-returning functions with nonescaping call results, closed variables and static scalar body/bodyBytes/status/statusCode/url reads/assignments/deletion; proven QX string/undefined results require original response-body declarations; class-local strict receivers preserve native calls",
    outside:
      "Alias escapes, shorthand escapes, duplicate dynamic declarations, loop assignment, unknown/async returns, escaped function results, header/response mutations and dynamic property writes remain blocked",
  },
  storage: {
    status: "conditional",
    domain:
      "Explicit plain constant strings/concatenations/const aliases as keys; known nonempty JSON serialization writes and pristine Loon JSON.stringify results including undefined deletion; read absence may normalize under ||, ??, Boolean/loose-null tests or proven String/truthy branch guards, including fully audited local aliases",
    outside:
      "Strict null/undefined observations, stringification, implicit/dynamic keys, Loon empty-string writes and full cleanup remain blocked",
  },
  headers: {
    status: "conditional-readonly-singleton",
    domain:
      "Pure Object.keys(h).find with lowercase-literal equality or anchored literal case-insensitive exact/prefix regex, guarded readonly lookup and no key/header alias escape; lexical let aliases must remain readonly; target validates one string value per queried name/prefix",
    outside:
      "General object casing, duplicate values, mutation, output headers and framing remain unproven",
    reason:
      "Global lowercase proxies alter enumeration, overwrite case variants and can remove Host or mutate unrelated source behavior",
    next: "Extend exact per-field operations and real-client vectors without changing dictionary casing, duplicates or framing",
  },
  http: {
    status:
      "conditional-callback-and-qx-Promise-bridge-with-authorized-omissions",
    qx: qxHttpOptions,
    implemented:
      "Callback-source bridge: seven methods; Surge/Loon keep strict explicit HTTP options and native timeout unit conversion; QX maps author-documented fields and omits undocumented optional request parameters. QX-source literal/closed-const fetch calls support closed then/catch and locally caught await, numeric statusCode, ASCII or exact-offset bodyBytes. All retain explicit UA/Accept/identity encoding, <=64KiB and one active request; source Promise errors propagate and unknown QX fields are omitted on all hosts including QX itself",
    production:
      "Shared callback-source and proven QX-source Promise programs publish only after every registered profile passes all three hosts; ignored QX fields are recorded outside author scripts",
    fixtures:
      "tests/support/http-contract-server.ts, tests/script-contracts.ts, tests/script-task.ts, tests/script-flow.ts, tests/script-flow-production.ts and manual tools/script-client-probe.js; no real-client result has been supplied",
    methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"],
    timeout: {
      surge: "seconds; default 5",
      loon: "milliseconds; default 5000",
      qx: "omitted without parameter errors by user instruction; no request cancellation is claimed and no timer is invented",
    },
    cookie: {
      surge: "default true",
      loon: "default true",
      qx: "auto-cookie default false on build 934+; older versions differ",
    },
    tls: {
      loon: "insecure defaults true; ALPN defaults h1",
      surge: "explicit insecure option; never inherit Loon defaults silently",
    },
    errors:
      "QX rejected Promise reason.error versus callback error/response/data; missing response must not become successful null",
    next: "Extend dynamic URLs/headers, escaped response objects, detailed error observations and independent real-client fixtures; undocumented QX request parameters remain omitted without error",
  },
  webAssembly: {
    status: "blocked-without-engine-proof",
    reason:
      "Identical JS glue does not establish WASM availability, module imports, memory or native ABI equivalence on all hosts",
    inspection:
      "Literal WASM_BASE64/base64_wasm modules are decoded, hashed and compiled without instantiation, recording imports/exports per source; never execute author start functions",
    next: "Verify exact module hashes and each target engine/module profile or replace the specific exported operation with independent pure-JS code and byte vectors; no empty exports",
  },
  hostWebApi: {
    status: "blocked-unless-locally-implemented",
    reason:
      "Surge standard WebAPI may require WebView; QX/Loon do not promise all same globals",
    implemented:
      "Scoped direct UTF-8 TextEncoder/Decoder and atob/btoa with closed instances, pristine intrinsics, exact BufferSource views, streaming/fatal/BOM, encodeInto and standard Base64 validation; tested against independent native vectors",
    outside:
      "Legacy encodings, shared buffers, codec reflection/escapes, intrinsic mutation, compression, arbitrary Web APIs and full DOMException identity remain unproven",
    next: "Extend independently verified algorithms or establish each target engine contract; local author polyfills remain local code",
  },
  // Modified: 2026-11-02 (chance). Typed source parameters and declared byte
  // inputs are separate contracts; QX omission never fabricates author defaults.
  arguments: {
    status: "conditional-with-authorized-qx-omission",
    domain:
      "Declared Loon Boolean/number/safe finite-select objects bind to an existing typed Surge JSON payload; native Loon uses its actual object. QX omits $argument only with proven safe author fallback expressions. Literal String schemas require actual String input",
    outside:
      "Unbounded macro String escaping, missing payload/schema, unknown properties, unsafe null/object aliases and dynamic argument consumers remain blocked",
  },
  binaryInput: {
    status: "conditional",
    domain:
      "Explicit stable binary profile and observed principal body reads map callback Uint8Array to QX ArrayBuffer bodyBytes with exact byte offsets; unflagged text retains body even if QX exposes bodyBytes too",
    outside:
      "Unresolved dynamic binary mode, missing required bytes and arbitrary mixed text/byte observations remain blocked",
  },
  configurationControl: {
    status: "excluded",
    apis: ["$config", "$surge", "$httpAPI", "$configuration"],
    reason: "Only HTTP adblock scripts are in the current user scope",
  },
  verification:
    "Node VM, native ICU, file-integrity and classic-JS syntax checks are engineering evidence, not blanket iOS device certification",
} as const;
