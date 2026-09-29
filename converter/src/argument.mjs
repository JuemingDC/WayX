// Loon [Argument] parser and optional descriptor generation
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
