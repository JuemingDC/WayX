// Modified: 2026-11-02 (chance). Runtime capabilities replace static author-
// program proof domains. Compatible output is not a device-execution certificate.
export const scriptCapabilityBoundaries = {
  revision: "2026-11-02",
  runtimePolicyVersion: 2,
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
      "Seven dynamic methods, concurrent requests, Promise rejection and callbacks, source defaults, units, policy names, text and exact byte views; QX-undocumented parameters omitted without deleting argument construction",
    outside:
      "No fabricated timeout/cancellation on QX. Target-native detailed errors, charset handling, cookie state and source-version differences can remain observable",
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
      "Dynamic completion dictionaries and wrappers, source status/byte field conversion, flat/wrapped synthetic responses",
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
      "Use native globals when available, otherwise retained UTF-8/Base64 implementations with independent standard vectors",
    outside:
      "Other encodings, compression, cryptography, WASM, require and host file/control APIs require actual target support; no empty implementations",
  },
  verification:
    "API contract vectors and mock transports, syntax and backup integrity. Generated compatibility means API adapter composition succeeded, not every author business path or device runtime was verified",
} as const;
