// WayX Surge Module formatter / validator
// Author: chance
// Category: Converter / Surge Module
import { splitTopLevelCsv, surgePolicyIndex, surgeRuleTypesInTree, SURGE_MODULE_POLICIES } from './rule.mjs';
export { renderSurgeModuleHeader } from './metadata.mjs';

export function hasActiveSurgeLines(lines = []) {
  return lines.some(raw => {
    const line = String(raw).trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function validateSurgeModule(text, entry = {id:'module'}) {
  const fixedSections = new Set([
    'General','Rule','URL Rewrite','Header Rewrite','Body Rewrite','Map Local',
    'Script','MITM','Host','MTProto','Snell Server',
  ]);
  const allowedSection = name =>
    fixedSections.has(name) || /^WireGuard\s+.+$/.test(name) || /^Ruleset\s+.+$/.test(name);

  const assertCanonicalUrlPattern = (pattern, line) => {
    const value = String(pattern || '');
    if (/\\\//.test(value)) {
      throw new Error(`${entry.id}: Surge URL pattern must use bare '/' instead of Loon/JS '\\/' escaping: ${line}`);
    }
    if (/^\(\^/.test(value)) {
      throw new Error(`${entry.id}: Surge URL pattern must use '^(...)' instead of '(^...)': ${line}`);
    }
  };

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
  let hasLineRequirement = false;
  const declaredArguments = new Set();
  let moduleRequirementCore = null;

  for (const raw of String(text).split('\n')) {
    let line = raw.trim();
    if (!line) continue;

    if (current === null) {
      const args = line.match(/^#!arguments=(.+)$/i);
      if (args) {
        for (const item of args[1].split(',')) {
          const name = item.split(':', 1)[0].trim();
          if (!/^[A-Za-z0-9_]+$/.test(name)) {
            throw new Error(`${entry.id}: invalid Surge module argument name: ${name}`);
          }
          if (declaredArguments.has(name)) {
            throw new Error(`${entry.id}: duplicate Surge module argument: ${name}`);
          }
          declaredArguments.add(name);
        }
      }
      const requirement = line.match(/^#!requirement=.*CORE_VERSION\s*>=\s*(\d+)/i);
      if (requirement) moduleRequirementCore = Number(requirement[1]);
    }

    const lineRequirement = line.match(/^#!REQUIREMENT\s+(?:"(?:[^"\\]|\\.)*"|\S+)\s+(.+)$/);
    if (lineRequirement) {
      hasLineRequirement = true;
      line = lineRequirement[1].trim();
    }

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
      throw new Error(`${entry.id}: unsupported Surge module directive: ${line}`);
    }
    if (line.startsWith('#') || line.startsWith(';') || line.startsWith('//')) continue;

    if (current === null) {
      throw new Error(`${entry.id}: active Surge content outside a section: ${line}`);
    }

    if (current === 'Rule') {
      const parts = splitTopLevelCsv(line);
      if (String(parts[0] || '').toUpperCase() === 'URL-REGEX') {
        assertCanonicalUrlPattern(parts[1], line);
      }
      const typeTree = surgeRuleTypesInTree(line);
      if (!typeTree.ok) {
        throw new Error(`${entry.id}: unsupported Surge rule type/combination in module (${typeTree.reason}): ${line}`);
      }
      const policyIndex = surgePolicyIndex(parts);
      const policy = String(parts[policyIndex] || '').toUpperCase();
      if (!SURGE_MODULE_POLICIES.has(policy)) {
        throw new Error(`${entry.id}: Surge module [Rule] policy is not in the accepted built-in runtime set: ${line}`);
      }
      if (line !== parts.join(',')) {
        throw new Error(`${entry.id}: Surge module [Rule] must use canonical top-level comma formatting: ${line}`);
      }
      continue;
    }

    if (current === 'URL Rewrite') {
      assertCanonicalUrlPattern(line.split(/\s+/, 1)[0], line);
      if (!/\s(?:header|302|307|reject)$/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge URL Rewrite line: ${line}`);
      }
      if (/\sreject$/.test(line) && !/\s_\sreject$/.test(line)) {
        throw new Error(`${entry.id}: Surge URL reject must use '<pattern> _ reject': ${line}`);
      }
      continue;
    }

    if (current === 'Header Rewrite') {
      const headerParts = line.split(/\s+/);
      assertCanonicalUrlPattern(headerParts[1], line);
      if (!/^http-(?:request|response)\s+\S+\s+header-(?:add|del|replace|replace-regex)\b/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Header Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Body Rewrite') {
      hasBodyRewrite = true;
      const bodyParts = line.split(/\s+/);
      assertCanonicalUrlPattern(bodyParts[1], line);
      if (!/^http-(?:request|response)(?:-jq)?\s+/.test(line)) {
        throw new Error(`${entry.id}: invalid Surge Body Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Map Local') {
      assertCanonicalUrlPattern(line.split(/\s+/, 1)[0], line);
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
      if (type === 'http-request' || type === 'http-response') {
        const patternMatch = body.match(/(?:^|,)\s*pattern=([^,]+)/);
        if (!patternMatch) {
          throw new Error(`${entry.id}: Surge HTTP script missing pattern: ${line}`);
        }
        assertCanonicalUrlPattern(patternMatch[1].trim(), line);
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

  if ((hasBodyRewrite || hasInlineMapLocal) && !(moduleRequirementCore >= 20)) {
    throw new Error(`${entry.id}: Body Rewrite / inline Map Local requires #!requirement CORE_VERSION>=20 or newer`);
  }
  if (hasLineRequirement && !(moduleRequirementCore >= 22)) {
    throw new Error(`${entry.id}: parameterized line requirements require #!requirement CORE_VERSION>=22 or newer`);
  }

  for (const match of String(text).matchAll(/\{\{\{([A-Za-z0-9_]+)\}\}\}/g)) {
    if (!declaredArguments.has(match[1])) {
      throw new Error(`${entry.id}: undeclared Surge module argument placeholder: ${match[1]}`);
    }
  }
}
