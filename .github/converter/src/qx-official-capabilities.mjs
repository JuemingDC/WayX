// Quantumult X official capability registry used by WayX validation
// Author: chance
// Category: Converter / Quantumult X / Adblock Capability Gate

// WayX converts Loon ad-block plugins only. The target capability gate is
// intentionally limited to source-relevant Rule types, Rewrite actions and
// MITM hostname. Full-profile routing/configuration features are out of scope.
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
  'request-header','response-header',
  'request-body','response-body','echo-response',
  ...QX_WAYX_SCRIPT_ACTIONS,
]);

export const QX_WAYX_SNIPPET_MITM_KEYS = new Set(['hostname']);
