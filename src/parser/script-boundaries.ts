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
      "TypeScript-resolved local bindings, capture-free generated bindings, mapped context-presence guards, unused pure host-presence probes and pure source-host typeof/const branches with var-hoist preservation, localized source edits and nonescaping function proofs",
    outside:
      "Escaping platform aliases, class-getter receiver identity, nonsequential const/TDZ uses, dynamic receivers, eval and Function construction remain blocked",
  },
  completion: {
    status: "conditional",
    domain:
      "Literal/conditional result objects, closed variables assigned literal objects and static scalar body/bodyBytes/status/statusCode/url reads, assignments or deletion; class-local strict receivers preserve native calls",
    outside:
      "Alias escapes, shorthand escapes, duplicate dynamic declarations, loop assignment, unknown returns, header/response mutations and dynamic property writes remain blocked",
  },
  storage: {
    status: "conditional",
    domain:
      "Explicit plain string keys; read absence may normalize only under ||, ??, Boolean guards or loose-null tests, including fully audited local aliases",
    outside:
      "Strict null/undefined observations, stringification, implicit/dynamic keys, Loon empty-string writes and full cleanup remain blocked",
  },
  headers: {
    status: "conditional-readonly-singleton",
    domain:
      "Pure Object.keys(h).find(k=>k.toLowerCase()===literal) with a const result key, guarded readonly lookup and no key/header alias escape; target validates one string value per queried name",
    outside:
      "General object casing, duplicate values, mutation, output headers and framing remain unproven",
    reason:
      "Global lowercase proxies alter enumeration, overwrite case variants and can remove Host or mutate unrelated source behavior",
    next: "Extend exact per-field operations and real-client vectors without changing dictionary casing, duplicates or framing",
  },
  http: {
    status: "callback-pair-only; blocked-for-three-host-equivalence",
    implemented:
      "Surge/Loon CLI pair: seven native callback methods, HTTP-only literal options, explicit timeout/cookie=false/redirect=false, explicit UA/Accept/identity encoding, ASCII <=64KiB, one active request, ignored return, Boolean-only errors and success-guarded response/data with numeric response.status; native timeout unit conversion",
    production:
      "No Adblock HTTP shim is published until QX also passes; the pairwise CLI implementation is not a three-host certification",
    fixtures:
      "tests/support/http-contract-server.ts, tests/script-contracts.ts and manual tools/script-client-probe.js; no real-client result has been supplied",
    methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH"],
    timeout: {
      surge: "seconds; default 5",
      loon: "milliseconds; default 5000",
      qx: "matching per-request timeout/cancel contract not established by the cited official sample",
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
    next: "Map all options/methods explicitly, establish QX timeout/cancel behavior and real-client default/error/limit fixtures; no Promise.race fake cancellation",
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
    next: "Bundle scoped codecs with standard vectors or declare a verified engine; local author polyfills are treated as local code",
  },
  configurationControl: {
    status: "excluded",
    apis: ["$config", "$surge", "$httpAPI", "$configuration"],
    reason: "Only HTTP adblock scripts are in the current user scope",
  },
  verification:
    "Node VM, native ICU, file-integrity and classic-JS syntax checks are engineering evidence, not blanket iOS device certification",
} as const;
