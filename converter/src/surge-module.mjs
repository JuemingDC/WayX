// WayX Surge Module formatter / validator
// Author: chance
// Category: Converter / Surge Module
import { splitTopLevelCsv, surgePolicyIndex, surgeRuleTypesInTree, SURGE_MODULE_POLICIES } from './rule.mjs';

export function hasActiveSurgeLines(lines = []) {
  return lines.some(raw => {
    const line = String(raw).trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function renderSurgeModuleHeader(headerLines, entry, stamp, {needsCore20 = false} = {}) {
  const clean = (headerLines || []).map(line => String(line).trimEnd());
  const directive = key => {
    const re = new RegExp('^#!' + key + '=(.*)$', 'i');
    for (const line of clean) {
      const match = line.match(re);
      if (match) return match[1].trim();
    }
    return null;
  };

  const out = [
    '#!name=' + (directive('name') || entry.id),
    '#!desc=' + (directive('desc') || ('Converted from Loon plugin: ' + entry.id)),
  ];

  const system = directive('system');
  if (system && /^(?:ios|mac)$/i.test(system)) out.push('#!system=' + system.toLowerCase());
  if (needsCore20) out.push('#!requirement=CORE_VERSION>=20');

  out.push('');
  for (const raw of clean) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#!name=/i.test(line) || /^#!desc=/i.test(line) || /^#!system=/i.test(line)) continue;
    if (line.startsWith('#!')) out.push('# Original Loon metadata: ' + line);
    else out.push(raw);
  }

  out.push(
    '# Converted: ' + stamp,
    '# Author: chance',
    '# Category: ' + entry.category,
    '# Target: Surge',
    '# Source: ' + entry.source,
  );
  return out;
}

export function validateSurgeModule(text, entry = {id:'module'}) {
  const fixedSections = new Set([
    'General','Rule','URL Rewrite','Header Rewrite','Body Rewrite','Map Local',
    'Script','MITM','Host','MTProto','Snell Server',
  ]);
  const allowedSection = name =>
    fixedSections.has(name) || /^WireGuard\s+.+$/.test(name) || /^Ruleset\s+.+$/.test(name);

  const allowedTopDirectives = [
    /^#!name=.+$/i,
    /^#!desc=.+$/i,
    /^#!system=mac$/i,
    /^#!requirement=.+$/i,
    /^#!arguments=.+$/i,
    /^#!arguments-desc=.+$/i,
  ];

  if (!/^#!name=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!name`);
  if (!/^#!desc=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!desc`);

  let current = null;
  let hasBodyRewrite = false;
  let hasInlineMapLocal = false;

  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = section[1];
      if (!allowedSection(current)) {
        throw new Error(`${entry.id}: unsupported Surge module section [${current}]`);
      }
      continue;
    }

    if (line.startsWith('#!')) {
      if (current === null && allowedTopDirectives.some(re => re.test(line))) continue;
      if (/^#!REQUIREMENT\b/.test(line)) continue; // official line-requirement prefix
      throw new Error(`${entry.id}: unsupported Surge module directive: ${line}`);
    }
    if (line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;

    if (current === null) {
      throw new Error(`${entry.id}: active Surge content outside a section: ${line}`);
    }

    if (current === 'Rule') {
      const parts = splitTopLevelCsv(line);
      const typeTree = surgeRuleTypesInTree(line);
      if (!typeTree.ok) {
        throw new Error(`${entry.id}: unsupported Surge rule type/combination in module (${typeTree.reason}): ${line}`);
      }
      const policyIndex = surgePolicyIndex(parts);
      const policy = String(parts[policyIndex] || '').toUpperCase();
      if (!SURGE_MODULE_POLICIES.has(policy)) {
        throw new Error(`${entry.id}: Surge module [Rule] policy must be DIRECT/REJECT/REJECT-TINYGIF: ${line}`);
      }
      if (line !== parts.join(',')) {
        throw new Error(`${entry.id}: Surge module [Rule] must use canonical top-level comma formatting: ${line}`);
      }
      continue;
    }

    if (current === 'URL Rewrite') {
      if (!/\s(?:header|302|307|reject)$/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge URL Rewrite line: ${line}`);
      }
      if (/\sreject$/.test(line) && !/\s_\sreject$/.test(line)) {
        throw new Error(`${entry.id}: Surge URL reject must use '<pattern> _ reject': ${line}`);
      }
      continue;
    }

    if (current === 'Header Rewrite') {
      if (!/^http-(?:request|response)\s+\S+\s+header-(?:add|del|replace|replace-regex)\b/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Header Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Body Rewrite') {
      hasBodyRewrite = true;
      if (!/^http-(?:request|response)(?:-jq)?\s+/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Body Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Map Local') {
      if (!/\bdata-type=(?:file|text|tiny-gif|base64)\b/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Map Local line: ${line}`);
      }
      if (/\bdata-type=(?:text|tiny-gif|base64)\b/.test(line)) hasInlineMapLocal = true;
      continue;
    }

    if (current === 'Script') {
      const declaration = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!declaration) throw new Error(`${entry.id}: invalid Surge [Script] declaration: ${line}`);
      const body = declaration[2];
      const typeMatch = body.match(/(?:^|,)\s*type=([^,\s]+)/);
      const type = typeMatch?.[1] || 'generic';
      const allowedTypes = new Set(['http-request','http-response','rule','dns','event','cron','generic']);
      if (!allowedTypes.has(type)) throw new Error(`${entry.id}: unsupported Surge script type '${type}': ${line}`);
      if (!/(?:^|,)\s*script-path=[^,\s]+/.test(body)) {
        throw new Error(`${entry.id}: Surge [Script] missing script-path: ${line}`);
      }
      if ((type === 'http-request' || type === 'http-response') && !/(?:^|,)\s*pattern=/.test(body)) {
        throw new Error(`${entry.id}: Surge HTTP script missing pattern: ${line}`);
      }
      if (type === 'cron' && !/(?:^|,)\s*cronexp=(?:"[^"]+"|'[^']+'|[^,]+)/.test(body)) {
        throw new Error(`${entry.id}: Surge cron script missing cronexp: ${line}`);
      }
      if (type === 'event' && !/(?:^|,)\s*event-name=[^,]+/.test(body)) {
        throw new Error(`${entry.id}: Surge event script missing event-name: ${line}`);
      }
      continue;
    }

    if (current === 'MITM') {
      const match = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!match) throw new Error(`${entry.id}: invalid Surge MITM option: ${line}`);
      const key = match[1].trim();
      if (!['hostname','skip-server-cert-verify'].includes(key)) {
        throw new Error(`${entry.id}: Module may only manipulate hostname/skip-server-cert-verify in [MITM]: ${line}`);
      }
      continue;
    }

    if (current === 'General' || current === 'Host' ||
        current === 'MTProto' || current === 'Snell Server' ||
        /^WireGuard\s+/.test(current)) {
      if (!/^[^=]+\s*=\s*.+$/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge [${current}] key/value line: ${line}`);
      }
      continue;
    }

    // [Ruleset *] contains rule entries and is accepted as an inline rule-set
    // payload. Its per-line semantics are validated by Surge when the module is
    // loaded; the section itself is explicitly supported by the Module manual.
    if (/^Ruleset\s+/.test(current)) continue;
  }

  if ((hasBodyRewrite || hasInlineMapLocal) &&
      !/^#!requirement=.*CORE_VERSION\s*>=\s*20/m.test(text)) {
    throw new Error(`${entry.id}: Body Rewrite / inline Map Local requires #!requirement including CORE_VERSION>=20`);
  }
}
