// WayX Loon Rule conversion core
// Author: chance
// Category: Converter / Rule

function splitTopLevelCsv(input) {
  const out = [];
  let buf = '', quote = null, esc = false, depth = 0;
  for (const ch of input) {
    if (quote) {
      buf += ch;
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '(') { depth++; buf += ch; continue; }
    if (ch === ')') { depth = Math.max(0, depth - 1); buf += ch; continue; }
    if (ch === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  out.push(buf.trim());
  return out;
}

function unquote(value) {
  const s = String(value ?? '').trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

const QX_RULE_TYPES = new Map([
  ['DOMAIN','host'], ['DOMAIN-SUFFIX','host-suffix'], ['DOMAIN-KEYWORD','host-keyword'],
  ['DOMAIN-WILDCARD','host-wildcard'], ['IP-CIDR','ip-cidr'], ['IP-CIDR6','ip6-cidr'],
  ['GEOIP','geoip'], ['IP-ASN','ip-asn'], ['USER-AGENT','user-agent'],
]);

const QX_URL_REJECT_ACTIONS = new Map([
  ['REJECT','reject-200'],
  ['REJECT-200','reject-200'],
  ['REJECT-IMG','reject-img'],
  ['REJECT-DICT','reject-dict'],
  ['REJECT-ARRAY','reject-array'],
]);

// Current official Surge Rule type index.
// Keep this separate from Module policy restrictions: rule TYPE support is broad,
// while .sgmodule policy names are explicitly restricted by the Module manual.
export const SURGE_RULE_TYPES = new Set([
  'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD', 'DOMAIN-SET',
  'IP-CIDR', 'IP-CIDR6', 'GEOIP', 'IP-ASN',
  'USER-AGENT', 'URL-REGEX',
  'PROCESS-NAME',
  'DEST-PORT', 'SRC-PORT', 'IN-PORT', 'SRC-IP', 'DEVICE-NAME', 'MAC-ADDRESS',
  'PROTOCOL', 'HOSTNAME-TYPE', 'SUBNET', 'CELLULAR-RADIO', 'CELLULAR-CARRIER',
  'AND', 'OR', 'NOT',
  'SCRIPT', 'RULE-SET', 'FINAL',
]);

export const SURGE_MODULE_POLICIES = new Set(['DIRECT', 'REJECT', 'REJECT-TINYGIF']);

export const SURGE_PROFILE_BUILTIN_POLICIES = new Set([
  'DIRECT', 'REJECT', 'REJECT-TINYGIF', 'REJECT-DROP', 'REJECT-NO-DROP',
  'CELLULAR', 'CELLULAR-ONLY', 'HYBRID', 'NO-HYBRID',
]);

function surgePolicyIndex(parts) {
  return String(parts[0] || '').toUpperCase() === 'FINAL' ? 1 : 2;
}

export function qxRule(line) {
  const source = String(line).trim();
  if (/^(AND|OR|NOT)\s*,/i.test(source)) {
    return {kind:'comment', line:`# Loon logical rule (Quantumult X unsupported): ${source}`, reason:'logical-rule'};
  }

  const parts = splitTopLevelCsv(source);
  const type = (parts[0] || '').toUpperCase();
  const value = unquote(parts[1] || '');
  const policyRaw = (parts[2] || '').toUpperCase();

  if (type === 'URL-REGEX') {
    const action = QX_URL_REJECT_ACTIONS.get(policyRaw);
    if (action) return {kind:'rewrite', line:`${value} url ${action}`, reason:'wayx-url-regex-reject'};
    if (policyRaw === 'REJECT-DROP') return {kind:'rewrite', line:`${value} url reject`, reason:'wayx-url-regex-reject-drop'};
  }

  const qxType = QX_RULE_TYPES.get(type);
  if (!qxType) return {kind:'comment', line:`# Loon rule (Quantumult X unsupported): ${source}`, reason:'unsupported-type'};

  let policy;
  if (policyRaw === 'DIRECT') policy = 'direct';
  else if (policyRaw === 'REJECT' || policyRaw === 'REJECT-DROP' || policyRaw === 'REJECT-NO-DROP') policy = 'reject';
  else if (policyRaw === 'PROXY') policy = 'proxy';
  else if (/^REJECT/.test(policyRaw)) {
    return {kind:'comment', line:`# Loon reject policy has no proven equivalent Quantumult X filter behavior: ${source}`, reason:'unsupported-reject-policy'};
  } else {
    return {kind:'comment', line:`# Loon rule policy (Quantumult X unsupported): ${source}`, reason:'unsupported-policy'};
  }

  return {kind:'filter', line:`${qxType}, ${value}, ${policy}`, reason:'native-filter'};
}

export function surgeModuleRule(line) {
  const source = String(line).trim();
  const parts = splitTopLevelCsv(source);
  const type = String(parts[0] || '').toUpperCase();

  if (!SURGE_RULE_TYPES.has(type)) {
    return {
      kind:'comment',
      lines:[`# [WayX] Surge rule type unsupported by current official manual: ${source}`],
      reason:'unsupported-rule-type',
    };
  }

  const policyIndex = surgePolicyIndex(parts);
  if (parts.length <= policyIndex || !parts[policyIndex]) {
    return {
      kind:'comment',
      lines:[`# [WayX] Invalid/unsupported Loon rule preserved: ${source}`],
      reason:'invalid-rule',
    };
  }

  let policy = String(parts[policyIndex]).toUpperCase();

  // Loon's image reject rule is behaviorally equivalent to Surge's tiny GIF reject.
  if (policy === 'REJECT-IMG') policy = 'REJECT-TINYGIF';

  // Do not collapse REJECT-DROP / REJECT-NO-DROP to REJECT. They are valid
  // Surge profile policies with different behavior, but the official Module
  // manual still restricts module rules to DIRECT / REJECT / REJECT-TINYGIF.
  // Semantic fidelity therefore requires fail-closed output for those policies.
  if (!SURGE_MODULE_POLICIES.has(policy)) {
    const isProfileBuiltin = SURGE_PROFILE_BUILTIN_POLICIES.has(policy);
    return {
      kind:'comment',
      lines:[
        isProfileBuiltin
          ? `# [WayX] Surge profile supports policy ${policy}, but current official Module [Rule] does not; source rule preserved for Review: ${source}`
          : `# [WayX] Surge Module policy binding required: ${source}`,
      ],
      reason:isProfileBuiltin ? 'module-policy-restricted' : 'external-policy',
    };
  }

  parts[policyIndex] = policy;
  const lineOut = parts.join(',');
  return {
    kind:'rule',
    line:lineOut,
    lines:[lineOut],
    reason:'module-native-rule',
  };
}

export function surgeRule(line) {
  return surgeModuleRule(line).lines.join('\n');
}

export { splitTopLevelCsv, surgePolicyIndex };
