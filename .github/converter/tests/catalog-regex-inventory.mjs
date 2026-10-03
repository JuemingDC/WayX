import { isRewriteV2, parseRewriteV2 } from '../src/rewrite.mjs';
import { isScriptV2, parseScriptV2 } from '../src/script.mjs';

// Catalog-observed Loon Rewrite regex feature inventory
// Author: chance
// Category: Converter / Validation / Regex Inventory

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));

function activeSectionLines(text,wanted){
  const out=[];
  let section=null;
  for(const raw of String(text).replace(/\r\n?/g,'\n').split('\n')){
    const line=raw.trim();
    const header=line.match(/^\[([^\]]+)\]$/);
    if(header){ section=header[1]; continue; }
    if(section!==wanted || !line || /^(?:#|;|\/\/)/.test(line)) continue;
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

  for(const line of activeSectionLines(source,'Rewrite')){
    if(isRewriteV2(line)){
      const ast=parseRewriteV2(line);
      for(const node of regexNodes(ast)) inspect(node.pattern,node.flags,entry.file+' [Rewrite v2]: '+line);
      continue;
    }
    const legacyPattern=line.split(/\s+/,1)[0];
    if(legacyPattern) inspect(legacyPattern,'',entry.file+' [Rewrite legacy]: '+line);
  }

  for(const line of activeSectionLines(source,'Script')){
    if(isScriptV2(line)){
      const ast=parseScriptV2(line);
      for(const node of regexNodes(ast)) inspect(node.pattern,node.flags,entry.file+' [Script v2]: '+line);
      continue;
    }
    const legacy=line.match(/^(?:http-request|http-response)\s+(\S+)/);
    if(legacy) inspect(legacy[1],'',entry.file+' [Script legacy]: '+line);
  }
}

const observedAdvanced=hits.map(hit=>({feature:hit.feature,pattern:hit.pattern,where:hit.where.replace(/: .*/, '')})).sort((a,b)=>
  (a.where+'\0'+a.feature+'\0'+a.pattern).localeCompare(b.where+'\0'+b.feature+'\0'+b.pattern)
);
// Reviewed 2026-10-03 baseline: seven source-authored special regex constructs.
const expectedAdvanced=[
  {
    feature:'atomic-group',
    pattern:'^https?:\\/\\/ddplus\\.meituan\\.net\\/v\\d\\/mss_\\w+\\/(?>ehc|titansx|ddblue|edfu)\\/',
    where:'DianPing.lpx [Rewrite legacy]',
  },
  {
    feature:'atomic-group',
    pattern:'^https?:\\/\\/img\\.meituan\\.net\\/(?>dpmobile|goodsawardpic)\\/',
    where:'DianPing.lpx [Script legacy]',
  },
  {
    feature:'atomic-group',
    pattern:'^https?:\\/\\/mapi\\.dianping\\.com\\/mapi\\/operating\\/(?>indexopsmodules|loadsplashconfig)',
    where:'DianPing.lpx [Rewrite legacy]',
  },
  {
    feature:'negative-lookahead',
    pattern:'^https?:\\/\\/p\\d\\.meituan\\.net\\/travelcube\\/(?!c129a661)\\w+\\.gif',
    where:'DianPing.lpx [Rewrite legacy]',
  },
  {
    feature:'negative-lookahead',
    pattern:'^https:\\/\\/hanime1\\.me\\/(?!(favicon|css|js|cdn-cgi|load))',
    where:'RuCu6/webpage.lpx [Script v2]',
  },
  {
    feature:'negative-lookahead',
    pattern:'^https:\\/\\/javdb\\.com\\/(?!over18\\?)',
    where:'RuCu6/webpage.lpx [Script v2]',
  },
  {
    feature:'negative-lookahead',
    pattern:'^https:\\/\\/missav\\.(?:ai|fans|ws)\\/(?!favicon)(?!(build|fonts|img|js|api|cdn-cgi)\\/).',
    where:'RuCu6/webpage.lpx [Script v2]',
  },
].sort((a,b)=>(a.where+'\0'+a.feature+'\0'+a.pattern).localeCompare(b.where+'\0'+b.feature+'\0'+b.pattern));

console.log('Catalog Loon Rewrite/Script regex inventory: '+regexCount+' regex fields');
console.log('Ordinary regex constructs: '+JSON.stringify(ordinary));
console.log('Advanced/special regex baseline: '+observedAdvanced.length);
for(const hit of observedAdvanced) console.log('- '+hit.feature+' :: '+hit.where+' :: '+hit.pattern);
assert.deepEqual(
  observedAdvanced,
  expectedAdvanced,
  'Catalog advanced/special regex baseline changed; review target regex compatibility before changing conversion behavior',
);
console.log('Catalog regex inventory passed: existing advanced constructs are locked to the reviewed raw-preservation baseline');
