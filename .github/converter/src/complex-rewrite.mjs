// WayX complex Rewrite v2 capability registry
// Author: chance
// Category: Converter / Rewrite v2

import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';

const families = Object.freeze([
  { id:'header-pipeline', test:a => /^(request|response)\.header\.(add|set|del|replace)$/.test(a.name) },
  { id:'body-pipeline', test:a => /^(request|response)\.body\.replace$/.test(a.name) },
  { id:'json-pipeline', test:a => /^(request|response)\.json\.(add|delete|replace)$/.test(a.name) },
  { id:'jq-pipeline', test:a => /^(request|response)\.json\.(?:jq|jq_file)$/.test(a.name) },
  { id:'mock-pipeline', test:a => /^(request|response)\.body\.(?:mock|mock_file)$/.test(a.name) },
  { id:'url-control-pipeline', test:a => a.name==='url.replace' },
  { id:'synthetic-response-pipeline', test:a => /^(?:redirect|reject|reject_img|reject_dict|reject_array|reject_video)$/.test(a.name) },
]);

export function classifyComplexRewrite(ast) {
  validateRewriteV2Ast(ast);
  const matched = ast.actions.map(action => families.find(f => f.test(action))?.id || null);
  if (matched.some(x => x === null)) return { ok:false, reason:'unregistered complex action family' };
  return { ok:true, families:[...new Set(matched)], phase:ast.phase };
}

export const COMPLEX_REWRITE_FAMILIES = families.map(x => x.id);

export function complexConditionKinds(node, out = []) {
  if (!node) return out;
  if (node.type === 'group') return complexConditionKinds(node.expression, out);
  if (node.type === 'logical') {
    out.push(node.operator);
    complexConditionKinds(node.left, out);
    complexConditionKinds(node.right, out);
    return out;
  }
  if (node.type === 'comparison') {
    out.push(node.operator);
    out.push(node.left?.name || 'unknown');
    return out;
  }
  out.push('unsupported');
  return out;
}

function fixedConditionValue(node) {
  if (!node || !['string','raw-string','number','boolean','null'].includes(node.type)) {
    throw new Error('complex condition value must be fixed');
  }
  return JSON.stringify(node.value);
}

function argumentEntry(name, argumentTable) {
  return argumentTable?.byId?.get(String(name)) || null;
}

function conditionEquality(left, node, argumentTable) {
  if (node?.type === 'variable') {
    const entry = argumentEntry(node.name, argumentTable);
    if (!entry) throw new Error('undeclared complex condition argument: ' + node.name);
    const right='__wayxArgs[' + JSON.stringify(entry.id) + ']';
    if (entry.valueType === 'number') return '(Number(' + left + ') === Number(' + right + '))';
    if (entry.valueType === 'boolean') return '((String(' + left + ').toLowerCase()==="true") === (String(' + right + ').toLowerCase()==="true"))';
    return '(String(' + left + ' ?? "") === String(' + right + ' ?? ""))';
  }

  const value=fixedConditionValue(node);
  if(node.type==='string'||node.type==='raw-string') return '(String(' + left + ' ?? "") === ' + value + ')';
  if(node.type==='number') return '(Number(' + left + ') === ' + value + ')';
  if(node.type==='boolean') return '((String(' + left + ').toLowerCase()==="true") === ' + value + ')';
  return '(' + left + ' == null)';
}

function runtimeConditionVariable(name, target, argumentTable) {
  if (name === 'url') return '$request.url';
  if (name === 'request.method') return '$request.method';
  if (name === 'response.status') return target === 'qx' ? '$response.statusCode' : '$response.status';
  const header = String(name).match(/^(request|response)\.header\[['"](.+?)['"]\]$/);
  if (header) return '__wayxHeader(' + JSON.stringify(header[1]) + ',' + JSON.stringify(header[2]) + ')';
  const entry=argumentEntry(name, argumentTable);
  if (entry) return '__wayxArgs[' + JSON.stringify(entry.id) + ']';
  throw new Error('unsupported complex condition variable: ' + name);
}

export function compileComplexCondition(node, target, {argumentTable = null} = {}) {
  if (node?.type === 'group') return '(' + compileComplexCondition(node.expression, target, {argumentTable}) + ')';
  if (node?.type === 'logical') {
    if (!['&&','||'].includes(node.operator)) throw new Error('unsupported complex logical operator: ' + node.operator);
    return '(' + compileComplexCondition(node.left, target, {argumentTable}) + ' ' + node.operator + ' ' + compileComplexCondition(node.right, target, {argumentTable}) + ')';
  }
  if (node?.type !== 'comparison' || node.left?.type !== 'variable') throw new Error('unsupported complex condition shape');
  const left = runtimeConditionVariable(node.left.name, target, argumentTable);
  if (node.operator === '==') return conditionEquality(left, node.right, argumentTable);
  if (node.operator === '~=' && node.right?.type === 'regex') {
    const pattern=String(node.right.pattern ?? '');
    const flags=String(node.right.flags || '');
    const regexp='new RegExp(' + JSON.stringify(pattern) + ',' + JSON.stringify(flags) + ')';
    if (node.capture) {
      return '((__wayxCaptures[' + JSON.stringify(node.capture) + ']=String(' + left + ' ?? "").match(' + regexp + '))!==null)';
    }
    return '(' + regexp + '.test(String(' + left + ' ?? "")))';
  }
  throw new Error('unsupported complex comparison');
}
