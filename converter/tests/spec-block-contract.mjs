import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const contracts=[
  ['00','docs/conversion-spec/00-authority.md',['converter/tests/genericity-audit.mjs','converter/tools/audit-repository.mjs']],
  ['05','docs/conversion-spec/05-generic-converter.md',['converter/src/source-catalog.mjs','converter/src/source-fetch.mjs','.github/scripts/sync-convert.mjs','.github/manual-assets.json','converter/tests/manual-assets.mjs']],
  ['10','docs/conversion-spec/10-target-format.md',['converter/src/paths.mjs','converter/src/metadata.mjs','converter/src/surge-module.mjs','converter/src/qx-official-capabilities.mjs','converter/src/surge-official-capabilities.mjs']],
  ['20','docs/conversion-spec/20-rule-mapping.md',['converter/src/rule-ast.mjs','converter/src/rule-qx.mjs','converter/src/rule-surge.mjs','converter/src/rule.mjs','converter/tests/rule-ast.mjs','converter/tests/catalog-rule-inventory.mjs','converter/fixtures/catalog-rule-inventory.json']],
  ['30','docs/conversion-spec/30-rewrite-mapping.md',['converter/src/rewrite-ir.mjs','converter/src/legacy-rewrite.mjs','converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-semantic.mjs','converter/src/complex-rewrite-types.mjs','converter/src/complex-rewrite-registry.mjs','converter/tests/rewrite-ir.mjs','converter/tests/complex-source-inventory.mjs']],
  ['40','docs/conversion-spec/40-regex-condition.md',['converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-actions.mjs','converter/src/target-regex.mjs']],
  ['50','docs/conversion-spec/50-json-jq-mock.md',['converter/src/jq.mjs','converter/src/dependency.mjs','converter/src/qx-mock.mjs','converter/src/surge-mock.mjs']],
  ['60','docs/conversion-spec/60-script-argument.md',['converter/src/script.mjs','converter/src/script-v2.mjs','converter/src/script-v2-target.mjs','converter/src/argument.mjs']],
  ['70','docs/conversion-spec/70-mitm-comments.md',['converter/src/mitm.mjs','converter/src/metadata.mjs']],
  ['80','docs/conversion-spec/80-review-validation.md',['converter/src/surge-module.mjs','converter/src/unknown-issue.mjs','converter/src/qx-official-capabilities.mjs','converter/src/surge-official-capabilities.mjs','converter/tools/conversion-reports.mjs','converter/tests/unknown-issue-markers.mjs','converter/tests/qx-official-capabilities.mjs','converter/tests/surge-official-capabilities.mjs','converter/tests/genericity-audit.mjs','converter/tests/generated-helper-refs.mjs','converter/tests/end-to-end-golden.mjs']],
  ['90','docs/conversion-spec/90-project-workflow.md',['.github/scripts/sync-convert.mjs','.github/scripts/propose-conversion-issues.mjs','converter/tools/regenerate-canonical.mjs','.github/workflows/converter-check.yml','.github/workflows/upstream-monitor.yml']],
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
const targetRegex=await fs.readFile(path.join(ROOT,'converter/src/target-regex.mjs'),'utf8');
assert.equal(/"mirrors"\s*:/.test(sourceCatalog), false, 'Block 90: Source Catalog must not contain mirrors');
assert.equal(/entry\.mirrors|fetchWithFallback|planScriptMirrorPaths/.test(syncConverter), false, 'Block 90: converter must not use source/script mirror fallback');
assert.match(syncConverter,/fetchOriginalText\(entry\.source\)/, 'Block 90: plugin fetch must use original descriptor source');
assert.equal(/sync_rucu6\.py|rucu6_sync/.test(upstreamWorkflow), false, 'Block 90: duplicate RuCu6 sync path must not return');
assert.match(upstreamWorkflow,/monitor\/review-queue\//, 'Block 90: Review without normal diff must still persist a Work-review PR marker');
assert.equal(/script_scan|scan-script-compat/.test(upstreamWorkflow), false, 'Block 60/90: Source Script compatibility scan must not remain in automation');
assert.match(upstreamWorkflow,/REMOTE_MAIN/, 'Block 90: Safe Tier push must verify the main generation baseline');
assert.equal(/git pull --rebase origin main/.test(upstreamWorkflow), false, 'Block 90: generated Safe Tier output must not be rebased onto a newer main without regeneration');
assert.match(upstreamWorkflow,/node \.github\/scripts\/sync-convert\.mjs/, 'Block 90: scheduled workflow must call the unified converter');
assert.equal(/work\/catalog-unification|github\.head_ref\s*==/.test(converterWorkflow), false, 'Block 90: CI must not contain branch-specific canonical behavior');
assert.equal(/EXTRA_LOCAL_ENTRIES|RuCu6\/youtube\.lpx|RuCu6\/myblockads\.lpx/.test(canonicalRunner), false, 'Block 90: canonical runner must only traverse Source Catalog');
assert.equal(/DEPENDENCY_MANIFEST|localJqFiles|assertOfflineDependencies/.test(canonicalRunner), false, 'Block 50/90: canonical runner must not fall back to repository dependency caches');
assert.match(canonicalRunner,/materializeJqFiles\(entry, parsed\)/, 'Block 50: canonical runner must fetch JQ from original dependency URLs through the shared materializer');
assert.match(canonicalRunner,/materializeMockFiles\(entry, parsed\)/, 'Block 50: canonical runner must fetch mock_file from original dependency URLs through the shared materializer');
assert.match(canonicalRunner,/inspectSourceScript\(reference, pluginSourceUrl\)/, 'Block 60: canonical runner must delegate optional Source Script action-type inspection to the shared inspector');
assert.match(syncConverter,/resolveOriginalUrl\(reference, pluginSourceUrl\)/, 'Block 60: shared Source Script inspector must resolve relative refs against the original plugin URL');
assert.match(syncConverter,/fetchOriginalText\(originalUrl\)/, 'Block 60: optional QX action-type inspection must read only the resolved original Source Script URL when available');
assert.match(targetRegex,/return String\(pattern \?\? ''\);/, 'Block 40: target regex normalization must preserve the regex body');
assert.equal(/replace\([^\n]*\\\\\\\//.test(targetRegex), false, 'Block 40: target regex compiler must not globally rewrite escaped slashes');
assert.match(targetRegex,/sourceFlags:\s*flags/, 'Block 40: discarded source flags must remain observable metadata without being propagated');
assert.match(syncConverter,/planComplexRewrite\(/, 'Block 30: unified converter must keep the complex helper planner in the target fallback chain');
assert.equal(/planAdjacentQxHeaderGroups/.test(syncConverter), false, 'Block 30: independent source Rewrite declarations must never be merged into synthetic pipelines');
const rewriteIr=await fs.readFile(path.join(ROOT,'converter/src/rewrite-ir.mjs'),'utf8');
const legacyRewrite=await fs.readFile(path.join(ROOT,'converter/src/legacy-rewrite.mjs'),'utf8');
assert.equal(/qx-official-capabilities|surge-official-capabilities/.test(rewriteIr), false, 'Block 30: Rewrite Semantic IR must stay target-neutral');
assert.match(legacyRewrite,/legacyRewriteToSemanticIr\(pattern, action\)/, 'Block 30: Legacy Rewrite planner must route through Semantic IR');
assert.match(syncConverter,/rewriteV2AstToSemanticIr\(ast, \{source:line\}\)/, 'Block 30: Rewrite v2 orchestration must build Semantic IR after source normalization');
assert.match(syncConverter,/singleRewriteOperation\(ir\)/, 'Block 30: Rewrite v2 routing must consume normalized Semantic IR operations');
assert.equal(/ast\.actions\[0\]\.name === 'response\.header\.add'/.test(syncConverter), false, 'Block 30: orchestration must not restore raw action-name routing for response.header.add');
assert.equal(/ast\.actions\[0\]\.name === 'redirect'/.test(syncConverter), false, 'Block 30: orchestration must not restore raw action-name routing for redirect');
assert.equal(/action => action\.name === 'response\.body\.mock_file'/.test(syncConverter), false, 'Block 30: orchestration must not restore raw action-name routing for mock_file');
assert.match(converterWorkflow,/rewrite-ir\.mjs/, 'Block 30/80: Converter Check must execute Rewrite Semantic IR contract');
const complexTypes=await fs.readFile(path.join(ROOT,'converter/src/complex-rewrite-types.mjs'),'utf8');
assert.match(complexTypes,/response\.body\.mock.*response\.header\.set/s, 'Block 30: observed Bilibili-source complex signature must be registered generically');
assert.match(upstreamWorkflow,/propose-conversion-issues\.mjs/, 'Block 80/90: unknown markers must be proposed as GitHub issues');
assert.match(upstreamWorkflow,/conversion-reports\.mjs/, 'Block 80/90: scheduled flow must generate reconciliation and Review inventory reports');
assert.match(converterWorkflow,/conversion-reports\.mjs/, 'Block 80: Converter Check must generate reconciliation and Review inventory reports');
assert.match(upstreamWorkflow,/steps\.reports\.outcome/, 'Block 90: failed reconciliation report must block Safe Tier');
const manualAssets=JSON.parse(await fs.readFile(path.join(ROOT,'.github/manual-assets.json'),'utf8'));
assert.ok(manualAssets.assets.some(asset=>asset.id==='QZXY' && asset.mode==='manual'), 'Block 05: QZXY must stay explicitly hand-maintained');
assert.match(upstreamWorkflow,/steps\.issues\.outputs\.has_unknown/, 'Block 90: unknown issue markers must block Safe Tier direct commit');
assert.match(syncConverter,/QX_WAYX_FILTER_TYPES/, 'Block 80: QX validator must consume the explicit official-backed active filter whitelist');
assert.match(syncConverter,/QX_WAYX_SCRIPT_ACTIONS/, 'Block 80: QX validator must consume the explicit official-backed Script action whitelist');
assert.match(syncConverter,/QX_WAYX_SNIPPET_MITM_KEYS/, 'Block 80: QX validator must consume the official-backed snippet MITM whitelist');
assert.match(syncConverter,/supportedSourceSections/, 'Block 80: source orchestration must explicitly account for unsupported active sections');
assert.match(syncConverter,/ISSUE REQUIRED \[unknown-source-section\]/, 'Block 80: unknown active source sections must fail closed and request an issue');
assert.equal(/inspectQxScriptCompatibility|qxManualPortComment/.test(syncConverter), false, 'Block 60: production converter must not gate Source Script execution on runtime compatibility scanning');
const surgeValidator=await fs.readFile(path.join(ROOT,'converter/src/surge-module.mjs'),'utf8');
assert.match(surgeValidator,/WayX ad-block Surge \[Script\] only accepts HTTP rewrite types/, 'Block 80: Surge validator must be explicitly scoped to ad-block rewrite scripts');
assert.match(surgeValidator,/SURGE_WAYX_REWRITE_SECTIONS/, 'Block 80: Surge validator must consume the official-backed rewrite registry');
const surgeCapabilities=await fs.readFile(path.join(ROOT,'converter/src/surge-official-capabilities.mjs'),'utf8');
assert.match(surgeCapabilities,/SURGE_WAYX_RULE_TYPES/, 'Block 80: Surge Rule registry must be explicit and official-backed');
assert.match(converterWorkflow,/surge-official-capabilities\.mjs/, 'Block 80: Converter Check must execute the Surge official capability gate');
assert.match(converterWorkflow,/catalog-rule-inventory\.mjs/, 'Block 20/80: Converter Check must execute the Catalog Rule inventory gate');
const ruleAst=await fs.readFile(path.join(ROOT,'converter/src/rule-ast.mjs'),'utf8');
const ruleQx=await fs.readFile(path.join(ROOT,'converter/src/rule-qx.mjs'),'utf8');
const ruleSurge=await fs.readFile(path.join(ROOT,'converter/src/rule-surge.mjs'),'utf8');
const ruleFacade=await fs.readFile(path.join(ROOT,'converter/src/rule.mjs'),'utf8');
assert.equal(/qx-official-capabilities|surge-official-capabilities/.test(ruleAst), false, 'Block 20: target-neutral Rule AST parser must not import target capability registries');
assert.match(ruleQx,/planQxRuleAst\(ast\)/, 'Block 20: QX Rule planner must consume AST');
assert.match(ruleSurge,/planSurgeModuleRuleAst\(ast/, 'Block 20: Surge Rule planner must consume AST');
assert.equal(/splitTopLevelCsv|splitLogicalSubrules/.test(ruleQx), false, 'Block 20: QX planner must not reparse source Rule strings');
assert.equal(/splitTopLevelCsv|splitLogicalSubrules/.test(ruleSurge), false, 'Block 20: Surge planner must not reimplement source Rule parsing');
assert.match(ruleFacade,/parseLoonRuleAst\(source\)/, 'Block 20: public Rule facade must parse once before target planning');
assert.match(converterWorkflow,/rule-ast\.mjs/, 'Block 20: Converter Check must execute Rule AST contract');

const index=await fs.readFile(path.join(ROOT,'docs/conversion-spec/95-implementation-index.md'),'utf8');
for(const [block] of contracts) assert.match(index,new RegExp('\\| '+block+' \\|'), `implementation index missing Block ${block}`);

console.log('Spec block implementation contract passed');
