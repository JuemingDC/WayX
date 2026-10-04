// WayX JQ syntax and lowering helpers
// Author: chance
// Category: Converter / JQ
//
// Policy:
// 1. jqlang is the syntax/semantic authority for JQ.
// 2. ONLY JSON replace intentionally follows ScriptHub's parent/getpath/has + setpath shape.
// 3. JSON add/delete and source-authored jq keep WayX's own lowering policy.
// 4. jq_file / jq-path content is fetched by input.mjs and inlined as JQ; this module never
//    turns those dependencies into JavaScript helpers or ScriptHub-style rewrites.

import { spawnSync } from "node:child_process";

export function parseJsonKeyPath(pathText) {
  const text=String(pathText ?? '');
  if (!text) throw new Error('JSON key path must not be empty');
  const parts=[];
  let i=0;

  const decodeSingleQuoted=value=>{
    let out='';
    for(let j=1;j<value.length-1;j++){
      const ch=value[j];
      if(ch!=='\\'){ out+=ch; continue; }
      if(j+1>=value.length-1){ out+='\\'; continue; }
      const next=value[++j];
      if(next==="'" || next==='\\') out+=next;
      else if(next==='n') out+='\n';
      else if(next==='r') out+='\r';
      else if(next==='t') out+='\t';
      else out+='\\'+next;
    }
    return out;
  };

  while(i<text.length){
    if(text[i]==='.') { i++; continue; }
    if(text[i]==='['){
      const rest=text.slice(i);
      const numeric=rest.match(/^\[(\d+)\]/);
      if(numeric){
        parts.push(Number(numeric[1]));
        i+=numeric[0].length;
        continue;
      }
      const quoted=rest.match(/^\[((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\]/);
      if(!quoted) throw new Error('unsupported JSON key-path bracket syntax: '+text);
      let value;
      if(quoted[1].startsWith('"')){
        try { value=JSON.parse(quoted[1]); }
        catch { throw new Error('invalid quoted JSON key-path segment: '+text); }
      }else{
        value=decodeSingleQuoted(quoted[1]);
      }
      parts.push(value);
      i+=quoted[0].length;
      continue;
    }
    const bare=text.slice(i).match(/^[^.[\]]+/);
    if(!bare) throw new Error('invalid JSON key path: '+text);
    parts.push(bare[0]);
    i+=bare[0].length;
  }
  if(!parts.length) throw new Error('JSON key path must not be empty');
  return parts;
}

function validateParts(parts) {
  if (!Array.isArray(parts) || !parts.length || parts.some(part=>typeof part!=='string' && !Number.isInteger(part))) {
    throw new Error('JQ path must be a non-empty array of string/integer segments');
  }
  return parts;
}

export function jqPathSelector(parts) {
  validateParts(parts);
  let out='';
  for (const part of parts) {
    if (typeof part === 'number') out += '[' + part + ']';
    else if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(part)) out += '.' + part;
    else out += '[' + JSON.stringify(part) + ']';
  }
  return out || '.';
}

// WayX delete policy: use jq's native del(path_expression). Multiple fixed object
// paths are combined into one del(...). Array-index deletes stay sequential,
// because earlier deletions shift subsequent indexes.
export function renderFixedPathDeleteJq(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    throw new Error('delete path list must not be empty');
  }
  const normalized=paths.map(item=>{
    const parts=validateParts(Array.isArray(item)?item:item?.parts);
    const selector=typeof item?.selector==='string' && item.selector ? item.selector : jqPathSelector(parts);
    return {parts,selector};
  });
  if (normalized.length === 1) return 'del(' + normalized[0].selector + ')';
  if (normalized.some(item => item.parts.some(part => typeof part === 'number'))) {
    return normalized.map(item => 'del(' + item.selector + ')').join(' | ');
  }
  return 'del(' + normalized.map(item => item.selector).join(', ') + ')';
}

// WayX add policy: add only when the addressed value is null/missing. This is
// deliberately not copied from ScriptHub.
export function renderFixedPathAddJq(parts,value) {
  validateParts(parts);
  const path=JSON.stringify(parts);
  return 'if getpath(' + path + ') == null then setpath(' + path + '; ' + value + ') else . end';
}

// ScriptHub is referenced ONLY here. Its json-replace lowering checks the
// parent with getpath(... ) | has(last), then setpath(...) only when that key
// exists. Other WayX JQ renderers must not inherit ScriptHub formatting.
export function renderFixedPathReplaceJq(parts,value) {
  validateParts(parts);
  const parent=JSON.stringify(parts.slice(0,-1));
  const last=JSON.stringify(parts.at(-1));
  const path=JSON.stringify(parts);
  return 'if (getpath(' + parent + ') | has(' + last + ')) then (setpath(' + path + '; ' + value + ')) else . end';
}

export function renderFixedJsonMutationJq(operation, entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error(operation + ' entries must not be empty');
  if (operation === 'delete') return renderFixedPathDeleteJq(entries);
  if (operation === 'add') return entries.map(entry=>renderFixedPathAddJq(entry.parts,entry.value)).join(' | ');
  if (operation === 'replace') return entries.map(entry=>renderFixedPathReplaceJq(entry.parts,entry.value)).join(' | ');
  throw new Error('unsupported fixed JSON mutation: '+operation);
}

export function stripJqComments(expr) {
  const input = String(expr);
  let out = '', quote = null, esc = false, comment = false;
  for (const ch of input) {
    if (comment) {
      if (ch === '\n' || ch === '\r') {
        comment = false;
        out += ' ';
      }
      continue;
    }
    if (quote) {
      out += ch;
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '#') {
      comment = true;
      continue;
    }
    out += ch;
  }
  return out;
}

export function minifyJq(expr){
  const input=String(expr).trim();
  let out='',quote=null,esc=false,pending=false;
  const noSpaceBefore=new Set([')',']',',','|','=']),noSpaceAfter=new Set(['(','[',',','|','=']);
  for(const ch of input){
    if(quote){
      out+=ch;
      if(esc){esc=false;continue}
      if(ch==='\\'){esc=true;continue}
      if(ch===quote)quote=null;
      continue
    }
    if(ch==='"'||ch==="'"){
      if(pending&&out&&!noSpaceAfter.has(out.at(-1)))out+=' ';
      pending=false;quote=ch;out+=ch;continue
    }
    if(/\s/.test(ch)){pending=true;continue}
    if(pending){
      const prev=out.at(-1);
      if(prev&&!noSpaceAfter.has(prev)&&!noSpaceBefore.has(ch))out+=' ';
      pending=false
    }
    if(noSpaceBefore.has(ch)&&out.endsWith(' '))out=out.slice(0,-1);
    out+=ch
  }
  return out.trim()
}

export function minifyJqFile(expr) {
  return minifyJq(stripJqComments(expr));
}

export function normalizeJqForSingleQuotedConfig(expr){
  const jq=String(expr);
  let out='', inString=false, esc=false;
  for(const ch of jq){
    if(inString){
      if(esc){ out+=ch; esc=false; continue; }
      if(ch==='\\'){ out+=ch; esc=true; continue; }
      if(ch==='"'){ out+=ch; inString=false; continue; }
      if(ch==="'"){ out+='\\u0027'; continue; }
      out+=ch;
      continue;
    }
    if(ch==='"'){ inString=true; out+=ch; continue; }
    if(ch==="'"){
      throw new Error('JQ contains a single quote outside a JSON string; target quoting is not proven safe');
    }
    out+=ch;
  }
  if(inString || esc) throw new Error('JQ contains an unterminated JSON string');
  return out;
}

export function quoteJq(expr){
  return "'" + normalizeJqForSingleQuotedConfig(expr) + "'";
}

// 上游错误：jq keyword whitespace lost after an identity selector.
// Failed case: KuGou / Issue #162 / `else .end;` -> `else . end;`.
// Valid field `.end` and quoted/comment text are never rewritten. Empty stdin
// compiles the program without evaluating the author's filter on any JSON.
const upstreamJqRepairCache=new Map();
export function repairUpstreamJq(expr) {
  const original=String(expr);
  if(upstreamJqRepairCache.has(original))return upstreamJqRepairCache.get(original);
  let masked='',quoted=false,escaped=false,comment=false;
  for(let i=0;i<original.length;i++) {
    const ch=original[i];
    if(comment){masked+=ch==='\n'?'\n':' ';if(ch==='\n')comment=false;continue;}
    if(quoted){masked+=' ';if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue;}
    if(ch==='"'){quoted=true;masked+=' ';continue;}
    if(ch==='#'){comment=true;masked+=' ';continue;}
    masked+=ch;
  }
  const matches=[...masked.matchAll(/\belse\s*\.end\b(?=\s*(?:[;|)\],}]|$))/g)];
  let result={jq:original,changed:false};
  if(matches.length) {
    const compile=program=>{
      const checked=spawnSync('jq',[program],{input:'',encoding:'utf8',timeout:5000,maxBuffer:1024*1024});
      if(checked.error || checked.signal || ![0,3].includes(checked.status))throw new Error('jq compiler unavailable or failed: '+String(checked.error?.message||checked.stderr||checked.signal));
      return checked;
    };
    const before=compile(original);
    if(before.status===3 && /syntax error|unterminated/i.test(before.stderr)) {
      let candidate=original;
      for(const match of matches.reverse()) {
        const offset=match.index+match[0].lastIndexOf('.end')+1;
        candidate=candidate.slice(0,offset)+' '+candidate.slice(offset);
      }
      const after=compile(candidate);
      if(after.status===0)result={jq:candidate,changed:true,kind:'jq-identity-end-whitespace',original,diagnostic:before.stderr.split('\n').find(line=>line.startsWith('jq: error:'))||'jq compile error'};
    }
  }
  if(upstreamJqRepairCache.size>=512)upstreamJqRepairCache.clear();
  upstreamJqRepairCache.set(original,result);return result;
}
