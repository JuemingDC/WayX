import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { minifyJq, parseRewriteV2 } from '../src/index.mjs';

const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/myblockads-golden.json', import.meta.url), 'utf8'));
const root = new URL('../../', import.meta.url);
const source = await fs.readFile(new URL(fixture.source, root), 'utf8');
const qx = await fs.readFile(new URL(fixture.quantumultX, root), 'utf8');
const surge = await fs.readFile(new URL(fixture.surge, root), 'utf8');

function extractQx(text) {
  return text.split('\n').map(x => x.trim()).filter(x => x.includes(' url jsonjq-response-body ')).map(line => {
    const match = line.match(/^(.*?) url jsonjq-response-body '(.*)'$/);
    assert.ok(match, 'Malformed QX JQ line: ' + line);
    return { pattern: match[1], jq: match[2] };
  });
}

function extractSurge(text) {
  return text.split('\n').map(x => x.trim()).filter(x => x.startsWith('http-response-jq ')).map(line => {
    const match = line.match(/^http-response-jq (.*?) '(.*)'$/);
    assert.ok(match, 'Malformed Surge JQ line: ' + line);
    return { pattern: match[1], jq: match[2] };
  });
}

function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, '0');
}

const qxPairs = extractQx(qx);
const surgePairs = extractSurge(surge);
assert.deepEqual(qxPairs, surgePairs, 'QX and Surge JQ rule order/content diverged');
assert.equal(qxPairs.length, fixture.jqRuleCount);
assert.equal(new Set(qxPairs.map(x => x.jq)).size, fixture.uniqueJqCount);
assert.equal(fnv1a64(JSON.stringify(qxPairs)), fixture.orderedPairsFnv1a64);
assert.equal(qxPairs.some(x => x.jq.includes('jq-path=')), false, 'Target JQ must not keep unresolved jq-path markers');

const sourceJq = source.split('\n').map(x => x.trim())
  .filter(line => /^(?:request|response)\s+if\b/.test(line) && /\.json\.jq\(/.test(line))
  .map(parseRewriteV2);
assert.equal(sourceJq.length, 3, 'Unexpected current MyBlockAds Rewrite v2 JQ count');

for (const ast of sourceJq) {
  assert.equal(ast.condition.type, 'comparison');
  assert.equal(ast.condition.left.type, 'variable');
  assert.equal(ast.condition.left.name, 'url');
  assert.equal(ast.condition.right.type, 'regex');
  const pattern = ast.condition.right.pattern;
  const target = qxPairs.find(x => x.pattern === pattern);
  assert.ok(target, 'No target JQ rule for source URL regex: ' + pattern);

  const action = ast.actions[0];
  const jq = action.args[0]?.value;
  assert.equal(typeof jq, 'string');
  if (!jq.startsWith('jq-path=')) {
    assert.equal(target.jq, minifyJq(jq), 'Inline source JQ changed semantics/text beyond whitespace minification');
  }
}

console.log('MyBlockAds JQ golden fixture passed');
