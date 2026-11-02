import { scriptRuntimePolicyVersion } from "../domain/script-api.ts";
// Modified: 2026-11-02 (chance). Runtime capabilities replace static author-
// program proof domains. Compatible output is not a device-execution certificate.
import { excludedAdblockScriptApis } from "../domain/script-api.ts";
export const scriptCapabilityBoundaries = {
  revision: "2026-11-02",
  runtimePolicyVersion: scriptRuntimePolicyVersion,
  // Modified: 2026-11-02 (chance). User scope exclusions are not deferred APIs.
  excluded: {
    status: "out-of-scope",
    apis: excludedAdblockScriptApis,
    policy:
      "DNS and IP-database services do not participate in adblock API conversion, operation inventories or remaining-work priorities; no emulation, native binding or source deletion",
  },
  scriptHub: {
    repository: "Script-Hub-Org/Script-Hub",
    commit: "b943361f11be5795b3eb10f9cc4e5497642922fc",
    file: "script-converter.js",
    reusedCode: true,
    license: "GPL-3.0",
    notice: "vendor/script-hub/NOTICE.md",
    approach:
      "Native runtime API facade; author business expressions and Env objects execute unchanged",
  },
  headers: {
    status: "runtime",
    domain:
      "Case-insensitive lowercase Header dictionary Proxy, get/set/delete/has/define/descriptor, Symbol-safe; native dictionaries are copied",
    outside:
      "This is an explicit ScriptHub-compatible normalization policy; original key casing and duplicate-case keys are not preserved. Full-header arrays are not supported",
  },
  http: {
    status: "runtime",
    domain:
      "Seven dynamic methods, concurrent requests, Promise rejection and callbacks, source defaults, units, policy names, exact byte views and Loon body-base64 decoding; preserve native QX decoded text and honor explicit foreign response charset with actual TextDecoder; QX-undocumented parameters omitted without deleting argument construction",
    outside:
      "No fabricated timeout/cancellation on QX. Unsupported response charset rejects with UNSUPPORTED_RESPONSE_CHARSET; native detailed errors, cookie state, ALPN, h2_trailers and source-version differences can remain observable",
  },
  storage: {
    status: "runtime",
    domain:
      "Dynamic String keys/values, explicit deletion and source-name default keys; native return/error behavior retained",
    outside:
      "Missing null/undefined and empty-value behavior may remain target-native. Unknown source default name throws at invocation; no invented shared namespace or empty-string deletion probe",
  },
  completion: {
    status: "runtime",
    domain:
      "Dynamic completion dictionaries and wrappers, source status/byte field conversion, flat/wrapped synthetic responses; failed result validation permits author catch/fallback before the single host submission",
    outside:
      "QX synthetic response requires an echo declaration; target QX body/header restrictions and unavailable fields are checked at invocation. No catch-and-pass-through suppression",
  },
  environment: {
    status: "compatibility-facade",
    domain:
      "Env receivers and functions are ordinary JavaScript; source API presence is provided by the facade. Loon presence marker identifies compatibility, not a target version",
    outside:
      "Actual source device/version/source-path values cannot be reconstructed; dynamically constructed Function code and unsupported native engines are not emulated",
  },
  codecs: {
    status: "standard-api-fallback",
    domain:
      "Scoped UTF-8/Base64 plus native-first TextDecoder with lazy Exodus bytes 1.16.0 legacy labels, streaming/fatal/BOM support and exact byte views",
    outside:
      "Unknown encoding labels reject. Native decoding is preferred and otherwise a pinned Exodus decoder handles standard legacy labels. WASM, require and file/control APIs need actual target support; no empty implementations",
  },
  // Modified: 2026-11-02 (chance). Distinguish implemented providers from
  // source-native services and proposals in every generated capability report.
  compression: {
    status: "runtime-provider",
    source: "$utils.gzip / $utils.ungzip",
    provider: "nodeca/pako 2.1.0",
    commit: "3c06216518c259b569a5168dee867e6dabbe5160",
    notice: "vendor/pako/NOTICE.md",
    license: "MIT AND Zlib",
    domain:
      "Synchronous Uint8Array API; exact cross-realm views; native Loon first, otherwise lazy isolated provider; gzip framing and complete stream plus CRC/trailer validation; explicit failure codes",
    outside:
      "Valid gzip encoding bytes/header metadata and error messages may differ from native Loon. No compression algorithm is reimplemented locally",
  },
  // Modified: 2026-11-02 (chance). Provider work is implemented, while
  // missing native operations are stated as boundaries rather than future mocks.
  crypto: {
    status: "runtime-provider",
    provider: "@noble/ciphers 2.4.0",
    notice: "vendor/script-api-providers/README.md",
    domain:
      "Native Loon AES first; otherwise synchronous ECB/CBC/CTR/GCM, 16/24/32-byte keys, PKCS7/none, 12-byte GCM nonce, AAD and separate authenticated tag",
    outside:
      "Invalid parameters and authentication failures throw; source error strings/codes are not promised byte-for-byte identical",
  },
  url: {
    status: "runtime-provider",
    provider: "whatwg-url 14.2.0",
    notice: "vendor/script-api-providers/README.md",
    domain:
      "Native URL/URLSearchParams pair first, otherwise a linked WHATWG implementation with IDNA, parsing, setters, iteration, parse/canParse and query parameter methods",
    outside:
      "The pinned specification revision and actual engine versions may differ from future standards",
  },
  nativeBoundaries: {
    status: "explicit-invocation-boundaries",
    storage:
      "Loon remove maps to QX removeAllValues; Surge clear-all is intentionally ignored without deleting keys or reporting success",
    http: "QX omits undocumented options. User policy omits Surge ALPN and h2_trailers/node/policy completion fields without errors",
    headers:
      "Only Loon/QX dictionary source contracts are adapted; Surge full-header arrays are not a new source conversion direction",
    notification:
      "Surge posts content immediately, ignoring delay and click actions; remote images use media-url, PNG/JPEG/GIF/WebP inline images use media-base64 and media-base64-mime; unknown media is omitted. QX extra options are omitted",
    identity:
      "Real source device/version/sourcePath cannot be reconstructed; no fabricated identity",
    policy:
      "Native/absent boundaries are descriptive, never author-source whitelist gates or success suppression",
    documentation: "docs/script-api/03-API能力与实施路线.md",
  },
  verification:
    "API contract vectors and mock transports, syntax and backup integrity. Generated compatibility means API adapter composition succeeded, not every author business path or device runtime was verified",
} as const;
