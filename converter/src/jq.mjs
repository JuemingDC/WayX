// WayX JQ handling
// Author: chance
// Category: Converter / JQ
export function minifyJq(expr){const input=String(expr).trim();let out='',quote=null,esc=false,pending=false;const noSpaceBefore=new Set([')',']',',','|','=']),noSpaceAfter=new Set(['(','[',',','|','=']);for(const ch of input){if(quote){out+=ch;if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch===quote)quote=null;continue}if(ch==='"'||ch==="'"){if(pending&&out&&!noSpaceAfter.has(out.at(-1)))out+=' ';pending=false;quote=ch;out+=ch;continue}if(/\s/.test(ch)){pending=true;continue}if(pending){const prev=out.at(-1);if(prev&&!noSpaceAfter.has(prev)&&!noSpaceBefore.has(ch))out+=' ';pending=false}if(noSpaceBefore.has(ch)&&out.endsWith(' '))out=out.slice(0,-1);out+=ch}return out.trim()}
export function quoteJq(expr){const jq=String(expr);if(jq.includes("'"))throw new Error('JQ contains a single quote; reviewed escaping/helper is required');return `'${jq}'`;}
