// Catalog-observed Loon Rule syntax inventory
// Author: chance
// Category: Converter / Validation / Observed Rule Syntax

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseLoonRuleAst } from '../src/rule-ast.mjs';

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

function collectNode(node,{logicalDepth=0,file='unknown'}={}) {
  const nested=node.nested;
  (nested ? inventory.nestedTypes : inventory.topLevelTypes).add(node.type);
  (nested ? inventory.nestedFieldCounts : inventory.topLevelFieldCounts).add(node.fieldCount);

  if (!nested) {
    assert.ok(node.policyRaw, `${file}: top-level Rule missing policy: ${node.source}`);
    inventory.policies.add(node.policy);
  }

  for (const param of node.params) {
    if (!param.name) continue;
    inventory.parameterNames.add(param.name);
    inventory.parameterShapes.add(node.type+':'+param.name);
  }

  let nextLogicalDepth=logicalDepth;
  if (node.kind==='logical') {
    inventory.logicalOperators.add(node.type);
    inventory.logicalPlacements.add(node.type+':' + (nested?'nested':'top'));
    nextLogicalDepth=logicalDepth+1;
    inventory.maxLogicalDepth=Math.max(inventory.maxLogicalDepth,nextLogicalDepth);
  }

  for (const child of node.children) {
    collectNode(child,{logicalDepth:nextLogicalDepth,file});
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
    const parsed=parseLoonRuleAst(line);
    assert.ok(parsed.ok, `${entry.file}: Rule AST parse failed (${parsed.reason}): ${line}`);
    collectNode(parsed.ast,{file:entry.file});
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
