// WayX Loon Rule conversion core
// Author: chance
// Category: Converter / Rule
function splitTopLevelCsv(input){const out=[];let buf='',quote=null,esc=false,depth=0;for(const ch of input){if(quote){buf+=ch;if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote)quote=null;continue}if(ch==='"'||ch==="'"){quote=ch;buf+=ch;continue}if(ch==='('){depth++;buf+=ch;continue}if(ch===')'){depth=Math.max(0,depth-1);buf+=ch;continue}if(ch===','&&depth===0){out.push(buf.trim());buf='';continue}buf+=ch}out.push(buf.trim());return out}
function unquote(value){const s=String(value??'').trim();if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))return s.slice(1,-1);return s}
const QX_RULE_TYPES=new Map([['DOMAIN','host'],['DOMAIN-SUFFIX','host-suffix'],['DOMAIN-KEYWORD','host-keyword'],['DOMAIN-WILDCARD','host-wildcard'],['IP-CIDR','ip-cidr'],['IP-CIDR6','ip6-cidr'],['GEOIP','geoip'],['IP-ASN','ip-asn'],['USER-AGENT','user-agent']]);
export function qxRule(line){const source=String(line).trim();if(/^(AND|OR|NOT)\s*,/i.test(source))return{kind:'comment',line:`# Loon logical rule (Quantumult X unsupported): ${source}`,reason:'logical-rule'};const parts=splitTopLevelCsv(source),type=(parts[0]||'').toUpperCase(),value=unquote(parts[1]||''),policyRaw=(parts[2]||'').toUpperCase();if(type==='URL-REGEX'&&/^REJECT/.test(policyRaw))return{kind:'rewrite',line:`${value} url reject-200`,reason:'wayx-url-regex-reject'};const qxType=QX_RULE_TYPES.get(type);if(!qxType)return{kind:'comment',line:`# Loon rule (Quantumult X unsupported): ${source}`,reason:'unsupported-type'};let policy;if(policyRaw==='DIRECT')policy='direct';else if(/^REJECT/.test(policyRaw))policy='reject';else if(policyRaw==='PROXY')policy='proxy';else return{kind:'comment',line:`# Loon rule policy (Quantumult X unsupported): ${source}`,reason:'unsupported-policy'};return{kind:'filter',line:`${qxType}, ${value}, ${policy}`,reason:'native-filter'}}
export function surgeRule(line){
  const source=String(line).trim();
  const parts=splitTopLevelCsv(source);
  const policy=(parts[2]||'').toUpperCase();
  const internal=new Set(['DIRECT','REJECT','REJECT-DROP','REJECT-NO-DROP','REJECT-TINYGIF']);
  if(internal.has(policy))return source;
  return `# [WayX] Surge Module policy binding required: ${source}`;
}
export{splitTopLevelCsv};
