// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / catalog / Regression Suite

import { isRewriteV2, parseRewriteV2, validateRewriteV2Ast, classifyComplexRewrite, isScriptV2, parseScriptV2, classifyLegacyRewriteAction, LOON_LEGACY_MOCK_OPTION_NAMES, LOON_LEGACY_SCRIPT_OPTION_NAMES, parseLegacyScriptLine } from "../src/index.mjs";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["complex-source-inventory.mjs","catalog-syntax-inventory.mjs","catalog-regex-inventory.mjs","catalog-legacy-syntax-inventory.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "complex-source-inventory.mjs") {
// Suite case: complex-source-inventory.mjs
const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const found=[];

function activeRewriteLines(text){
  const out=[];
  let section=null;
  for(const raw of String(text).replace(/\r\n?/g,'\n').split('\n')){
    const trimmed=raw.trim();
    const header=trimmed.match(/^\[([^\]]+)\]$/);
    if(header){ section=header[1]; continue; }
    if(section!=='Rewrite' || !trimmed || /^(?:#|;|\/\/)/.test(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

for(const entry of manifest){
  const source=await fs.readFile(path.join(ROOT,'Resource/Loon',entry.file),'utf8');
  for(const line of activeRewriteLines(source)){
    if(!isRewriteV2(line)) continue;
    const ast=parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    if(ast.actions.length<2) continue;
    const classified=classifyComplexRewrite(ast);
    found.push({
      file:entry.file,
      actions:ast.actions.map(action=>action.name),
      families:classified.ok ? classified.families : [],
      rendererClassified:classified.ok,
      reason:classified.reason || null,
    });
  }
}

assert.ok(found.length>0,'expected at least one source-authored multi-action Rewrite pipeline');
console.log('Generic complex Rewrite source coverage:');
for(const item of found) console.log(
  '- '+item.file+': '+item.actions.join(' | ')+' ['+(item.rendererClassified ? item.families.join(',') : 'planner-review: '+item.reason)+']'
);
}

if (selectedCase === "catalog-syntax-inventory.mjs") {
// Suite case: catalog-syntax-inventory.mjs
// WayX Catalog-observed Loon v2 semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Semantics
// Baseline is evaluated against the refreshed full catalog in CI; do not run this inventory before source refresh.




const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const expected=JSON.parse(await fs.readFile(path.join(ROOT,'.github/converter/fixtures/catalog-syntax-inventory.json'),'utf8'));

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
function sorted(set){ return [...set].sort(); }
function normalizeConditionVariable(name){
  const value=String(name||'');
  if(/^request\.header\[['"].+['"]\]$/.test(value)) return 'request.header[*]';
  if(/^response\.header\[['"].+['"]\]$/.test(value)) return 'response.header[*]';
  if(['url','request.method','response.status'].includes(value)) return value;
  return 'argument';
}
function collectCondition(node,bucket){
  if(!node) return;
  if(node.type==='group'){ collectCondition(node.expression,bucket); return; }
  if(node.type==='logical'){
    bucket.logicalOperators.add(node.operator);
    collectCondition(node.left,bucket);
    collectCondition(node.right,bucket);
    return;
  }
  if(node.type!=='comparison') throw new Error('unknown condition node: '+node.type);
  bucket.conditionVariables.add(normalizeConditionVariable(node.left?.name));
  bucket.conditionOperators.add(node.operator);
}
function conditionBucket(){
  return {
    conditionVariables:new Set(),
    conditionOperators:new Set(),
    logicalOperators:new Set(),
  };
}

const observed={
  rewriteV2:{
    phases:new Set(),
    ...conditionBucket(),
    actionNames:new Set(),
  },
  scriptV2:{
    phases:new Set(),
    ...conditionBucket(),
    optionNames:new Set(),
  },
};
let rewriteCount=0, scriptCount=0;

for(const entry of manifest){
  const source=await fs.readFile(path.join(ROOT,'Resource/Loon',entry.file),'utf8');

  for(const line of activeSectionLines(source,'Rewrite')){
    const looksV2=/^(?:request|response)\b/.test(line);
    if(!looksV2) continue;
    assert.ok(isRewriteV2(line),entry.file+': request/response Rewrite line is outside Rewrite v2 grammar:\n'+line);
    const ast=parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    rewriteCount++;
    observed.rewriteV2.phases.add(ast.phase);
    collectCondition(ast.condition,observed.rewriteV2);
    for(const action of ast.actions) observed.rewriteV2.actionNames.add(action.name);
  }

  for(const line of activeSectionLines(source,'Script')){
    const looksV2=/^(?:request|response|cron|network-changed|generic)\b/.test(line);
    if(!looksV2) continue;
    assert.ok(isScriptV2(line),entry.file+': Script v2-looking line is outside Script v2 grammar:\n'+line);
    const ast=parseScriptV2(line);
    scriptCount++;
    observed.scriptV2.phases.add(ast.phase);
    collectCondition(ast.condition,observed.scriptV2);
    for(const option of ast.options) observed.scriptV2.optionNames.add(option.name);
  }
}

function materialize(bucket){
  return Object.fromEntries(Object.entries(bucket).map(([key,value])=>[
    key,
    value instanceof Set ? sorted(value) : value,
  ]));
}
const actual={
  version:expected.version,
  scope:expected.scope,
  rewriteV2:materialize(observed.rewriteV2),
  scriptV2:materialize(observed.scriptV2),
};

assert.ok(rewriteCount>0,'expected Catalog Rewrite v2 syntax');
assert.ok(scriptCount>0,'expected Catalog Script v2 syntax');

for(const family of ['rewriteV2','scriptV2'])for(const [key,values] of Object.entries(actual[family])) {
  assert.deepEqual(values.filter(value=>!expected[family][key].includes(value)),[],
    'New catalog semantic identifier requires review: '+family+'.'+key);
}
// Catalog scope can shrink without deleting the historical capability baseline.

console.log('Catalog v2 semantic inventory passed: '+rewriteCount+' Rewrite / '+scriptCount+' Script declarations');
}

if (selectedCase === "catalog-regex-inventory.mjs") {
// Suite case: catalog-regex-inventory.mjs
// Catalog-observed Loon Rewrite regex feature inventory
// Author: chance
// Category: Converter / Validation / Regex Inventory




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
  expectedAdvanced.filter(hit=>manifest.some(entry=>hit.where.startsWith(entry.file+' ['))),
  'Catalog advanced/special regex baseline changed; review target regex compatibility before changing conversion behavior',
);
console.log('Catalog regex inventory passed: existing advanced constructs are locked to the reviewed raw-preservation baseline');
}

if (selectedCase === "catalog-legacy-syntax-inventory.mjs") {
// Suite case: catalog-legacy-syntax-inventory.mjs
// WayX Catalog-observed Loon Legacy Rewrite / Script semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Legacy Semantics




const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const expected=JSON.parse(await fs.readFile(path.join(ROOT,'.github/converter/fixtures/catalog-legacy-syntax-inventory.json'),'utf8'));

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
function splitPatternAction(line){
  const idx=line.search(/\s/);
  if(idx<0) return [line.trim(),''];
  return [line.slice(0,idx).trim(),line.slice(idx).trim().replace(/^\-\s+/,'')];
}
function sorted(set){ return [...set].sort(); }

const observed={
  legacyRewrite:{
    actionKinds:new Set(),
    mockOptionNames:new Set(),
  },
  legacyScript:{
    phases:new Set(),
    optionNames:new Set(),
  },
};
let rewriteCount=0, scriptCount=0;

for(const entry of manifest){
  const source=await fs.readFile(path.join(ROOT,'Resource/Loon',entry.file),'utf8');

  for(const line of activeSectionLines(source,'Rewrite')){
    if(isRewriteV2(line)) continue;
    const [pattern,action]=splitPatternAction(line);
    assert.ok(pattern && action,entry.file+': malformed Legacy Rewrite declaration:\n'+line);
    const op=classifyLegacyRewriteAction(action);
    assert.notEqual(
      op.kind,
      'unknown',
      entry.file+': Legacy Rewrite declaration is outside the registered source grammar: '+(op.reason||'unknown action')+'\n'+line
    );
    rewriteCount++;
    observed.legacyRewrite.actionKinds.add(op.kind);
    for(const name of op.optionNames||[]){
      assert.ok(LOON_LEGACY_MOCK_OPTION_NAMES.has(name),entry.file+': unknown Legacy mock option '+name);
      observed.legacyRewrite.mockOptionNames.add(name);
    }
  }

  for(const line of activeSectionLines(source,'Script')){
    if(isScriptV2(line)) continue;
    const parsed=parseLegacyScriptLine(line);
    assert.ok(
      parsed,
      entry.file+': active non-v2 Script declaration is outside the registered Legacy HTTP Script grammar:\n'+line
    );
    scriptCount++;
    observed.legacyScript.phases.add(parsed.phase);
    for(const option of parsed.options){
      assert.ok(LOON_LEGACY_SCRIPT_OPTION_NAMES.has(option.name),entry.file+': unknown Legacy Script option '+option.name);
      observed.legacyScript.optionNames.add(option.name);
    }
  }
}

function materialize(bucket){
  return Object.fromEntries(Object.entries(bucket).map(([key,value])=>[
    key,
    value instanceof Set ? sorted(value) : value,
  ]));
}
const actual={
  version:expected.version,
  scope:expected.scope,
  legacyRewrite:materialize(observed.legacyRewrite),
  legacyScript:materialize(observed.legacyScript),
};

assert.ok(rewriteCount>0,'expected Catalog Legacy Rewrite syntax');
assert.ok(scriptCount>0,'expected Catalog Legacy Script syntax');

assert.equal(actual.version,expected.version,'Legacy semantic inventory fixture version drifted');
assert.equal(actual.scope,expected.scope,'Legacy semantic inventory fixture scope drifted');

function assertNoNewObserved(actualValues, expectedValues, label) {
  const baseline=new Set(expectedValues || []);
  const added=(actualValues || []).filter(value=>!baseline.has(value));
  assert.deepEqual(
    added,
    [],
    [
      'Catalog-observed Legacy semantic-token inventory gained new '+label+'.',
      'Do not update the baseline mechanically.',
      'Disappearing historical tokens are allowed; only newly observed semantics require review.',
      '',
      'Actual inventory:',
      JSON.stringify(actual,null,2),
    ].join('\n')
  );
}

assertNoNewObserved(actual.legacyRewrite.actionKinds,expected.legacyRewrite.actionKinds,'Rewrite category');
assertNoNewObserved(actual.legacyRewrite.mockOptionNames,expected.legacyRewrite.mockOptionNames,'mock option name');
assertNoNewObserved(actual.legacyScript.phases,expected.legacyScript.phases,'Script phase');
assertNoNewObserved(actual.legacyScript.optionNames,expected.legacyScript.optionNames,'Script option name');

console.log('Catalog Legacy semantic inventory passed: '+rewriteCount+' Rewrite / '+scriptCount+' Script declarations');
}
