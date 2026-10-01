// WayX Catalog-observed Loon Legacy Rewrite / Script syntax inventory
// Author: chance
// Category: Converter / Validation / Observed Legacy Syntax

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isRewriteV2 } from '../src/rewrite-v2.mjs';
import { classifyLegacyRewriteAction } from '../src/rewrite-ir.mjs';
import { isScriptV2 } from '../src/script-v2.mjs';
import { parseLegacyScriptLine } from '../src/script-legacy.mjs';

const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const expected=JSON.parse(await fs.readFile(path.join(ROOT,'converter/fixtures/catalog-legacy-syntax-inventory.json'),'utf8'));

function activeSectionLines(text,wanted){
  const out=[];
  let section=null;
  for(const raw of String(text).replace(/\r\n?/g,'\n').split('\n')){
    const line=raw.trim();
    const header=line.match(/^\[([^\]]+)\]$/);
    if(header){
      section=header[1];
      continue;
    }
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

function sorted(set){
  return [...set].sort();
}

function legacyRewriteShape(op){
  if(op.kind==='reject') return 'reject:'+op.variant;
  if(op.kind==='redirect') return 'redirect:'+op.status;
  if(op.kind==='url-rewrite') return 'url-rewrite';
  if(op.kind==='header') return 'header:'+op.phase+':'+op.operation;
  if(op.kind==='body-regex') return 'body-regex:'+op.phase+':'+op.operation;
  if(op.kind==='json') return 'json:'+op.phase+':'+op.operation;
  if(op.kind==='mock') return 'mock:'+op.phase+':'+op.operation;
  return op.kind;
}

function legacyMockOptionSet(action){
  if(!/^mock-(?:request|response)-body\b/i.test(action)) return null;
  const keys=[];
  for(const match of action.matchAll(/\b([A-Za-z][A-Za-z0-9-]*)=/g)) keys.push(match[1].toLowerCase());
  return [...new Set(keys)].sort().join('|');
}

function legacyOptionValueShape(value){
  const text=String(value ?? '').trim();
  if(/^\$\{[^}]+\}$/.test(text) || /^\{[^{}]+\}$/.test(text)) return 'variable';
  if(/^(?:true|false|1|0)$/i.test(text)) return 'boolean';
  if(/^-?\d+(?:\.\d+)?$/.test(text)) return 'number';
  if((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) return 'quoted-string';
  return 'raw-string';
}

const observed={
  legacyRewrite:{
    actionKinds:new Set(),
    actionShapes:new Set(),
    mockOptionSets:new Set(),
  },
  legacyScript:{
    phases:new Set(),
    optionNames:new Set(),
    optionShapes:new Set(),
    optionSets:new Set(),
  },
};

let rewriteCount=0;
let scriptCount=0;

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
      entry.file+': unregistered Legacy Rewrite action shape; review Loon source semantics before updating the baseline:\n'+line
    );
    rewriteCount++;
    observed.legacyRewrite.actionKinds.add(op.kind);
    observed.legacyRewrite.actionShapes.add(legacyRewriteShape(op));
    const mockOptions=legacyMockOptionSet(action);
    if(mockOptions!==null) observed.legacyRewrite.mockOptionSets.add(mockOptions);
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
    const names=[];
    for(const option of parsed.options){
      observed.legacyScript.optionNames.add(option.name);
      observed.legacyScript.optionShapes.add(option.name+':'+legacyOptionValueShape(option.value));
      names.push(option.name);
    }
    observed.legacyScript.optionSets.add(names.sort().join('|'));
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

assert.deepEqual(
  actual,
  expected,
  [
    'Catalog-observed Loon Legacy Rewrite / Script syntax inventory changed.',
    'Do not update the baseline mechanically.',
    'First verify the new syntax against current Loon source semantics.',
    'If target mapping changes, then verify Quantumult X official sample and Surge official Manual,',
    'update CONVERSION_SPEC + generic parser/planner/tests, and only then accept the new fingerprint.',
    '',
    'Observed counts: Legacy Rewrite='+rewriteCount+', Legacy Script='+scriptCount,
    '',
    'Actual inventory:',
    JSON.stringify(actual,null,2),
  ].join('\n')
);

console.log('Catalog Legacy syntax inventory passed: '+rewriteCount+' Rewrite / '+scriptCount+' Script declarations');
