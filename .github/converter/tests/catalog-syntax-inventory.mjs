// WayX Catalog-observed Loon v2 semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Semantics
// Baseline is evaluated against the refreshed full catalog in CI; do not run this inventory before source refresh.

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  isRewriteV2,
  parseRewriteV2,
} from '../src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../src/rewrite-v2-actions.mjs';
import {
  isScriptV2,
  parseScriptV2,
} from '../src/script-v2.mjs';

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

assert.deepEqual(
  actual,
  expected,
  [
    'Catalog-observed Loon v2 semantic-token inventory changed.',
    'Do not update the baseline mechanically.',
    'This gate intentionally ignores action argument shape/arity, multi-action signature, grouping,',
    'regex flag combinations, Script path/argument kinds, option value shapes, option order and option-set combinations.',
    'Those are source grammar or planner responsibilities, not observed-capability shapes.',
    'Only genuinely new phase / condition-variable class / condition operator / logical operator / action name / Script option name',
    'requires semantic review.',
    '',
    'Actual inventory:',
    JSON.stringify(actual,null,2),
  ].join('\n')
);

console.log('Catalog v2 semantic inventory passed: '+rewriteCount+' Rewrite / '+scriptCount+' Script declarations');
