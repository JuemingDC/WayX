// WayX behavior-first Rewrite v2 semantic mapper
// Author: chance
// Category: Converter / Rewrite v2 / Semantic Mapping
import { compileRegexForTarget, normalizeRegexBodyForTarget } from './target-regex.mjs';
import { qxPrimitiveForRewriteV2Action, validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import { quoteJq, renderFixedPathDeleteJq } from './jq.mjs';
import { dependencySpecFromAction } from './dependency.mjs';

function unsupported(reason, extra = {}) {
  return { ok: false, reason, ...extra };
}

function stringNode(node) {
  if (!node || !['string','raw-string'].includes(node.type)) return null;
  return String(node.value);
}

function scalarItems(node) {
  return node?.type === 'array' ? node.items : [node];
}

export function simpleUrlRewriteCondition(ast, {target = 'generic'} = {}) {
  if (!ast || ast.type !== 'rewrite') return unsupported('expected Rewrite v2 AST');
  const c = ast.condition;
  if (!c || c.type !== 'comparison' || c.operator !== '~=' ||
      c.left?.type !== 'variable' || c.left.name !== 'url' ||
      c.right?.type !== 'regex') {
    return unsupported('condition is not a single URL regex');
  }
  // URL matcher bodies are source regex bodies after the Loon literal wrapper
  // has been removed by the parser. Do not compile/canonicalize them here.
  return { ok: true, pattern: String(c.right.pattern), regex: c.right, capture: c.capture || null, notes: [] };
}

function parseKeyPath(path) {
  const text = String(path || '');
  if (!text) throw new Error('JSON key path must not be empty');
  const parts = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '.') { i++; continue; }
    if (text[i] === '[') {
      const m = text.slice(i).match(/^\[(\d+)\]/);
      if (!m) throw new Error('unsupported JSON key-path bracket syntax: ' + text);
      parts.push(Number(m[1]));
      i += m[0].length;
      continue;
    }
    const m = text.slice(i).match(/^[^.[\]]+/);
    if (!m) throw new Error('invalid JSON key path: ' + text);
    parts.push(m[0]);
    i += m[0].length;
  }
  if (!parts.length) throw new Error('JSON key path must not be empty');
  return parts;
}

function pathLiteral(path) {
  return JSON.stringify(parseKeyPath(path));
}

function pathSelector(path) {
  const parts = parseKeyPath(path);
  let out = '';
  for (const part of parts) {
    if (typeof part === 'number') {
      out += '[' + part + ']';
    } else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) {
      out += '.' + part;
    } else {
      out += '[' + JSON.stringify(part) + ']';
    }
  }
  return out || '.';
}

function anyToJq(node) {
  if (!node) throw new Error('missing JSON value');
  if (node.type === 'string') return JSON.stringify(node.value);
  if (node.type === 'raw-string') {
    try { return JSON.stringify(JSON.parse(node.value)); }
    catch { return JSON.stringify(node.value); }
  }
  if (node.type === 'number' || node.type === 'boolean') return JSON.stringify(node.value);
  if (node.type === 'null') return 'null';
  if (node.type === 'variable') throw new Error('plugin/capture variable JSON value requires a target runtime bridge');
  throw new Error('unsupported JSON value node: ' + node.type);
}

function qxQuote(value) {
  return quoteJq(value);
}

export function jsonActionToJq(action) {
  const name = action?.name || '';
  if (!/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(name)) {
    return unsupported('JSON action is outside add/delete/replace direct subset');
  }

  if (name.endsWith('.delete')) {
    const nodes = scalarItems(action.args[0]);
    const paths = nodes.map(node => {
      const value = stringNode(node);
      if (value === null) throw new Error(name + ': key path must be a fixed string');
      const parts = parseKeyPath(value);
      return { parts, literal:JSON.stringify(parts), selector:pathSelector(value) };
    });
    return {ok:true, jq:renderFixedPathDeleteJq(paths)};
  }

  const paths = scalarItems(action.args[0]);
  const values = scalarItems(action.args[1]);
  if (paths.length !== values.length) throw new Error(name + ': batch argument lengths differ');
  const ops = paths.map((node, index) => {
    const key = stringNode(node);
    if (key === null) throw new Error(name + ': key path must be a fixed string');
    const path = pathLiteral(key);
    const value = anyToJq(values[index]);
    if (name.endsWith('.add')) {
      return 'if getpath(' + path + ') == null then setpath(' + path + '; ' + value + ') else . end';
    }
    return 'if getpath(' + path + ') then setpath(' + path + '; ' + value + ') else . end';
  });
  return { ok: true, jq: ops.join(' | ') };
}


function topLevelObjectKey(node, actionName) {
  const value=stringNode(node);
  if (value===null) throw new Error(actionName + ': key path must be a fixed string');
  const parts=parseKeyPath(value);
  if (parts.length!==1 || typeof parts[0]!=='string') return null;
  return parts[0];
}

function topLevelObjectJsonOps(action) {
  const name=action?.name || '';
  if (!/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(name)) {
    return unsupported('JSON pipeline action is outside add/delete/replace subset');
  }

  const paths=scalarItems(action.args[0]);
  const values=name.endsWith('.delete') ? null : scalarItems(action.args[1]);
  if (values && paths.length!==values.length) {
    return unsupported(name + ': batch argument lengths differ');
  }

  const ops=[];
  for (let index=0; index<paths.length; index++) {
    let key;
    try {
      key=topLevelObjectKey(paths[index],name);
    } catch (error) {
      return unsupported(String(error?.message || error));
    }
    if (key===null) {
      return unsupported(name + ': native multi-action JQ currently requires top-level object key paths');
    }

    const path=JSON.stringify([key]);
    const selector='.[' + JSON.stringify(key) + ']';

    if (name.endsWith('.delete')) {
      ops.push('if type == "object" then del(' + selector + ') else . end');
      continue;
    }

    let value;
    try {
      value=anyToJq(values[index]);
    } catch (error) {
      return unsupported(String(error?.message || error));
    }

    if (name.endsWith('.add')) {
      ops.push('if type == "object" then if getpath(' + path + ') == null then setpath(' + path + '; ' + value + ') else . end else . end');
    } else {
      ops.push('if type == "object" then if getpath(' + path + ') then setpath(' + path + '; ' + value + ') else . end else . end');
    }
  }

  return {ok:true,ops};
}

export function jsonPipelineToSafeNativeJq(ast) {
  validateRewriteV2Ast(ast);
  if (!Array.isArray(ast?.actions) || ast.actions.length<2) {
    return unsupported('native JSON pipeline requires at least two actions');
  }
  if (!['request','response'].includes(ast.phase)) {
    return unsupported('native JSON pipeline requires request/response phase');
  }
  if (ast.actions.some(action=>!new RegExp('^'+ast.phase+'\\.json\\.(?:add|delete|replace)$').test(action.name))) {
    return unsupported('native JSON pipeline requires same-phase add/delete/replace actions only');
  }

  const ops=[];
  for (const action of ast.actions) {
    const mapped=topLevelObjectJsonOps(action);
    if (!mapped.ok) return mapped;
    ops.push(...mapped.ops);
  }
  return {ok:true,jq:ops.join(' | ')};
}

export function qxDirectRewritePlan(ast, {matcher = null} = {}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) return unsupported('QX direct mapping requires exactly one action');

  let condition;
  if (matcher) {
    if (matcher.exact !== true || !matcher.prefix) {
      return unsupported('QX direct native action requires an exact matcher plan');
    }
    condition={
      ok:true,
      pattern:matcher.urlPattern,
      prefix:matcher.prefix,
      notes:[],
    };
  } else {
    condition = simpleUrlRewriteCondition(ast);
    if (!condition.ok) return condition;
    condition={...condition,prefix:condition.pattern+' url '};
  }

  const action = ast.actions[0];

  const primitive = qxPrimitiveForRewriteV2Action(action);
  if (primitive && /^(?:reject-|reject$)/.test(primitive)) {
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.prefix + primitive, notes:condition.notes,
    };
  }

  if (action.name === 'request.json.jq' || action.name === 'response.json.jq') {
    const jq = stringNode(action.args[0]);
    if (jq === null) return unsupported(action.name + ': inline JQ must be a fixed string');
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.prefix + token + ' ' + qxQuote(jq), notes:condition.notes,
    };
  }

  if (/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(action.name)) {
    const mapped = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.prefix + token + ' ' + qxQuote(mapped.jq), notes:condition.notes,
    };
  }

  if (action.name === 'request.body.replace' || action.name === 'response.body.replace') {
    if (action.args.some(node => node.type === 'array')) return unsupported('QX direct body replacement currently requires scalar arguments');
    const regex = action.args[0];
    const replacement = stringNode(action.args[1]);
    if (regex?.type !== 'regex' || replacement === null) return unsupported(action.name + ': invalid body replacement arguments');
    const bodyRegex = compileRegexForTarget(regex, { subject: 'body' });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement)) return unsupported('QX direct body replacement with literal whitespace requires script fallback');
    const token = action.name.startsWith('request.') ? 'request-body' : 'response-body';
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.prefix + token + ' ' + bodyRegex.pattern + ' ' + token + ' ' + replacement,
      notes:[...condition.notes, ...bodyRegex.notes],
    };
  }

  return unsupported('action requires generated script or target-specific mapping');
}

function surgeQuoteJq(jq) {
  return quoteJq(jq);
}

export function surgeDirectRewritePlan(ast) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) return unsupported('Surge direct mapping requires exactly one action');
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action = ast.actions[0];

  if (action.name === 'request.json.jq' || action.name === 'response.json.jq') {
    const jq = stringNode(action.args[0]);
    if (jq === null) return unsupported(action.name + ': inline JQ must be a fixed string');
    const token = action.name.startsWith('request.') ? 'http-request-jq' : 'http-response-jq';
    return {
      ok:true, strategy:'direct', section:'body', pattern:condition.pattern,
      line:token + ' ' + condition.pattern + ' ' + surgeQuoteJq(jq), notes:condition.notes,
    };
  }

  if (/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(action.name)) {
    const mapped = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token = action.name.startsWith('request.') ? 'http-request-jq' : 'http-response-jq';
    return {
      ok:true, strategy:'direct', section:'body', pattern:condition.pattern,
      line:token + ' ' + condition.pattern + ' ' + surgeQuoteJq(mapped.jq), notes:condition.notes,
    };
  }

  if (action.name === 'request.body.replace' || action.name === 'response.body.replace') {
    if (action.args.some(node => node.type === 'array')) return unsupported('Surge direct body replacement currently requires scalar arguments');
    const regex = action.args[0];
    const replacement = stringNode(action.args[1]);
    if (regex?.type !== 'regex' || replacement === null) return unsupported(action.name + ': invalid body replacement arguments');
    const bodyRegex = compileRegexForTarget(regex, { subject: 'body' });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement)) return unsupported('Surge direct body replacement with literal whitespace requires script fallback');
    const token = action.name.startsWith('request.') ? 'http-request' : 'http-response';
    return {
      ok:true, strategy:'direct', section:'body', pattern:condition.pattern,
      line:token + ' ' + condition.pattern + ' ' + bodyRegex.pattern + ' ' + replacement,
      notes:[...condition.notes, ...bodyRegex.notes],
    };
  }

  return unsupported('action requires generated script or target-specific mapping');
}

function loonTemplateToSurge(template, capture, argumentTable = null) {
  let converted = String(template).replace(/\$\{([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)\}/g, (_, name, number) => {
    if (!capture || name !== capture) throw new Error('URL replacement contains a non-URL capture');
    return '$' + number;
  });
  converted = converted.replace(/\$\{([A-Za-z_][A-Za-z0-9_-]*)\}/g, (_, name) => {
    const entry=argumentTable?.byId?.get(String(name));
    if (!entry) throw new Error('URL replacement contains an undeclared plugin argument: '+name);
    return entry.placeholder;
  });
  if (converted.includes('$' + '{')) throw new Error('URL replacement contains an unsupported variable');
  return converted;
}

export function surgeRedirectRewritePlan(ast, {argumentTable = null} = {}) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1 || !['redirect','url.replace'].includes(ast.actions[0].name)) {
    return unsupported('Surge URL Rewrite mapping requires one redirect/url.replace action');
  }
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action = ast.actions[0];

  if (action.name === 'redirect') {
    const status = action.args[0];
    const target = stringNode(action.args[1]);
    if (status?.type !== 'number' || ![302,307].includes(status.value)) return unsupported('redirect status must be 302 or 307');
    if (target === null) return unsupported('redirect target must be a fixed string');
    try {
      const replacement = loonTemplateToSurge(target, condition.capture, argumentTable);
      return {
        ok:true, strategy:'direct', section:'url', pattern:condition.pattern,
        line:condition.pattern + ' ' + replacement + ' ' + status.value, notes:condition.notes,
      };
    } catch (error) {
      return unsupported(String(error.message || error));
    }
  }

  const target = stringNode(action.args[0]);
  if (target === null) return unsupported('url.replace target must be a fixed string');
  try {
    const replacement = loonTemplateToSurge(target, condition.capture, argumentTable);
    return {
      ok:true, strategy:'direct', section:'url', pattern:condition.pattern,
      line:condition.pattern + ' ' + replacement + ' header', notes:condition.notes,
    };
  } catch (error) {
    return unsupported(String(error.message || error));
  }
}

function mapLocalData(value) {
  return JSON.stringify(String(value));
}

export function surgeRejectRewritePlan(ast) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) return unsupported('Surge reject mapping requires exactly one action');
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action = ast.actions[0];
  if (!['reject','reject_img','reject_dict','reject_array'].includes(action.name)) return unsupported('reject action has no direct Surge mapping');
  const status = action.args[0];
  if (status?.type !== 'number' || !Number.isInteger(status.value) || status.value < 200 || status.value > 599) {
    return unsupported('reject status must be 200...599 for this mapping');
  }

  // Ordinary Loon reject(404) is just a normal reject. Surge has a native
  // URL Rewrite reject action, so do not synthesize a Map Local response.
  if (action.name === 'reject' && action.args.length === 1 && status.value === 404) {
    return {
      ok:true, strategy:'direct', section:'url', pattern:condition.pattern,
      line:condition.pattern + ' _ reject', notes:condition.notes,
    };
  }

  if (action.name === 'reject_img') {
    return {
      ok:true, strategy:'direct', section:'map', pattern:condition.pattern,
      line:condition.pattern + ' data-type=tiny-gif status-code=' + status.value, notes:condition.notes,
    };
  }

  let body = '';
  let header = '';
  if (action.name === 'reject_dict') {
    body = '{}';
    header = ' header="Content-Type:application/json"';
  } else if (action.name === 'reject_array') {
    body = '[]';
    header = ' header="Content-Type:application/json"';
  } else if (action.args.length > 1) {
    body = stringNode(action.args[1]);
    if (body === null) return unsupported('custom reject body must be a fixed string');
    header = ' header="Content-Type:text/plain; charset=utf-8"';
  }
  return {
    ok:true, strategy:'direct', section:'map', pattern:condition.pattern,
    line:condition.pattern + ' data-type=text data=' + mapLocalData(body) + ' status-code=' + status.value + header,
    notes:condition.notes,
  };
}

function fixedNoTemplate(node, what) {
  const value = stringNode(node);
  if (value === null) throw new Error(what + ' must be a fixed string');
  if (value.includes('$' + '{')) throw new Error(what + ' contains a runtime variable');
  return value;
}

function expandBulkAction(action) {
  if (!action.args.some(arg => arg.type === 'array')) return [action.args];
  const arrays = action.args.map(arg => arg.items);
  return arrays[0].map((_, index) => arrays.map(items => items[index]));
}

function surgeHeaderLine(phase, pattern, action, args) {
  const direction = phase === 'request' ? 'http-request' : 'http-response';
  const name = fixedNoTemplate(args[0], 'header name');
  if (/\s/.test(name)) throw new Error('header name contains whitespace');

  if (action.name.endsWith('.add')) {
    const value = fixedNoTemplate(args[1], 'header value');
    if (/[\r\n]/.test(value)) throw new Error('header value contains a line break');
    return [direction + ' ' + pattern + ' header-add ' + name + ' ' + value];
  }
  if (action.name.endsWith('.set')) {
    const value = fixedNoTemplate(args[1], 'header value');
    if (/[\r\n]/.test(value)) throw new Error('header value contains a line break');
    return [
      direction + ' ' + pattern + ' header-del ' + name,
      direction + ' ' + pattern + ' header-add ' + name + ' ' + value,
    ];
  }
  if (action.name.endsWith('.del')) {
    return [direction + ' ' + pattern + ' header-del ' + name];
  }

  const regex = args[1];
  const replacement = fixedNoTemplate(args[2], 'header replacement');
  if (regex?.type !== 'regex') throw new Error('header.replace regex must be fixed');
  const compiled = compileRegexForTarget(regex, {subject:'header'});
  if (!compiled.ok) throw new Error(compiled.reason);
  if (/\s/.test(compiled.pattern) || /[\r\n]/.test(replacement)) {
    throw new Error('Surge header-replace-regex with literal whitespace requires script fallback');
  }
  return [direction + ' ' + pattern + ' header-replace-regex ' + name + ' ' + compiled.pattern + ' ' + replacement];
}

export function surgeHeaderRewritePlan(ast) {
  validateRewriteV2Ast(ast);
  const allowed = new Set([
    ast.phase + '.header.add',
    ast.phase + '.header.set',
    ast.phase + '.header.del',
    ast.phase + '.header.replace',
  ]);
  if (!ast.actions.length || ast.actions.some(action => !allowed.has(action.name))) {
    return unsupported('Surge Header Rewrite requires same-phase header actions only');
  }
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  try {
    const lines = [];
    for (const action of ast.actions) {
      for (const args of expandBulkAction(action)) lines.push(...surgeHeaderLine(ast.phase, condition.pattern, action, args));
    }
    return {ok:true, strategy:'direct', section:'header', pattern:condition.pattern, lines, notes:condition.notes};
  } catch (error) {
    return unsupported(String(error.message || error));
  }
}

const MOCK_MIME = Object.freeze({
  json:'application/json',
  text:'text/plain',
  css:'text/css',
  html:'text/html',
  javascript:'application/javascript',
  plain:'text/plain',
  png:'image/png',
  gif:'image/gif',
  jpeg:'image/jpeg',
  tiff:'image/tiff',
  svg:'image/svg+xml',
  mp4:'video/mp4',
  'form-data':'multipart/form-data',
});
const MOCK_TEXT_TYPES = new Set(['json','text','css','html','javascript','plain']);

function boolArg(node, fallback = false) {
  if (!node) return fallback;
  if (node.type !== 'boolean') throw new Error('mock Base64 flag must be Boolean');
  return node.value;
}

function intArg(node, fallback) {
  if (!node) return fallback;
  if (node.type !== 'number' || !Number.isInteger(node.value)) throw new Error('mock status must be an integer');
  return node.value;
}

function applyStaticHeaderAction(headers, action) {
  const remove = name => {
    const wanted = name.toLowerCase();
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i][0].toLowerCase() === wanted) headers.splice(i, 1);
    }
  };

  for (const args of expandBulkAction(action)) {
    const name = fixedNoTemplate(args[0], 'header name');
    if (action.name.endsWith('.add')) {
      headers.push([name, fixedNoTemplate(args[1], 'header value')]);
    } else if (action.name.endsWith('.set')) {
      remove(name);
      headers.push([name, fixedNoTemplate(args[1], 'header value')]);
    } else if (action.name.endsWith('.del')) {
      remove(name);
    } else {
      const regex = args[1];
      const replacement = fixedNoTemplate(args[2], 'header replacement');
      if (regex?.type !== 'regex') throw new Error('header.replace regex must be fixed');
      const re = new RegExp(normalizeRegexBodyForTarget(regex.pattern));
      const wanted = name.toLowerCase();
      for (const pair of headers) {
        if (pair[0].toLowerCase() === wanted) pair[1] = String(pair[1]).replace(re, replacement);
      }
    }
  }
}

export function surgeInlineMockPlan(ast) {
  validateRewriteV2Ast(ast);
  if (ast.phase !== 'response') return unsupported('Surge Map Local maps response.body.mock only');
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const mocks = ast.actions.filter(action => action.name === 'response.body.mock');
  if (mocks.length !== 1) return unsupported('Surge mock conversion requires exactly one response.body.mock');
  if (ast.actions.some(action => action !== mocks[0] && !/^response\.header\.(?:add|set|del|replace)$/.test(action.name))) {
    return unsupported('response mock may only combine response.header actions');
  }

  try {
    const mock = mocks[0];
    const type = fixedNoTemplate(mock.args[0], 'mock content type').toLowerCase();
    const body = fixedNoTemplate(mock.args[1], 'mock body');
    const status = intArg(mock.args[2], 200);
    const base64 = boolArg(mock.args[3], false);
    if (status < 200 || status > 999) return unsupported('Surge Map Local cannot preserve this Loon mock status');
    if (!Object.hasOwn(MOCK_MIME, type)) return unsupported('unsupported Loon mock content type: ' + type);
    if (!MOCK_TEXT_TYPES.has(type) && !base64) return unsupported('binary inline mock requires Base64=true for Surge Map Local');

    const compactBase64 = base64 ? body.replace(/\s+/g, '') : '';
    if (base64 && (!/^[A-Za-z0-9+/]*={0,2}$/.test(compactBase64) || compactBase64.length % 4 === 1)) {
      return unsupported('invalid inline Base64 mock body');
    }

    const headers = [['Content-Type', MOCK_MIME[type]]];
    for (const action of ast.actions) {
      if (action !== mock) applyStaticHeaderAction(headers, action);
    }

    for (const pair of headers) {
      if (/[\r\n|]/.test(pair[0]) || /[\r\n|]/.test(pair[1])) {
        return unsupported('Map Local header contains a separator or line break and requires encoded header materialization');
      }
    }

    const headerValue = headers.map(pair => pair[0] + ':' + pair[1]).join('|');
    const data = base64 ? compactBase64 : body;
    const dataType = base64 ? 'base64' : 'text';
    const line = condition.pattern + ' data-type=' + dataType + ' data=' + JSON.stringify(data) +
      ' status-code=' + status + (headerValue ? ' header=' + JSON.stringify(headerValue) : '');
    return {ok:true, strategy:'direct', section:'map', pattern:condition.pattern, line, notes:condition.notes};
  } catch (error) {
    return unsupported(String(error.message || error));
  }
}

export function surgeMockFilePlan(ast, {pluginSourceUrl = '', materialized = null} = {}) {
  validateRewriteV2Ast(ast);
  if (ast.phase !== 'response') {
    return unsupported('Surge Map Local file mapping requires response phase');
  }
  const condition = simpleUrlRewriteCondition(ast, {target:'surge'});
  if (!condition.ok) return condition;

  const mocks = ast.actions.filter(action => action.name === 'response.body.mock_file');
  if (mocks.length !== 1) return unsupported('Surge Map Local file mapping requires exactly one response.body.mock_file action');
  if (ast.actions.some(action => action !== mocks[0] && !/^response\.header\.(?:add|set|del|replace)$/.test(action.name))) {
    return unsupported('response mock_file may only combine response.header actions');
  }

  try {
    const action = mocks[0];
    const spec = dependencySpecFromAction(action, {pluginSourceUrl});
    if (!spec?.resolvable || !spec.url) return unsupported(spec?.reason || 'mock_file is not resolvable');
    if (spec.status < 200 || spec.status > 999) return unsupported('Surge Map Local cannot preserve this Loon mock_file status');
    if (!Object.hasOwn(MOCK_MIME, spec.contentType)) return unsupported('unsupported Loon mock_file content type: ' + spec.contentType);

    let dataType = 'file';
    let data = spec.url;
    if (spec.base64) {
      if (!materialized || materialized.error || typeof materialized.bodyBase64 !== 'string') {
        return unsupported(materialized?.error || 'Base64 mock_file content was not materialized');
      }
      dataType = 'base64';
      data = materialized.bodyBase64;
    }

    const headers = [['Content-Type', MOCK_MIME[spec.contentType]]];
    for (const item of ast.actions) {
      if (item !== action) applyStaticHeaderAction(headers, item);
    }
    for (const pair of headers) {
      if (/[\r\n|]/.test(pair[0]) || /[\r\n|]/.test(pair[1])) {
        return unsupported('Map Local header contains a separator or line break and requires script fallback');
      }
    }
    const headerValue = headers.map(pair => pair[0] + ':' + pair[1]).join('|');

    return {
      ok:true,
      strategy:'direct',
      section:'map',
      pattern:condition.pattern,
      line:condition.pattern + ' data-type=' + dataType + ' data=' + JSON.stringify(data) +
        ' status-code=' + spec.status + (headerValue ? ' header=' + JSON.stringify(headerValue) : ''),
      notes:condition.notes,
    };
  } catch (error) {
    return unsupported(String(error?.message || error));
  }
}


export function fixedStringValue(node) {
  return stringNode(node);
}
