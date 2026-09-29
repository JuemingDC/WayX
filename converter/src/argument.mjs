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

export function renderQxPrefsObjectBridge(entryId, argumentLines = [], argumentIds = [], typeOverrides = {}) {
  const byId = new Map(parseLoonArguments(argumentLines).map(arg => [arg.id, arg]));
  const selected = argumentIds.map(id => {
    const arg = byId.get(id);
    if (!arg) throw new Error(`Unknown Loon [Argument] reference: ${id}`);
    const valueType = typeOverrides[id] || arg.valueType;
    if (!['string', 'number', 'boolean'].includes(valueType)) throw new Error(`Unsupported bridge type for ${id}: ${valueType}`);
    return { ...arg, valueType };
  });
  if (!selected.length) return '';

  const rows = selected.map(arg => {
    const read = `__wayxPref(${JSON.stringify(boxJsKey(entryId, arg.id))}, ${JSON.stringify(arg.defaultValue)})`;
    let value;
    if (arg.valueType === 'boolean') value = `String(${read}).toLowerCase() === "true"`;
    else if (arg.valueType === 'number') value = `Number(${read})`;
    else value = `String(${read})`;
    return `  ${JSON.stringify(arg.id)}: ${value},`;
  });

  return [
    '// WayX BoxJs -> Quantumult X $prefs bridge',
    '// Converted by: chance',
    'const __wayxPref = (key, fallback) => {',
    '  const value = $prefs.valueForKey(key);',
    '  return value === null || value === undefined ? fallback : value;',
    '};',
    'const $argument = {',
    ...rows,
    '};',
    '',
  ].join('\n');
}


function argumentMap(lines = []) {
  return new Map(parseLoonArguments(lines).map(arg => [arg.id, arg]));
}

function qxPrefExpression(entryId, arg) {
  const key = boxJsKey(entryId, arg.id);
  const read = '__wayxPref(' + JSON.stringify(key) + ', ' + JSON.stringify(arg.defaultValue) + ')';
  if (arg.valueType === 'boolean') return 'String(' + read + ').toLowerCase() === "true"';
  if (arg.valueType === 'number') return 'Number(' + read + ')';
  return 'String(' + read + ')';
}

function assertBridgeableSource(source, target) {
  if (/\b(?:const|let|var|function)\s+\$argument\b/.test(source)) {
    throw new Error(target + ': source declares $argument; automatic bridge would collide');
  }
}

export function renderQxScriptV2Bridge(entryId, argumentLines = [], ast, source, meta = {}) {
  const byId = argumentMap(argumentLines);
  const arg = ast?.script?.argument || null;
  const enable = ast?.options?.find(option => option.name === 'enable')?.value || null;
  const ids = new Set();

  if (arg?.type === 'plugin-object') for (const item of arg.items) ids.add(item.name);
  if (enable?.type === 'variable') ids.add(enable.name);
  for (const id of ids) if (!byId.has(id)) throw new Error('Unknown Loon [Argument] reference: ' + id);

  const needsArgument = Boolean(arg);
  const needsEnable = enable?.type === 'variable';
  if (!needsArgument && !needsEnable) return {changed:false, source, preferenceIds:[]};
  assertBridgeableSource(source, 'Quantumult X');

  const lines = [
    meta.stamp ? '// Converted: ' + meta.stamp : null,
    '// Converted by: chance',
    meta.category ? '// Category: ' + meta.category : '// Category: Script',
    meta.sourceUrl ? '// Source: ' + meta.sourceUrl : null,
    '// WayX Loon Script v2 -> Quantumult X BoxJs/$prefs bridge',
    'const __wayxPref = (key, fallback) => {',
    '  const value = $prefs.valueForKey(key);',
    '  return value === null || value === undefined ? fallback : value;',
    '};',
  ].filter(Boolean);

  let enabledExpr = 'true';
  if (enable?.type === 'boolean') enabledExpr = enable.value ? 'true' : 'false';
  else if (enable?.type === 'variable') enabledExpr = qxPrefExpression(entryId, byId.get(enable.name));

  let argumentExpr = 'undefined';
  if (arg?.type === 'plugin-object') {
    const rows = arg.items.map(item => JSON.stringify(item.name) + ': ' + qxPrefExpression(entryId, byId.get(item.name)));
    argumentExpr = '{' + rows.join(', ') + '}';
  } else if (arg?.type === 'string' || arg?.type === 'raw-string') {
    argumentExpr = JSON.stringify(arg.value);
  }

  lines.push(
    'const __wayxEnabled = ' + enabledExpr + ';',
    'if (!__wayxEnabled) {',
    '  $done({});',
    '} else {',
    '  const __wayxArgument = ' + argumentExpr + ';',
    '  (async function($argument) {',
    source.replace(/\n*$/, '').split('\n').map(line => '    ' + line).join('\n'),
    '  })(__wayxArgument);',
    '}',
    '',
  );

  return {changed:true, source:lines.join('\n'), preferenceIds:[...ids]};
}

function surgePlaceholderValue(arg) {
  if (arg.valueType === 'boolean' || arg.valueType === 'number') return '{{{' + arg.id + '}}}';
  return JSON.stringify('{{{' + arg.id + '}}}');
}

export function renderSurgeModuleArguments(argumentLines = [], ids = []) {
  const byId = argumentMap(argumentLines);
  const unique = [...new Set(ids)];
  if (!unique.length) return [];
  const rows = unique.map(id => {
    const arg = byId.get(id);
    if (!arg) throw new Error('Unknown Loon [Argument] reference: ' + id);
    if (!/^[A-Za-z0-9_]+$/.test(id)) throw new Error('Surge module argument name is invalid: ' + id);
    return id + ':' + String(arg.defaultValue ?? '');
  });
  return [
    '#!arguments=' + rows.join(','),
    '#!arguments-desc=Converted from Loon [Argument] by WayX / chance',
  ];
}

export function renderSurgeScriptV2Bridge(argumentLines = [], ast, source, meta = {}) {
  const byId = argumentMap(argumentLines);
  const arg = ast?.script?.argument || null;
  const enable = ast?.options?.find(option => option.name === 'enable')?.value || null;
  const ids = new Set();
  if (arg?.type === 'plugin-object') for (const item of arg.items) ids.add(item.name);
  if (enable?.type === 'variable') ids.add(enable.name);
  for (const id of ids) if (!byId.has(id)) throw new Error('Unknown Loon [Argument] reference: ' + id);

  const needsArgument = Boolean(arg);
  const needsEnable = enable?.type === 'variable';
  if (!needsArgument && !needsEnable) {
    return {changed:false, source, moduleArgumentIds:[], declarationArgument:null};
  }
  assertBridgeableSource(source, 'Surge');

  let payloadExpression;
  let declarationArgument;
  if (ids.size === 1) {
    const id = [...ids][0];
    const def = byId.get(id);
    declarationArgument = '"{{{' + id + '}}}"';
    const valueExpr = def.valueType === 'boolean'
      ? 'String($argument).toLowerCase() === "true"'
      : def.valueType === 'number' ? 'Number($argument)' : '$argument';
    const objectRows = [];
    if (arg?.type === 'plugin-object') {
      for (const item of arg.items) objectRows.push(JSON.stringify(item.name) + ': ' + (item.name === id ? valueExpr : 'undefined'));
    }
    const enabledExpr = enable?.type === 'variable' && enable.name === id ? valueExpr : 'true';
    payloadExpression = '{enabled:' + enabledExpr + ', argument:' + (arg?.type === 'plugin-object' ? '{' + objectRows.join(', ') + '}' : arg ? JSON.stringify(arg.value) : 'undefined') + '}';
  } else {
    const fields = [...ids].map(id => {
      const def = byId.get(id);
      return JSON.stringify(id) + ':' + surgePlaceholderValue(def);
    });
    declarationArgument = JSON.stringify('{' + fields.join(',') + '}');
    const argRows = arg?.type === 'plugin-object'
      ? arg.items.map(item => JSON.stringify(item.name) + ': __wayxPayload[' + JSON.stringify(item.name) + ']').join(', ')
      : '';
    const enabledExpr = enable?.type === 'variable'
      ? '__wayxPayload[' + JSON.stringify(enable.name) + '] !== false'
      : 'true';
    payloadExpression = '{enabled:' + enabledExpr + ', argument:' + (arg?.type === 'plugin-object' ? '{' + argRows + '}' : arg ? JSON.stringify(arg.value) : 'undefined') + '}';
  }

  const lines = [
    meta.stamp ? '// Converted: ' + meta.stamp : null,
    '// Converted by: chance',
    meta.category ? '// Category: ' + meta.category : '// Category: Script',
    meta.sourceUrl ? '// Source: ' + meta.sourceUrl : null,
    '// WayX Loon Script v2 -> Surge module-argument bridge',
  ].filter(Boolean);

  if (ids.size > 1) {
    lines.push(
      'let __wayxPayload;',
      'try { __wayxPayload = JSON.parse($argument || "{}"); } catch { __wayxPayload = {}; }',
    );
  }
  lines.push(
    'const __wayxBridge = ' + payloadExpression + ';',
    'if (!__wayxBridge.enabled) {',
    '  $done({});',
    '} else {',
    '  (async function($argument) {',
    source.replace(/\n*$/, '').split('\n').map(line => '    ' + line).join('\n'),
    '  })(__wayxBridge.argument);',
    '}',
    '',
  );

  return {
    changed:true,
    source:lines.join('\n'),
    moduleArgumentIds:[...ids],
    declarationArgument,
  };
}
