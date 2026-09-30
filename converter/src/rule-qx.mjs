// Quantumult X Rule planner
// Author: chance
// Category: Converter / Rule / Quantumult X

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { QX_WAYX_FILTER_TYPES } from './qx-official-capabilities.mjs';

const QX_RULE_TYPES=new Map([
  ['DOMAIN','host'], ['DOMAIN-SUFFIX','host-suffix'], ['DOMAIN-KEYWORD','host-keyword'],
  ['DOMAIN-WILDCARD','host-wildcard'], ['IP-CIDR','ip-cidr'], ['IP-CIDR6','ip6-cidr'],
  ['GEOIP','geoip'], ['IP-ASN','ip-asn'], ['USER-AGENT','user-agent'],
]);

const QX_URL_REJECT_ACTIONS=new Map([
  ['REJECT','reject-200'],
  ['REJECT-200','reject-200'],
  ['REJECT-IMG','reject-img'],
  ['REJECT-DICT','reject-dict'],
  ['REJECT-ARRAY','reject-array'],
]);

export function planQxRuleAst(ast) {
  const source=ast.source;

  if (ast.kind==='logical') {
    return {
      kind:'comment',
      line:`# [WayX] Quantumult X unsupported Rule type commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`,
      reason:'unsupported-qx-rule-comment',
    };
  }

  const type=ast.type;
  const value=type==='URL-REGEX' ? normalizeRegexBodyForTarget(ast.value) : ast.value;
  const policyRaw=ast.policy;

  if (type==='URL-REGEX') {
    const action=QX_URL_REJECT_ACTIONS.get(policyRaw);
    if (action) return {kind:'rewrite',line:`${value} url ${action}`,reason:'wayx-url-regex-reject'};
    if (policyRaw==='REJECT-DROP') return {kind:'rewrite',line:`${value} url reject`,reason:'wayx-url-regex-reject-drop'};
  }

  const qxType=QX_RULE_TYPES.get(type);
  if (!qxType || !QX_WAYX_FILTER_TYPES.has(qxType)) {
    return {
      kind:'comment',
      line:`# [WayX] Quantumult X unsupported Rule type ${type} commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`,
      reason:'unsupported-qx-rule-comment',
    };
  }

  let policy;
  if (policyRaw==='DIRECT') policy='direct';
  else if (policyRaw==='REJECT' || policyRaw==='REJECT-DROP' || policyRaw==='REJECT-NO-DROP') policy='reject';
  else if (policyRaw==='PROXY') policy='PROXY';
  else if (/^REJECT/.test(policyRaw)) {
    return {
      kind:'comment',
      line:`# [WayX] REVIEW REQUIRED: Quantumult X cannot preserve source reject policy ${policyRaw} in filter syntax or a lossless script equivalent\n# Source declaration: ${source}`,
      reason:'unsupported-reject-policy',
    };
  } else {
    return {
      kind:'comment',
      line:`# [WayX] REVIEW REQUIRED: Quantumult X Rule policy ${policyRaw} is not verified and has no lossless script equivalent\n# Source declaration: ${source}`,
      reason:'unsupported-policy',
    };
  }

  return {kind:'filter',line:`${qxType}, ${value}, ${policy}`,reason:'native-filter'};
}
