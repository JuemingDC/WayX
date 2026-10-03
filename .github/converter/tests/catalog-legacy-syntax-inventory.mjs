// WayX Catalog-observed Loon Legacy Rewrite / Script semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Legacy Semantics

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isRewriteV2 } from '../src/rewrite-v2.mjs';
import {
  classifyLegacyRewriteAction,
  LOON_LEGACY_MOCK_OPTION_NAMES,
} from '../src/rewrite-ir.mjs';
import { isScriptV2 } from '../src/script-v2.mjs';
import {
  LOON_LEGACY_SCRIPT_OPTION_NAMES,
  parseLegacyScriptLine,
} from '../src/script-legacy.mjs';

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
