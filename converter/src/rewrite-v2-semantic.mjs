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
    const paths = scalarItems(action.args[0]).map(n => {
      const v = stringNode(n);
      if (v === null) throw new Error(name + ': key path must be a fixed string');
      return pathLiteral(v);
    });
    return { ok: true, jq: paths.map(p => `delpaths([${p}])`).join(' | ') };
  }

  const paths = scalarItems(action.args[0]);
  const values = scalarItems(action.args[1]);
  if (paths.length !== values.length) throw new Error(name + ': batch argument lengths differ');
  const ops = paths.map((p, i) => {
    const key = stringNode(p);
    if (key === null) throw new Error(name + ': key path must be a fixed string');
    return `setpath(${pathLiteral(key)}; ${anyToJq(values[i])})`;
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
    return { ok: true, strategy: 'direct', section: 'rewrite', pattern: condition.pattern, line: `${condition.pattern} url ${primitive}`, notes: condition.notes };
  }

  if (action.name === 'request.json.jq' || action.name === 'response.json.jq') {
    const jq = stringNode(action.args[0]);
    if (jq === null) return unsupported(action.name + ': inline JQ must be a fixed string');
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return { ok: true, strategy: 'direct', section: 'rewrite', pattern: condition.pattern, line: `${condition.pattern} url ${token} ${qxQuote(jq)}`, notes: condition.notes };
  }

  if (/^(?:request|response)\.json\.(?:delete|replace)$/.test(action.name)) {
    const mapped = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token = action.name.startsWith('request.') ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return { ok: true, strategy: 'direct', section: 'rewrite', pattern: condition.pattern, line: `${condition.pattern} url ${token} ${qxQuote(mapped.jq)}`, notes: condition.notes };
  }

  if (action.name === 'request.body.replace' || action.name === 'response.body.replace') {
    if (action.args.some(x => x.type === 'array')) return unsupported('QX direct body replacement currently requires scalar arguments');
    const regex = action.args[0], replacement = stringNode(action.args[1]);
    if (regex?.type !== 'regex' || replacement === null) return unsupported(action.name + ': invalid body replacement arguments');
    const bodyRegex = compileRegexForTarget(regex, { subject: 'body' });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement)) return unsupported('QX direct body replacement with literal whitespace requires script fallback');
    const token = action.name.startsWith('request.') ? 'request-body' : 'response-body';
    return {
      ok: true, strategy: 'direct', section: 'rewrite', pattern: condition.pattern,
      line: `${condition.pattern} url ${token} ${bodyRegex.pattern} ${token} ${replacement}`,
      notes: [...condition.notes, ...bodyRegex.notes],
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
    return { ok: true, strategy: 'direct', section: 'body', pattern: condition.pattern, line: `${token} ${condition.pattern} ${surgeQuoteJq(jq)}`, notes: condition.notes };
  }

  if (/^(?:request|response)\.json\.(?:delete|replace)$/.test(action.name)) {
    const mapped = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token = action.name.startsWith('request.') ? 'http-request-jq' : 'http-response-jq';
    return { ok: true, strategy: 'direct', section: 'body', pattern: condition.pattern, line: `${token} ${condition.pattern} ${surgeQuoteJq(mapped.jq)}`, notes: condition.notes };
  }

  if (action.name === 'request.body.replace' || action.name === 'response.body.replace') {
    if (action.args.some(x => x.type === 'array')) return unsupported('Surge direct body replacement currently requires scalar arguments');
    const regex = action.args[0], replacement = stringNode(action.args[1]);
    if (regex?.type !== 'regex' || replacement === null) return unsupported(action.name + ': invalid body replacement arguments');
    const bodyRegex = compileRegexForTarget(regex, { subject: 'body' });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement)) return unsupported('Surge direct body replacement with literal whitespace requires script fallback');
    const token = action.name.startsWith('request.') ? 'http-request' : 'http-response';
    return {
      ok: true, strategy: 'direct', section: 'body', pattern: condition.pattern,
      line: `${token} ${condition.pattern} ${bodyRegex.pattern} ${replacement}`,
      notes: [...condition.notes, ...bodyRegex.notes],
    };
  }

  return unsupported('action requires generated script or target-specific mapping');
}

export function fixedStringValue(node) {
  return stringNode(node);
}
