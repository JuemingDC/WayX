import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const contracts=[
  ['00','docs/conversion-spec/00-authority.md',['converter/tests/genericity-audit.mjs','converter/tools/audit-repository.mjs']],
  ['05','docs/conversion-spec/05-generic-converter.md',['converter/src/source-catalog.mjs','converter/src/plugin-parser.mjs','converter/src/dependency-materializer.mjs','converter/src/source-script-materializer.mjs','converter/src/conversion-context.mjs','converter/src/conversion-pipeline.mjs','converter/src/source-section.mjs','converter/src/source-metadata.mjs','converter/src/source-fetch.mjs','.github/scripts/sync-convert.mjs','.github/manual-assets.json','converter/tests/conversion-context-materializers.mjs','converter/tests/conversion-pipeline.mjs','converter/tests/source-section-comments.mjs','converter/tests/manual-assets.mjs']],
  ['10','docs/conversion-spec/10-target-format.md',['converter/src/paths.mjs','converter/src/metadata.mjs','converter/src/output-lines.mjs','converter/src/qx-output.mjs','converter/src/surge-output.mjs','converter/src/qx-snippet-validator.mjs','converter/src/surge-module.mjs','converter/src/qx-official-capabilities.mjs','converter/src/surge-official-capabilities.mjs','converter/tests/target-output-builders.mjs']],
  ['20','docs/conversion-spec/20-rule-mapping.md',['converter/src/rule-ast.mjs','converter/src/rule-qx.mjs','converter/src/rule-surge.mjs','converter/src/rule.mjs','converter/tests/rule-ast.mjs','converter/tests/catalog-rule-inventory.mjs','converter/fixtures/catalog-rule-inventory.json']],
  ['30','docs/conversion-spec/30-rewrite-mapping.md',['converter/src/rewrite-ir.mjs','converter/src/rewrite-qx.mjs','converter/src/rewrite-surge.mjs','converter/src/rewrite-plan-result.mjs','converter/src/legacy-rewrite.mjs','converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-semantic.mjs','converter/src/complex-rewrite-types.mjs','converter/src/complex-rewrite-registry.mjs','converter/tests/rewrite-ir.mjs','converter/tests/rewrite-target-planners.mjs','converter/tests/complex-source-inventory.mjs']],
  ['40','docs/conversion-spec/40-regex-condition.md',['converter/src/rewrite-v2.mjs','converter/src/rewrite-v2-actions.mjs','converter/src/target-regex.mjs']],
  ['50','docs/conversion-spec/50-json-jq-mock.md',['converter/src/jq.mjs','converter/src/dependency.mjs','converter/src/dependency-materializer.mjs','converter/src/conversion-context.mjs','converter/src/qx-mock.mjs','converter/src/surge-mock.mjs','converter/tests/conversion-context-materializers.mjs']],
  ['60','docs/conversion-spec/60-script-argument.md',['converter/src/script.mjs','converter/src/script-legacy.mjs','converter/src/script-v2.mjs','converter/src/script-ir.mjs','converter/src/script-qx.mjs','converter/src/script-surge.mjs','converter/src/script-v2-target.mjs','converter/src/argument.mjs','converter/src/source-script-materializer.mjs','converter/src/conversion-context.mjs','converter/tests/conversion-context-materializers.mjs','converter/tests/script-ir-target-planners.mjs']],
  ['70','docs/conversion-spec/70-mitm-comments.md',['converter/src/mitm.mjs','converter/src/source-section.mjs','converter/src/source-metadata.mjs','converter/src/qx-comment.mjs','converter/src/metadata.mjs','converter/tests/source-section-comments.mjs']],
  ['80','docs/conversion-spec/80-review-validation.md',['converter/src/dependency-materializer.mjs','converter/src/source-script-materializer.mjs','converter/src/conversion-context.mjs','converter/src/conversion-pipeline.mjs','converter/src/qx-snippet-validator.mjs','converter/src/surge-module.mjs','converter/src/unknown-issue.mjs','converter/src/qx-official-capabilities.mjs','converter/src/surge-official-capabilities.mjs','converter/tools/conversion-reports.mjs','converter/tests/conversion-context-materializers.mjs','converter/tests/conversion-pipeline.mjs','converter/tests/unknown-issue-markers.mjs','converter/tests/qx-official-capabilities.mjs','converter/tests/surge-official-capabilities.mjs','converter/tests/genericity-audit.mjs','converter/tests/generated-helper-refs.mjs','converter/tests/end-to-end-golden.mjs']],
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
const qxValidator=await fs.readFile(path.join(ROOT,'converter/src/qx-snippet-validator.mjs'),'utf8');
const repositoryAudit=await fs.readFile(path.join(ROOT,'converter/tools/audit-repository.mjs'),'utf8');
const conversionPipeline=await fs.readFile(path.join(ROOT,'converter/src/conversion-pipeline.mjs'),'utf8');
const pluginParser=await fs.readFile(path.join(ROOT,'converter/src/plugin-parser.mjs'),'utf8');
const dependencyMaterializer=await fs.readFile(path.join(ROOT,'converter/src/dependency-materializer.mjs'),'utf8');
const sourceScriptMaterializer=await fs.readFile(path.join(ROOT,'converter/src/source-script-materializer.mjs'),'utf8');
const conversionContext=await fs.readFile(path.join(ROOT,'converter/src/conversion-context.mjs'),'utf8');
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
assert.match(canonicalRunner,/materializeConversionContext\(entry, source\)/, 'Block 05/50/60: canonical runner must use the shared conversion-context materializer');
assert.match(syncConverter,/materializeConversionContext\(entry, source\)/, 'Block 05/50/60: sync orchestration must use the shared conversion-context materializer');
assert.equal(/materializeJqFiles|materializeMockFiles|inspectSourceScript|scriptUrls/.test(syncConverter), false, 'Block 50/60: sync orchestration must not own dependency or Source Script materialization');
assert.equal(/rewrite-v2|dependency\.mjs|jq\.mjs|script-v2|source-section|fetchOriginalBytes/.test(syncConverter), false, 'Block 50/60: sync orchestration must not import materializer internals');
assert.equal(/inspectSourceScript|materializeJqFiles|materializeMockFiles|scriptUrls/.test(canonicalRunner), false, 'Block 50/60: canonical runner must not borrow materializers from sync-convert');
const dependencySource=await fs.readFile(path.join(ROOT,'converter/src/dependency.mjs'),'utf8');
const dependencySpecBody=(dependencySource.match(/export function dependencySpecFromAction[\s\S]*?\n\}/)||[''])[0];
assert.equal(/qxAction|generated-qx-script|surge/i.test(dependencySpecBody), false, 'Block 50: dependencySpecFromAction must remain target-neutral');
assert.match(dependencyMaterializer,/fetchOriginalText/, 'Block 50: dependency materializer must use original-source text fetch');
assert.match(dependencyMaterializer,/fetchOriginalBytes/, 'Block 50: dependency materializer must use original-source bytes fetch');
assert.equal(/mirror|fallback|cache/i.test(dependencyMaterializer.replace(/Category:[^\n]*/g,'')), false, 'Block 50/90: dependency materializer must not add mirror/cache fallback');
assert.match(sourceScriptMaterializer,/resolveOriginalUrl\(reference,pluginSourceUrl\)/, 'Block 60: Source Script materializer must resolve relative refs against the original plugin URL');
assert.match(sourceScriptMaterializer,/fetchText\(originalUrl\)/, 'Block 60: optional action-type inspection must read only the resolved original Source Script URL');
assert.match(sourceScriptMaterializer,/qx:originalUrl[\s\S]*surge:originalUrl/, 'Block 60: Source Script materializer must preserve the resolved original URL for both targets');
assert.equal(/runtime compatibility|mirror|fallback/i.test(sourceScriptMaterializer), false, 'Block 60/90: Source Script materializer must not add compatibility or mirror gates');
assert.match(conversionContext,/materializeRewriteDependencies\(entry,parsed/, 'Block 05/50: conversion context must compose dependency materialization');
assert.match(conversionContext,/materializeSourceScripts\(source,entry\.source/, 'Block 05/60: conversion context must compose Source Script materialization');
assert.match(targetRegex,/return String\(pattern \?\? ''\);/, 'Block 40: target regex normalization must preserve the regex body');
assert.equal(/replace\([^\n]*\\\\\\\//.test(targetRegex), false, 'Block 40: target regex compiler must not globally rewrite escaped slashes');
assert.match(targetRegex,/sourceFlags:\s*flags/, 'Block 40: discarded source flags must remain observable metadata without being propagated');
assert.equal(/planComplexRewrite\(/.test(conversionPipeline), false, 'Block 30: conversion pipeline must not own the complex Rewrite fallback chain');
assert.equal(/planAdjacentQxHeaderGroups/.test(conversionPipeline), false, 'Block 30: independent source Rewrite declarations must never be merged into synthetic pipelines');
const rewriteIr=await fs.readFile(path.join(ROOT,'converter/src/rewrite-ir.mjs'),'utf8');
const legacyRewrite=await fs.readFile(path.join(ROOT,'converter/src/legacy-rewrite.mjs'),'utf8');
assert.equal(/qx-official-capabilities|surge-official-capabilities/.test(rewriteIr), false, 'Block 30: Rewrite Semantic IR must stay target-neutral');
assert.match(legacyRewrite,/legacyRewriteToSemanticIr\(pattern, action\)/, 'Block 30: Legacy Rewrite planner must route through Semantic IR');
assert.match(conversionPipeline,/rewriteV2AstToSemanticIr\(ast,\{source:line\}\)/, 'Block 30: Rewrite v2 pipeline must build Semantic IR after source normalization');
assert.equal(/singleRewriteOperation\(ir\)/.test(conversionPipeline), false, 'Block 30: pipeline must not own target semantic-operation routing');
assert.equal(/ast\.actions\[0\]\.name === 'response\.header\.add'/.test(conversionPipeline), false, 'Block 30: pipeline must not restore raw action-name routing for response.header.add');
assert.equal(/ast\.actions\[0\]\.name === 'redirect'/.test(conversionPipeline), false, 'Block 30: pipeline must not restore raw action-name routing for redirect');
assert.equal(/action => action\.name === 'response\.body\.mock_file'/.test(conversionPipeline), false, 'Block 30: pipeline must not restore raw action-name routing for mock_file');
assert.match(converterWorkflow,/rewrite-ir\.mjs/, 'Block 30/80: Converter Check must execute Rewrite Semantic IR contract');
const rewriteQx=await fs.readFile(path.join(ROOT,'converter/src/rewrite-qx.mjs'),'utf8');
const rewriteSurge=await fs.readFile(path.join(ROOT,'converter/src/rewrite-surge.mjs'),'utf8');
assert.match(conversionPipeline,/planQxRewrite\(ir/, 'Block 30: conversion pipeline must delegate QX Rewrite planning');
assert.match(conversionPipeline,/planSurgeRewrite\(ir/, 'Block 30: conversion pipeline must delegate Surge Rewrite planning');
assert.equal(/qx-semantic-script\.mjs|surge-mock\.mjs|complex-rewrite-registry\.mjs|rewrite-v2-semantic\.mjs.*(?:qxDirectRewritePlan|surgeDirectRewritePlan)/.test(conversionPipeline), false, 'Block 30: pipeline must not import target Rewrite renderers or complex registry');
assert.equal(/function qxNativeHeaderPlan|function qxHeaderRewriteInfo/.test(conversionPipeline), false, 'Block 30: QX Rewrite special routing must live in the QX planner');
assert.equal(/\brewriteAction\s*\(/.test(conversionPipeline), false, 'Block 30: undefined legacy conservative fallback must not return');
assert.match(rewriteQx,/export function planQxRewrite\(ir/, 'Block 30: QX Rewrite planner entry must consume Semantic IR');
assert.match(rewriteSurge,/export function planSurgeRewrite\(ir/, 'Block 30: Surge Rewrite planner entry must consume Semantic IR');
assert.match(rewriteQx,/planComplexRewrite\(ast,'qx'/, 'Block 30: QX planner must own its complex fallback');
assert.match(rewriteSurge,/planComplexRewrite\(ast,'surge'/, 'Block 30: Surge planner must own its complex fallback');
assert.match(rewriteQx,/function ensureQxRewriteHandlers\(\)/, 'Block 30: QX complex handlers must register lazily');
assert.match(rewriteSurge,/function ensureSurgeRewriteHandlers\(\)/, 'Block 30: Surge complex handlers must register lazily');
assert.ok(rewriteQx.indexOf('registerComplexRewriteHandler({') > rewriteQx.indexOf('function ensureQxRewriteHandlers()'), 'Block 30: QX planner import must not register handlers at top level');
assert.ok(rewriteSurge.indexOf('registerComplexRewriteHandler({') > rewriteSurge.indexOf('function ensureSurgeRewriteHandlers()'), 'Block 30: Surge planner import must not register handlers at top level');
assert.match(converterWorkflow,/rewrite-target-planners\.mjs/, 'Block 30/80: Converter Check must execute target planner contract');
const complexTypes=await fs.readFile(path.join(ROOT,'converter/src/complex-rewrite-types.mjs'),'utf8');
assert.match(complexTypes,/response\.body\.mock.*response\.header\.set/s, 'Block 30: observed Bilibili-source complex signature must be registered generically');
assert.match(upstreamWorkflow,/propose-conversion-issues\.mjs/, 'Block 80/90: unknown markers must be proposed as GitHub issues');
assert.match(upstreamWorkflow,/conversion-reports\.mjs/, 'Block 80/90: scheduled flow must generate reconciliation and Review inventory reports');
assert.match(converterWorkflow,/conversion-reports\.mjs/, 'Block 80: Converter Check must generate reconciliation and Review inventory reports');
assert.match(upstreamWorkflow,/steps\.reports\.outcome/, 'Block 90: failed reconciliation report must block Safe Tier');
const manualAssets=JSON.parse(await fs.readFile(path.join(ROOT,'.github/manual-assets.json'),'utf8'));
assert.ok(manualAssets.assets.some(asset=>asset.id==='QZXY' && asset.mode==='manual'), 'Block 05: QZXY must stay explicitly hand-maintained');
assert.match(upstreamWorkflow,/steps\.issues\.outputs\.has_unknown/, 'Block 90: unknown issue markers must block Safe Tier direct commit');
assert.match(qxValidator,/QX_WAYX_FILTER_TYPES/, 'Block 80: QX validator must consume the explicit official-backed active filter whitelist');
assert.match(qxValidator,/QX_WAYX_SCRIPT_ACTIONS/, 'Block 80: QX validator must consume the explicit official-backed Script action whitelist');
assert.match(qxValidator,/QX_WAYX_SNIPPET_MITM_KEYS/, 'Block 80: QX validator must consume the official-backed snippet MITM whitelist');
assert.match(syncConverter,/qx-snippet-validator\.mjs/, 'Block 80: sync orchestration must call the shared QX validator');
assert.equal(/function validateQX|function validateQxExecutableLine|QX_WAYX_/.test(syncConverter), false, 'Block 80: sync orchestration must not own QX validation grammar or capability whitelists');
assert.match(canonicalRunner,/qx-snippet-validator\.mjs/, 'Block 80: canonical runner must import the shared QX validator directly');
assert.match(repositoryAudit,/qx-snippet-validator\.mjs/, 'Block 80: repository audit must import the shared QX validator directly');
assert.equal(/sync-convert\.mjs/.test(canonicalRunner), false, 'Block 80: canonical runner must not import validation through sync orchestration');
assert.equal(/sync-convert\.mjs/.test(repositoryAudit), false, 'Block 80: repository audit must not import validation through sync orchestration');
assert.match(conversionPipeline,/isSupportedSourceSection\(/, 'Block 80: conversion pipeline must explicitly account for unsupported active sections through the shared source-section scope');
assert.match(conversionPipeline,/ISSUE REQUIRED \[unknown-source-section\]/, 'Block 80: unknown active source sections must fail closed and request an issue');
assert.equal(/inspectQxScriptCompatibility|qxManualPortComment/.test(syncConverter), false, 'Block 60: production converter must not gate Source Script execution on runtime compatibility scanning');
const scriptIr=await fs.readFile(path.join(ROOT,'converter/src/script-ir.mjs'),'utf8');
const scriptQx=await fs.readFile(path.join(ROOT,'converter/src/script-qx.mjs'),'utf8');
const scriptSurge=await fs.readFile(path.join(ROOT,'converter/src/script-surge.mjs'),'utf8');
assert.equal(/qx-official-capabilities|surge-official-capabilities/.test(scriptIr), false, 'Block 60: Script IR must remain target-neutral');
assert.equal(/qxAction|surgeType|section:/.test(scriptIr), false, 'Block 60: Script IR must not encode target action or section');
assert.match(conversionPipeline,/planQxScript\(ir/, 'Block 60: conversion pipeline must delegate QX Script planning');
assert.match(conversionPipeline,/planSurgeScript\(ir/, 'Block 60: conversion pipeline must delegate Surge Script planning');
assert.equal(/selectQxScriptAction\(|qxScriptV2Plan\(|surgeScriptV2Plan\(|function parseScriptLine\(/.test(conversionPipeline), false, 'Block 60: conversion pipeline must not own low-level Script target planning or duplicate Legacy parsing');
assert.equal(/surgeEnableRequirement\(|surgeDynamicOptionValue\(|surgePluginObjectArgument\(|parseLegacyLoonPluginObjectRefs\(/.test(conversionPipeline), false, 'Block 60: conversion pipeline must not expand Surge Script parameters');
assert.equal(/normalizeRegexBodyForTarget\(sc\.pattern\)|sc\.requiresBody|sc\.binary|sc\.timeout|sc\.maxSize|sc\.argument|sc\.enable/.test(conversionPipeline), false, 'Block 60: conversion pipeline must not route Legacy Script options');
assert.match(scriptQx,/export function planQxScript\(ir/, 'Block 60: QX Script planner must consume Script IR');
assert.match(scriptSurge,/export function planSurgeScript\(ir/, 'Block 60: Surge Script planner must consume Script IR');
assert.match(converterWorkflow,/script-ir-target-planners\.mjs/, 'Block 60/80: Converter Check must execute Script IR target planner contract');
const sourceSection=await fs.readFile(path.join(ROOT,'converter/src/source-section.mjs'),'utf8');
const sourceMetadata=await fs.readFile(path.join(ROOT,'converter/src/source-metadata.mjs'),'utf8');
const qxComment=await fs.readFile(path.join(ROOT,'converter/src/qx-comment.mjs'),'utf8');
const metadataRenderer=await fs.readFile(path.join(ROOT,'converter/src/metadata.mjs'),'utf8');
assert.equal(/QX|Quantumult|Surge|target/i.test(sourceSection.replace(/Category:[^\n]*/g,'')), false, 'Block 05/70: source-section grouping must remain target-neutral');
assert.equal(/QX|Quantumult|Surge|target/i.test(sourceMetadata.replace(/Category:[^\n]*/g,'')), false, 'Block 70: source metadata parser must remain target-neutral');
assert.match(conversionPipeline,/groupSourceSectionItems\(/, 'Block 05/70: conversion pipeline must consume shared source section grouping');
assert.match(conversionPipeline,/cleanSourceComments\(/, 'Block 70: conversion pipeline must consume shared source comment cleaning');
assert.match(conversionPipeline,/isSupportedSourceSection\(/, 'Block 05/80: conversion pipeline must consume shared supported-section scope');
assert.match(conversionPipeline,/attachQxInlineNote\(/, 'Block 70: conversion pipeline must delegate QX inline-note rendering');
assert.equal(/function sectionItems\(|function cleanComments\(|function sourceCommentText\(|function qxInlineNoteCandidate\(|function qxAttachInlineNote\(|supportedSourceSections\s*=/.test(conversionPipeline), false, 'Block 05/70: conversion pipeline must not restore duplicate source comment/section parsing');
assert.match(metadataRenderer,/parseSourceMetadataHeader\(headerLines\)/, 'Block 70: target metadata renderer must consume source metadata IR');
assert.equal(/function parseHeader\(/.test(metadataRenderer), false, 'Block 70: metadata renderer must not reparse source header directives');
assert.match(qxComment,/export function attachQxInlineNote/, 'Block 70: QX note logic must live in target-specific renderer');
assert.match(converterWorkflow,/source-section-comments\.mjs/, 'Block 70/80: Converter Check must execute source section/comment contract');
const qxOutput=await fs.readFile(path.join(ROOT,'converter/src/qx-output.mjs'),'utf8');
const surgeOutput=await fs.readFile(path.join(ROOT,'converter/src/surge-output.mjs'),'utf8');
const convertBody=(conversionPipeline.match(/export function convertPlugin\([\s\S]*$/)||[''])[0];
assert.match(conversionPipeline,/createQxOutputState\(\)/, 'Block 10/80: conversion pipeline must use QX output state');
assert.match(conversionPipeline,/createSurgeOutputState\(\)/, 'Block 10/80: conversion pipeline must use Surge output state');
assert.match(conversionPipeline,/renderQxOutput\(/, 'Block 10/80: conversion pipeline must delegate QX final assembly');
assert.match(conversionPipeline,/renderSurgeOutput\(/, 'Block 10/80: conversion pipeline must delegate Surge final assembly');
assert.match(conversionPipeline,/qxRuleOutputDestination\(/, 'Block 10: QX Rule section routing must use builder API');
assert.match(conversionPipeline,/qxRewriteOutputDestination\(/, 'Block 10: QX Rewrite section routing must use builder API');
assert.match(conversionPipeline,/surgeRuleOutputDestination\(/, 'Block 10: Surge Rule section routing must use builder API');
assert.match(conversionPipeline,/surgeRewriteOutputDestination\(/, 'Block 10: Surge Rewrite section routing must use builder API');
assert.equal(/\bqx\.(?:filter|rewrite|notes|mitm)\b|\bsg\.(?:rule|url|header|body|map|script|mitm|notes)\b/.test(conversionPipeline), false, 'Block 10: conversion pipeline must not access target section arrays directly');
assert.equal(/const\s+compact\s*=|\[URL Rewrite\]|\[Header Rewrite\]|\[Body Rewrite\]|\[Map Local\]/.test(convertBody), false, 'Block 10: convert() must not own target section titles or local compaction');
assert.equal(/# \[filter_local\]|# \[rewrite_local\]|# \[mitm\]/.test(convertBody), false, 'Block 10: convert() must not own QX section titles');
assert.equal(/renderQxSnippetHeader|renderSurgeModuleHeader|hasActiveSurgeLines/.test(convertBody), false, 'Block 10: convert() must not own target header assembly or Surge core requirement calculation');
assert.equal(/from '.\/(?:rule|rewrite|script)-/.test(qxOutput), false, 'Block 10: QX output builder must not import semantic planners');
assert.equal(/from '.\/(?:rule|rewrite|script)-/.test(surgeOutput), false, 'Block 10: Surge output builder must not import semantic planners');
assert.match(qxOutput,/# \[filter_local\][\s\S]*# \[rewrite_local\][\s\S]*# \[mitm\]/, 'Block 10: QX builder must own fixed commented section order');
assert.match(surgeOutput,/\['rule','\[Rule\]'\][\s\S]*\['url','\[URL Rewrite\]'\][\s\S]*\['header','\[Header Rewrite\]'\][\s\S]*\['body','\[Body Rewrite\]'\][\s\S]*\['map','\[Map Local\]'\][\s\S]*\['script','\[Script\]'\][\s\S]*\['mitm','\[MITM\]'\]/, 'Block 10: Surge builder must own fixed section order');
assert.match(converterWorkflow,/target-output-builders\.mjs/, 'Block 10/80: Converter Check must execute output builder contract');
assert.match(syncConverter,/convertPlugin\(entry, source/, 'Block 05/90: sync orchestration must invoke the shared pure conversion pipeline');
assert.equal(/function parseLoon\(|function convert\(|planQxRewrite|planSurgeRewrite|planQxScript|planSurgeScript|planMitmLine|canonicalQxRule|surgeModuleRule/.test(syncConverter), false, 'Block 05/80: sync orchestration must not own semantic conversion dispatch');
assert.match(pluginParser,/export function parseLoonPlugin\(text\)/, 'Block 05: whole-plugin parser must be explicit and reusable');
assert.match(conversionPipeline,/export function convertPlugin\(entry,source/, 'Block 05/80: pure conversion core must expose convertPlugin');
assert.equal(/node:fs|node:path|source-fetch|source-catalog|fetchOriginal|https?:\/\//.test(conversionPipeline), false, 'Block 05/80: pure conversion pipeline must not perform I/O or network fetch');
assert.match(canonicalRunner,/from '\.\.\/src\/plugin-parser\.mjs'/, 'Block 05/90: canonical runner must import the shared plugin parser directly');
assert.match(canonicalRunner,/from '\.\.\/src\/conversion-pipeline\.mjs'/, 'Block 05/90: canonical runner must import the shared conversion pipeline directly');
assert.equal(/\bconvert\(|\bparseLoon\(/.test(canonicalRunner), false, 'Block 05/90: canonical runner must not depend on legacy sync-convert conversion core');
assert.match(converterWorkflow,/conversion-pipeline\.mjs/, 'Block 05/80: Converter Check must execute conversion pipeline contract');
assert.match(converterWorkflow,/conversion-context-materializers\.mjs/, 'Block 05/50/60/80: Converter Check must execute conversion-context materializer contract');
assert.match(canonicalRunner,/from '\.\.\/src\/conversion-context\.mjs'/, 'Block 05/90: canonical runner must import shared conversion context directly');
assert.equal(/from '\.\.\.\/\.\.\/\.github\/scripts\/sync-convert\.mjs'.*(?:materialize|inspect|scriptUrls)/.test(canonicalRunner), false, 'Block 50/60/90: canonical runner must not import materialization APIs from sync-convert');
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
