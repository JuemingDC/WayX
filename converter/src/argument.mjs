// Loon [Argument] parser and Surge module parameter conversion
// Author: chance
// Category: Converter / Argument / Surge Module
import { splitTopLevelCsv } from './rule.mjs';

function unquote(s) {
  const v = String(s ?? '').trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

export function parseLoonArguments(lines = []) {
  const args = [];
  for (const raw of lines) {
    const line = String(raw).trim();
    if (!line || /^[#;\/]/.test(line)) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;

    const id = line.slice(0, eq).trim();
    const tokens = splitTopLevelCsv(line.slice(eq + 1));
    const kind = (tokens.shift() || '').trim().toLowerCase();
    const values = [];
    const options = {};

    for (const token of tokens) {
      const m = token.match(/^([A-Za-z_][\w-]*)\s*=\s*(.*)$/s);
      if (m) options[m[1].toLowerCase()] = unquote(m[2]);
      else values.push(unquote(token));
    }

    const valueType = kind === 'switch'
      ? 'boolean'
      : String(options.type || '').toLowerCase() === 'number' ? 'number' : 'string';

    const hasDefault = values.length > 0 || kind === 'switch';
    args.push({
      id,
      kind,
      values,
      hasDefault,
      defaultValue: values[0] ?? (kind === 'switch' ? 'false' : undefined),
      valueType,
      tag: options.tag || id,
      desc: options.desc || '',
      options,
      raw: line,
    });
  }
  return args;
}

function surgeArgumentName(id) {
  const raw = String(id || '');
  const safe = raw.replace(/[^A-Za-z0-9_]/g, '_');
  if (!safe || !/^[A-Za-z_]/.test(safe)) return '_' + safe;
  return safe;
}

function metadataDefaultValue(value, id) {
  const text = String(value ?? '');
  if (/[\r\n,]/.test(text)) {
    throw new Error(`Surge #!arguments default for ${id} contains an unsupported comma/newline delimiter`);
  }
  return text;
}

export function buildSurgeArgumentTable(argumentLines = []) {
  const declarations = parseLoonArguments(argumentLines);
  const usedNames = new Map();
  const entries = [];

  for (const declaration of declarations) {
    const surgeName = surgeArgumentName(declaration.id);
    const previous = usedNames.get(surgeName);
    if (previous && previous !== declaration.id) {
      throw new Error(`Surge argument name collision after normalization: ${previous}, ${declaration.id} -> ${surgeName}`);
    }
    usedNames.set(surgeName, declaration.id);
    entries.push({
      ...declaration,
      surgeName,
      placeholder:`{{{${surgeName}}}}`,
    });
  }

  return {
    entries,
    byId:new Map(entries.map(entry => [entry.id, entry])),
  };
}

export function surgeArgumentMetadata(argumentLines = []) {
  const table = buildSurgeArgumentTable(argumentLines);
  if (!table.entries.length) return { table, lines:[] };

  const args = table.entries.map(entry => {
    if (!entry.hasDefault) return entry.surgeName;
    return `${entry.surgeName}:${metadataDefaultValue(entry.defaultValue, entry.id)}`;
  });

  const desc = table.entries.map(entry => {
    const pieces = [entry.tag || entry.id];
    if (entry.kind === 'select' && entry.values.length) {
      pieces.push('options=' + entry.values.join('|'));
    } else if (entry.kind === 'switch') {
      pieces.push('true/false');
    }
    if (entry.desc) pieces.push(entry.desc);
    return `${entry.surgeName}: ${pieces.join(' — ')}`;
  }).join('\\n');

  const lines = ['#!arguments=' + args.join(',')];
  if (desc) lines.push('#!arguments-desc=' + desc);
  return { table, lines };
}

export function surgeArgumentPlaceholder(id, table) {
  return table?.byId?.get(String(id))?.placeholder || null;
}

export function parseLegacyLoonPluginObjectRefs(source) {
  const raw = String(source || '').trim();
  if (!raw) return null;

  const bracket = raw.match(/^\[([\s\S]*)\]$/);
  if (bracket) {
    const refs = [...bracket[1].matchAll(/\{([A-Za-z_][\w-]*)\}/g)].map(match => match[1]);
    return refs.length ? refs : null;
  }

  const compact = raw.match(/^\{([A-Za-z_][\w-]*(?:\s*,\s*[A-Za-z_][\w-]*)*)\}$/);
  if (compact) return compact[1].split(',').map(value => value.trim());

  return null;
}

export function surgePluginObjectArgument(refs = [], table) {
  const fields = [];
  for (const id of refs) {
    const entry = table?.byId?.get(String(id));
    if (!entry) return {ok:false, reason:`undeclared Loon [Argument]: ${id}`};
    if (!entry.hasDefault) {
      return {ok:false, reason:`Loon [Argument] ${id} has no default; PluginObject missing-value null cannot be represented losslessly by Surge module substitution`};
    }
    const key = JSON.stringify(entry.id);
    const placeholder = entry.placeholder;
    if (entry.valueType === 'string') {
      fields.push(`${key}:${JSON.stringify(placeholder)}`);
    } else if (entry.valueType === 'number' || entry.valueType === 'boolean') {
      fields.push(`${key}:${placeholder}`);
    } else {
      return {ok:false, reason:`unsupported Loon [Argument] value type for ${id}: ${entry.valueType}`};
    }
  }
  const jsonTemplate = '{' + fields.join(',') + '}';
  return {ok:true, value:JSON.stringify(jsonTemplate)};
}

export function surgeRewriteArgumentPayload(refs = [], table) {
  const unique = [...new Set(refs.map(String))];
  const fields = [];
  for (const id of unique) {
    const entry = table?.byId?.get(id);
    if (!entry) return {ok:false, reason:`undeclared Loon [Argument]: ${id}`};
    const key = JSON.stringify(entry.id);
    if (entry.valueType === 'string') {
      fields.push(`${key}:${JSON.stringify(entry.placeholder)}`);
    } else if (entry.valueType === 'number' || entry.valueType === 'boolean') {
      fields.push(`${key}:${entry.placeholder}`);
    } else {
      return {ok:false, reason:`unsupported Loon [Argument] value type for ${id}: ${entry.valueType}`};
    }
  }
  const template = '{' + fields.join(',') + '}';
  return {ok:true, value:JSON.stringify(template)};
}

export function surgeDynamicOptionValue(id, table) {
  const entry = table?.byId?.get(String(id));
  if (!entry || !entry.hasDefault) return null;
  return entry.placeholder;
}

export function surgeEnableRequirement(id, table) {
  const entry = table?.byId?.get(String(id));
  if (!entry || entry.valueType !== 'boolean') return null;
  return `#!REQUIREMENT "'${entry.placeholder}'=='true'"`;
}

