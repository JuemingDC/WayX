// Loon [Argument] parser for dependency analysis only
// Author: chance
// Category: Converter / Argument Parser
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

    args.push({
      id,
      kind,
      values,
      defaultValue: values[0] ?? (kind === 'switch' ? 'false' : ''),
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

function escapeMetadataValue(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,');
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
    const defaultValue = entry.defaultValue;
    return defaultValue === undefined || defaultValue === null
      ? entry.surgeName
      : `${entry.surgeName}:${escapeMetadataValue(defaultValue)}`;
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

export function surgePluginObjectArgument(refs = [], table) {
  const fields = [];
  for (const id of refs) {
    const entry = table?.byId?.get(String(id));
    if (!entry) return {ok:false, reason:`undeclared Loon [Argument]: ${id}`};
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

export function surgeDynamicOptionValue(id, table) {
  const entry = table?.byId?.get(String(id));
  return entry ? entry.placeholder : null;
}

export function surgeEnableRequirement(id, table) {
  const placeholder = surgeDynamicOptionValue(id, table);
  if (!placeholder) return null;
  return `#!REQUIREMENT "'${placeholder}'=='true'"`;
}

