// WayX generated scripts for mixed same-phase Rewrite v2 pipelines
// Author: chance
// Category: Converter / Rewrite v2 / Complex Helper

import { findRewriteComparisons } from './rewrite-v2.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import { compileComplexCondition } from './complex-rewrite.mjs';

function fixed(node, label) {
  if (!node || !['string','raw-string'].includes(node.type) || String(node.value).includes('${')) {
    throw new Error(label + ' must be a fixed string');
  }
  return String(node.value);
}
function expand(action) {
  if (!action.args.some(arg => arg.type === 'array')) return [action.args];
  return action.args[0].items.map((_, i) => action.args.map(arg => arg.items[i]));
}
function coarsePattern(ast) {
  const found = findRewriteComparisons(ast.condition, node =>
    node.operator === '~=' && node.left?.type === 'variable' && node.left.name === 'url' && node.right?.type === 'regex'
  );
  if (!found.length) return '^https?://';
  if (found.length === 1) return found[0].right.pattern;
  return '(?:' + found.map(node => '(?:' + node.right.pattern + ')').join('|') + ')';
}
function jsonValue(node) {
  if (!node || !['string','raw-string','number','boolean','null'].includes(node.type)) throw new Error('JSON replacement value must be fixed');
  if (node.type === 'raw-string') {
    try { return JSON.parse(node.value); } catch { return node.value; }
  }
  return node.value;
}
function jsonPath(text) {
  const path=String(text||''); if(!path) throw new Error('JSON key path must not be empty');
  const parts=[]; let i=0;
  while(i<path.length){
    if(path[i]==='.') { i++; continue; }
    if(path[i]==='['){const m=path.slice(i).match(/^\[(\d+)\]/); if(!m) throw new Error('unsupported JSON key-path bracket syntax: '+path); parts.push(Number(m[1])); i+=m[0].length; continue;}
    const m=path.slice(i).match(/^[^.[\]]+/); if(!m) throw new Error('invalid JSON key path: '+path); parts.push(m[0]); i+=m[0].length;
  }
  return parts;
}
function statements(ast, target) {
  const out = [];
  let body = false, headers = false, json = false, headerAdd = false;
  for (const action of ast.actions) {
    if (new RegExp('^' + ast.phase + '\\x2eheader\\x2e(?:add|set|del|replace)$').test(action.name)) {
      headers = true;
      for (const args of expand(action)) {
        const name = fixed(args[0], 'header name');
        if (action.name.endsWith('.add')) {
          if (target !== 'surge') throw new Error('header.add duplicate semantics are not verified for ' + target);
          headerAdd = true;
          out.push('__wayxAdd(' + JSON.stringify(name) + ',' + JSON.stringify(fixed(args[1], 'header value')) + ');');
        }
        else if (action.name.endsWith('.set')) out.push('__wayxSet(' + JSON.stringify(name) + ',' + JSON.stringify(fixed(args[1], 'header value')) + ');');
        else if (action.name.endsWith('.del')) out.push('__wayxDel(' + JSON.stringify(name) + ');');
        else {
          if (args[1]?.type !== 'regex') throw new Error('header.replace regex must be fixed');
          out.push('__wayxHeaderReplace(' + JSON.stringify(name) + ',' + JSON.stringify(args[1].pattern) + ',' + JSON.stringify(fixed(args[2], 'header replacement')) + ');');
        }
      }
      continue;
    }
    if (action.name === ast.phase + '.json.delete' || action.name === ast.phase + '.json.replace') {
      body = true; json = true;
      const groups=expand(action);
      for(const args of groups){
        const path=jsonPath(fixed(args[0], 'JSON key path'));
        if(action.name.endsWith('.delete')) out.push('__wayxJsonDelete(__wayxJson,'+JSON.stringify(path)+');');
        else out.push('__wayxJsonReplace(__wayxJson,'+JSON.stringify(path)+','+JSON.stringify(jsonValue(args[1]))+');');
      }
      continue;
    }
    if (action.name === ast.phase + '.body.replace') {
      if (action.args[0]?.type !== 'regex') throw new Error('body.replace regex must be fixed');
      body = true;
      out.push('__wayxBody=String(__wayxBody ?? "").replace(new RegExp(' + JSON.stringify(action.args[0].pattern) + '),' + JSON.stringify(fixed(action.args[1], 'body replacement')) + ');');
      continue;
    }
    throw new Error('mixed helper does not handle ' + action.name);
  }
  if (!body || !headers) throw new Error('mixed helper requires both header and body/JSON actions');
  return {out, body, headers, json, headerAdd};
}
export function renderMixedRewriteScript(ast, {target, stamp='', category='', sourceLine=''}
