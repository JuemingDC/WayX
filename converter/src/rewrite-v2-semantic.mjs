// WayX behavior-first Rewrite v2 semantic mapper
// Author: chance
// Category: Converter / Rewrite v2 / Semantic Mapping
import { compileRegexForTarget } from './target-regex.mjs';
import { qxPrimitiveForRewriteV2Action, validateRewriteV2Ast } from './rewrite-v2-actions.mjs';

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

export function simpleUrlRewriteCondition(ast) {
  if (!ast || ast.type !== 'rewrite') return unsupported('expected Rewrite v2 AST');
  const c = ast.condition;
  if (!c || c.type !== 'comparison' || c.operator !== '~=' ||
      c.left?.type !== 'variable' || c.left.name !== 'url' ||
      c.right?.type !== 'regex') {
    return unsupported('condition is not a single URL regex');
  }
  const compiled = compileRegexForTarget(c.right, { subject: 'url' });
  if (!compiled.ok) return unsupported(compiled.reason);
  return { ok: true, pattern: compiled.pattern, regex: c.right, capture: c.capture || null, notes: compiled.notes };
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
  if (String(value).includes("'")) throw new Error('JQ contains a single quote and requires script fallback');
  return "'" + value + "'";
}

export function jsonActionToJq(action) {
  const name = action?.name || '';
  if (!/^(?:request|response)\.json\.(?:delete|replace)$/.test(name)) {
    return unsupported('JSON action is outside delete/replace direct subset');
  }

  if (name.endsWith('.delete')) {
    const paths = scalarItems(action.args[0]).map(node => {
      const value = stringNode(node);
      if (value === null) throw new Error(name + ': key path must be a fixed string');
      return pathLiteral(value);
    });
    return { ok: true, jq: paths.map(path => 'delpaths([' + path + '])').join(' | ') };
  }

  const paths = scalarItems(action.args[0]);
  const values = scalarItems(action.args[1]);
  if (paths.length !== values.length) throw new Error(name + ': batch argument lengths differ');
  const ops = paths.map((node, index) => {
    const key = stringNode(node);
    if (key === null) throw new Error(name + ': key path must be a fixed string');
    return 'setpath(' + pathLiteral(key) + '; ' + anyToJq(values[index]) + ')';
  });
  return { ok: true, jq: ops.join(' | ') };
}

export function qxDirectRewritePlan(ast) {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1) return unsupported('QX direct mapping requires exactly one action');
  const condition = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action = ast.actions[0];

  const primitive = qxPrimitiveForRewriteV2Action(action);
  if (primitive && /^(?:reject-|reject$)/.test(primitive)) {
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.pattern + ' url ' + primitive, notes:condition.notes,
    };
  }

  if (action.name === 'request.json.jq' || action.name === 'response.json.jq') {
    const jq = stringNode(action.args[0]);
    if (jq === null) return unsupported(action.name + ': inline JQ must be a fixed string');
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.pattern + ' url ' + token + ' ' + qxQuote(jq), notes:condition.notes,
    };
  }

  if (/^(?:request|response)\.json\.(?:delete|replace)$/.test(action.name)) {
    const mapped = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {
      ok:true, strategy:'direct', section:'rewrite', pattern:condition.pattern,
      line:condition.pattern + ' url ' + token + ' ' + qxQuote(mapped.jq), notes:condition.notes,
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
      line:condition.pattern + ' url ' + token + ' ' + bodyRegex.pattern + ' ' + token + ' ' + replacement,
      notes:[...condition.notes, ...bodyRegex.notes],
    };
  }

  return unsupported('action requires generated script or target-specific mapping');
}

function surgeQuoteJq(jq) {
  if (String(jq).includes("'")) throw new Error('JQ contains a single quote and requires script fallback');
  return "'" + jq + "'";
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

  if (/^(?:request|response)\.json\.(?:delete|replace)$/.test(action.name)) {
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

function loonTemplateToSurge(template, capture) {
  const converted = String(template).replace(/\$\{([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)\}/g, (_, name, number) => {
    if (!capture || name !== capture) throw new Error('URL replacement contains a non-URL capture');
    return '$' + number;
  });
  if (converted.includes('$' + '{')) throw new Error('URL replacement contains a non-URL variable');
  return converted;
}

export function surgeRedirectRewritePlan(ast) {
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
      const replacement = loonTemplateToSurge(target, condition.capture);
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
    const replacement = loonTemplateToSurge(target, condition.capture);
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
    return unsupported('Surge Map Local status must be 200...599 for this mapping');
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
      const re = new RegExp(regex.pattern, String(regex.flags || ''));
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
    if (status < 200 || status > 599) return unsupported('Surge Map Local cannot preserve this Loon mock status');
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

export function fixedStringValue(node) {
  return stringNode(node);
}
