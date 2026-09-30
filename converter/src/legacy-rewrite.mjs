// Generic Loon legacy Rewrite classifier and target planner
// Author: chance
// Category: Converter / Legacy Rewrite
import crypto from 'node:crypto';
import { minifyJq, quoteJq } from './jq.mjs';
import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { renderQxHeaderScript, renderQxInlineMockScript } from './qx-semantic-script.mjs';
import { surgeInlineMockPlan } from './rewrite-v2-semantic.mjs';
import { renderSurgeRequestMockScript } from './surge-mock.mjs';
import { renderSingleJsonAddScript } from './complex-rewrite-script.mjs';

const REJECT_ACTIONS = new Set(['reject','reject-200','reject-img','reject-dict','reject-array']);

function review(pattern, action, reason) {
  return {
    section:'comment',
    line:`# [WayX] REVIEW REQUIRED: ${reason}\n# Source declaration: ${pattern} ${action}`,
  };
}

function shellTokens(input) {
  const out = [];
  let cur = '', quote = null, esc = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\' && quote) { cur += ch; esc = true; continue; }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur = ''; }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function unquote(token) {
  const t = String(token ?? '');
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function jqPath(pathText) {
  const parts = [];
  for (const raw of String(pathText).split('.')) {
    const m = raw.match(/^([^[]+)((?:\[\d+\])*)$/);
    if (!m) return null;
    parts.push(m[1]);
    for (const idx of m[2].matchAll(/\[(\d+)\]/g)) parts.push(Number(idx[1]));
  }
  return parts;
}

function jqAccess(pathText) {
  const parts=jqPath(pathText);
  if (!parts) return null;
  let out='';
  for (const part of parts) {
    if (typeof part === 'number') out += `[${part}]`;
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) out += '.' + part;
    else out += '[' + JSON.stringify(part) + ']';
  }
  return out;
}

function parseJsonValue(token) {
  const t = String(token).trim();
  try { return JSON.parse(t); } catch {}
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

function compileJsonMutation(phase, op, rest) {
  if (op === 'jq') return { ok:true, jq:unquote(String(rest).trim()), preserve:true };
  const tokens = shellTokens(rest);
  if (op === 'del') {
    if (!tokens.length) return { ok:false, reason:'missing JSON path' };
    const paths = tokens.map(unquote).map(jqAccess);
    if (paths.some(x => !x)) return { ok:false, reason:'unsupported JSON path syntax' };
    return { ok:true, jq:`del(${paths.join(', ')})` };
  }
  if (op === 'replace') {
    if (!tokens.length || tokens.length % 2) return { ok:false, reason:'json-replace requires path/value pairs' };
    const ops = [];
    for (let i=0;i<tokens.length;i+=2) {
      const p=jqPath(unquote(tokens[i]));
      if (!p) return { ok:false, reason:'unsupported JSON path syntax' };
      ops.push(`setpath(${JSON.stringify(p)}; ${JSON.stringify(parseJsonValue(tokens[i+1]))})`);
    }
    return { ok:true, jq:ops.join(' | ') };
  }
  return { ok:false, reason:'unsupported JSON operation' };
}

function parseMockData(rest) {
  const source=String(rest || '');
  const quotedStart=source.search(/\bdata="/i);
  if(quotedStart >= 0){
    const valueStart=source.indexOf('"', quotedStart) + 1;
    const tail=source.slice(valueStart);
    const marker=tail.match(/"\s+(?=(?:status-code|data-path|mock-data-is-base64)=)/i);
    const end=marker ? valueStart + marker.index : source.lastIndexOf('"');
    if(end >= valueStart){
      return source.slice(valueStart,end)
        .replace(/\\"/g, '"')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');
    }
  }
  const unquoted=source.match(/\bdata=([^\s]+)/i);
  return unquoted ? unquoted[1] : null;
}

function parseMock(rest) {
  const type = (rest.match(/\bdata-type=([^\s]+)/i) || [])[1] || 'text';
  const status = Number((rest.match(/\bstatus-code=(\d+)/i) || [])[1] || 200);
  const dataPath = (rest.match(/\bdata-path=([^\s]+)/i) || [])[1] || null;
  const base64 = /\bmock-data-is-base64=(?:true|1)\b/i.test(rest);
  return { type, status, data:parseMockData(rest), dataPath, base64 };
}

export function classifyLegacyRewrite(action) {
  const raw=String(action ?? '').trim();
  const lower=raw.toLowerCase();
  if (REJECT_ACTIONS.has(lower)) return {kind:'reject', action:lower};
  if (lower === 'reject-video') return {kind:'reject-video'};
  let m=raw.match(/^(302|307)\s+(.+)$/i);
  if (m) return {kind:'redirect', status:Number(m[1]), target:m[2]};
  m=raw.match(/^header\s+(.+)$/i);
  if (m) return {kind:'url-rewrite', target:m[1]};
  m=raw.match(/^(response-)?header-(add|del|replace|replace-regex)\s+(.+)$/i);
  if (m) return {kind:'header', phase:m[1] ? 'response':'request', op:m[2].toLowerCase(), rest:m[3]};
  m=raw.match(/^(request|response)-body-replace-regex\s+(.+)$/i);
  if (m) return {kind:'body-regex', phase:m[1].toLowerCase(), rest:m[2]};
  m=raw.match(/^(request|response)-body-json-(add|replace|del|jq)\s+(.+)$/i);
  if (m) return {kind:'json', phase:m[1].toLowerCase(), op:m[2].toLowerCase(), rest:m[3]};
  m=raw.match(/^mock-(request|response)-body\s+(.+)$/i);
  if (m) return {kind:'mock', phase:m[1].toLowerCase(), mock:parseMock(m[2])};
  return {kind:'unknown', raw};
}

function legacyStringNode(value) {
  return {type:'string', value:String(value), raw:JSON.stringify(String(value))};
}

function legacyRegexNode(pattern) {
  return {type:'regex', pattern:String(pattern), flags:'', raw:'/' + String(pattern).replaceAll('/', '\\/') + '/'};
}

function legacyHeaderAst(pattern, parsed, tokens) {
  const width=parsed.op === 'del' ? 1 : parsed.op === 'replace-regex' ? 3 : 2;
  const actions=[];
  for(let i=0;i<tokens.length;i+=width){
    const args=tokens.slice(i,i+width).map(unquote);
    let suffix;
    let nodes;
    if(parsed.op === 'del'){
      suffix='del';
      nodes=[legacyStringNode(args[0])];
    }else if(parsed.op === 'add'){
      suffix='add';
      nodes=[legacyStringNode(args[0]), legacyStringNode(args[1])];
    }else if(parsed.op === 'replace'){
      // Legacy header-replace is the set/replace-whole-field operation.
      suffix='set';
      nodes=[legacyStringNode(args[0]), legacyStringNode(args[1])];
    }else{
      suffix='replace';
      nodes=[legacyStringNode(args[0]), legacyRegexNode(args[1]), legacyStringNode(args[2])];
    }
    actions.push({type:'action', name:parsed.phase + '.header.' + suffix, args:nodes});
  }
  return {
    type:'rewrite',
    phase:parsed.phase,
    condition:{
      type:'comparison',
      operator:'~=',
      left:{type:'variable', name:'url'},
      right:legacyRegexNode(pattern),
      capture:null,
    },
    actions,
  };
}

function planHeader(pattern, action, parsed, target, ctx) {
  const tokens=shellTokens(parsed.rest);
  const direction=parsed.phase === 'response' ? 'http-response' : 'http-request';
  const width=parsed.op === 'del' ? 1 : parsed.op === 'replace-regex' ? 3 : 2;
  if (!tokens.length || tokens.length % width) return review(pattern, action, 'invalid legacy header argument grouping');

  if (target === 'qx' && parsed.phase === 'request' && parsed.op === 'add') {
    const targetPattern=normalizeRegexBodyForTarget(pattern);
    const pairs=[];
    for(let i=0;i<tokens.length;i+=width){
      const [name,value]=tokens.slice(i,i+width).map(unquote);
      if(!name || /[\s:\r\n]/.test(name) || /[\r\n$]/.test(value)) {
        return review(pattern, action, 'legacy request header-add contains an unsafe field name/value for QX whole-header rewrite');
      }
      pairs.push([name,value]);
    }
    const inserted=pairs.map(([name,value]) => name + ': ' + value + '$2').join('');
    return {
      section:'rewrite',
      line:targetPattern + ' url request-header ^([^\\r\\n]+)(\\r\\n) request-header $1$2' + inserted,
    };
  }


  if (target === 'qx') {
    try {
      const ast=legacyHeaderAst(pattern, parsed, tokens);
      const plan=renderQxHeaderScript(ast, {
        stamp:ctx.stamp || '',
        category:ctx.category || 'Rewrite / Legacy Header',
        sourceLine:pattern + ' ' + action,
      });
      const key=crypto.createHash('sha1').update('legacy-header\\0'+pattern+'\\0'+action).digest('hex').slice(0,10);
      const filename='legacy_header_'+key+'.js';
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section:'rewrite',
        line:plan.pattern + ' url ' + plan.qxAction + ' ' + ctx.rawBase + '/script/' + ctx.id + '/' + filename,
      };
    } catch (error) {
      return review(pattern, action, String(error?.message || error));
    }
  }

  const targetPattern=normalizeRegexBodyForTarget(pattern);
  const lines=[];
  for(let i=0;i<tokens.length;i+=width){
    const args=tokens.slice(i,i+width).map(unquote);
    if (parsed.op === 'replace-regex') args[1]=normalizeRegexBodyForTarget(args[1]);
    lines.push(`${direction} ${targetPattern} header-${parsed.op} ${args.join(' ')}`);
  }
  return {section:'header', lines};
}
function planBodyRegex(pattern, action, parsed, target) {
  const tokens=shellTokens(parsed.rest).map(unquote);
  if (!tokens.length || tokens.length % 2) return review(pattern, action, 'body regex rewrite requires regex/replacement pairs');
  const targetPattern=normalizeRegexBodyForTarget(pattern);
  for(let i=0;i<tokens.length;i+=2) tokens[i]=normalizeRegexBodyForTarget(tokens[i]);
  if (target === 'qx') {
    const verb=parsed.phase === 'request' ? 'request-body' : 'response-body';
    const lines=[];
    for(let i=0;i<tokens.length;i+=2) lines.push(`${targetPattern} url ${verb} ${tokens[i]} ${verb} ${tokens[i+1]}`);
    return {section:'rewrite', lines};
  }
  const direction=parsed.phase === 'request' ? 'http-request' : 'http-response';
  return {section:'body', line:`${direction} ${targetPattern} ${tokens.join(' ')}`};
}

function legacyValueNode(token) {
  const value=parseJsonValue(token);
  if(value === null) return {type:'null', value:null, raw:'null'};
  if(typeof value === 'boolean') return {type:'boolean', value, raw:String(value)};
  if(typeof value === 'number' && Number.isFinite(value)) return {type:'number', value, raw:String(value)};
  if(typeof value === 'string') return legacyStringNode(value);
  throw new Error('legacy JSON value object/array syntax is not yet proven equivalent');
}

function legacyJsonAddAst(pattern, parsed) {
  const tokens=shellTokens(parsed.rest);
  if (!tokens.length || tokens.length % 2) throw new Error('json-add requires path/value pairs');
  const actions=[];
  for(let i=0;i<tokens.length;i+=2){
    const path=unquote(tokens[i]);
    if(!jqPath(path)) throw new Error('unsupported JSON path syntax');
    actions.push({
      type:'action',
      name:parsed.phase + '.json.add',
      args:[legacyStringNode(path), legacyValueNode(tokens[i+1])],
    });
  }
  return {
    type:'rewrite',
    phase:parsed.phase,
    condition:{type:'comparison',operator:'~=',left:{type:'variable',name:'url'},right:legacyRegexNode(pattern),capture:null},
    actions,
  };
}

function planJson(pattern, action, parsed, target, ctx) {
  if(parsed.op === 'add'){
    try{
      const ast=legacyJsonAddAst(pattern, parsed);
      const plan=renderSingleJsonAddScript(ast, {
        target,
        stamp:ctx.stamp || '',
        category:ctx.category || 'Rewrite / Legacy JSON',
        sourceLine:pattern + ' ' + action,
      });
      const key=crypto.createHash('sha1').update('legacy-json-add\\0'+target+'\\0'+pattern+'\\0'+action).digest('hex').slice(0,10);
      const filename='legacy_json_add_'+target+'_'+key+'.js';
      ctx.generatedScripts.set(filename, plan.script);
      if(target === 'qx'){
        return {section:'rewrite', line:plan.pattern+' url '+plan.qxAction+' '+ctx.rawBase+'/script/'+ctx.id+'/'+filename};
      }
      return {section:'script', line:'wayx_legacy_json_add_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+ctx.rawBase+'/script/'+ctx.id+'/'+filename+',requires-body=true'};
    }catch(error){
      return review(pattern, action, String(error?.message || error));
    }
  }

  let compiled;
  try { compiled=compileJsonMutation(parsed.phase, parsed.op, parsed.rest); }
  catch (error) { return review(pattern, action, String(error?.message || error)); }
  if (!compiled.ok) return review(pattern, action, compiled.reason);
  const jq=compiled.preserve ? compiled.jq : minifyJq(compiled.jq);
  let quoted;
  try { quoted=quoteJq(jq); }
  catch (error) { return review(pattern, action, String(error?.message || error)); }
  const targetPattern=normalizeRegexBodyForTarget(pattern);
  if (target === 'qx') {
    const verb=parsed.phase === 'request' ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {section:'rewrite', line:`${targetPattern} url ${verb} ${quoted}`};
  }
  const verb=parsed.phase === 'request' ? 'http-request-jq' : 'http-response-jq';
  return {section:'body', line:`${verb} ${targetPattern} ${quoted}`};
}

function legacyMockAst(pattern, parsed) {
  const mock=parsed.mock;
  const args=[
    legacyStringNode(mock.type),
    legacyStringNode(mock.data),
  ];
  if(parsed.phase === 'response'){
    args.push({type:'number', value:mock.status, raw:String(mock.status)});
    if(mock.base64) args.push({type:'boolean', value:true, raw:'true'});
  }else if(mock.base64){
    args.push({type:'boolean', value:true, raw:'true'});
  }
  return {
    type:'rewrite',
    phase:parsed.phase,
    condition:{
      type:'comparison',
      operator:'~=',
      left:{type:'variable', name:'url'},
      right:legacyRegexNode(pattern),
      capture:null,
    },
    actions:[{type:'action', name:parsed.phase + '.body.mock', args}],
  };
}

function planMock(pattern, action, parsed, target, ctx) {
  const mock=parsed.mock;
  if (mock.dataPath) return review(pattern, action, 'legacy mock data-path requires source dependency materialization before a native/helper target can be proven');
  if (mock.data === null) return review(pattern, action, 'legacy body mock has no inline data');

  try {
    const ast=legacyMockAst(pattern, parsed);
    if(target === 'qx'){
      const plan=renderQxInlineMockScript(ast, {
        stamp:ctx.stamp || '',
        category:ctx.category || 'Rewrite / Legacy Mock',
        sourceLine:pattern + ' ' + action,
      });
      const key=crypto.createHash('sha1').update('legacy-mock\\0'+pattern+'\\0'+action).digest('hex').slice(0,10);
      const filename='legacy_mock_'+key+'.js';
      ctx.generatedScripts.set(filename, plan.script);
      return {section:'rewrite', line:plan.pattern + ' url ' + plan.qxAction + ' ' + ctx.rawBase + '/script/' + ctx.id + '/' + filename};
    }

    if(parsed.phase === 'response'){
      const direct=surgeInlineMockPlan(ast);
      if(direct.ok) return {section:direct.section, line:direct.line, lines:direct.lines};
      return review(pattern, action, direct.reason);
    }

    const plan=renderSurgeRequestMockScript(ast, {
      stamp:ctx.stamp || '',
      category:ctx.category || 'Rewrite / Legacy Mock',
      sourceLine:pattern + ' ' + action,
    });
    const key=crypto.createHash('sha1').update('legacy-request-mock\\0'+pattern+'\\0'+action).digest('hex').slice(0,10);
    const filename='legacy_request_mock_'+key+'.js';
    ctx.generatedScripts.set(filename, plan.script);
    return {
      section:'script',
      line:'wayx_legacy_request_mock_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+ctx.rawBase+'/script/'+ctx.id+'/'+filename+',requires-body=true'+(plan.binaryBodyMode?',binary-body-mode=true':''),
    };
  } catch (error) {
    return review(pattern, action, String(error?.message || error));
  }
}

export function planLegacyRewrite(pattern, action, target, ctx={}) {
  const targetPattern=normalizeRegexBodyForTarget(pattern);
  const parsed=classifyLegacyRewrite(action);
  if (parsed.kind === 'reject') {
    if (target === 'qx') return {section:'rewrite', line:`${targetPattern} url ${parsed.action}`};
    if (parsed.action === 'reject') return {section:'url', line:`${targetPattern} _ reject`};
    if (parsed.action === 'reject-img') return {section:'map', line:`${targetPattern} data-type=tiny-gif status-code=200`};
    if (parsed.action === 'reject-dict') return {section:'map', line:`${targetPattern} data-type=text data="{}" status-code=200 header="Content-Type:application/json"`};
    if (parsed.action === 'reject-array') return {section:'map', line:`${targetPattern} data-type=text data="[]" status-code=200 header="Content-Type:application/json"`};
    return {section:'map', line:`${targetPattern} data-type=text data="" status-code=200`};
  }
  if (parsed.kind === 'reject-video') return review(pattern, action, 'target mapping for Loon reject-video is not yet proven by official target documentation');
  if (parsed.kind === 'redirect') {
    return target === 'qx'
      ? {section:'rewrite', line:`${targetPattern} url ${parsed.status} ${parsed.target}`}
      : {section:'url', line:`${targetPattern} ${parsed.target} ${parsed.status}`};
  }
  if (parsed.kind === 'url-rewrite') {
    return target === 'surge'
      ? {section:'url', line:`${targetPattern} ${parsed.target} header`}
      : review(pattern, action, 'Quantumult X official sample has no verified transparent URL-rewrite equivalent for Loon legacy header action');
  }
  if (parsed.kind === 'header') return planHeader(pattern, action, parsed, target, ctx);
  if (parsed.kind === 'body-regex') return planBodyRegex(pattern, action, parsed, target);
  if (parsed.kind === 'json') return planJson(pattern, action, parsed, target, ctx);
  if (parsed.kind === 'mock') return planMock(pattern, action, parsed, target, ctx);
  return review(pattern, action, 'unsupported Loon legacy Rewrite action');
}
