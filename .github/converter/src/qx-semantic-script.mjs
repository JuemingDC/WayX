// WayX generated Quantumult X scripts for semantic Rewrite v2 actions
// Author: chance
// Category: Converter / Quantumult X / Rewrite v2

import { simpleUrlRewriteCondition, fixedStringValue } from './rewrite-v2-semantic.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import { qxMockTypeIsBinary, renderQxMockScript } from './qx-mock.mjs';
import { normalizeRegexBodyForTarget } from './target-regex.mjs';

const STATUS_TEXT = Object.freeze({
  200:'OK', 201:'Created', 202:'Accepted', 204:'No Content',
  301:'Moved Permanently', 302:'Found', 307:'Temporary Redirect', 308:'Permanent Redirect',
  400:'Bad Request', 401:'Unauthorized', 403:'Forbidden', 404:'Not Found', 410:'Gone',
  418:"I'm a teapot", 429:'Too Many Requests', 451:'Unavailable For Legal Reasons',
  500:'Internal Server Error', 502:'Bad Gateway', 503:'Service Unavailable', 504:'Gateway Timeout',
});

function statusLine(code) {
  return 'HTTP/1.1 ' + code + ' ' + (STATUS_TEXT[code] || 'WayX Response');
}

function metadata({ stamp = '', category = '', sourceLine = '' } = {}) {
  return [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    category ? '// Category: ' + category : '// Category: Rewrite / Script',
    sourceLine ? '// Source Loon: ' + sourceLine : null,
  ].filter(Boolean);
}

function oneAction(ast, name, {conditionMode='simple-url'}={}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1 || ast.actions[0].name !== name) {
    throw new Error('Expected one ' + name + ' action');
  }
  if (conditionMode === 'external-exact') {
    return { condition:null, action:ast.actions[0] };
  }
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) throw new Error(condition.reason);
  return { condition, action: ast.actions[0] };
}

function templateCaptureName(template) {
  return [...String(template).matchAll(/\$\{([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)\}/g)];
}

export function renderQxRedirectScript(ast, options = {}) {
  const pair = oneAction(ast, 'redirect');
  const condition = pair.condition;
  const action = pair.action;
  const status = action.args[0];
  const template = fixedStringValue(action.args[1]);
  if (status?.type !== 'number' || ![302,307].includes(status.value)) throw new Error('redirect status must be 302 or 307');
  if (template === null) throw new Error('redirect target must be a fixed string');

  const refs = templateCaptureName(template);
  if (/\$\{/.test(template) && refs.length === 0) throw new Error('redirect target contains an unsupported variable template');
  for (const ref of refs) {
    if (!condition.capture || ref[1] !== condition.capture) throw new Error('redirect target references a non-URL capture');
  }

  const lines = [
    ...metadata(options),
    'const __wayxRe = new RegExp(' + JSON.stringify(condition.pattern) + ');',
    'const __wayxUrl = $request.url;',
    'const __wayxMatch = __wayxRe.exec(__wayxUrl);',
    'if (!__wayxMatch) {',
    '  $done({});',
    '} else {',
    '  const __wayxTemplate = ' + JSON.stringify(template) + ';',
  ];
  if (refs.length) {
    lines.push('  const __wayxReplacement = __wayxTemplate.replace(/\\$\\{' + condition.capture + '\\.(\\d+)\\}/g, (_, n) => __wayxMatch[Number(n)] ?? "");');
  } else {
    lines.push('  const __wayxReplacement = __wayxTemplate;');
  }
  lines.push(
    '  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);',
    '  $done({status: ' + JSON.stringify(statusLine(status.value)) + ', headers: {Location: __wayxLocation}, body: ""});',
    '}',
    '',
  );
  return {
    qxAction: 'script-echo-response',
    pattern: condition.pattern,
    script: lines.join('\n'),
    notes: condition.notes,
  };
}

export function renderQxRejectScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) throw new Error('reject script requires exactly one action');
  const externalExact=options.conditionMode === 'external-exact';
  const condition=externalExact ? {pattern:null,notes:[]} : simpleUrlRewriteCondition(ast);
  if (!condition.ok && !externalExact) throw new Error(condition.reason);
  const action = ast.actions[0];
  if (!['reject','reject_dict','reject_array'].includes(action.name)) {
    throw new Error('reject action has no generated QX response implementation');
  }
  const status = action.args[0];
  if (status?.type !== 'number' || !Number.isInteger(status.value) || status.value < 100 || status.value > 599) {
    throw new Error('reject status must be 100...599');
  }

  let body = '', contentType = null;
  if (action.name === 'reject') {
    if (action.args.length > 1) {
      body = fixedStringValue(action.args[1]);
      if (body === null) throw new Error('custom reject body must be a fixed string');
      contentType = 'text/plain; charset=utf-8';
    }
  } else if (action.name === 'reject_dict') {
    body = '{}';
    contentType = 'application/json';
  } else if (action.name === 'reject_array') {
    body = '[]';
    contentType = 'application/json';
  }

  const response = {
    status: statusLine(status.value),
    ...(contentType ? { headers: { 'Content-Type': contentType } } : {}),
    body,
  };
  return {
    qxAction: 'script-echo-response',
    pattern: condition.pattern,
    script: [...metadata(options), '$done(' + JSON.stringify(response) + ');', ''].join('\n'),
    notes: condition.notes,
  };
}

function expandAction(action) {
  if (!action.args.some(x => x.type === 'array')) return [action.args];
  const arrays = action.args.map(x => x.items);
  return arrays[0].map((_, index) => arrays.map(a => a[index]));
}

function fixed(node, what) {
  const value = fixedStringValue(node);
  if (value === null) throw new Error(what + ' must be a fixed string');
  if (/\$\{/.test(value)) throw new Error(what + ' contains a runtime variable and needs a broader script bridge');
  return value;
}

function booleanArg(node, fallback = false) {
  if (!node) return fallback;
  if (node.type !== 'boolean') throw new Error('mock Base64 flag must be Boolean');
  return node.value;
}

function numberArg(node, fallback = 200) {
  if (!node) return fallback;
  if (node.type !== 'number' || !Number.isInteger(node.value)) throw new Error('mock status must be an integer');
  return node.value;
}

export function headerOpsForMock(ast, mockAction) {
  const ops = [];
  for (const action of ast.actions) {
    if (action === mockAction) continue;
    if (!new RegExp('^' + ast.phase + '\\.header\\.(?:add|set|del|replace)$').test(action.name)) {
      throw new Error('QX mock pipeline supports only same-phase header add/set/del/replace actions');
    }
    for (const args of expandAction(action)) {
      if (action.name.endsWith('.add')) {
        ops.push({type:'add', name:fixed(args[0], 'header name'), value:fixed(args[1], 'header value')});
      } else if (action.name.endsWith('.set')) {
        ops.push({type:'set', name:fixed(args[0], 'header name'), value:fixed(args[1], 'header value')});
      } else if (action.name.endsWith('.del')) {
        ops.push({type:'del', name:fixed(args[0], 'header name')});
      } else {
        const regex = args[1];
        if (regex?.type !== 'regex') throw new Error('header.replace regex is not fixed');
        ops.push({
          type:'replace',
          name:fixed(args[0], 'header name'),
          pattern:normalizeRegexBodyForTarget(regex.pattern),
          replacement:fixed(args[2], 'header replacement'),
        });
      }
    }
  }
  return ops;
}

export function renderQxInlineMockScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  const externalExact=options.conditionMode === 'external-exact';
  const condition=externalExact ? {pattern:null,notes:[]} : simpleUrlRewriteCondition(ast);
  if (!condition.ok && !externalExact) throw new Error(condition.reason);
  const mocks = ast.actions.filter(a => /^(?:request|response)\.body\.mock$/.test(a.name));
  if (mocks.length !== 1) throw new Error('QX inline mock conversion requires exactly one body.mock action');
  const mock = mocks[0];
  if (!mock.name.startsWith(ast.phase + '.')) throw new Error('mock action phase does not match Rewrite phase');

  const contentType = fixedStringValue(mock.args[0]);
  const body = fixedStringValue(mock.args[1]);
  if (contentType === null || body === null) throw new Error('inline mock content type/body must be fixed strings');

  const isResponse = ast.phase === 'response';
  const status = isResponse ? numberArg(mock.args[2], 200) : null;
  const base64 = isResponse ? booleanArg(mock.args[3], false) : booleanArg(mock.args[2], false);
  const binary = qxMockTypeIsBinary(contentType);
  if (binary && !base64) throw new Error('binary inline mock must use Base64=true for a lossless QX conversion');
  const compactBase64 = base64 ? body.replace(/\s+/g, '') : '';
  if (base64 && (!/^[A-Za-z0-9+/]*={0,2}$/.test(compactBase64) || compactBase64.length % 4 === 1)) {
    throw new Error('inline mock Base64 body is invalid');
  }

  const plan = {phase:ast.phase, contentType, status, base64, binary};
  const headerOps = headerOpsForMock(ast, mock);
  const scriptOptions = {
    ...options,
    headerOps,
    ...(base64 || binary ? {bodyBase64:compactBase64} : {bodyText:body}),
  };
  return {
    qxAction: isResponse ? 'script-echo-response' : 'script-request-body',
    pattern: condition.pattern,
    script: renderQxMockScript(plan, scriptOptions),
    notes: condition.notes,
  };
}

export function renderQxHeaderScript(ast, options = {}) {
  validateRewriteV2Ast(ast);
  const externalExact=options.conditionMode === 'external-exact';
  const condition=externalExact ? {pattern:null,notes:[]} : simpleUrlRewriteCondition(ast);
  if (!condition.ok && !externalExact) throw new Error(condition.reason);
  if (!ast.actions.length || ast.actions.some(a =>
    !new RegExp('^' + ast.phase + '\\.header\\.(?:add|set|del|replace)$').test(a.name)
  )) {
    throw new Error('QX header script supports only same-phase add/set/del/replace actions');
  }
  if (ast.actions.some(action => action.name.endsWith('.add'))) {
    throw new Error('QX header.add cannot be represented losslessly: the official header object form does not prove duplicate-header preservation');
  }

  const statements = [];
  for (const action of ast.actions) {
    for (const args of expandAction(action)) {
      if (action.name.endsWith('.set')) {
        statements.push('__wayxSet(' + JSON.stringify(fixed(args[0], 'header name')) + ', ' + JSON.stringify(fixed(args[1], 'header value')) + ');');
      } else if (action.name.endsWith('.del')) {
        statements.push('__wayxDel(' + JSON.stringify(fixed(args[0], 'header name')) + ');');
      } else {
        const name = fixed(args[0], 'header name');
        const regex = args[1];
        const replacement = fixed(args[2], 'header replacement');
        if (regex?.type !== 'regex') throw new Error('header.replace regex is not fixed');
        statements.push('__wayxReplace(' + JSON.stringify(name) + ', ' + JSON.stringify(normalizeRegexBodyForTarget(regex.pattern)) + ', ' + JSON.stringify(replacement) + ');');
      }
    }
  }

  const source = ast.phase === 'request' ? '$request.headers' : '$response.headers';
  const lines = [
    ...metadata(options),
    'const __wayxHeaders = {...' + source + '};',
    'function __wayxKey(name) {',
    '  const wanted = String(name).toLowerCase();',
    '  return Object.keys(__wayxHeaders).find(key => key.toLowerCase() === wanted);',
    '}',

    'function __wayxSet(name, value) {',
    '  const key = __wayxKey(name);',
    '  __wayxHeaders[key || name] = value;',
    '}',
    'function __wayxDel(name) {',
    '  const wanted = String(name).toLowerCase();',
    '  for (const key of Object.keys(__wayxHeaders)) if (key.toLowerCase() === wanted) delete __wayxHeaders[key];',
    '}',
    'function __wayxReplace(name, source, replacement) {',
    '  const key = __wayxKey(name);',
    '  if (key !== undefined) __wayxHeaders[key] = String(__wayxHeaders[key]).replace(new RegExp(source), replacement);',
    '}',
    ...statements,
    '$done({headers: __wayxHeaders});',
    '',
  ];

  return {
    qxAction: ast.phase === 'request' ? 'script-request-header' : 'script-response-header',
    pattern: condition.pattern,
    script: lines.join('\n'),
    notes: condition.notes,
  };
}
