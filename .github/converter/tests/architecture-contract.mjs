// WayX architecture contract: single authority + semantic compiler migration
// Author: chance
// Category: Converter / Architecture / Governance

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const spec=await fs.readFile(path.join(ROOT,'.github/CONVERSION_SPEC.md'),'utf8');

assert.match(spec,/版本：1\.59\b/,'Domain migration requires spec v1.59+');
for (const evidence of [
  'crossutility/Quantumult-X',
  'sample.conf',
  'rewrite.md',
  'sample-rewrite-request-header.js',
  'sample-rewrite-response-header.js',
  'sample-rewrite-with-script.js',
  'sample-echo-response.js',
  'manual.nssurge.com',
]) {
  assert.ok(spec.includes(evidence),'missing official capability evidence in CONVERSION_SPEC: '+evidence);
}

for (const invariant of [
  'Semantic IR',
  'native-equivalent',
  'guarded-helper',
  'phase-dispatcher',
  'false positive',
  'false negative',
  'new RegExp(source, flags)',
  '唯一规范源',
  'finite fixture',
  'false-positive / false-negative evidence',
]) {
  assert.ok(spec.includes(invariant),'missing semantic-compiler invariant in CONVERSION_SPEC: '+invariant);
}

assert.doesNotMatch(
  spec,
  /Regex flags[^\n]*无条件丢弃|target 输出无条件丢弃/,
  'v1.58 must not preserve the historical unconditional regex-flag drop rule',
);

for (const rel of [
  '.github/converter/src/core/regex.mjs',
  '.github/converter/src/core/condition-evaluator.mjs',
  '.github/converter/src/core/equivalence-plan.mjs',
  '.github/converter/tests/core-semantics.mjs',
  '.github/converter/src/rewrite.mjs',
  '.github/converter/src/script.mjs',
  '.github/converter/src/script-target.mjs',
  '.github/converter/src/configuration.mjs',
  '.github/converter/src/rule.mjs',
  '.github/converter/src/rule-ast.mjs',
  '.github/converter/tests/rule.mjs',
]) {
  const stat=await fs.stat(path.join(ROOT,rel));
  assert.ok(stat.isFile() && stat.size>0,'semantic core path missing: '+rel);
}

for (const rel of [
  '.github/docs/conversion-spec',
  '.github/PROJECT_STATUS.md',
  '.github/converter/README.md',
  '.github/converter/src/source-metadata.mjs',
  '.github/converter/src/rewrite-v2.mjs',
  '.github/converter/src/rewrite-ir.mjs',
  '.github/converter/src/rewrite-v2-actions.mjs',
  '.github/converter/src/rewrite-plan-result.mjs',
  '.github/converter/src/script-v2.mjs',
  '.github/converter/src/script-legacy.mjs',
  '.github/converter/src/script-ir.mjs',
  '.github/converter/src/script-qx.mjs',
  '.github/converter/src/script-surge.mjs',
  '.github/converter/src/script-v2-target.mjs',
  '.github/converter/src/mitm.mjs',
  '.github/converter/src/rule-qx.mjs',
  '.github/converter/src/rule-surge.mjs',
  '.github/converter/tests/rule-ast.mjs',
  '.github/converter/tests/catalog-rule-inventory.mjs',
  '.github/converter/tests/surge-rule-coverage.mjs',
]) {
  await assert.rejects(
    fs.stat(path.join(ROOT,rel)),
    {code:'ENOENT'},
    'duplicate/stale architecture authority must stay removed: '+rel,
  );
}

console.log('Semantic compiler architecture contract passed');
