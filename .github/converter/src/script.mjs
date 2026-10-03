import { parseRewriteV2, conditionToSource, valueToSource } from './rewrite.mjs';

// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Script / Domain

// WayX Loon Script v2 parser / AST
// Author: chance
// Category: Converter / Script v2
function fail(source, message) {
  const error = new SyntaxError(message + '\n' + source);
  error.code = 'WAYX_SCRIPT_V2_PARSE';
  throw error;
}

function decodeQuoted(raw) {
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw); }
    catch {
      let out = '';
      for (let i = 1; i < raw.length - 1; i++) {
        const ch = raw[i];
        if (ch !== '\\') { out += ch; continue; }
        const next = raw[++i];
        if (next === 'n') out += '\n';
        else if (next === 'r') out += '\r';
        else if (next === 't') out += '\t';
        else if (next === '"' || next === '\\') out += next;
        else out += '\\' + next;
      }
      return out;
    }
  }
  if (raw.startsWith("'")) return raw.slice(1, -1);
  throw new Error('not quoted');
}

function scanState(source, callback) {
  let quote = null, regex = false, regexClass = false, raw = false, escape = false, variableDepth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === '`') {
        if (source[i + 1] === '`') { i++; continue; }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (regex) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '[') { regexClass = true; continue; }
      if (ch === ']' && regexClass) { regexClass = false; continue; }
      if (ch === '/' && !regexClass) {
        regex = false;
        while (/[A-Za-z]/.test(source[i + 1] || '')) i++;
      }
      continue;
    }
    if (variableDepth) {
      if (ch === '{') variableDepth++;
      else if (ch === '}') variableDepth--;
      continue;
    }
    if (ch === '$' && source[i + 1] === '{') { variableDepth = 1; i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') { raw = true; continue; }
    if (ch === '/') { regex = true; continue; }
    const stop = callback(i);
    if (stop !== undefined) return stop;
  }
  return undefined;
}

function findThenScript(source) {
  return scanState(source, i => {
    const rest = source.slice(i);
    const match = rest.match(/^\s+then\s+script\s*\(/);
    if (match) return { index: i, callOpen: i + match[0].lastIndexOf('('), matched: match[0] };
  });
}

function findClosingParen(source, openIndex) {
  let depth = 1, quote = null, raw = false, escape = false, variableDepth = 0;
  for (let i = openIndex + 1; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === '`') {
        if (source[i + 1] === '`') { i++; continue; }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (variableDepth) {
      if (ch === '{') variableDepth++;
      else if (ch === '}') variableDepth--;
      continue;
    }
    if (ch === '$' && source[i + 1] === '{') { variableDepth = 1; i++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') { raw = true; continue; }
    if (ch === '(') depth++;
    else if (ch === ')' && --depth === 0) return i;
  }
  return -1;
}

function splitTopLevelCsv(source) {
  const out = [];
  let start = 0, quote = null, raw = false, escape = false;
  let paren = 0, brace = 0, bracket = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === '`') {
        if (source[i + 1] === '`') { i++; continue; }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '`') { raw = true; continue; }
    if (ch === '(') paren++;
    else if (ch === ')') paren--;
    else if (ch === '{') brace++;
    else if (ch === '}') brace--;
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === ',' && !paren && !brace && !bracket) {
      out.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function parseValue(source) {
  const raw = String(source).trim();
  if (!raw) throw new Error('empty value');
  const variable = raw.match(/^\$\{([^}]+)\}$/);
  if (variable) return { type:'variable', name:variable[1], raw };

  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return { type:'string', value:decodeQuoted(raw), raw };
  }
  if (raw.startsWith('`') && raw.endsWith('`')) {
    return { type:'raw-string', value:raw.slice(1, -1).replace(/``/g, '`'), raw };
  }
  if (/^(true|false)$/.test(raw)) return { type:'boolean', value:raw === 'true', raw };
  if (raw === 'null') return { type:'null', value:null, raw };
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) return { type:'number', value:Number(raw), raw };

  if (raw.startsWith('{') && raw.endsWith('}')) {
    const inner = raw.slice(1, -1).trim();
    const items = inner ? splitTopLevelCsv(inner).map(parseValue) : [];
    if (items.some(item => item.type !== 'variable')) {
      throw new Error('plugin object argument may only contain plugin parameter variables');
    }
    return { type:'plugin-object', items, raw };
  }

  throw new Error('unsupported Script v2 value: ' + raw);
}

const OPTION_FIELDS = Object.freeze({
  enable: ['boolean','variable'],
  tag: ['string','raw-string'],
  img_url: ['string','raw-string'],
  timeout: ['number','variable'],
  debug: ['boolean','variable'],
  requires_body: ['boolean'],
  binary_body_mode: ['boolean'],
});

function validateOptions(options, phase) {
  const seen = new Set();
  for (const option of options) {
    if (seen.has(option.name)) throw new Error('duplicate Script v2 option: ' + option.name);
    seen.add(option.name);
    const allowed = OPTION_FIELDS[option.name];
    if (!allowed) throw new Error('unknown Script v2 option: ' + option.name);
    if (!allowed.includes(option.value.type)) throw new Error(option.name + ': invalid value type ' + option.value.type);
    if (option.name === 'timeout' && option.value.type === 'number' && (!Number.isFinite(option.value.value) || option.value.value <= 0)) {
      throw new Error('timeout must be a finite positive number');
    }
  }

  if (!['request','response'].includes(phase) && options.some(x => ['requires_body','binary_body_mode'].includes(x.name))) {
    throw new Error('requires_body/binary_body_mode only apply to HTTP request/response scripts');
  }
}

export function isScriptV2(source) {
  const raw = String(source ?? '').trim();
  return /^(?:(?:request|response)\s+if\b|cron\s+|network-changed\b|generic\b)/.test(raw) &&
    /\bthen\s+script\s*\(/.test(raw);
}

export function parseScriptV2(source) {
  const raw = String(source ?? '').trim();
  const found = findThenScript(raw);
  if (!found) fail(raw, 'Expected "then script(...)"');

  const triggerText = raw.slice(0, found.index).trim();
  let phase;
  let conditionAst = null;
  let trigger = null;

  const http = triggerText.match(/^(request|response)\s+if\s+([\s\S]+)$/);
  if (http) {
    phase = http[1];
    const conditionText = http[2].trim();
    if (!conditionText) fail(raw, 'Missing Script v2 condition');
    conditionAst = parseRewriteV2(phase + ' if ' + conditionText + ' then reject(200)').condition;
  } else if (/^cron\s+/.test(triggerText)) {
    phase = 'cron';
    let expression;
    try { expression = parseValue(triggerText.replace(/^cron\s+/, '')); }
    catch (error) { fail(raw, 'Invalid Cron Script expression: ' + error.message); }
    if (!['string','raw-string','variable'].includes(expression.type)) {
      fail(raw, 'Cron Script expression must be a String/raw String or plugin variable');
    }
    trigger = { type:'cron', expression, raw:triggerText };
  } else if (triggerText === 'network-changed') {
    phase = 'network-changed';
    trigger = { type:'event', name:'network-changed', raw:triggerText };
  } else if (triggerText === 'generic') {
    phase = 'generic';
    trigger = { type:'generic', raw:triggerText };
  } else {
    fail(raw, 'Unsupported Script v2 trigger');
  }

  const close = findClosingParen(raw, found.callOpen);
  if (close < 0) fail(raw, 'Unterminated script(...) call');
  const callArgs = splitTopLevelCsv(raw.slice(found.callOpen + 1, close));
  if (callArgs.length < 1 || callArgs.length > 2) fail(raw, 'script(...) expects path and optional argument');

  const pathValue = parseValue(callArgs[0]);
  if (!['string','raw-string'].includes(pathValue.type) || !pathValue.value) fail(raw, 'script path must be a fixed non-empty string');
  const argument = callArgs[1] ? parseValue(callArgs[1]) : null;
  if (argument && !['string','raw-string','plugin-object'].includes(argument.type)) {
    fail(raw, 'script argument must be a String/raw String or plugin object');
  }

  const tail = raw.slice(close + 1).trim();
  const options = [];
  if (tail) {
    if (!/^with\s+/.test(tail)) fail(raw, 'Unexpected content after script(...)');
    const optionText = tail.replace(/^with\s+/, '');
    for (const token of splitTopLevelCsv(optionText)) {
      const eq = token.indexOf('=');
      if (eq < 1) fail(raw, 'Invalid Script v2 option: ' + token);
      const name = token.slice(0, eq).trim();
      const value = parseValue(token.slice(eq + 1));
      options.push({ type:'option', name, value, raw:token });
    }
  }
  try { validateOptions(options, phase); }
  catch (error) { fail(raw, error.message); }

  return {
    type:'script',
    syntax:'loon-script-v2',
    phase,
    condition:conditionAst,
    trigger,
    script:{ path:pathValue.value, pathNode:pathValue, argument },
    options,
    raw,
  };
}

export function scriptOption(ast, name) {
  return ast?.options?.find(option => option.name === name)?.value ?? null;
}

export function scriptOptionBoolean(ast, name, fallback = false) {
  const value = scriptOption(ast, name);
  return value?.type === 'boolean' ? value.value : fallback;
}

export function scriptV2ArgumentRefs(ast) {
  const arg = ast?.script?.argument;
  if (!arg) return [];
  if (arg.type === 'plugin-object') return arg.items.map(item => item.name);
  return [];
}

export function scriptV2DynamicOptionRefs(ast) {
  const out = [];
  for (const option of ast?.options || []) {
    if (option.value?.type === 'variable') out.push({option:option.name, id:option.value.name});
  }
  return out;
}

export function scriptV2ToSource(ast) {
  if (!ast || ast.type !== 'script') throw new TypeError('Expected Script v2 AST');
  const args = [JSON.stringify(ast.script.path)];
  const argument = ast.script.argument;
  if (argument) {
    if (argument.type === 'plugin-object') args.push('{' + argument.items.map(valueToSource).join(', ') + '}');
    else args.push(valueToSource(argument));
  }
  const withPart = ast.options.length
    ? ' with ' + ast.options.map(option => option.name + '=' + valueToSource(option.value)).join(', ')
    : '';
  let triggerSource;
  if (ast.phase === 'request' || ast.phase === 'response') {
    triggerSource = ast.phase + ' if ' + conditionToSource(ast.condition);
  } else if (ast.phase === 'cron') {
    triggerSource = 'cron ' + valueToSource(ast.trigger?.expression);
  } else if (ast.phase === 'network-changed') {
    triggerSource = 'network-changed';
  } else if (ast.phase === 'generic') {
    triggerSource = 'generic';
  } else {
    throw new Error('Unsupported Script v2 phase: ' + ast.phase);
  }
  return triggerSource + ' then script(' + args.join(', ') + ')' + withPart;
}

export { splitTopLevelCsv as splitScriptV2Csv, parseValue as parseScriptV2Value, OPTION_FIELDS as SCRIPT_V2_OPTION_FIELDS };


// Loon Legacy Script parser
// Author: chance
// Category: Converter / Script / Source Parsing

export const LOON_LEGACY_SCRIPT_OPTION_NAMES = new Set([
  'script-path',
  'tag',
  'requires-body',
  'binary-body-mode',
  'timeout',
  'max-size',
  'argument',
  'enable',
  'enabled',
  'debug',
]);


export function parseLegacyScriptLine(source) {
  const raw=String(source ?? '').trim();
  const match=raw.match(/^(http-request|http-response)\s+(\S+)\s+(.+)$/i);
  if (!match) return null;

  const type=match[1].toLowerCase();
  const phase=type.replace(/^http-/,'');
  const pattern=match[2];
  const rest=match[3];
  const options=new Map();
  const optionList=[];

  for (const token of splitTopLevelCsv(rest)) {
    const eq=token.indexOf('=');
    if (eq<1) return null;
    const name=token.slice(0,eq).trim().toLowerCase();
    const value=token.slice(eq+1).trim();
    if(!LOON_LEGACY_SCRIPT_OPTION_NAMES.has(name) || options.has(name) || !value) return null;
    options.set(name,value);
    optionList.push({type:'option',name,value,raw:token});
  }

  const scriptPath=options.get('script-path') || null;
  const tag=options.get('tag') || null;
  const requiresBody=/^(?:true|1)$/i.test(options.get('requires-body') || '');
  const binary=/^(?:true|1)$/i.test(options.get('binary-body-mode') || '');
  const timeout=options.get('timeout') || null;
  const maxSize=options.get('max-size') || null;
  const argument=options.get('argument') || null;
  const enable=options.get('enable') ?? options.get('enabled') ?? null;
  const debug=options.get('debug') ?? null;

  return {
    type:'script',
    syntax:'loon-script-legacy',
    phase,
    httpType:type,
    pattern,
    script:{path:scriptPath},
    options:optionList,
    optionMap:options,
    tag,
    requiresBody,
    binaryBodyMode:binary,
    timeout,
    maxSize,
    argument,
    enable,
    debug,
    raw,
  };
}


// Target-neutral Script Semantic IR
// Author: chance
// Category: Converter / Script / Semantic IR

function freezeOptions(options) {
  return Object.freeze((options || []).map(item=>Object.freeze({...item})));
}

function baseIr({sourceSyntax,source,phase,condition,trigger,pattern,scriptPath,argument,options,sourcePayload}) {
  return Object.freeze({
    type:'script-semantic-ir',
    sourceSyntax,
    source:String(source || sourcePayload?.raw || ''),
    phase,
    condition:condition || (pattern ? {type:'url-regex',pattern:String(pattern)} : null),
    trigger:trigger || null,
    pattern:pattern || null,
    script:Object.freeze({path:String(scriptPath || ''),argument:argument ?? null}),
    argument:argument ?? null,
    options:freezeOptions(options),
    sourcePayload,
  });
}

export function legacyScriptToSemanticIr(parsed,{source=parsed?.raw || ''}={}) {
  if (!parsed || parsed.syntax!=='loon-script-legacy') throw new TypeError('Expected parsed Legacy Script declaration');
  return baseIr({
    sourceSyntax:'legacy',
    source,
    phase:parsed.phase,
    pattern:parsed.pattern,
    scriptPath:parsed.script?.path,
    argument:parsed.argument,
    options:parsed.options,
    sourcePayload:parsed,
  });
}

export function scriptV2AstToSemanticIr(ast,{source=ast?.raw || ''}={}) {
  if (!ast || ast.type!=='script' || ast.syntax!=='loon-script-v2') throw new TypeError('Expected Script v2 AST');
  return baseIr({
    sourceSyntax:'v2',
    source,
    phase:ast.phase,
    condition:ast.condition,
    trigger:ast.trigger || null,
    scriptPath:ast.script?.path,
    argument:ast.script?.argument || null,
    options:ast.options,
    sourcePayload:ast,
  });
}

export function scriptIrSourcePath(ir) {
  if (!ir || ir.type!=='script-semantic-ir') throw new TypeError('Expected Script Semantic IR');
  return ir.script.path;
}

// Unified source entry point; provenance is retained but never needed by planners.
export function parseScriptDeclaration(source) {
  if (isScriptV2(source)) return scriptV2AstToSemanticIr(parseScriptV2(source),{source});
  const parsed=parseLegacyScriptLine(source);
  return parsed?.script?.path ? legacyScriptToSemanticIr(parsed,{source}) : null;
}

export function scriptIrTag(ir) {
  const tag=ir?.options?.find(option=>option.name==='tag')?.value;
  return ir?.sourceSyntax==='legacy' ? tag : tag?.value;
}

export function legacyScriptIrDeclaration(ir) {
  if (ir?.type!=='script-semantic-ir' || ir.sourceSyntax!=='legacy') throw new TypeError('Expected Legacy Script Semantic IR');
  const options=new Map(ir.options.map(option=>[option.name,option.value]));
  return {
    phase:ir.phase,
    httpType:'http-'+ir.phase,
    pattern:ir.condition?.pattern ?? ir.pattern,
    script:ir.script,
    tag:scriptIrTag(ir),
    requiresBody:/^(?:true|1)$/i.test(options.get('requires-body') || ''),
    binaryBodyMode:/^(?:true|1)$/i.test(options.get('binary-body-mode') || ''),
    maxSize:options.get('max-size') ?? null,
    timeout:options.get('timeout') ?? null,
    enable:options.get('enable') ?? options.get('enabled') ?? null,
    debug:options.get('debug') ?? null,
    argument:ir.argument,
  };
}
