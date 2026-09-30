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
function statements(ast) {
  const out = [];
  let body = false, headers = false;
  for (const action of ast.actions) {
    if (new RegExp('^' + ast.phase + '\\x2eheader\\x2e(?:set|del|replace)$').test(action.name)) {
      headers = true;
      for (const args of expand(action)) {
        const name = fixed(args[0], 'header name');
        if (action.name.endsWith('.set')) out.push('__wayxSet(' + JSON.stringify(name) + ',' + JSON.stringify(fixed(args[1], 'header value')) + ');');
        else if (action.name.endsWith('.del')) out.push('__wayxDel(' + JSON.stringify(name) + ');');
        else {
          if (args[1]?.type !== 'regex') throw new Error('header.replace regex must be fixed');
          out.push('__wayxHeaderReplace(' + JSON.stringify(name) + ',' + JSON.stringify(args[1].pattern) + ',' + JSON.stringify(fixed(args[2], 'header replacement')) + ');');
        }
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
  if (!body || !headers) throw new Error('mixed helper requires both header and body actions');
  return {out, body, headers};
}
export function renderMixedRewriteScript(ast, {target, stamp='', category='', sourceLine=''}={}) {
  validateRewriteV2Ast(ast);
  if (!['qx','surge'].includes(target)) throw new Error('invalid mixed helper target');
  const plan = statements(ast);
  const condition = compileComplexCondition(ast.condition, target);
  const source = ast.phase === 'request' ? '$request' : '$response';
  const lines = [
    stamp ? '// Converted: ' + stamp : null,
    '// Converted by: chance',
    '// Category: ' + (category || 'Rewrite / Complex Helper'),
    sourceLine ? '// Source Loon: ' + sourceLine : null,
    'let __wayxHeaders={...(' + source + '.headers||{})};',
    'let __wayxBody=' + source + '.body;',
    'function __wayxHeader(phase,name){const h=phase==="request"?$request.headers:$response.headers;const k=Object.keys(h||{}).find(x=>x.toLowerCase()===String(name).toLowerCase());return k===undefined?undefined:h[k];}',
    'function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}',
    'function __wayxSet(n,v){const k=__wayxKey(n);__wayxHeaders[k||n]=v;}',
    'function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}',
    'function __wayxHeaderReplace(n,p,r){const k=__wayxKey(n);if(k!==undefined)__wayxHeaders[k]=String(__wayxHeaders[k]).replace(new RegExp(p),r);}',
    'if(' + condition + '){',
    ...plan.out.map(line => '  ' + line),
    '  $done({headers:__wayxHeaders,body:__wayxBody});',
    '}else{$done({});}',
    '',
  ].filter(line => line !== null);
  return {
    pattern: coarsePattern(ast),
    script: lines.join('\n'),
    qxAction: ast.phase === 'request' ? 'script-request-body' : 'script-response-body',
    surgeType: ast.phase === 'request' ? 'http-request' : 'http-response',
    requiresBody: true,
  };
}
