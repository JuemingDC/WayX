// WayX Surge Module formatter / validator
// Author: chance
// Category: Converter / Surge Module
import { splitTopLevelCsv, surgePolicyIndex, surgeRuleTypesInTree, SURGE_MODULE_POLICIES } from './rule.mjs';
import { SURGE_WAYX_REWRITE_SECTIONS, SURGE_WAYX_URL_REWRITE_TYPES, SURGE_WAYX_HEADER_REWRITE_ACTIONS, SURGE_WAYX_BODY_REWRITE_TYPES, SURGE_WAYX_MAP_LOCAL_DATA_TYPES, SURGE_WAYX_SCRIPT_TYPES, SURGE_WAYX_MITM_KEYS } from './surge-official-capabilities.mjs';
export { renderSurgeModuleHeader } from './metadata.mjs';

export function hasActiveSurgeLines(lines = []) {
  return lines.some(raw => {
    const line = String(raw).trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function validateSurgeModule(text, entry = {id:'module'}) {
  const allowedSections = new Set(['Rule', ...SURGE_WAYX_REWRITE_SECTIONS, 'MITM']);

  const allowedTopDirectives = [
    /^#!name=.+$/i,
    /^#!desc=.+$/i,
    /^#!category=WayX$/,
    /^#!system=mac$/i,
    /^#!requirement=.+$/i,
    /^#!arguments=.+$/i,
    /^#!arguments-desc=.+$/i,
  ];

  if (!/^#!name=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!name`);
  if (!/^#!desc=.+$/m.test(text)) throw new Error(`${entry.id}: Surge module missing #!desc`);
  if (!/^#!category=WayX$/m.test(text)) throw new Error(`${entry.id}: Surge module must declare #!category=WayX`);

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
      if (!allowedSections.has(current)) {
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
      const typeTree = surgeRuleTypesInTree(line);
      if (!typeTree.ok) {
        throw new Error(`${entry.id}: unsupported Surge rule type/combination in module (${typeTree.reason}): ${line}`);
      }
      const policyIndex = surgePolicyIndex(parts);
      const policyRaw = String(parts[policyIndex] || '');
      const argumentPolicy = policyRaw.match(/^\{\{\{([A-Za-z0-9_]+)\}\}\}$/);
      if (argumentPolicy) {
        if (!declaredArguments.has(argumentPolicy[1])) {
          throw new Error(`${entry.id}: Surge module [Rule] references undeclared policy argument ${argumentPolicy[1]}: ${line}`);
        }
      } else {
        const policy = policyRaw.toUpperCase();
        if (!SURGE_MODULE_POLICIES.has(policy)) {
          throw new Error(`${entry.id}: Surge module [Rule] policy is outside the official Module set DIRECT/REJECT/REJECT-TINYGIF or a declared {{{argument}}}: ${line}`);
        }
      }
      if (line !== parts.join(',')) {
        throw new Error(`${entry.id}: Surge module [Rule] must use canonical top-level comma formatting: ${line}`);
      }
      continue;
    }

    if (current === 'URL Rewrite') {
      const type = line.trim().split(/\s+/).at(-1);
      if (!SURGE_WAYX_URL_REWRITE_TYPES.has(type)) {
        throw new Error(`${entry.id}: invalid Surge URL Rewrite line: ${line}`);
      }
      if (type === 'reject' && !/\s_\sreject$/.test(line)) {
        throw new Error(`${entry.id}: Surge URL reject must use '<pattern> _ reject': ${line}`);
      }
      continue;
    }

    if (current === 'Header Rewrite') {
      const match = line.match(/^http-(?:request|response)\s+\S+\s+(header-[a-z-]+)\b/);
      if (!match || !SURGE_WAYX_HEADER_REWRITE_ACTIONS.has(match[1])) {
        throw new Error(`${entry.id}: invalid Surge Header Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Body Rewrite') {
      hasBodyRewrite = true;
      const type = line.trim().split(/\s+/, 1)[0];
      if (!SURGE_WAYX_BODY_REWRITE_TYPES.has(type)) {
        throw new Error(`${entry.id}: invalid Surge Body Rewrite line: ${line}`);
      }
      continue;
    }

    if (current === 'Map Local') {
      const dataType = line.match(/\bdata-type=([^\s]+)/)?.[1];
      if (!dataType || !SURGE_WAYX_MAP_LOCAL_DATA_TYPES.has(dataType)) {
        throw new Error(`${entry.id}: invalid Surge Map Local line: ${line}`);
      }
      if (dataType !== 'file') hasInlineMapLocal = true;
      continue;
    }

    if (current === 'Script') {
      const declaration = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!declaration) throw new Error(`${entry.id}: invalid Surge [Script] declaration: ${line}`);
      const body = declaration[2];
      const typeMatch = body.match(/(?:^|,)\s*type=([^,\s]+)/);
      if (!typeMatch) throw new Error(`${entry.id}: Surge [Script] declaration must include an explicit type: ${line}`);
      const type = typeMatch[1];
      if (!SURGE_WAYX_SCRIPT_TYPES.has(type)) {
        throw new Error(`${entry.id}: WayX ad-block Surge [Script] only accepts HTTP rewrite types: ${line}`);
      }
      if (!/(?:^|,)\s*script-path=[^,\s]+/.test(body)) {
        throw new Error(`${entry.id}: Surge [Script] missing script-path: ${line}`);
      }
      if (type === 'http-request' || type === 'http-response') {
        const patternMatch = body.match(/(?:^|,)\s*pattern=([^,]+)/);
        if (!patternMatch) {
          throw new Error(`${entry.id}: Surge HTTP script missing pattern: ${line}`);
        }
      }
      continue;
    }

    if (current === 'MITM') {
      const match = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!match) throw new Error(`${entry.id}: invalid Surge MITM option: ${line}`);
      const key = match[1].trim();
      if (!SURGE_WAYX_MITM_KEYS.has(key)) {
        throw new Error(`${entry.id}: WayX ad-block Surge Module [MITM] only accepts hostname: ${line}`);
      }
      continue;
    }

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
