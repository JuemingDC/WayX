// WayX Loon Rule conversion core
// Author: chance
// Category: Converter / Rule

import { normalizeRegexBodyForTarget } from './target-regex.mjs';

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

function surgeCsvRegexField(value) {
  const text = String(value ?? '');
  return text.includes(',') ? '"' + text.replace(/"/g, '\\"') + '"' : text;
}

function splitLogicalSubrules(value) {
  const source = String(value ?? '').trim();
  if (!source.startsWith('(') || !source.endsWith(')')) return null;
  const inner = source.slice(1, -1).trim();
  const out = [];
  let i = 0;

  while (i < inner.length) {
    while (i < inner.length && /[\s,]/.test(inner[i])) i++;
    if (i >= inner.length) break;
    if (inner[i] !== '(') return null;

    const start = ++i;
    let depth = 1, quote = null, esc = false;
    for (; i < inner.length; i++) {
      const ch = inner[i];
      if (quote) {
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '(') { depth++; continue; }
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          out.push(inner.slice(start, i).trim());
          i++;
          break;
        }
      }
    }
    if (depth !== 0) return null;
    while (i < inner.length && /\s/.test(inner[i])) i++;
    if (i < inner.length && inner[i] === ',') i++;
  }

  return out;
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

// Current Surge app runtime accepts these built-in policies in module Rule UI.
// The public Module manual still documents only DIRECT/REJECT/REJECT-TINYGIF;
// keep the broader runtime set explicit instead of silently collapsing behavior.
export const SURGE_MODULE_POLICIES = new Set([
  'DIRECT', 'REJECT', 'REJECT-TINYGIF', 'REJECT-DROP', 'REJECT-NO-DROP',
  'CELLULAR', 'CELLULAR-ONLY', 'HYBRID', 'NO-HYBRID',
]);

export const SURGE_PROFILE_BUILTIN_POLICIES = new Set([
  'DIRECT', 'REJECT', 'REJECT-TINYGIF', 'REJECT-DROP', 'REJECT-NO-DROP',
  'CELLULAR', 'CELLULAR-ONLY', 'HYBRID', 'NO-HYBRID',
]);

function surgePolicyIndex(parts) {
  return String(parts[0] || '').toUpperCase() === 'FINAL' ? 1 : 2;
}

function normalizeSurgeRuleRegexes(line) {
  const parts = splitTopLevelCsv(String(line ?? '').trim());
  const type = String(parts[0] || '').toUpperCase();
  if (type === 'URL-REGEX') {
    parts[1] = surgeCsvRegexField(normalizeRegexBodyForTarget(unquote(parts[1] || '')));
    return parts.join(',');
  }
  if (['AND','OR','NOT'].includes(type)) {
    const subrules = splitLogicalSubrules(parts[1]);
    if (subrules?.length) {
      parts[1] = '(' + subrules.map(child => '(' + normalizeSurgeRuleRegexes(child) + ')').join(',') + ')';
    }
  }
  return parts.join(',');
}


export function surgeRuleTypesInTree(line, {subrule = false} = {}) {
  const parts = splitTopLevelCsv(String(line ?? '').trim());
  const type = String(parts[0] || '').toUpperCase();
  if (!type) return {ok:false, types:[], reason:'missing-rule-type'};

  const types = [type];
  if (!SURGE_RULE_TYPES.has(type)) {
    return {ok:false, types, reason:`unsupported-rule-type:${type}`};
  }

  if (subrule && type === 'FINAL') {
    return {ok:false, types, reason:'FINAL-cannot-be-a-logical-subrule'};
  }

  if (['AND','OR','NOT'].includes(type)) {
    const subrules = splitLogicalSubrules(parts[1]);
    if (!subrules?.length) return {ok:false, types, reason:`invalid-${type}-subrules`};
    if (type === 'NOT' && subrules.length !== 1) return {ok:false, types, reason:'NOT-requires-one-subrule'};
    if ((type === 'AND' || type === 'OR') && subrules.length < 1) return {ok:false, types, reason:`${type}-requires-subrules`};

    for (const child of subrules) {
      const result = surgeRuleTypesInTree(child, {subrule:true});
      types.push(...result.types);
      if (!result.ok) return {ok:false, types, reason:result.reason};
    }
  }

  return {ok:true, types, reason:null};
}

export function qxRule(line) {
  const source = String(line).trim();
  if (/^(AND|OR|NOT)\s*,/i.test(source)) {
    return {kind:'comment', line:`# [WayX] Quantumult X unsupported Rule type commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`, reason:'unsupported-qx-rule-comment'};
  }

  const parts = splitTopLevelCsv(source);
  const type = (parts[0] || '').toUpperCase();
  const sourceValue = unquote(parts[1] || '');
  const value = type === 'URL-REGEX' ? normalizeRegexBodyForTarget(sourceValue) : sourceValue;
  const policyRaw = (parts[2] || '').toUpperCase();

  if (type === 'URL-REGEX') {
    const action = QX_URL_REJECT_ACTIONS.get(policyRaw);
    if (action) return {kind:'rewrite', line:`${value} url ${action}`, reason:'wayx-url-regex-reject'};
    if (policyRaw === 'REJECT-DROP') return {kind:'rewrite', line:`${value} url reject`, reason:'wayx-url-regex-reject-drop'};
  }

  const qxType = QX_RULE_TYPES.get(type);
  if (!qxType) return {kind:'comment', line:`# [WayX] Quantumult X unsupported Rule type ${type} commented out; Rule conversion does not use Script fallback\n# Source declaration: ${source}`, reason:'unsupported-qx-rule-comment'};

  let policy;
  if (policyRaw === 'DIRECT') policy = 'direct';
  else if (policyRaw === 'REJECT' || policyRaw === 'REJECT-DROP' || policyRaw === 'REJECT-NO-DROP') policy = 'reject';
  else if (policyRaw === 'PROXY') policy = 'PROXY';
  else if (/^REJECT/.test(policyRaw)) {
    return {kind:'comment', line:`# [WayX] REVIEW REQUIRED: Quantumult X cannot preserve source reject policy ${policyRaw} in filter syntax or a lossless script equivalent\n# Source declaration: ${source}`, reason:'unsupported-reject-policy'};
  } else {
    return {kind:'comment', line:`# [WayX] REVIEW REQUIRED: Quantumult X Rule policy ${policyRaw} is not verified and has no lossless script equivalent\n# Source declaration: ${source}`, reason:'unsupported-policy'};
  }

  return {kind:'filter', line:`${qxType}, ${value}, ${policy}`, reason:'native-filter'};
}

export function surgeModuleRule(line) {
  const source = String(line).trim();
  const parts = splitTopLevelCsv(source);
  const type = String(parts[0] || '').toUpperCase();

  // WayX converts ad-block plugins, not a complete Surge policy graph.
  // A source FINAL is intentionally discarded so a module cannot alter the
  // user's global catch-all routing policy.
  if (type === 'FINAL') {
    return {kind:'drop', section:'rule', line:'', lines:[], reason:'drop-source-final'};
  }

  // Loon URL-REGEX supports HTTP-response-shaped reject policies that are not
  // Surge Rule policies. Lower those to Surge's native Map Local instead of
  // weakening them to a generic reject or dropping the response body semantics.
  if (type === 'URL-REGEX') {
    const pattern = normalizeRegexBodyForTarget(unquote(parts[1] || ''));
    parts[1] = surgeCsvRegexField(pattern);
    const sourcePolicy = String(parts[2] || '').toUpperCase();
    const mapLocal = {
      'REJECT-200': `${pattern} data-type=text data="" status-code=200`,
      'REJECT-DICT': `${pattern} data-type=text data="{}" status-code=200 header="Content-Type:application/json"`,
      'REJECT-ARRAY': `${pattern} data-type=text data="[]" status-code=200 header="Content-Type:application/json"`,
    }[sourcePolicy];
    if (mapLocal) {
      return {
        kind:'map',
        section:'map',
        line:mapLocal,
        lines:[mapLocal],
        reason:'url-regex-local-response',
      };
    }
  }

  const typeTree = surgeRuleTypesInTree(source);
  if (!typeTree.ok) {
    return {
      kind:'comment',
      lines:[`# [WayX] REVIEW REQUIRED: Surge Rule type/combination has no verified native or lossless script equivalent (${typeTree.reason})`,`# Source declaration: ${source}`],
      reason:'unsupported-rule-type',
    };
  }

  const policyIndex = surgePolicyIndex(parts);
  if (parts.length <= policyIndex || !parts[policyIndex]) {
    return {
      kind:'comment',
      lines:[`# [WayX] REVIEW REQUIRED: invalid/unsupported source Rule cannot be converted losslessly`,`# Source declaration: ${source}`],
      reason:'invalid-rule',
    };
  }

  let policy = String(parts[policyIndex]).toUpperCase();

  // Source image-reject behavior maps to Surge's tiny GIF reject policy.
  if (policy === 'REJECT-IMG') policy = 'REJECT-TINYGIF';

  // Loon plugin policy PROXY is preserved without semantic remapping.
  // Surge Module Rule lines can only use official internal policies, so PROXY
  // cannot be emitted as an active module policy; preserve the source as comments.
  if (policy === 'PROXY') {
    return {
      kind:'comment',
      section:'rule',
      line:'',
      lines:[
        '# [WayX] Source Loon plugin policy PROXY preserved without conversion; Surge Module cannot activate external policy names.',
        `# Source declaration: ${source}`,
      ],
      reason:'source-proxy-policy-preserved',
    };
  }

  // Preserve runtime-supported built-in policies exactly. Unknown/external
  // policy-group names cannot be defined by a module and remain a binding note.
  if (!SURGE_MODULE_POLICIES.has(policy)) {
    return {
      kind:'comment',
      lines:[`# [WayX] REVIEW REQUIRED: Surge Module requires an external policy binding that cannot be defined losslessly by this ad-block module`,`# Source declaration: ${source}`],
      reason:'external-policy',
    };
  }

  parts[policyIndex] = policy;
  const lineOut = normalizeSurgeRuleRegexes(parts.join(','));
  return {
    kind:'rule',
    section:'rule',
    line:lineOut,
    lines:[lineOut],
    reason:'module-native-rule',
  };
}

export function surgeRule(line) {
  return surgeModuleRule(line).lines.join('\n');
}

export { splitTopLevelCsv, surgePolicyIndex };
