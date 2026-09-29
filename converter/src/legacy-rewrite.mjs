// Generic Loon legacy Rewrite classifier and target planner
// Author: chance
// Category: Converter / Legacy Rewrite
import crypto from 'node:crypto';
import { minifyJq } from './jq.mjs';

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

function quoteJq(jq) {
  if (jq.includes("'")) throw new Error('jq expression contains a single quote and cannot be safely embedded');
  return `'${jq}'`;
}

function parseJsonValue(token) {
  const t = String(token).trim();
  try { return JSON.parse(t); } catch {}
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

function compileJsonMutation(phase, op, rest) {
  if (op === 'jq') return { ok:true, jq:unquote(String(rest).trim()) };
  const tokens = shellTokens(rest);
  if (op === 'add') return { ok:false, reason:'legacy json-add semantics are not compiled until add-vs-replace behavior is proven equivalent' };
  if (op === 'del') {
    if (!tokens.length) return { ok:false, reason:'missing JSON path' };
    const paths = tokens.map(unquote).map(jqPath);
    if (paths.some(x => !x)) return { ok:false, reason:'unsupported JSON path syntax' };
    return { ok:true, jq:`delpaths(${JSON.stringify(paths)})` };
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

function parseMock(rest) {
  const type = (rest.match(/\bdata-type=([^\s]+)/i) || [])[1] || 'text';
  const status = Number((rest.match(/\bstatus-code=(\d+)/i) || [])[1] || 200);
  const dataPath = (rest.match(/\bdata-path=([^\s]+)/i) || [])[1] || null;
  const base64 = /\bmock-data-is-base64=(?:true|1)\b/i.test(rest);
  let data = null;
  const dm = rest.match(/\bdata="((?:\\.|[^"])*)"/i);
  if (dm) data = dm[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  else {
    const du = rest.match(/\bdata=([^\s]+)/i);
    if (du) data = du[1];
  }
  return { type, status, data, dataPath, base64 };
}

function contentType(type) {
  if (type === 'json') return 'application/json';
  if (type === 'html') return 'text/html';
  if (type === 'javascript') return 'application/javascript';
  if (type === 'css') return 'text/css';
  if (['png','gif','jpeg','tiff','svg','mp4'].includes(type)) return null;
  return 'text/plain';
}

function mockScriptContent(mock) {
  const ct = contentType(mock.type) || 'application/octet-stream';
  return `// Generated from generic Loon mock-response-body by chance\n$done({status: "HTTP/1.1 ${mock.status} OK", headers: {"Content-Type": ${JSON.stringify(ct)}}, body: ${JSON.stringify(mock.data ?? '')}});\n`;
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

function planHeader(pattern, action, parsed, target) {
  const tokens=shellTokens(parsed.rest);
  const direction=parsed.phase === 'response' ? 'http-response' : 'http-request';
  const width=parsed.op === 'del' ? 1 : parsed.op === 'replace-regex' ? 3 : 2;
  if (!tokens.length || tokens.length % width) return review(pattern, action, 'invalid legacy header argument grouping');
  if (target === 'qx') {
    return review(pattern, action, 'Quantumult X official static rewrite sample does not provide a lossless field-oriented equivalent for this Loon header mutation');
  }
  const lines=[];
  for(let i=0;i<tokens.length;i+=width){
    const args=tokens.slice(i,i+width).map(unquote);
    lines.push(`${direction} ${pattern} header-${parsed.op} ${args.join(' ')}`);
  }
  return {section:'header', lines};
}

function planBodyRegex(pattern, action, parsed, target) {
  const tokens=shellTokens(parsed.rest).map(unquote);
  if (!tokens.length || tokens.length % 2) return review(pattern, action, 'body regex rewrite requires regex/replacement pairs');
  if (target === 'qx') {
    const verb=parsed.phase === 'request' ? 'request-body' : 'response-body';
    const lines=[];
    for(let i=0;i<tokens.length;i+=2) lines.push(`${pattern} url ${verb} ${tokens[i]} ${verb} ${tokens[i+1]}`);
    return {section:'rewrite', lines};
  }
  const direction=parsed.phase === 'request' ? 'http-request' : 'http-response';
  return {section:'body', line:`${direction} ${pattern} ${tokens.join(' ')}`};
}

function planJson(pattern, action, parsed, target) {
  let compiled;
  try { compiled=compileJsonMutation(parsed.phase, parsed.op, parsed.rest); }
  catch (error) { return review(pattern, action, String(error?.message || error)); }
  if (!compiled.ok) return review(pattern, action, compiled.reason);
  const jq=minifyJq(compiled.jq);
  let quoted;
  try { quoted=quoteJq(jq); }
  catch (error) { return review(pattern, action, String(error?.message || error)); }
  if (target === 'qx') {
    const verb=parsed.phase === 'request' ? 'jsonjq-request-body' : 'jsonjq-response-body';
    return {section:'rewrite', line:`${pattern} url ${verb} ${quoted}`};
  }
  const verb=parsed.phase === 'request' ? 'http-request-jq' : 'http-response-jq';
  return {section:'body', line:`${verb} ${pattern} ${quoted}`};
}

function planMock(pattern, action, parsed, target, ctx) {
  const mock=parsed.mock;
  if (mock.dataPath) return review(pattern, action, 'legacy mock data-path requires dependency materialization before conversion');
  if (mock.base64) return review(pattern, action, 'legacy Base64 mock requires binary-safe dependency handling');
  if (parsed.phase === 'request') return review(pattern, action, 'legacy request-body mock requires a dedicated request-body helper plan');
  if (mock.data === null) return review(pattern, action, 'legacy response mock has no inline data');
  if (target === 'surge') {
    const ct=contentType(mock.type);
    if (!ct) return review(pattern, action, 'binary response mock requires data-type/base64 or file materialization');
    return {
      section:'map',
      line:`${pattern} data-type=text data=${JSON.stringify(mock.data)} status-code=${mock.status} header=${JSON.stringify('Content-Type:'+ct)}`,
    };
  }
  if (mock.status === 200 && mock.type === 'json' && mock.data === '{}') return {section:'rewrite', line:`${pattern} url reject-dict`};
  if (mock.status === 200 && mock.type === 'json' && mock.data === '[]') return {section:'rewrite', line:`${pattern} url reject-array`};
  const key=crypto.createHash('sha1').update(pattern+action).digest('hex').slice(0,10);
  const filename=`mock_${key}.js`;
  ctx.generatedScripts.set(filename,mockScriptContent(mock));
  return {section:'rewrite', line:`${pattern} url script-echo-response ${ctx.rawBase}/script/${ctx.id}/${filename}`};
}

export function planLegacyRewrite(pattern, action, target, ctx={}) {
  const parsed=classifyLegacyRewrite(action);
  if (parsed.kind === 'reject') {
    if (target === 'qx') return {section:'rewrite', line:`${pattern} url ${parsed.action}`};
    if (parsed.action === 'reject') return {section:'url', line:`${pattern} _ reject`};
    if (parsed.action === 'reject-img') return {section:'map', line:`${pattern} data-type=tiny-gif status-code=200`};
    if (parsed.action === 'reject-dict') return {section:'map', line:`${pattern} data-type=text data="{}" status-code=200 header="Content-Type:application/json"`};
    if (parsed.action === 'reject-array') return {section:'map', line:`${pattern} data-type=text data="[]" status-code=200 header="Content-Type:application/json"`};
    return {section:'map', line:`${pattern} data-type=text data="" status-code=200`};
  }
  if (parsed.kind === 'reject-video') return review(pattern, action, 'target mapping for Loon reject-video is not yet proven by official target documentation');
  if (parsed.kind === 'redirect') {
    return target === 'qx'
      ? {section:'rewrite', line:`${pattern} url ${parsed.status} ${parsed.target}`}
      : {section:'url', line:`${pattern} ${parsed.target} ${parsed.status}`};
  }
  if (parsed.kind === 'url-rewrite') {
    return target === 'surge'
      ? {section:'url', line:`${pattern} ${parsed.target} header`}
      : review(pattern, action, 'Quantumult X official sample has no verified transparent URL-rewrite equivalent for Loon legacy header action');
  }
  if (parsed.kind === 'header') return planHeader(pattern, action, parsed, target);
  if (parsed.kind === 'body-regex') return planBodyRegex(pattern, action, parsed, target);
  if (parsed.kind === 'json') return planJson(pattern, action, parsed, target);
  if (parsed.kind === 'mock') return planMock(pattern, action, parsed, target, ctx);
  return review(pattern, action, 'unsupported Loon legacy Rewrite action');
}
