// Catalog-observed Loon Rule syntax inventory
// Author: chance
// Category: Converter / Validation / Observed Rule Syntax

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { splitTopLevelCsv, splitLogicalSubrules } from '../src/rule.mjs';

const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(
  path.join(ROOT,'.github/sources/loon.json'),
  'utf8',
));
const baseline=JSON.parse(await fs.readFile(
  path.join(ROOT,'converter/fixtures/catalog-rule-inventory.json'),
  'utf8',
));

const inventory={
  topLevelTypes:new Set(),
  nestedTypes:new Set(),
  policies:new Set(),
  parameterNames:new Set(),
  parameterShapes:new Set(),
  logicalOperators:new Set(),
  logicalPlacements:new Set(),
  topLevelFieldCounts:new Set(),
  nestedFieldCounts:new Set(),
  maxLogicalDepth:0,
};

let declarationCount=0;

function parameterName(raw) {
  return String(raw||'').trim().split('=',1)[0].toLowerCase();
}

function parseRuleNode(source,{nested=false,logicalDepth=0,file='unknown'}={}) {
  const parts=splitTopLevelCsv(String(source).trim());
  const type=String(parts[0]||'').toUpperCase();
  assert.ok(type, `${file}: missing Rule type: ${source}`);

  (nested ? inventory.nestedTypes : inventory.topLevelTypes).add(type);
  (nested ? inventory.nestedFieldCounts : inventory.topLevelFieldCounts).add(parts.length);

  const logical=['AND','OR','NOT'].includes(type);
  if (logical) {
    inventory.logicalOperators.add(type);
    inventory.logicalPlacements.add(type+':' + (nested?'nested':'top'));
    const depth=logicalDepth+1;
    inventory.maxLogicalDepth=Math.max(inventory.maxLogicalDepth,depth);

    const children=splitLogicalSubrules(parts[1]);
    assert.ok(children?.length, `${file}: unparseable logical Rule children: ${source}`);

    if (!nested) {
      assert.ok(parts.length>=3 && parts[2], `${file}: top-level logical Rule missing policy: ${source}`);
      inventory.policies.add(String(parts[2]).trim().toUpperCase());
      for (const raw of parts.slice(3)) {
        const name=parameterName(raw);
        if (!name) continue;
        inventory.parameterNames.add(name);
        inventory.parameterShapes.add(type+':'+name);
      }
    }

    for (const child of children) {
      parseRuleNode(child,{nested:true,logicalDepth:depth,file});
    }
    return;
  }

  if (nested) return;

  assert.ok(parts.length>=3 && parts[2], `${file}: top-level Rule missing policy: ${source}`);
  inventory.policies.add(String(parts[2]).trim().toUpperCase());
  for (const raw of parts.slice(3)) {
    const name=parameterName(raw);
    if (!name) continue;
    inventory.parameterNames.add(name);
    inventory.parameterShapes.add(type+':'+name);
  }
}

function activeRuleLines(text) {
  const out=[];
  let section=null;
  for (const raw of String(text).replace(/\r\n?/g,'\n').split('\n')) {
    const line=raw.trim();
    const header=line.match(/^\[([^\]]+)\]$/);
    if (header) {
      section=header[1];
      continue;
    }
    if (section!=='Rule' || !line || /^(?:#|;|\/\/)/.test(line)) continue;
    out.push(line);
  }
  return out;
}

for (const entry of manifest) {
  const file=path.join(ROOT,'Resource/Loon',entry.file);
  const text=await fs.readFile(file,'utf8');
  for (const line of activeRuleLines(text)) {
    declarationCount++;
    parseRuleNode(line,{file:entry.file});
  }
}

const sorted=set=>[...set].sort();
const actual={
  version:baseline.version,
  scope:baseline.scope,
  topLevelTypes:sorted(inventory.topLevelTypes),
  nestedTypes:sorted(inventory.nestedTypes),
  policies:sorted(inventory.policies),
  parameterNames:sorted(inventory.parameterNames),
  parameterShapes:sorted(inventory.parameterShapes),
  logicalOperators:sorted(inventory.logicalOperators),
  logicalPlacements:sorted(inventory.logicalPlacements),
  topLevelFieldCounts:[...inventory.topLevelFieldCounts].sort((a,b)=>a-b),
  nestedFieldCounts:[...inventory.nestedFieldCounts].sort((a,b)=>a-b),
  maxLogicalDepth:inventory.maxLogicalDepth,
};

assert.deepEqual(
  actual,
  baseline,
  [
    'Catalog-observed Loon Rule syntax inventory changed.',
    'Do not update the baseline mechanically.',
    'First identify the new Rule type/policy/parameter/logical shape, then verify Loon semantics',
    'and the Quantumult X official sample / Surge official Manual before changing generic conversion.',
  ].join(' ')
);

console.log(
  'Catalog Rule inventory passed: '+
  declarationCount+' declarations / '+
  actual.topLevelTypes.length+' top-level types / '+
  actual.policies.length+' policies / max logical depth '+
  actual.maxLogicalDepth
);
