// Catalog-observed Loon Rewrite regex feature inventory
// Author: chance
// Category: Converter / Validation / Regex Inventory

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isRewriteV2, parseRewriteV2 } from '../src/rewrite-v2.mjs';

const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));

function activeRewriteLines(text){
  const out=[];
  let section=null;
  for(const raw of String(text).replace(/\r\n?/g,'\n').split('\n')){
    const line=raw.trim();
    const header=line.match(/^\[([^\]]+)\]$/);
    if(header){ section=header[1]; continue; }
    if(section!=='Rewrite' || !line || /^(?:#|;|\/\/)/.test(line)) continue;
    out.push(line);
  }
  return out;
}

function regexNodes(node,out=[]){
  if(!node || typeof node!=='object') return out;
  if(node.type==='regex') out.push(node);
  if(Array.isArray(node)){ for(const item of node) regexNodes(item,out); return out; }
  for(const value of Object.values(node)) regexNodes(value,out);
  return out;
}

const advanced=[
  ['lookahead',/\(\?=/],
  ['negative-lookahead',/\(\?!/],
  ['lookbehind',/\(\?<=/],
  ['negative-lookbehind',/\(\?</],
  ['named-capture',/\(\?<[^=!]/],
  ['numeric-backreference',/\\[1-9]/],
  ['named-backreference',/\\k</],
  ['unicode-property',/\\[pP]\{/],
  ['inline-modifier',/\(\?[imsu-]+[:)]/],
  ['atomic-group',/\(\?>/],
  ['conditional-group',/\(\?\(/],
  ['branch-reset',/\(\?\|/],
  ['possessive-quantifier',/(?:[*+?]|\{\d+(?:,\d*)?\})\+/],
];

const hits=[];
const ordinary={captureGroup:0,noncapturingGroup:0,alternation:0,characterClass:0,escapedSlash:0,flags:0};
let regexCount=0;

function inspect(pattern,flags,where){
  regexCount++;
  const p=String(pattern||'');
  const f=String(flags||'');
  if(/(^|[^\\])\((?!\?)/.test(p)) ordinary.captureGroup++;
  if(p.includes('(?:')) ordinary.noncapturingGroup++;
  if(/(^|[^\\])\|/.test(p)) ordinary.alternation++;
  if(/(^|[^\\])\[/.test(p)) ordinary.characterClass++;
  if(p.includes('\\/')) ordinary.escapedSlash++;
  if(f) ordinary.flags++;
  for(const [name,re] of advanced){
    if(re.test(p)) hits.push({feature:name,pattern:p,flags:f,where});
  }
}

for(const entry of manifest){
  const source=await fs.readFile(path.join(ROOT,'Resource/Loon',entry.file),'utf8');
  for(const line of activeRewriteLines(source)){
    if(isRewriteV2(line)){
      const ast=parseRewriteV2(line);
      for(const node of regexNodes(ast)) inspect(node.pattern,node.flags,entry.file+': '+line);
      continue;
    }
    const legacyPattern=line.split(/\s+/,1)[0];
    if(legacyPattern) inspect(legacyPattern,'',entry.file+': '+line);
  }
}

console.log('Catalog Loon Rewrite regex inventory: '+regexCount+' regex fields');
console.log('Ordinary regex constructs: '+JSON.stringify(ordinary));
if(hits.length){
  console.log('Advanced/special regex constructs:');
  for(const hit of hits) console.log('- '+hit.feature+' :: '+hit.where);
}
assert.deepEqual(hits,[], 'Catalog contains advanced/special regex constructs; review raw-regex preservation assumptions before changing conversion behavior');
console.log('Catalog regex inventory passed: no advanced/special constructs observed');
