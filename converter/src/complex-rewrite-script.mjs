// WayX generated scripts for mixed same-phase Rewrite v2 pipelines
// Author: chance
// Category: Converter / Rewrite v2 / Complex Helper

import { findRewriteComparisons } from './rewrite-v2.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import { compileComplexCondition } from './complex-rewrite.mjs';

function fixed(node, label) {
  if (!node || !['string','raw-string'].includes(node.type) || (node.type === 'string' && String(node.value).includes('${'))) {
    throw new Error(label + ' must be a fixed string');
  }
  return String(node.value);
}
function captureGroupCount(pattern) {
  let count=0, escaped=false, inClass=false;
  for(let i=0;i<pattern.length;i++){
    const ch=pattern[i];
    if(escaped){escaped=false;continue}
    if(ch==='\\\\'){escaped=true;continue}
    if(ch==='['){inClass=true;continue}
    if(ch===']'&&inClass){inClass=false;continue}
    if(ch!=='('||inClass)continue;
    if(pattern[i+1]!=='?'){count++;continue}
    if(pattern[i+2]==='<' && pattern[i+3]!=='=' && pattern[i+3]!=='!') count++;
  }
  return count;
}
function captureInfo(node, map = new Map()) {
  if (!node) return map;
  if (node.type === 'comparison' && node.capture) {
    if (map.has(node.capture)) throw new Error('duplicate capture alias: ' + node.capture);
    map.set(node.capture, captureGroupCount(node.right?.pattern || ''));
  }
  if (node.type === 'group') captureInfo(node.expression, map);
  if (node.type === 'logical') { captureInfo(node.left, map); captureInfo(node.right, map); }
  return map;
}
function guaranteedCaptures(node) {
  if (!node) return new Set();
  if (node.type === 'comparison') return new Set(node.capture ? [node.capture] : []);
  if (node.type === 'group') return guaranteedCaptures(node.expression);
  if (node.type === 'logical') {
    const left=guaranteedCaptures(node.left), right=guaranteedCaptures(node.right);
    if(node.operator==='&&') return new Set([...left,...right]);
    return new Set([...left].filter(x=>right.has(x)));
  }
  return new Set();
}
function capturedString(node, label, captures, guaranteed) {
  if (!node || !['string','raw-string'].includes(node.type)) throw new Error(label + ' must be a string');
  const value=String(node.value);
  if(node.type==='raw-string') return JSON.stringify(value);
  const parts=[]; let last=0; const re=/\$\{([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)\}/g; let m;
  while((m=re.exec(value))){
    const max=captures.get(m[1]);
    if(max===undefined) throw new Error('unknown capture alias: ' + m[1]);
    if(!guaranteed.has(m[1])) throw new Error('capture alias is not guaranteed on every successful condition path: ' + m[1]);
    if(Number(m[2])>max) throw new Error('capture index exceeds regex capture-group count: ' + m[1] + '.' + m[2]);
    if(m.index>last) parts.push(['s',value.slice(last,m.index)]);
    parts.push(['c',m[1],Number(m[2])]);
    last=re.lastIndex;
  }
  if(last===0){ if(value.includes('${')) throw new Error(label + ' contains unsupported interpolation'); return JSON.stringify(value); }
  if(last<value.length) parts.push(['s',value.slice(last)]);
  return '__wayxTpl(' + JSON.stringify(parts) + ')';
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
function jsonValueSource(node, captures, guaranteed) {
  if (!node || !['string','raw-string','number','boolean','null'].includes(node.type)) throw new Error('JSON replacement value must be fixed');
  if (node.type === 'string') return capturedString(node, 'JSON replacement value', captures, guaranteed);
  if (node.type === 'raw-string') return JSON.stringify(node.value);
  return JSON.stringify(node.value);
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
  const captures = captureInfo(ast.condition);
  const guaranteed = guaranteedCaptures(ast.condition);
  let body = false, headers = false, json = false, headerAdd = false;
  for (const action of ast.actions) {
    if (new RegExp('^' + ast.phase + '\\x2eheader\\x2e(?:add|set|del|replace)$').test(action.name)) {
      headers = true;
      for (const args of expand(action)) {
        const name = fixed(args[0], 'header name');
        if (action.name.endsWith('.add')) {
          if (target !== 'surge') throw new Error('header.add duplicate semantics are not verified for ' + target);
          headerAdd = true;
          out.push('__wayxWith(' + capturedString(args[1], 'header value', captures, guaranteed) + ',v=>__wayxAdd(' + JSON.stringify(name) + ',v));');
        } else if (action.name.endsWith('.set')) {
          out.push('__wayxWith(' + capturedString(args[1], 'header value', captures, guaranteed) + ',v=>__wayxSet(' + JSON.stringify(name) + ',v));');
        } else if (action.name.endsWith('.del')) {
          out.push('__wayxDel(' + JSON.stringify(name) + ');');
        } else {
          if (args[1]?.type !== 'regex') throw new Error('header.replace regex must be fixed');
          out.push('__wayxWith(' + capturedString(args[2], 'header replacement', captures, guaranteed) + ',v=>__wayxHeaderReplace(' + JSON.stringify(name) + ',' + JSON.stringify(args[1].pattern) + ',v));');
        }
      }
      continue;
    }
    if (action.name === ast.phase + '.json.add' || action.name === ast.phase + '.json.delete' || action.name === ast.phase + '.json.replace') {
      body = true; json = true;
      for(const args of expand(action)){
        const path=jsonPath(fixed(args[0], 'JSON key path'));
        if(action.name.endsWith('.delete')) {
          out.push('__wayxJsonAction(j=>__wayxJsonDelete(j,'+JSON.stringify(path)+'));');
        } else {
          const value=jsonValueSource(args[1], captures, guaranteed);
          const helper=action.name.endsWith('.add')?'__wayxJsonAdd':'__wayxJsonReplace';
          if(args[1]?.type==='string' && String(args[1].value).includes('${')) out.push('__wayxWith('+value+',v=>__wayxJsonAction(j=>'+helper+'(j,'+JSON.stringify(path)+',v)));');
          else out.push('__wayxJsonAction(j=>'+helper+'(j,'+JSON.stringify(path)+','+value+'));');
        }
      }
      continue;
    }
    if (action.name === ast.phase + '.body.replace') {
      body = true;
      for(const args of expand(action)){
        if (args[0]?.type !== 'regex') throw new Error('body.replace regex must be fixed');
        const replacement=capturedString(args[1], 'body replacement', captures, guaranteed);
        if(args[1]?.type==='string' && String(args[1].value).includes('${')) out.push('__wayxWith('+replacement+',v=>{__wayxBody=String(__wayxBody ?? "").replace(new RegExp('+JSON.stringify(args[0].pattern)+'),v);});');
        else out.push('__wayxBody=String(__wayxBody ?? "").replace(new RegExp('+JSON.stringify(args[0].pattern)+'),'+replacement+');');
      }
      continue;
    }
    throw new Error('complex helper does not handle ' + action.name);
  }
  if (!body) throw new Error('complex helper requires at least one body/JSON action');
  return {out, body, headers, json, headerAdd};
}
export function renderMixedRewriteScript(ast, {target, stamp='', category='', sourceLine=''}={}) {
  validateRewriteV2Ast(ast);
  if (!['qx','surge'].includes(target)) throw new Error('invalid mixed helper target');
  const plan = statements(ast, target);
  const condition = compileComplexCondition(ast.condition, target);
  const source = ast.phase === 'request' ? '$request' : '$response';
  const doneValue = plan.headers ? '{headers:__wayxHeaders,body:__wayxBody}' : '{body:__wayxBody}';
  const lines = [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Complex Helper'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    'const __wayxCaptures=Object.create(null);',
    plan.headerAdd ? 'let __wayxHeaders=Array.isArray(' + source + '.headers)?' + source + '.headers.map(x=>({field:x.field,value:x.value})):Object.entries(' + source + '.headers||{}).map(([field,value])=>({field,value}));' : 'let __wayxHeaders={...(' + source + '.headers||{})};',
    'let __wayxBody=' + source + '.body;',
    'function __wayxTpl(parts){let out="";for(const p of parts){if(p[0]==="s"){out+=p[1];continue}const v=__wayxCaptures[p[1]]?.[p[2]];if(v===undefined)return undefined;out+=String(v)}return out}',
    'function __wayxWith(v,fn){if(v!==undefined)fn(v)}',
    'function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));fn(j);__wayxBody=JSON.stringify(j)}catch{}}',
    'function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||!(path[i] in Object(x)))return null;x=x[path[i]];}return x;}',
    'function __wayxJsonAdd(root,path,value){let x=root;for(let i=0;i<path.length-1;i++){const k=path[i],next=path[i+1];if(x==null||typeof x!=="object")return;if(!(k in x))x[k]=typeof next==="number"?[]:{};x=x[k]}if(x!=null&&typeof x==="object"&&!(path[path.length-1] in x))x[path[path.length-1]]=value;}',
    'function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p==null)return;const k=path[path.length-1];if(Array.isArray(p)&&typeof k==="number"){if(k>=0&&k<p.length)p.splice(k,1);}else delete p[k];}',
    'function __wayxJsonReplace(root,path,value){const p=__wayxJsonParent(root,path);if(p!=null&&path[path.length-1] in Object(p))p[path[path.length-1]]=value;}',
    'function __wayxHeader(phase,name){const h=phase==="request"?$request.headers:$response.headers;const w=String(name).toLowerCase();if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===w);return x?.value;}const k=Object.keys(h||{}).find(x=>x.toLowerCase()===w);return k===undefined?undefined:h[k];}',
    plan.headerAdd ? 'function __wayxAdd(n,v){__wayxHeaders.push({field:n,value:v});}' : null,
    plan.headerAdd ? 'function __wayxSet(n,v){const w=String(n).toLowerCase();let seen=false;__wayxHeaders=__wayxHeaders.filter(x=>{if(String(x.field).toLowerCase()!==w)return true;if(!seen){x.value=v;seen=true;return true;}return false;});if(!seen)__wayxHeaders.push({field:n,value:v});}' : 'function __wayxSet(n,v){const k=__wayxKey(n);__wayxHeaders[k||n]=v;}',
    plan.headerAdd ? 'function __wayxDel(n){const w=String(n).toLowerCase();__wayxHeaders=__wayxHeaders.filter(x=>String(x.field).toLowerCase()!==w);}' : 'function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}',
    plan.headerAdd ? 'function __wayxHeaderReplace(n,p,r){const w=String(n).toLowerCase();for(const x of __wayxHeaders)if(String(x.field).toLowerCase()===w)x.value=String(x.value).replace(new RegExp(p),r);}' : 'function __wayxHeaderReplace(n,p,r){const k=__wayxKey(n);if(k!==undefined)__wayxHeaders[k]=String(__wayxHeaders[k]).replace(new RegExp(p),r);}',
    plan.headerAdd ? null : 'function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}',
    'if(' + condition + '){',
    ...plan.out.map(line => '  ' + line),
    '  $done(' + doneValue + ');',
    '}else{$done({});}',
    '',
  ].filter(line => line !== null);
  return {pattern:coarsePattern(ast),script:lines.join('\n'),qxAction:ast.phase==='request'?'script-request-body':'script-response-body',surgeType:ast.phase==='request'?'http-request':'http-response',requiresBody:true,fullHeaderMode:plan.headerAdd};
}
