import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { compileRegexForTarget, minifyJq, parseRewriteV2 } from '../src/index.mjs';

const fixture = JSON.parse(await fs.readFile(new URL('../fixtures/myblockads-golden.json', import.meta.url), 'utf8'));
const root = new URL('../../../', import.meta.url);
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
const normalizeUrlPattern = value => String(value).replace(/\\\//g, '/');
assert.deepEqual(
  qxPairs.map(x => ({pattern:normalizeUrlPattern(x.pattern), jq:x.jq})),
  surgePairs.map(x => ({pattern:normalizeUrlPattern(x.pattern), jq:x.jq})),
  'QX and Surge JQ rule order/semantic content diverged',
);
assert.equal(qxPairs.length, fixture.jqRuleCount);
assert.equal(new Set(qxPairs.map(x => x.jq)).size, fixture.uniqueJqCount);
assert.equal(fnv1a64(JSON.stringify(qxPairs)), fixture.orderedPairsFnv1a64);
assert.equal(qxPairs.some(x => x.jq.includes('jq-path=')), false, 'Target JQ must not keep unresolved jq-path markers');

const sourceJq = source.split('\n').map(x => x.trim())
  .filter(line => /^(?:request|response)\s+if\b/.test(line) && /\.json\.jq\(/.test(line))
  .map(parseRewriteV2);
assert.equal(sourceJq.length, 3, 'Unexpected current MyBlockAds Rewrite v2 JQ count');

let discardedJq = 0;
for (const ast of sourceJq) {
  assert.equal(ast.condition.type, 'comparison');
  assert.equal(ast.condition.left.type, 'variable');
  assert.equal(ast.condition.left.name, 'url');
  assert.equal(ast.condition.right.type, 'regex');
  const compiled = compileRegexForTarget(ast.condition.right, {subject:'url'});
  assert.equal(compiled.ok, true, 'Source URL regex cannot be compiled for target: ' + ast.condition.right.pattern);

  const action = ast.actions[0];
  const jq = action.args[0]?.value;
  assert.equal(typeof jq, 'string');

  const target = qxPairs.find(x => x.pattern === compiled.pattern);
  if (/^jq-path=/i.test(jq)) {
    discardedJq += 1;
    assert.equal(target, undefined, 'Legacy jq-path action must be discarded instead of converted');
    assert.equal(qx.includes(jq), false, 'QX target must not preserve discarded jq-path text');
    assert.equal(surge.includes(jq), false, 'Surge target must not preserve discarded jq-path text');
    continue;
  }

  assert.ok(target, 'Inline source JQ must remain converted: ' + compiled.pattern);
  assert.equal(minifyJq(target.jq), minifyJq(jq), 'Inline source JQ changed semantics/text beyond whitespace normalization');
}
assert.equal(discardedJq, fixture.jqDiscardCount, 'Unexpected current MyBlockAds discarded jq-path count');

console.log('MyBlockAds JQ golden fixture passed');
