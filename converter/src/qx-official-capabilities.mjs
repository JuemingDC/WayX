// Quantumult X official capability registry used by WayX validation
// Author: chance
// Category: Converter / Quantumult X / Official Capability Gate

export const QX_WAYX_FILTER_TYPES = new Set([
  'host','host-suffix','host-keyword','host-wildcard',
  'ip-cidr','ip6-cidr','geoip','ip-asn','user-agent',
]);

export const QX_WAYX_SCRIPT_ACTIONS = new Set([
  'script-request-header','script-request-body',
  'script-response-header','script-response-body',
  'script-echo-response','script-analyze-echo-response',
]);

export const QX_WAYX_NATIVE_REWRITE_ACTIONS = new Set([
  'reject','reject-200','reject-img','reject-dict','reject-array',
  '302','307',
  'jsonjq-request-body','jsonjq-response-body',
  'request-header','request-body','response-body',
  ...QX_WAYX_SCRIPT_ACTIONS,
]);

// These are official QX capabilities, but WayX intentionally does not emit them
// from the current Loon ad-block conversion pipeline.
export const QX_WAYX_NOT_EMITTED = Object.freeze({
  filterTypes: Object.freeze({
    final: 'WayX drops source FINAL for generated ad-block snippets by project policy',
  }),
  urlRewriteActions: Object.freeze({
    'echo-response': 'WayX materializes/mocks response content through dedicated semantic paths instead of emitting echo-response',
  }),
  rewriteMatchKinds: Object.freeze({
    'url-and-header': 'Current Loon converter does not synthesize QX url-and-header declarations from source conditions',
  }),
});

// Official rewrite snippet example only demonstrates hostname. Full-profile
// [mitm] keys are tracked separately by the capability fixture/test.
export const QX_WAYX_SNIPPET_MITM_KEYS = new Set(['hostname']);
