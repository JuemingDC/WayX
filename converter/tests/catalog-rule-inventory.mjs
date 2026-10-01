// Catalog-observed Loon Rule semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Rule Semantics

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
  ruleTypes:new Set(),
  policies:new Set(),
  parameterNames:new Set(),
  logicalOperators:new Set(),
};

let declarationCount=0;

function collectNode(node,{file='unknown'}={}) {
  inventory.ruleTypes.add(node.type);

  if (!node.nested) {
    assert.ok(node.policyRaw, `${file}: top-level Rule missing policy: ${node.source}`);
    inventory.policies.add(node.policy);
  }

  for (const param of node.params) {
    if (param.name) inventory.parameterNames.add(param.name);
  }

  if (node.kind==='logical') inventory.logicalOperators.add(node.type);

  for (const child of node.children) collectNode(child,{file});
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
  ruleTypes:sorted(inventory.ruleTypes),
  policies:sorted(inventory.policies),
  parameterNames:sorted(inventory.parameterNames),
  logicalOperators:sorted(inventory.logicalOperators),
};

assert.deepEqual(
  actual,
  baseline,
  [
    'Catalog-observed Loon Rule semantic-token inventory changed.',
    'Do not update the baseline mechanically.',
    'This gate intentionally ignores top/nested placement, RuleType:parameter combinations,',
    'field counts, AND/OR child counts, logical placement and observed nesting depth.',
    'Only a genuinely new Rule type, top-level policy, parameter name or logical operator',
    'requires Loon semantics and target-capability review.',
  ].join(' ')
);

console.log(
  'Catalog Rule inventory passed: '+
  declarationCount+' declarations / '+
  actual.ruleTypes.length+' recursive rule types / '+
  actual.policies.length+' policies / '+
  actual.logicalOperators.length+' logical operators'
);
