// Loon [Argument] -> BoxJs descriptor / Quantumult X preference bridge
// Author: chance
// Category: Converter / Argument / BoxJs
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

export function boxJsKey(entryId, argId) {
  return `wayx.${String(entryId).toLowerCase()}.${argId}`;
}

export function renderBoxJsApp(entry, argumentLines = []) {
  const args = parseLoonArguments(argumentLines);
  if (!args.length) return null;

  const settings = args.map(arg => {
    const base = {
      id: boxJsKey(entry.id, arg.id),
      name: arg.tag,
      val: arg.valueType === 'boolean' ? /^(true|1)$/i.test(arg.defaultValue) : arg.defaultValue,
      desc: arg.desc || `Loon [Argument] ${arg.id}`,
    };
    if (arg.kind === 'switch') return { ...base, type: 'boolean' };
    if (arg.kind === 'select') {
      return {
        ...base,
        type: 'selects',
        items: arg.values.map(v => ({ key: v, label: v })),
      };
    }
    return { ...base, type: 'text' };
  });

  return {
    id: `juemingdc.${String(entry.id).toLowerCase()}.qx`,
    name: entry.name || entry.id,
    descs_html: ['由 WayX Converter 从 Loon [Argument] 生成；Quantumult X snippet 不直接承载配置项。'],
    keys: settings.map(x => x.id),
    settings,
    author: '@JuemingDC',
    repo: 'https://github.com/JuemingDC/WayX',
    _wayx: {
      managed: true,
      source_arguments: args.map(x => ({
        id: x.id,
        key: boxJsKey(entry.id, x.id),
        default: x.defaultValue,
        value_type: x.valueType,
      })),
    },
  };
}

export function mergeBoxJsSubscription(subscription, generatedApps = []) {
  const out = JSON.parse(JSON.stringify(subscription || {}));
  const incoming = generatedApps.filter(Boolean);
  const incomingIds = new Set(incoming.map(app => app.id));
  const existing = Array.isArray(out.apps) ? out.apps : [];

  out.apps = [
    ...existing.filter(app => !app?._wayx?.managed && !incomingIds.has(app?.id)),
    ...incoming,
  ];
  return out;
}
