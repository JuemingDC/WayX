// WayX Loon Rule conversion core
// Author: chance
// Category: Converter / Rule
function splitTopLevelCsv(input){const out=[];let buf='',quote=null,esc=false,depth=0;for(const ch of input){if(quote){buf+=ch;if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote)quote=null;continue}if(ch==='"'||ch==="'"){quote=ch;buf+=ch;continue}if(ch==='('){depth++;buf+=ch;continue}if(ch===')'){depth=Math.max(0,depth-1);buf+=ch;continue}if(ch===','&&depth===0){out.push(buf.trim());buf='';continue}buf+=ch}out.push(buf.trim());return out}
function unquote(value){const s=String(value??'').trim();if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))return s.slice(1,-1);return s}
const QX_RULE_TYPES=new Map([['DOMAIN','host'],['DOMAIN-SUFFIX','host-suffix'],['DOMAIN-KEYWORD','host-keyword'],['DOMAIN-WILDCARD','host-wildcard'],['IP-CIDR','ip-cidr'],['IP-CIDR6','ip6-cidr'],['GEOIP','geoip'],['IP-ASN','ip-asn'],['USER-AGENT','user-agent']]);
const QX_URL_REJECT_ACTIONS=new Map([
  ['REJECT','reject-200'],
  ['REJECT-200','reject-200'],
  ['REJECT-IMG','reject-img'],
  ['REJECT-DICT','reject-dict'],
  ['REJECT-ARRAY','reject-array'],
]);
export function qxRule(line){
  const source=String(line).trim();
  if(/^(AND|OR|NOT)\s*,/i.test(source))return{kind:'comment',line:`# Loon logical rule (Quantumult X unsupported): ${source}`,reason:'logical-rule'};
  const parts=splitTopLevelCsv(source),type=(parts[0]||'').toUpperCase(),value=unquote(parts[1]||''),policyRaw=(parts[2]||'').toUpperCase();
  if(type==='URL-REGEX'){
    const action=QX_URL_REJECT_ACTIONS.get(policyRaw);
    if(action)return{kind:'rewrite',line:`${value} url ${action}`,reason:'wayx-url-regex-reject'};
    if(policyRaw==='REJECT-DROP')return{kind:'comment',line:`# Loon URL-REGEX REJECT-DROP has no proven Quantumult X silent-drop equivalent: ${source}`,reason:'url-regex-reject-drop'};
  }
  const qxType=QX_RULE_TYPES.get(type);
  if(!qxType)return{kind:'comment',line:`# Loon rule (Quantumult X unsupported): ${source}`,reason:'unsupported-type'};
  let policy;
  if(policyRaw==='DIRECT')policy='direct';
  else if(policyRaw==='REJECT')policy='reject';
  else if(policyRaw==='PROXY')policy='proxy';
  else if(/^REJECT/.test(policyRaw))return{kind:'comment',line:`# Loon reject policy has no proven equivalent Quantumult X filter behavior: ${source}`,reason:'unsupported-reject-policy'};
  else return{kind:'comment',line:`# Loon rule policy (Quantumult X unsupported): ${source}`,reason:'unsupported-policy'};
  return{kind:'filter',line:`${qxType}, ${value}, ${policy}`,reason:'native-filter'}
}
export function surgeRule(line){
  const source=String(line).trim();
  const parts=splitTopLevelCsv(source);
  const policy=(parts[2]||'').toUpperCase();
  if(policy==='REJECT-IMG'){
    parts[2]='REJECT-TINYGIF';
    return parts.join(',');
  }
  const internal=new Set(['DIRECT','REJECT','REJECT-DROP','REJECT-NO-DROP','REJECT-TINYGIF']);
  if(internal.has(policy))return source;
  if(/^REJECT/.test(policy))return `# [WayX] Surge has no exact built-in equivalent for Loon policy: ${source}`;
  return `# [WayX] Surge Module policy binding required: ${source}`;
}
export{splitTopLevelCsv};
