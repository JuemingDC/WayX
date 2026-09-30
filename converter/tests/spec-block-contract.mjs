import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const contracts=[
  ['00','docs/conversion-spec/00-authority.md',['converter/tests/genericity-audit.mjs','converter/tools/audit-repository.mjs']],
  ['05','docs/conversion-spec/05-generic-converter.md',['converter/src/source-catalog.mjs','converter/src/source-fetch.mjs','.github/scripts/sync-convert.mjs']],
  ['10','docs/conversion-spec/10-target-format.md',['converter/src/paths.mjs','converter/src/metadata.mjs','converter/src/surge-module.mjs']],
  ['20','docs/conversion-spec/20-rule-mapping.md',['converter/src/rule.mjs']],
  ['30','docs/conversion-spec/30-rewrite-mapping.md',['converter/src/legacy-rewrite.mjs','converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-semantic.mjs']],
  ['40','docs/conversion-spec/40-regex-condition.md',['converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-actions.mjs','converter/src/target-regex.mjs']],
  ['50','docs/conversion-spec/50-json-jq-mock.md',['converter/src/jq.mjs','converter/src/dependency.mjs','converter/src/qx-mock.mjs','converter/src/surge-mock.mjs']],
  ['60','docs/conversion-spec/60-script-argument.md',['converter/src/script.mjs','converter/src/script-compat.mjs','converter/src/script-v2.mjs','converter/src/script-v2-target.mjs','converter/src/argument.mjs']],
  ['70','docs/conversion-spec/70-mitm-comments.md',['converter/src/mitm.mjs','converter/src/metadata.mjs']],
  ['80','docs/conversion-spec/80-review-validation.md',['converter/src/surge-module.mjs','converter/tests/genericity-audit.mjs','converter/tests/generated-helper-refs.mjs','converter/tests/end-to-end-golden.mjs']],
  ['90','docs/conversion-spec/90-project-workflow.md',['.github/scripts/sync-convert.mjs','converter/tools/regenerate-canonical.mjs','.github/workflows/converter-check.yml','.github/workflows/upstream-monitor.yml']],
];

for(const [block,doc,impls] of contracts){
  const docText=await fs.readFile(path.join(ROOT,doc),'utf8');
  assert.match(docText,/自动(?:转换|化|执行)/, `Block ${block}: missing automatic implementation section`);
  for(const rel of impls){
    const stat=await fs.stat(path.join(ROOT,rel));
    assert.ok(stat.isFile() && stat.size>0, `Block ${block}: missing implementation ${rel}`);
  }
}

const upstreamWorkflow=await fs.readFile(path.join(ROOT,'.github/workflows/upstream-monitor.yml'),'utf8');
const converterWorkflow=await fs.readFile(path.join(ROOT,'.github/workflows/converter-check.yml'),'utf8');
const canonicalRunner=await fs.readFile(path.join(ROOT,'converter/tools/regenerate-canonical.mjs'),'utf8');
const sourceCatalog=await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8');
const syncConverter=await fs.readFile(path.join(ROOT,'.github/scripts/sync-convert.mjs'),'utf8');
assert.equal(/"mirrors"\s*:/.test(sourceCatalog), false, 'Block 90: Source Catalog must not contain mirrors');
assert.equal(/entry\.mirrors|fetchWithFallback|planScriptMirrorPaths/.test(syncConverter), false, 'Block 90: converter must not use source/script mirror fallback');
assert.match(syncConverter,/fetchOriginalText\(entry\.source\)/, 'Block 90: plugin fetch must use original descriptor source');
assert.equal(/sync_rucu6\.py|rucu6_sync/.test(upstreamWorkflow), false, 'Block 90: duplicate RuCu6 sync path must not return');
assert.match(upstreamWorkflow,/monitor\/review-queue\//, 'Block 90: Review without normal diff must still persist a Work-review PR marker');
assert.match(upstreamWorkflow,/steps\.script_scan\.outcome != 'success'/, 'Block 90: Source Script scan failures must enter Review');
assert.match(upstreamWorkflow,/REMOTE_MAIN/, 'Block 90: Safe Tier push must verify the main generation baseline');
assert.equal(/git pull --rebase origin main/.test(upstreamWorkflow), false, 'Block 90: generated Safe Tier output must not be rebased onto a newer main without regeneration');
assert.match(upstreamWorkflow,/node \.github\/scripts\/sync-convert\.mjs/, 'Block 90: scheduled workflow must call the unified converter');
assert.equal(/work\/catalog-unification|github\.head_ref\s*==/.test(converterWorkflow), false, 'Block 90: CI must not contain branch-specific canonical behavior');
assert.equal(/EXTRA_LOCAL_ENTRIES|RuCu6\/youtube\.lpx|RuCu6\/myblockads\.lpx/.test(canonicalRunner), false, 'Block 90: canonical runner must only traverse Source Catalog');
assert.equal(/DEPENDENCY_MANIFEST|localJqFiles|assertOfflineDependencies/.test(canonicalRunner), false, 'Block 50/90: canonical runner must not fall back to repository dependency caches');
assert.match(canonicalRunner,/materializeJqFiles\(entry, parsed\)/, 'Block 50: canonical runner must fetch JQ from original dependency URLs through the shared materializer');
assert.match(canonicalRunner,/materializeMockFiles\(entry, parsed\)/, 'Block 50: canonical runner must fetch mock_file from original dependency URLs through the shared materializer');
assert.match(canonicalRunner,/resolveOriginalUrl\(reference, pluginSourceUrl\)/, 'Block 60: relative Source Script refs must resolve against the original plugin URL');
assert.match(canonicalRunner,/fetchOriginalText\(originalUrl\)/, 'Block 60: canonical script compatibility must read the resolved original Source Script URL');

const index=await fs.readFile(path.join(ROOT,'docs/conversion-spec/95-implementation-index.md'),'utf8');
for(const [block] of contracts) assert.match(index,new RegExp('\\| '+block+' \\|'), `implementation index missing Block ${block}`);

console.log('Spec block implementation contract passed');
