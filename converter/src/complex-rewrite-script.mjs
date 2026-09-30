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
        } else if (action.name.endsWith('.set')) out.push('__wayxSet(' + JSON.stringify(name) + ',' + JSON.stringify(fixed(args[1], 'header value')) + ');');
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
        if(action.name.endsWith('.delete')) {
          if (typeof path[path.length - 1] === 'number') throw new Error('json.delete array-index semantics are not verified');
          out.push('__wayxJsonDelete(__wayxJson,'+JSON.stringify(path)+');');
        }
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
export function renderMixedRewriteScript(ast, {target, stamp='', category='', sourceLine=''}={}) {
  validateRewriteV2Ast(ast);
  if (!['qx','surge'].includes(target)) throw new Error('invalid mixed helper target');
  const plan = statements(ast, target);
  const condition = compileComplexCondition(ast.condition, target);
  const source = ast.phase === 'request' ? '$request' : '$response';
  const lines = [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Complex Helper'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    plan.headerAdd ? 'let __wayxHeaders=Array.isArray(' + source + '.headers)?' + source + '.headers.map(x=>({field:x.field,value:x.value})):Object.entries(' + source + '.headers||{}).map(([field,value])=>({field,value}));' : 'let __wayxHeaders={...(' + source + '.headers||{})};',
    'let __wayxBody=' + source + '.body;',
    plan.json ? 'let __wayxJson=JSON.parse(String(__wayxBody ?? ""));' : null,
    'function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||!(path[i] in Object(x)))return null;x=x[path[i]];}return x;}',
    'function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p!=null)delete p[path[path.length-1]];}',
    'function __wayxJsonReplace(root,path,value){const p=__wayxJsonParent(root,path);if(p!=null&&path[path.length-1] in Object(p))p[path[path.length-1]]=value;}',
    'function __wayxHeader(phase,name){const h=phase==="request"?$request.headers:$response.headers;const w=String(name).toLowerCase();if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===w);return x?.value;}const k=Object.keys(h||{}).find(x=>x.toLowerCase()===w);return k===undefined?undefined:h[k];}',
    plan.headerAdd ? 'function __wayxAdd(n,v){__wayxHeaders.push({field:n,value:v});}' : null,
    plan.headerAdd ? 'function __wayxSet(n,v){const w=String(n).toLowerCase();let seen=false;__wayxHeaders=__wayxHeaders.filter(x=>{if(String(x.field).toLowerCase()!==w)return true;if(!seen){x.value=v;seen=true;return true;}return false;});if(!seen)__wayxHeaders.push({field:n,value:v});}' : 'function __wayxSet(n,v){const k=__wayxKey(n);__wayxHeaders[k||n]=v;}',
    plan.headerAdd ? 'function __wayxDel(n){const w=String(n).toLowerCase();__wayxHeaders=__wayxHeaders.filter(x=>String(x.field).toLowerCase()!==w);}' : 'function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}',
    plan.headerAdd ? 'function __wayxHeaderReplace(n,p,r){const w=String(n).toLowerCase();for(const x of __wayxHeaders)if(String(x.field).toLowerCase()===w)x.value=String(x.value).replace(new RegExp(p),r);}' : 'function __wayxHeaderReplace(n,p,r){const k=__wayxKey(n);if(k!==undefined)__wayxHeaders[k]=String(__wayxHeaders[k]).replace(new RegExp(p),r);}',
    plan.headerAdd ? null : 'function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}',
    'if(' + condition + '){',
    ...plan.out.map(line => '  ' + line),
    plan.json ? '  __wayxBody=JSON.stringify(__wayxJson);' : null,
    '  $done({headers:__wayxHeaders,body:__wayxBody});',
    '}else{$done({});}',
    '',
  ].filter(line => line !== null);
  return {pattern:coarsePattern(ast),script:lines.join('\n'),qxAction:ast.phase==='request'?'script-request-body':'script-response-body',surgeType:ast.phase==='request'?'http-request':'http-response',requiresBody:true,fullHeaderMode:plan.headerAdd};
}
