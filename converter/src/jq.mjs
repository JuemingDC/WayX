// WayX JQ handling
// Author: chance
// Category: Converter / JQ

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
  return `'${normalizeJqForSingleQuotedConfig(expr)}'`;
}
