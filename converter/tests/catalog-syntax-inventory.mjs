// WayX Catalog-observed Loon v2 syntax inventory
// Author: chance
// Category: Converter / Validation / Observed Syntax

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

const ROOT = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '.github/sources/loon.json'), 'utf8'));
const expected = JSON.parse(await fs.readFile(path.join(ROOT, 'converter/fixtures/catalog-syntax-inventory.json'), 'utf8'));

function activeSectionLines(text, wanted) {
  const out = [];
  let section = null;
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      continue;
    }
    if (section !== wanted || !line || /^(?:#|;|\/\/)/.test(line)) continue;
    out.push(line);
  }
  return out;
}

function sorted(set) {
  return [...set].sort();
}

function valueShape(node) {
  if (!node) return 'none';
  if (node.type === 'array') {
    const kinds = sorted(new Set(node.items.map(valueShape)));
    return 'array<' + kinds.join('|') + '>';
  }
  if (node.type === 'plugin-object') return 'plugin-object';
  return node.type;
}

function normalizeConditionVariable(name) {
  const value = String(name || '');
  if (/^request\.header\[['"].+['"]\]$/.test(value)) return 'request.header[*]';
  if (/^response\.header\[['"].+['"]\]$/.test(value)) return 'response.header[*]';
  if (['url','request.method','response.status'].includes(value)) return value;
  return 'argument';
}

function collectCondition(node, bucket) {
  if (!node) return;
  if (node.type === 'group') {
    bucket.grouping.add('group');
    collectCondition(node.expression, bucket);
    return;
  }
  if (node.type === 'logical') {
    bucket.logicalOperators.add(node.operator);
    collectCondition(node.left, bucket);
    collectCondition(node.right, bucket);
    return;
  }
  if (node.type !== 'comparison') throw new Error('unknown condition node: ' + node.type);

  bucket.conditionComparisons.add(
    normalizeConditionVariable(node.left?.name) + ' ' + node.operator + ' ' + valueShape(node.right)
  );
  bucket.captureModes.add(node.capture ? 'capture' : 'none');
  if (node.right?.type === 'regex') bucket.regexFlags.add(node.right.flags || 'none');
}

function emptyConditionBucket() {
  return {
    conditionComparisons:new Set(),
    captureModes:new Set(),
    logicalOperators:new Set(),
    grouping:new Set(),
    regexFlags:new Set(),
  };
}

const observed = {
  rewriteV2: {
    phases:new Set(),
    ...emptyConditionBucket(),
    actionNames:new Set(),
    actionShapes:new Set(),
    multiActionSignatures:new Set(),
  },
  scriptV2: {
    phases:new Set(),
    ...emptyConditionBucket(),
    pathTypes:new Set(),
    argumentKinds:new Set(),
    optionNames:new Set(),
    optionShapes:new Set(),
    optionSets:new Set(),
  },
};

let rewriteCount = 0;
let scriptCount = 0;

for (const entry of manifest) {
  const file = path.join(ROOT, 'Resource/Loon', entry.file);
  const source = await fs.readFile(file, 'utf8');

  for (const line of activeSectionLines(source, 'Rewrite')) {
    const looksV2 = /^(?:request|response)\b/.test(line);
    if (!looksV2) continue;
    assert.ok(isRewriteV2(line), entry.file + ': request/response Rewrite line no longer matches the registered Rewrite v2 grammar:\n' + line);

    const ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    rewriteCount++;
    observed.rewriteV2.phases.add(ast.phase);
    collectCondition(ast.condition, observed.rewriteV2);

    const names = [];
    for (const action of ast.actions) {
      observed.rewriteV2.actionNames.add(action.name);
      observed.rewriteV2.actionShapes.add(
        action.name + '(' + action.args.map(valueShape).join(',') + ')'
      );
      names.push(action.name);
    }
    if (names.length > 1) observed.rewriteV2.multiActionSignatures.add(names.join(' | '));
  }

  for (const line of activeSectionLines(source, 'Script')) {
    const looksV2 = /^(?:request|response)\b/.test(line);
    if (!looksV2) continue;
    assert.ok(isScriptV2(line), entry.file + ': request/response Script line no longer matches the registered Script v2 grammar:\n' + line);

    const ast = parseScriptV2(line);
    scriptCount++;
    observed.scriptV2.phases.add(ast.phase);
    collectCondition(ast.condition, observed.scriptV2);
    observed.scriptV2.pathTypes.add(ast.script.pathNode.type);
    observed.scriptV2.argumentKinds.add(ast.script.argument?.type || 'none');

    const optionNames = [];
    for (const option of ast.options) {
      observed.scriptV2.optionNames.add(option.name);
      observed.scriptV2.optionShapes.add(option.name + ':' + valueShape(option.value));
      optionNames.push(option.name);
    }
    observed.scriptV2.optionSets.add(optionNames.sort().join('|'));
  }
}

function materialize(bucket) {
  return Object.fromEntries(Object.entries(bucket).map(([key, value]) => [
    key,
    value instanceof Set ? sorted(value) : value,
  ]));
}

const actual = {
  version: expected.version,
  scope: expected.scope,
  rewriteV2: materialize(observed.rewriteV2),
  scriptV2: materialize(observed.scriptV2),
};

assert.ok(rewriteCount > 0, 'expected Catalog Rewrite v2 syntax');
assert.ok(scriptCount > 0, 'expected Catalog Script v2 syntax');

assert.deepEqual(
  actual,
  expected,
  [
    'Catalog-observed Loon v2 syntax inventory changed.',
    'Do not update the baseline mechanically.',
    'First verify the new syntax against current Loon semantics and the QX/Surge official target contracts,',
    'then update CONVERSION_SPEC + generic parser/planner/tests before accepting the new fingerprint.',
    '',
    'Actual inventory:',
    JSON.stringify(actual, null, 2),
  ].join('\n')
);

console.log('Catalog syntax inventory passed: ' + rewriteCount + ' Rewrite v2 / ' + scriptCount + ' Script v2 declarations');
