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
  const allowedSections = new Set(['Rule','URL Rewrite','Header Rewrite','Body Rewrite','Map Local','Script','MITM']);
  const allowedTopDirectives = [
    /^#!name=/i,
    /^#!desc=/i,
    /^#!system=/i,
    /^#!requirement=/i,
    /^#!arguments=/i,
    /^#!arguments-desc=/i,
  ];

  if (!/^#!name=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!name`);
  if (!/^#!desc=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!desc`);

  let current = null;
  let hasBodyRewrite = false;
  let hasMapLocal = false;

  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = section[1];
      if (!allowedSections.has(current)) {
        throw new Error(`${entry.id}: unsupported Surge module section [${current}]`);
      }
      continue;
    }

    if (line.startsWith('#!')) {
      if (current === null && allowedTopDirectives.some(re => re.test(line))) continue;
      if (/^#!REQUIREMENT\b/.test(line)) continue;
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
      hasMapLocal = true;
      if (!/\bdata-type=(?:file|text|tiny-gif|base64)\b/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Map Local line: ${line}`);
      }
      continue;
    }

    if (current === 'Script') {
      if (!/^[^=]+\s=\stype=http-(?:request|response),pattern=.+,script-path=/.test(line)) {
        throw new Error(`${entry.id}: Surge [Script] must use modern 'name = type=...,pattern=...,script-path=...' syntax: ${line}`);
      }
      continue;
    }

    if (current === 'MITM') {
      const match = line.match(/^hostname\s*=\s*(.+)$/i);
      if (!match) throw new Error(`${entry.id}: unsupported Surge module MITM option: ${line}`);
      if (!match[1].trim().startsWith('%APPEND%')) {
        throw new Error(`${entry.id}: Surge module MITM hostname must use %APPEND%`);
      }
    }
  }

  if ((hasBodyRewrite || hasMapLocal) && !/^#!requirement=CORE_VERSION>=20$/m.test(text)) {
    throw new Error(`${entry.id}: Body Rewrite / inline Map Local requires #!requirement=CORE_VERSION>=20`);
  }
}
