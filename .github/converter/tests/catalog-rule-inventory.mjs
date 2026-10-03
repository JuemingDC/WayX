// Catalog-observed Loon Rule semantic-token inventory
// Author: chance
// Category: Converter / Validation / Observed Rule Semantics

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseLoonRuleAst } from '../src/rule-ast.mjs';
import { classifyLegacyRewriteAction } from '../src/rewrite-ir.mjs';

const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(
  path.join(ROOT,'.github/sources/loon.json'),
  'utf8',
));
const baseline=JSON.parse(await fs.readFile(
  path.join(ROOT,'.github/converter/fixtures/catalog-rule-inventory.json'),
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

function splitPatternAction(line) {
  const idx=String(line).search(/\s/);
  if (idx<0) return [String(line).trim(),''];
  return [String(line).slice(0,idx).trim(),String(line).slice(idx).trim().replace(/^\-\s+/,'')];
}

function isKnownSourceNonRule(line) {
  const [pattern,action]=splitPatternAction(line);
  if (pattern && action && classifyLegacyRewriteAction(action).kind!=='unknown') return true;
  return !String(line).includes(',') && /^(?:\*\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i.test(String(line));
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
    if (isKnownSourceNonRule(line)) continue;
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

assert.equal(actual.version,baseline.version,'Rule inventory fixture version drifted');
assert.equal(actual.scope,baseline.scope,'Rule inventory fixture scope drifted');

function assertNoNewObserved(actualValues, baselineValues, label) {
  const expected=new Set(baselineValues || []);
  const added=(actualValues || []).filter(value=>!expected.has(value));
  assert.deepEqual(
    added,
    [],
    [
      'Catalog-observed Loon Rule inventory gained new '+label+'.',
      'Do not update the baseline mechanically.',
      'Disappearing historical tokens are allowed; only newly observed semantics require review.',
      'Actual inventory: '+JSON.stringify(actual),
    ].join(' ')
  );
}

assertNoNewObserved(actual.ruleTypes,baseline.ruleTypes,'Rule type');
assertNoNewObserved(actual.policies,baseline.policies,'top-level policy');
assertNoNewObserved(actual.parameterNames,baseline.parameterNames,'parameter name');
assertNoNewObserved(actual.logicalOperators,baseline.logicalOperators,'logical operator');

console.log(
  'Catalog Rule inventory passed: '+
  declarationCount+' declarations / '+
  actual.ruleTypes.length+' recursive rule types / '+
  actual.policies.length+' policies / '+
  actual.logicalOperators.length+' logical operators'
);
