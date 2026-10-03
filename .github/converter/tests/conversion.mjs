// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / conversion / Regression Suite

import assert from "node:assert/strict";
import { normalizePluginSource, parseLoonPlugin, convertPlugin, materializeJqFiles, materializeMockFiles, discoverSourceScriptUrls, inspectSourceScript, materializeSourceScripts, materializeConversionContext, materializeConversionRunContext, convertPluginWithContext, validateConvertedPlugin, validateQX, validateSurgeModule, parseRewriteV2, qxDirectRewritePlan, surgeDirectRewritePlan, surgeRejectRewritePlan, renderQxInlineMockScript, surgeInlineMockPlan, qxPrimitiveForRewriteV2Action, qxRule, surgeRule, rewriteV2AstToSemanticIr, legacyRewriteToSemanticIr, planQxRewrite, planSurgeRewrite, parseScriptDeclaration, planQxScript, planSurgeScript, parseConfigurationDeclaration, planConfiguration, WAYX_SUPPORTED_SOURCE_SECTIONS, cleanSourceComments, groupSourceSectionItems, isSupportedSourceSection, sourceCommentText, attachQxInlineNote, looksLikeCommentedSourceDeclaration, parseSourceMetadataHeader, renderQxSnippetHeader, renderSurgeModuleHeader, compactOutputLines, finalizeOutputLines, hasActiveOutputLines, appendQxOutput, createQxOutputState, qxOutputDestination, qxRuleOutputDestination, qxRewriteOutputDestination, renderQxOutput, appendSurgeOutput, createSurgeOutputState, renderSurgeOutput, surgeOutputDestination, surgeRuleOutputDestination, surgeRewriteOutputDestination, validateConversionMetadata } from "../src/index.mjs";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["conversion-pipeline.mjs","conversion-context-materializers.mjs","conversion-runner.mjs","end-to-end-golden.mjs","generic-identity.mjs","loon-new-syntax-cases.mjs","domain-migration.mjs","source-section-comments.mjs","target-output-builders.mjs","conversion-policy.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "conversion-pipeline.mjs") {
// Suite case: conversion-pipeline.mjs
// Plugin parser / pure conversion pipeline contract
// Author: chance
// Category: Converter / Pipeline / Validation





const normalized=normalizePluginSource('\uFEFF#!name=Demo\r\n[Rule]\r\nDOMAIN-SUFFIX,ads.example,REJECT\r\n');
assert.equal(normalized,'#!name=Demo\n[Rule]\nDOMAIN-SUFFIX,ads.example,REJECT\n');

const parsed=parseLoonPlugin(normalized);
assert.deepEqual(parsed.header,['#!name=Demo']);
assert.deepEqual(parsed.sections.get('Rule'),['DOMAIN-SUFFIX,ads.example,REJECT','']);

const entry={
  id:'Demo',
  category:'去广告',
  source:'https://example.com/Demo.lpx',
};
const source=[
  '#!name=Demo',
  '#!desc=Demo Loon plugin',
  '',
  '[Rule]',
  '# ad domain',
  'DOMAIN-SUFFIX,ads.example,REJECT',
  '',
  '[Rewrite]',
  '^https://old\\.example\\.com 302 https://new.example.com',
  '',
  '[Script]',
  'http-response ^https://api\\.example\\.com script-path=https://example.com/resp.js, requires-body=true, tag=Resp',
  '',
  '[Unknown]',
  'ACTIVE,unknown',
  '',
].join('\n');

const out=convertPlugin(entry,source,{
  stamp:'2026-10-01 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  scriptMap:new Map([[
    'https://example.com/resp.js',
    {
      qx:'https://example.com/resp.js',
      surge:'https://example.com/resp.js',
      source:'const x=$response.body; $done({body:x});',
      sourceError:null,
    },
  ]]),
  mockFiles:new Map(),
  jqFiles:new Map(),
});

assert.match(out.qx,/^# Name: Demo$/m);
assert.match(out.qx,/\{# ad domain #\} host-suffix, ads\.example, reject/);
assert.match(out.qx,/\^https:\/\/old\\\.example\\\.com url 302 https:\/\/new\.example\.com/);
assert.match(out.qx,/script-response-body https:\/\/example\.com\/resp\.js/);
assert.match(out.qx,/ISSUE REQUIRED \[unknown-source-section\]/);
assert.match(out.qx,/# Source declaration: ACTIVE,unknown/);

assert.match(out.surge,/^#!name=Demo$/m);
assert.match(out.surge,/^\[Rule\]$/m);
assert.match(out.surge,/DOMAIN-SUFFIX,ads\.example,REJECT/);
assert.match(out.surge,/^\[URL Rewrite\]$/m);
assert.match(out.surge,/\^https:\/\/old\\\.example\\\.com https:\/\/new\.example\.com 302/);
assert.match(out.surge,/^\[Script\]$/m);
assert.match(out.surge,/Resp = type=http-response/);
assert.match(out.surge,/ISSUE REQUIRED \[unknown-source-section\]/);

assert.ok(out.generatedScripts instanceof Map);
assert.equal(out.qx.endsWith('\n'),true);
assert.equal(out.surge.endsWith('\n'),true);

const emptyLegacyJqSource=[
  '#!name=EmptyLegacyJq',
  '[Rewrite]',
  "^https:\\/\\/comment-card\\.iqiyi\\.com\/views_comment\/3\\.0\/long_video_comments\\? response-body-json-jq ''",
  "^https:\\/\\/comment-card\\.iqiyi\\.com\/views_comment\/3\\.0\/long_video_comments\\? response-body-json-jq '.cards |= map(select(has(\"alias_name\")))'",
].join('\n');
const emptyLegacyJqOut=convertPlugin({...entry,id:'EmptyLegacyJq'},emptyLegacyJqSource,{
  stamp:'2026-10-03 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  scriptMap:new Map(),
  mockFiles:new Map(),
  jqFiles:new Map(),
});
assert.doesNotMatch(emptyLegacyJqOut.qx,/jsonjq-response-body\s+''/);
assert.doesNotMatch(emptyLegacyJqOut.surge,/http-response-jq\s+\S+\s+''/);
assert.match(emptyLegacyJqOut.qx,/jsonjq-response-body '.cards \|= map\(select\(has\("alias_name"\)\)\)'/);
assert.match(emptyLegacyJqOut.surge,/http-response-jq .*'.cards \|= map\(select\(has\("alias_name"\)\)\)'/);

const emptyV2JqSource=[
  '#!name=EmptyV2Jq',
  '[Rewrite]',
  'response if ${url} ~= /^https:\\/\\/comment-card\\.iqiyi\\.com\\// then response.json.jq("")',
  'response if ${url} ~= /^https:\\/\\/comment-card\\.iqiyi\\.com\\// then response.json.jq(".cards")',
].join('\n');
const emptyV2JqOut=convertPlugin({...entry,id:'EmptyV2Jq'},emptyV2JqSource,{
  stamp:'2026-10-03 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  scriptMap:new Map(),
  mockFiles:new Map(),
  jqFiles:new Map(),
});
assert.doesNotMatch(emptyV2JqOut.qx,/jsonjq-response-body\s+''/);
assert.doesNotMatch(emptyV2JqOut.surge,/http-response-jq\s+\S+\s+''/);
assert.match(emptyV2JqOut.qx,/jsonjq-response-body '.cards'/);
assert.match(emptyV2JqOut.surge,/http-response-jq .*'.cards'/);

const mixedScriptSource=[
  '#!name=MixedScriptOrder',
  '[Script]',
  'http-request ^https://one\\.example script-path=https://example.com/legacy-one.js, tag=LegacyOne',
  'request if ${url} ~= /^https:\\/\\/two\\.example/ then script("https://example.com/v2-two.js") with tag="V2Two"',
  'http-response ^https://three\\.example script-path=https://example.com/legacy-three.js, tag=LegacyThree',
].join('\n');
const mixedMap=new Map([
  ['https://example.com/legacy-one.js',{qx:'https://example.com/legacy-one.js',surge:'https://example.com/legacy-one.js',source:'$done({});'}],
  ['https://example.com/v2-two.js',{qx:'https://example.com/v2-two.js',surge:'https://example.com/v2-two.js',source:'$done({});'}],
  ['https://example.com/legacy-three.js',{qx:'https://example.com/legacy-three.js',surge:'https://example.com/legacy-three.js',source:'$done({});'}],
]);
const mixedOut=convertPlugin({...entry,id:'MixedScriptOrder'},mixedScriptSource,{
  stamp:'2026-10-03 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  scriptMap:mixedMap,
  mockFiles:new Map(),
  jqFiles:new Map(),
});
const qxOne=mixedOut.qx.indexOf('https://example.com/legacy-one.js');
const qxTwo=mixedOut.qx.indexOf('https://example.com/v2-two.js');
const qxThree=mixedOut.qx.indexOf('https://example.com/legacy-three.js');
assert.ok(qxOne>=0 && qxOne<qxTwo && qxTwo<qxThree, 'QX must preserve mixed Legacy/Script v2 source order');
const surgeOne=mixedOut.surge.indexOf('https://example.com/legacy-one.js');
const surgeTwo=mixedOut.surge.indexOf('https://example.com/v2-two.js');
const surgeThree=mixedOut.surge.indexOf('https://example.com/legacy-three.js');
assert.ok(surgeOne>=0 && surgeOne<surgeTwo && surgeTwo<surgeThree, 'Surge must preserve mixed Legacy/Script v2 source order');

console.log('Plugin parser / conversion pipeline contract passed');
}

if (selectedCase === "conversion-context-materializers.mjs") {
// Suite case: conversion-context-materializers.mjs
// Conversion-context materializer contract
// Author: chance
// Category: Converter / Context / Validation








const entry={
  id:'MaterializerFixture',
  source:'https://example.com/plugins/demo.lpx',
  category:'测试',
};

const source=[
  '#!name=MaterializerFixture',
  '',
  '[Rewrite]',
  'response if ${url} ~= /jq/ then response.json.jq_file("filters/remove-ads.jq")',
  'response if ${url} ~= /jq-alias/ then response.json.jq("jq-path=filters/legacy-alias.jq")',
  '^https://legacy\\.example\\.com - response-body-json-jq jq-path=filters/legacy-rewrite.jq',
  'response if ${url} ~= /jq-missing/ then response.json.jq_file("filters/missing.jq")',
  'response if ${url} ~= /mock/ then response.body.mock_file("json", "mock.json", 200)',
  'response if ${url} ~= /image/ then response.body.mock_file("png", "image.bin", 200)',
  'request if ${request.header[\'X-Region\']} == "CN" then request.body.mock_file("json", "request-mixed.json") | request.header.set("X-Test","1")',
  '',
  '[Script]',
  'http-response ^https://api\\.example\\.com script-path=./legacy.js,tag=legacy',
  'response if ${url} ~= /v2/ then script("scripts/v2.js") with tag="v2", requires_body=true',
  'response if ${url} ~= /bad/ then script("https://bad.example/fail.js") with tag="bad"',
  '',
].join('\n');

const textByUrl=new Map([
  ['https://example.com/plugins/filters/remove-ads.jq','.ads | del(.banner)\n'],
  ['https://example.com/plugins/filters/legacy-alias.jq','del(.legacyAlias)\n'],
  ['https://example.com/plugins/filters/legacy-rewrite.jq','del(.legacyRewrite)\n'],
  ['https://example.com/plugins/mock.json','{"ok":true}'],
  ['https://example.com/plugins/request-mixed.json','{"request":true}'],
  ['https://example.com/plugins/legacy.js','const legacy = true;\r\n$done({});\r\n'],
  ['https://example.com/plugins/scripts/v2.js','const v2 = true;\n$done({});\n'],
]);

const fetchedText=[];
const fetchedBytes=[];
async function fetchText(url) {
  fetchedText.push(url);
  if (url==='https://bad.example/fail.js') throw new Error('fixture source unavailable');
  if (!textByUrl.has(url)) throw new Error('unexpected text URL: '+url);
  return textByUrl.get(url);
}
async function fetchBytes(url) {
  fetchedBytes.push(url);
  if (url!=='https://example.com/plugins/image.bin') {
    throw new Error('unexpected bytes URL: '+url);
  }
  return Uint8Array.from([0,1,2,255]);
}

const parsed=parseLoonPlugin(source);

const jqFiles=await materializeJqFiles(entry,parsed,{fetchText});
const jqLine='response if ${url} ~= /jq/ then response.json.jq_file("filters/remove-ads.jq")';
assert.equal(jqFiles.get(jqLine).sourceFile,'https://example.com/plugins/filters/remove-ads.jq');
assert.match(jqFiles.get(jqLine).content,/del\(\.banner\)/);

const jqAliasLine='response if ${url} ~= /jq-alias/ then response.json.jq("jq-path=filters/legacy-alias.jq")';
assert.equal(jqFiles.get(jqAliasLine).sourceFile,'https://example.com/plugins/filters/legacy-alias.jq');
assert.equal(jqFiles.get(jqAliasLine).content,'del(.legacyAlias)');
assert.equal(jqFiles.get(jqAliasLine).legacyAlias,true);

const legacyJqLine='^https://legacy\\.example\\.com - response-body-json-jq jq-path=filters/legacy-rewrite.jq';
assert.equal(jqFiles.get(legacyJqLine).sourceFile,'https://example.com/plugins/filters/legacy-rewrite.jq');
assert.equal(jqFiles.get(legacyJqLine).content,'del(.legacyRewrite)');
assert.equal(jqFiles.get(legacyJqLine).legacyAlias,true);

const missingJqLine='response if ${url} ~= /jq-missing/ then response.json.jq_file("filters/missing.jq")';
assert.match(jqFiles.get(missingJqLine).error,/unexpected text URL/);

const mockFiles=await materializeMockFiles(entry,parsed,{fetchText,fetchBytes});
const textMockLine='response if ${url} ~= /mock/ then response.body.mock_file("json", "mock.json", 200)';
assert.deepEqual(mockFiles.get(textMockLine),{
  bodyText:'{"ok":true}',
  sourceFile:'https://example.com/plugins/mock.json',
});
const binaryMockLine='response if ${url} ~= /image/ then response.body.mock_file("png", "image.bin", 200)';
assert.deepEqual(mockFiles.get(binaryMockLine),{
  bodyBase64:'AAEC/w==',
  sourceFile:'https://example.com/plugins/image.bin',
});
const mixedRequestMockLine='request if ${request.header[\'X-Region\']} == "CN" then request.body.mock_file("json", "request-mixed.json") | request.header.set("X-Test","1")';
assert.deepEqual(mockFiles.get(mixedRequestMockLine),{
  bodyText:'{"request":true}',
  sourceFile:'https://example.com/plugins/request-mixed.json',
});

const refs=discoverSourceScriptUrls(source,{parsed});
assert.deepEqual(refs,[
  './legacy.js',
  'scripts/v2.js',
  'https://bad.example/fail.js',
]);

const inspected=await inspectSourceScript('./legacy.js',entry.source,{fetchText});
assert.equal(inspected.qx,'https://example.com/plugins/legacy.js');
assert.equal(inspected.surge,'https://example.com/plugins/legacy.js');
assert.equal(inspected.source,'const legacy = true;\n$done({});\n');
assert.equal(inspected.sourceError,null);

const scriptMap=await materializeSourceScripts(source,entry.source,{parsed,fetchText});
assert.equal(scriptMap.get('./legacy.js').qx,'https://example.com/plugins/legacy.js');
assert.equal(scriptMap.get('scripts/v2.js').surge,'https://example.com/plugins/scripts/v2.js');
assert.equal(scriptMap.get('https://bad.example/fail.js').qx,'https://bad.example/fail.js');
assert.equal(scriptMap.get('https://bad.example/fail.js').source,'');
assert.match(scriptMap.get('https://bad.example/fail.js').sourceError,/fixture source unavailable/);

fetchedText.length=0;
fetchedBytes.length=0;
const context=await materializeConversionContext(entry,source,{fetchText,fetchBytes});
assert.ok(context.parsed.sections instanceof Map);
assert.equal(context.jqFiles.get(jqLine).sourceFile,'https://example.com/plugins/filters/remove-ads.jq');
assert.equal(context.jqFiles.get(jqAliasLine).content,'del(.legacyAlias)');
assert.equal(context.jqFiles.get(legacyJqLine).content,'del(.legacyRewrite)');
assert.match(context.jqFiles.get(missingJqLine).error,/unexpected text URL/);
assert.equal(context.mockFiles.get(binaryMockLine).bodyBase64,'AAEC/w==');
assert.equal(context.mockFiles.get(mixedRequestMockLine).bodyText,'{"request":true}');
assert.equal(context.scriptMap.get('./legacy.js').qx,'https://example.com/plugins/legacy.js');
assert.equal(context.scriptMap.get('scripts/v2.js').qx,'https://example.com/plugins/scripts/v2.js');
assert.match(context.scriptMap.get('https://bad.example/fail.js').sourceError,/fixture source unavailable/);
assert.ok(fetchedText.includes('https://example.com/plugins/filters/remove-ads.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/filters/legacy-alias.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/filters/legacy-rewrite.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/mock.json'));
assert.ok(fetchedText.includes('https://example.com/plugins/request-mixed.json'));
assert.ok(fetchedText.includes('https://example.com/plugins/legacy.js'));
assert.ok(fetchedText.includes('https://example.com/plugins/scripts/v2.js'));
assert.ok(fetchedBytes.includes('https://example.com/plugins/image.bin'));

const conversionOptions={
  parsed:context.parsed,
  scriptMap:context.scriptMap,
  mockFiles:context.mockFiles,
  jqFiles:context.jqFiles,
  stamp:'2026-10-01 00:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
};
const baseline=convertPlugin(entry,source,conversionOptions);
assert.match(baseline.qx,/jsonjq-response-body 'del\(\.legacyAlias\)'/);
assert.match(baseline.qx,/jsonjq-response-body 'del\(\.legacyRewrite\)'/);
assert.match(baseline.surge,/http-response-jq .*'del\(\.legacyAlias\)'/);
assert.match(baseline.surge,/http-response-jq .*'del\(\.legacyRewrite\)'/);
assert.doesNotMatch(baseline.qx,/jq-path=/);
assert.doesNotMatch(baseline.surge,/jq-path=/);
assert.match(baseline.qx,/REVIEW REQUIRED: unexpected text URL: https:\/\/example\.com\/plugins\/filters\/missing\.jq/);
assert.match(baseline.surge,/REVIEW REQUIRED: unexpected text URL: https:\/\/example\.com\/plugins\/filters\/missing\.jq/);
assert.doesNotMatch(
  baseline.qx.split(/\r?\n/).filter(line=>line.trim() && !line.trim().startsWith('#')).join('\n'),
  /jq-missing.*url script-/,
  'unresolved jq_file must not generate a QX Script helper',
);
assert.doesNotMatch(
  baseline.surge.split(/\r?\n/).filter(line=>line.trim() && !line.trim().startsWith('#')).join('\n'),
  /jq-missing.*script-path=/,
  'unresolved jq_file must not generate a Surge Script helper',
);
const reused=convertPlugin(entry,'#!name=Different\\n[Rule]\\nDOMAIN,wrong.example,DIRECT\\n',conversionOptions);
assert.equal(reused.qx,baseline.qx,'convertPlugin must consume the provided parsed plugin instead of reparsing source');
assert.equal(reused.surge,baseline.surge,'Surge output must use the same materialized parsed plugin');
assert.deepEqual([...reused.generatedScripts], [...baseline.generatedScripts]);

console.log('Conversion-context materializer contract passed');
}

if (selectedCase === "conversion-runner.mjs") {
// Suite case: conversion-runner.mjs
// Validated conversion runner behavior contract.
// Author: chance
// Category: Converter / Execution / Validation Test




const entry={
  id:'RunnerFixture',
  category:'去广告',
  source:'https://example.invalid/RunnerFixture.lpx',
  qx:'RunnerFixture.snippet',
  surge:'RunnerFixture.sgmodule',
};

const source=[
  '#!name=RunnerFixture',
  '#!desc=Validated runner fixture',
  '',
  '[Rule]',
  'DOMAIN-SUFFIX,ads.example,REJECT',
  '',
].join('\n');

const firstStages=[];
const context=await materializeConversionRunContext(entry,source,{
  onStage:stage=>firstStages.push(stage),
});
const first=convertPluginWithContext(entry,source,context,{
  stamp:'2026-10-01 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  onStage:stage=>firstStages.push(stage),
});
assert.deepEqual(firstStages,['materialize-context','convert']);

validateConvertedPlugin(entry,first,{
  onStage:stage=>firstStages.push(stage),
});
assert.deepEqual(firstStages,[
  'materialize-context',
  'convert',
  'validate-qx',
  'validate-surge',
]);
assert.match(first.qx,/^# Converted: 2026-10-01 12:00:00 \+08:00$/m);
assert.match(first.surge,/^# Converted: 2026-10-01 12:00:00 \+08:00$/m);

const rerunStages=[];
const second=convertPluginWithContext(entry,source,context,{
  stamp:'2026-10-01 12:01:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  onStage:stage=>rerunStages.push(stage),
});
assert.deepEqual(rerunStages,['convert']);

validateConvertedPlugin(entry,second,{
  surgeValidationOptions:{adblockScope:true},
  onStage:stage=>rerunStages.push(stage),
});
assert.deepEqual(rerunStages,[
  'convert',
  'validate-qx',
  'validate-surge',
]);
assert.match(second.qx,/^# Converted: 2026-10-01 12:01:00 \+08:00$/m);
assert.match(second.surge,/^# Converted: 2026-10-01 12:01:00 \+08:00$/m);
assert.notEqual(first.qx,second.qx);
assert.notEqual(first.surge,second.surge);

console.log('Validated conversion runner contract passed');
}

if (selectedCase === "end-to-end-golden.mjs") {
// Suite case: end-to-end-golden.mjs
const ROOT = process.cwd();
const golden = JSON.parse(await fs.readFile(path.join(ROOT, '.github/converter/fixtures/end-to-end-golden.json'), 'utf8'));
const STAMP = golden.stamp;
const RAW_BASE='https://raw.githubusercontent.com/JuemingDC/WayX/main';
const convert=(entry,source,scriptMap,stamp,mockFiles=new Map(),jqFiles=new Map())=>convertPlugin(entry,source,{scriptMap,stamp,mockFiles,jqFiles,rawBase:RAW_BASE});

const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '.github/sources/loon.json'), 'utf8'));
const byId = new Map(manifest.map(entry => [entry.id, entry]));

const headerGroupFixture = {
  id:'HeaderGroupFixture',
  source:'https://example.invalid/header-group.lpx',
  qx:'HeaderGroupFixture.snippet',
  surge:'HeaderGroupFixture.sgmodule',
  category:'测试',
};
const headerGroupSource = `#!name=HeaderGroupFixture
#!desc=Header grouping regression

[Rewrite]
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.add("content-disposition", "inline")
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.set("content-type", "text/plain; charset=utf-8")

[MITM]
hostname=api.example.com
`;
const headerGroupOutput = convert(headerGroupFixture, headerGroupSource, new Map(), STAMP);
assert.match(
  headerGroupOutput.qx,
  /url response-header \^\(\[\^\\r\\n\]\+\)\(\\r\\n\) response-header \$1\$2content-disposition: inline\$2/,
);
assert.doesNotMatch(headerGroupOutput.qx, /REVIEW REQUIRED: QX header\.add/);
assert.equal(
  headerGroupOutput.qx.split(/\r?\n/).filter(line => !line.trim().startsWith('#') && /script-response-header/.test(line)).length,
  1,
  'the independent response.header.set rule must remain active when the preceding independent response.header.add uses native response-header',
);
assert.doesNotMatch(
  headerGroupOutput.qx,
  /Source declaration: .*response\.header\.add.* \| response if .*response\.header\.set/,
  'converter must never invent a pipeline by joining adjacent source declarations',
);
assert.match(headerGroupOutput.surge, /header-add content-disposition inline/);

const qxIgnoredOptionsFixture = {
  id:'IgnoredOptionsFixture',
  category:'Adblock',
  source:'https://example.com/ignored-options.lpx',
  qx:'IgnoredOptionsFixture.snippet',
  surge:'IgnoredOptionsFixture.sgmodule',
};
const qxIgnoredOptionsSource = `#!name=IgnoredOptionsFixture

[Argument]
enabled=switch,false,true,tag=开关
lang=select,"zh-Hans","en",tag=语言

[Script]
http-response ^https://api\\.example\\.com/ script-path=https://example.com/legacy.js, requires-body=true, timeout=60, argument=[{lang}], enable={enabled}, tag=Legacy
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/v2/ then script("https://example.com/v2.js", {\${lang}}) with enable=\${enabled}, timeout=30, tag="V2", requires_body=true

[MITM]
hostname=api.example.com
`;
const ignoredScriptMap = new Map([
  ['https://example.com/legacy.js',{qx:'https://example.com/legacy.js',surge:'https://example.com/legacy.js',source:'$done({body:$response.body});'}],
  ['https://example.com/v2.js',{qx:'https://example.com/v2.js',surge:'https://example.com/v2.js',source:'$done({body:$response.body});'}],
]);
const qxIgnoredOptionsOutput = convert(qxIgnoredOptionsFixture, qxIgnoredOptionsSource, ignoredScriptMap, STAMP);
assert.doesNotMatch(qxIgnoredOptionsOutput.qx, /SCRIPT(?: V2)? REVIEW REQUIRED/);
assert.match(qxIgnoredOptionsOutput.qx, /dynamic enable=.*ignored for Quantumult X; converted rule defaults to enabled/i);
assert.match(qxIgnoredOptionsOutput.qx, /Source Script timeout ignored for Quantumult X/);
assert.match(qxIgnoredOptionsOutput.qx, /Source Script argument ignored for Quantumult X/);
assert.match(qxIgnoredOptionsOutput.qx, /url script-response-body https:\/\/example\.com\/legacy\.js/);
assert.match(qxIgnoredOptionsOutput.qx, /url script-response-body https:\/\/example\.com\/v2\.js/);
assert.doesNotMatch(qxIgnoredOptionsOutput.surge, /SCRIPT(?: V2)? REVIEW REQUIRED/);
assert.match(qxIgnoredOptionsOutput.surge, /#!REQUIREMENT .*enabled.*Legacy = type=http-response/);
assert.match(qxIgnoredOptionsOutput.surge, /Legacy = type=http-response[^\n]*timeout=60/);
assert.match(qxIgnoredOptionsOutput.surge, /#!REQUIREMENT .*enabled.*V2 = type=http-response/);
assert.match(qxIgnoredOptionsOutput.surge, /V2 = type=http-response[^\n]*timeout=30/);
assert.match(headerGroupOutput.surge, /header-del content-type/);
assert.match(headerGroupOutput.surge, /header-add content-type text\/plain; charset=utf-8/);

const genericComplexFixture = {
  id:'GenericComplexFixture',
  source:'https://example.invalid/generic-complex.lpx',
  qx:'GenericComplexFixture.snippet',
  surge:'GenericComplexFixture.sgmodule',
  category:'测试',
};
const genericComplexSource = `#!name=GenericComplexFixture
[Rewrite]
response if \${url} ~= /api/ then response.header.set("X-Test", "ok") | response.json.replace("data.ads", false)
`;
const genericComplexOutput = convert(genericComplexFixture, genericComplexSource, new Map(), STAMP);
assert.doesNotMatch(genericComplexOutput.qx, /ISSUE REQUIRED|REVIEW REQUIRED/);
assert.doesNotMatch(genericComplexOutput.surge, /ISSUE REQUIRED|REVIEW REQUIRED/);
assert.match(genericComplexOutput.qx, /complex_qx_/);
assert.match(genericComplexOutput.surge, /wayx_complex_/);

const unknownActionFixture = {
  id:'UnknownActionFixture',
  source:'https://example.invalid/unknown-action.lpx',
  qx:'UnknownActionFixture.snippet',
  surge:'UnknownActionFixture.sgmodule',
  category:'测试',
};
const unknownActionSource = `#!name=UnknownActionFixture
[Rewrite]
response if \${url} ~= /api/ then response.future.magic("x")
`;
const unknownActionOutput = convert(unknownActionFixture, unknownActionSource, new Map(), STAMP);
assert.match(unknownActionOutput.qx, /ISSUE REQUIRED \[unknown-rewrite-v2-action\]/);
assert.match(unknownActionOutput.surge, /ISSUE REQUIRED \[unknown-rewrite-v2-action\]/);

const requestAddFixture = {
  id:'RequestHeaderAddFixture',
  source:'https://example.invalid/request-header-add.lpx',
  qx:'RequestHeaderAddFixture.snippet',
  surge:'RequestHeaderAddFixture.sgmodule',
  category:'测试',
};
const requestAddSource = `#!name=RequestHeaderAddFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-Test", "one")
response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then response.header.replace("X-Test", /one/, "two")
`;
const requestAddOutput = convert(requestAddFixture, requestAddSource, new Map(), STAMP);
assert.ok(
  requestAddOutput.qx.includes('url request-header ^([^\\r\\n]+)(\\r\\n) request-header $1$2X-Test: one$2'),
  'QX request.header.add must use whole request-header insertion rather than object set\n' + requestAddOutput.qx,
);
assert.equal(
  requestAddOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url response-header /.test(line)),
  false,
  'QX must never emit the undocumented response-header rewrite token',
);
assert.match(requestAddOutput.qx, /url script-response-header .*header_.*\.js/);
assert.doesNotMatch(requestAddOutput.qx, /REVIEW REQUIRED/);
assert.match(requestAddOutput.surge, /header-add X-Test one/);

const requestAddBulkFixture = {
  id:'RequestHeaderAddBulkFixture',
  source:'https://example.invalid/request-header-add-bulk.lpx',
  qx:'RequestHeaderAddBulkFixture.snippet',
  surge:'RequestHeaderAddBulkFixture.sgmodule',
  category:'测试',
};
const requestAddBulkSource = `#!name=RequestHeaderAddBulkFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add(["X-A","X-B"], ["one","two"])
`;
const requestAddBulkOutput = convert(requestAddBulkFixture, requestAddBulkSource, new Map(), STAMP);
assert.ok(
  requestAddBulkOutput.qx.includes('request-header $1$2X-A: one$2X-B: two$2'),
  'QX bulk request.header.add must be emitted as one whole-header rewrite',
);
assert.equal(
  requestAddBulkOutput.qx.split(/\r?\n/).filter(line => !line.trim().startsWith('#') && / url request-header /.test(line)).length,
  1,
  'QX bulk request.header.add must not split one Loon action into multiple target rewrite rules',
);

const requestAddSetFixture = {
  id:'RequestHeaderAddSetFixture',
  source:'https://example.invalid/request-header-add-set.lpx',
  qx:'RequestHeaderAddSetFixture.snippet',
  surge:'RequestHeaderAddSetFixture.sgmodule',
  category:'测试',
};
const requestAddSetSource = `#!name=RequestHeaderAddSetFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-A", "one")
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.set("X-B", "two")
`;
const requestAddSetOutput = convert(requestAddSetFixture, requestAddSetSource, new Map(), STAMP);
assert.doesNotMatch(requestAddSetOutput.qx, /REVIEW REQUIRED/);
assert.equal(
  requestAddSetOutput.qx.split(/\r?\n/).filter(line => !line.trim().startsWith('#') && / url (?:request-header|script-request-header) /.test(line)).length,
  2,
  'independent request add+set declarations must remain two independent target rewrites',
);
assert.doesNotMatch(
  requestAddSetOutput.qx,
  /Source declaration: .*request\.header\.add.* \| request if .*request\.header\.set/,
  'adjacent request header rules must never be synthesized into a pipeline',
);

const requestReplaceCaptureFixture = {
  id:'RequestHeaderReplaceCaptureFixture',
  source:'https://example.invalid/request-header-replace-capture.lpx',
  qx:'RequestHeaderReplaceCaptureFixture.snippet',
  surge:'RequestHeaderReplaceCaptureFixture.sgmodule',
  category:'测试',
};
const requestReplaceCaptureSource = `#!name=RequestHeaderReplaceCaptureFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.replace("User-Agent", /iPhone OS (\\d+)/, "iPhone OS $1")
`;
const requestReplaceCaptureOutput = convert(requestReplaceCaptureFixture, requestReplaceCaptureSource, new Map(), STAMP);
assert.equal(
  requestReplaceCaptureOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url request-header /.test(line)),
  false,
  'QX header.replace must not embed action-local captures into whole-header capture numbering',
);
assert.match(requestReplaceCaptureOutput.qx, /url script-request-header .*header_.*\.js/);
assert.doesNotMatch(requestReplaceCaptureOutput.qx, /REVIEW REQUIRED/);
const requestReplaceCaptureHelper = [...requestReplaceCaptureOutput.generatedScripts.values()].find(text => text.includes('User-Agent'));
assert.ok(requestReplaceCaptureHelper, 'QX request.header.replace must generate a helper');
assert.ok(
  requestReplaceCaptureHelper.includes('__wayxReplace("User-Agent", "iPhone OS (\\\\d+)", "iPhone OS $1");'),
  'QX header helper must preserve action-local $1 replacement and regex capture source',
);
assert.match(requestReplaceCaptureHelper, /toLowerCase\(\)/);
assert.doesNotMatch(requestReplaceCaptureHelper, /__wayxJsonAdd|__wayxJsonDelete|__wayxBody=/);

const requestAddDollarFixture = {
  id:'RequestHeaderAddDollarFixture',
  source:'https://example.invalid/request-header-add-dollar.lpx',
  qx:'RequestHeaderAddDollarFixture.snippet',
  surge:'RequestHeaderAddDollarFixture.sgmodule',
  category:'测试',
};
const requestAddDollarSource = `#!name=RequestHeaderAddDollarFixture
[Rewrite]
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\//i then request.header.add("X-Price", "price $1")
`;
const requestAddDollarOutput = convert(requestAddDollarFixture, requestAddDollarSource, new Map(), STAMP);
assert.equal(
  requestAddDollarOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && / url request-header /.test(line)),
  false,
  'QX request.header.add with $ replacement syntax must not use the native replacement string',
);
assert.match(requestAddDollarOutput.qx, /REVIEW REQUIRED: QX header\.add cannot be represented losslessly/);


const qxValidatorEntry = {id:'QxValidatorFixture'};
const validQxValidatorText = `# Name: QxValidatorFixture
# [filter_local]
host, example.com, reject
# [rewrite_local]
^https://example\\.com url reject
# [mitm]
hostname = example.com
`;
assert.doesNotThrow(() => validateQX(validQxValidatorText, qxValidatorEntry));
assert.doesNotThrow(() => validateQX(
  validQxValidatorText
    .replace('host, example.com, reject', '{# Work VPN #} host, example.com, reject')
    .replace('^https://example\\.com url reject', '{# Block ads #} ^https://example\\.com url reject'),
  qxValidatorEntry,
));
assert.throws(
  () => validateQX(validQxValidatorText.replace('host, example.com, reject', '{# malformed note host, example.com, reject'), qxValidatorEntry),
  /malformed Quantumult X leading rule note/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('hostname = example.com', '{# MITM note #} hostname = example.com'), qxValidatorEntry),
  /leading notes are only valid on filter\/rewrite rules/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('host, example.com, reject', 'dest-port, 443, reject'), qxValidatorEntry),
  /unsupported Quantumult X filter type/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '(?i)^https://example\\.com url reject'), qxValidatorEntry),
  /must not restore discarded Loon regex flags/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '[hH][tT][tT][pP][sS]://example\\.com url reject'), qxValidatorEntry),
  /manual HTTP case-fold/,
);
assert.throws(
  () => validateQX(validQxValidatorText.replace('^https://example\\.com url reject', '^https://example\\.com url loon-private-action'), qxValidatorEntry),
  /unsupported Quantumult X rewrite action/,
);
assert.doesNotThrow(
  () => validateQX(
    validQxValidatorText.replace(
      '^https://example\\.com url reject',
      '^https://example\\.com url response-header ^([^\\r\\n]+)(\\r\\n) response-header $1$2X-Test: 1$2',
    ),
    qxValidatorEntry,
  ),
);

const nativeSurgeTaskScript = `#!name=ScopeFixture
#!desc=Scope fixture
#!category=WayX
[Script]
task = type=cron,script-path=https://example.com/task.js,cronexp="0 8 * * *"
`;
assert.doesNotThrow(
  () => validateSurgeModule(nativeSurgeTaskScript, {id:'ScopeFixture'}),
);

const qxLeadingNoteFixture = {
  id:'QxLeadingNoteFixture',
  source:'https://example.invalid/qx-leading-note.lpx',
  qx:'QxLeadingNoteFixture.snippet',
  surge:'QxLeadingNoteFixture.sgmodule',
  category:'测试',
};
const qxLeadingNoteSource = `#!name=QxLeadingNoteFixture
[Rule]
# Work VPN
DOMAIN-SUFFIX,example.com,PROXY
# Ad group
DOMAIN,ads-a.example.com,REJECT
DOMAIN,ads-b.example.com,REJECT
# First comment
# Second comment
DOMAIN,two-comments.example.com,REJECT

[Rewrite]
# Block ads
^https:\\/\\/ads\\.example\\.com reject
# Rewrite group
^https:\\/\\/a\\.example\\.com reject
^https:\\/\\/b\\.example\\.com reject

[Script]
# Script note
http-response ^https:\\/\\/script\\.example\\.com script-path=https://scripts.example.com/note.js,requires-body=true
# Script group
http-response ^https:\\/\\/script-a\\.example\\.com script-path=https://scripts.example.com/a.js,requires-body=true
http-response ^https:\\/\\/script-b\\.example\\.com script-path=https://scripts.example.com/b.js,requires-body=true
`;
const qxLeadingNoteOutput=convert(qxLeadingNoteFixture,qxLeadingNoteSource,new Map(),STAMP);
assert.match(qxLeadingNoteOutput.qx, /^\{# Work VPN #\} host-suffix, example\.com, PROXY$/m);
assert.match(qxLeadingNoteOutput.qx, /^\{# Block ads #\} \^https:\\\/\\\/ads\\\.example\\\.com url reject$/m);
assert.match(qxLeadingNoteOutput.qx, /^\{# Script note #\} \^https:\\\/\\\/script\\\.example\\\.com url script-response-body https:\/\/scripts\.example\.com\/note\.js$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /^# Work VPN$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /^# Block ads$/m);
assert.match(qxLeadingNoteOutput.qx, /^# Ad group$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /\{# Ad group #\}/);
assert.match(qxLeadingNoteOutput.qx, /^# First comment$/m);
assert.match(qxLeadingNoteOutput.qx, /^# Second comment$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /\{# Second comment #\}/);
assert.match(qxLeadingNoteOutput.qx, /^# Rewrite group$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /\{# Rewrite group #\}/);
assert.match(qxLeadingNoteOutput.qx, /^# Script group$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /\{# Script group #\}/);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /^# Script note$/m);
assert.doesNotMatch(qxLeadingNoteOutput.qx, /\{# (?:Converted|Converted by|Category|Target|Source)/);
assert.match(qxLeadingNoteOutput.surge, /^# Work VPN$/m);
assert.match(qxLeadingNoteOutput.surge, /^#!arguments=wayx_proxy_policy:DIRECT$/m);
assert.match(qxLeadingNoteOutput.surge, /^DOMAIN-SUFFIX,example\.com,\{\{\{wayx_proxy_policy\}\}\}$/m);
assert.match(qxLeadingNoteOutput.surge, /^# Block ads$/m);
assert.match(qxLeadingNoteOutput.surge, /^# Script note$/m);
assert.match(qxLeadingNoteOutput.surge, /^# Script group$/m);
validateQX(qxLeadingNoteOutput.qx, qxLeadingNoteFixture);

const argumentRewriteFixture = {
  id:'ArgumentRewriteFixture',
  source:'https://example.invalid/argument-rewrite.lpx',
  qx:'ArgumentRewriteFixture.snippet',
  surge:'ArgumentRewriteFixture.sgmodule',
  category:'测试',
};
const argumentRewriteSource = `#!name=ArgumentRewriteFixture
[Argument]
enabled=switch,true,tag=Enabled
price=input,9.99,type=number,tag=Price

[Rewrite]
response if \${enabled} == true && \${url} ~= /api/ then response.json.replace("data.price", \${price})
`;
const argumentRewriteOutput = convert(argumentRewriteFixture, argumentRewriteSource, new Map(), STAMP);
assert.match(argumentRewriteOutput.qx, /REVIEW REQUIRED: Quantumult X cannot carry Loon plugin \[Argument\] references/);
assert.doesNotMatch(argumentRewriteOutput.qx, /Source \[Argument\]|Argument usage:|enabled=switch|price=input/);
assert.match(argumentRewriteOutput.surge, /^#!arguments=.*enabled:true.*price:9\.99/m);
assert.match(argumentRewriteOutput.surge, /wayx_json_mutation_.*type=http-response,pattern=.*script-path=.*argument=/);
assert.doesNotMatch(argumentRewriteOutput.surge, /REVIEW REQUIRED/);
assert.equal(
  argumentRewriteOutput.qx.split(/\r?\n/).some(line => !line.trim().startsWith('#') && /jsonjq-response-body/.test(line)),
  false,
  'plugin Argument Rewrite must not be frozen into an executable QX rewrite',
);
const argumentHelper = [...argumentRewriteOutput.generatedScripts.values()].find(text => /__wayxArgs/.test(text));
assert.ok(argumentHelper, 'Surge Argument Rewrite must generate a runtime helper');
assert.match(argumentHelper, /JSON\.parse\(String\(\$argument/);

const directSourceScriptFixture = {
  id:'DirectSourceScriptFixture',
  source:'https://example.invalid/direct-source-script.lpx',
  qx:'DirectSourceScriptFixture.snippet',
  surge:'DirectSourceScriptFixture.sgmodule',
  category:'测试',
};
const directSourceScriptUrl='https://scripts.example.com/source-runtime.js';
const directSourceScriptSource = `#!name=DirectSourceScriptFixture
[Script]
http-response ^https:\\/\\/api\\.example\\.com script-path=${directSourceScriptUrl},tag=source_response,requires-body=true
`;
const directSourceScriptMap = new Map([[directSourceScriptUrl, {
  qx:directSourceScriptUrl,
  surge:directSourceScriptUrl,
  source:'throw new Error("Quantumult X is not supported"); const body=$utils.ungzip($response.bodyBytes);',
}]]);
const directSourceScriptOutput=convert(directSourceScriptFixture,directSourceScriptSource,directSourceScriptMap,STAMP);
assert.ok(directSourceScriptOutput.qx.includes('script-response-body ' + directSourceScriptUrl));
assert.ok(directSourceScriptOutput.surge.includes('script-path=' + directSourceScriptUrl));
assert.doesNotMatch(directSourceScriptOutput.qx, /source script disabled/i);

const disabledRewriteFixture = {
  id:'DisabledRewriteFixture',
  source:'https://example.invalid/disabled-rewrite.lpx',
  qx:'DisabledRewriteFixture.snippet',
  surge:'DisabledRewriteFixture.sgmodule',
  category:'测试',
};
const disabledRewriteSource = `#!name=DisabledRewriteFixture
[Rewrite]
#response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/mock\\?/i then response.body.mock("text", "OK", 200)
#response if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/json\\?/i then response.json.jq(".data.ads = []")
`;
const unknownSectionFixture = {
  id:'UnknownSectionFixture',
  source:'https://example.invalid/unknown-section.lpx',
  qx:'UnknownSectionFixture.snippet',
  surge:'UnknownSectionFixture.sgmodule',
  category:'测试',
};
const unknownSectionSource = `#!name=UnknownSectionFixture
[FutureFeature]
foo = bar
`;
const unknownSectionOutput = convert(unknownSectionFixture, unknownSectionSource, new Map(), STAMP);
assert.match(unknownSectionOutput.qx, /ISSUE REQUIRED \[unknown-source-section\]: unsupported Loon source section \[FutureFeature\]/);
assert.match(unknownSectionOutput.qx, /# Source declaration: foo = bar/);
assert.match(unknownSectionOutput.surge, /ISSUE REQUIRED \[unknown-source-section\]: unsupported Loon source section \[FutureFeature\]/);
assert.match(unknownSectionOutput.surge, /# Source declaration: foo = bar/);

const disabledRewriteOutput = convert(disabledRewriteFixture, disabledRewriteSource, new Map(), STAMP);
assert.match(disabledRewriteOutput.surge, /^\[Body Rewrite\]$/m);
assert.match(disabledRewriteOutput.surge, /#response if \$\{url\} ~= \/\^https:\\\/\\\/api\\\.example\\\.com\\\/json\\\?\/i then response\.json\.jq/);
assert.ok(disabledRewriteOutput.surge.includes("# http-response-jq ^https:\\/\\/api\\.example\\.com\\/json\\? '.data.ads = []'"));
assert.match(disabledRewriteOutput.surge, /^\[Map Local\]$/m);
assert.match(disabledRewriteOutput.surge, /#response if \$\{url\} ~= \/\^https:\\\/\\\/api\\\.example\\\.com\\\/mock\\\?\/i then response\.body\.mock\("text", "OK", 200\)/);
assert.ok(disabledRewriteOutput.surge.includes('# ^https:\\/\\/api\\.example\\.com\\/mock\\? data-type=text data="OK" status-code=200 header="Content-Type:text/plain"'));
assert.equal(
  disabledRewriteOutput.surge.split(/\r?\n/).some(line => !line.trim().startsWith('#') && /api\\\.example\\\.com\/(?:mock|json)/.test(line)),
  false,
  'disabled source Rewrite entries must remain disabled after Surge conversion',
);

const cases = [
  {
    name:'HTTPDNS',
    entry:byId.get('HTTPDNS'),
    file:'Resource/Loon/Block_HTTPDNS.lpx',
  },
  {
    name:'PinDuoDuo',
    entry:byId.get('PinDuoDuo'),
    file:'Resource/Loon/PinDuoDuo_remove_ads.lpx',
  },
  {
    name:'MyBlockAds',
    entry:{
      id:'MyBlockAds',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/myblockads.lpx',
      qx:'MyBlockAds.snippet',
      surge:'MyBlockAds.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/myblockads.lpx',
  },
  {
    name:'YouTube',
    entry:{
      id:'YouTube',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/youtube.lpx',
      qx:'YouTube.snippet',
      surge:'YouTube.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/youtube.lpx',
  },
  {
    name:'Bilibili',
    entry:{
      id:'Bilibili',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/bilibili.lpx',
      qx:'Bilibili.snippet',
      surge:'Bilibili.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/bilibili.lpx',
  },
  {
    name:'JingDong',
    entry:{
      id:'JingDong',
      source:'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/jingdong.lpx',
      qx:'JingDong.snippet',
      surge:'JingDong.sgmodule',
      category:'去广告',
    },
    file:'Resource/Loon/RuCu6/jingdong.lpx',
  },
];

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function regressionScriptSource(url) {
  // Real-plugin regression fixtures may encode known source behavior, but the
  // production converter never sees these identities. Genericity is enforced
  // separately by generic-identity.mjs and genericity-audit.mjs.
  if (/\/bilibili\/(?:request|response)\.js(?:\?|$)/i.test(url)) {
    return 'throw new Error("Quantumult X is not supported"); const body=$utils.ungzip($response.bodyBytes);';
  }
  if (/\/youtube\/(?:request|response)\.js(?:\?|$)/i.test(url)) {
    return 'const isQX=typeof $task!=="undefined"; const pref=$prefs.valueForKey("x"); $done({body:$response&&$response.body});';
  }
  if (/\/12306\.js(?:\?|$)/i.test(url)) {
    return 'const body=$request.body; const isQX=typeof $task!=="undefined"; if(isQX)$done({body});else $done({response:{body}});';
  }
  if (/\/header\.js(?:\?|$)/i.test(url)) {
    return 'const h=$request.headers; if(h) $done({status:"HTTP/1.1 404 Not Found"}); else $done({});';
  }
  return 'const isQX=typeof $task!=="undefined"; $done({});';
}

function passthroughScriptMap(source) {
  return new Map(discoverSourceScriptUrls(source).map(url => [
    url,
    {qx:url, surge:url, source:regressionScriptSource(url)},
  ]));
}

function regressionJqFiles(source) {
  // Network/dependency fidelity is covered by conversion-context-materializers.
  // The offline golden only needs a deterministic valid JQ payload so legacy
  // jq-path declarations exercise the active native-JQ target path.
  const out=new Map();
  for (const raw of String(source).split(/\r?\n/)) {
    const line=raw.trim();
    if (!line || !/jq-path\s*=/.test(line)) continue;
    out.set(line,{
      content:'walk(if type=="object" and .__typename=="AdPost" then empty else . end)',
      sourceFile:'fixture://legacy-jq-path',
      legacyAlias:true,
    });
  }
  return out;
}

function activeLines(text) {
  return text.split('\n').filter(raw => {
    const line = raw.trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//') && !/^\[[^\]]+\]$/.test(line);
  });
}

function count(text, re) {
  return (text.match(re) || []).length;
}

const report = [];
const goldenMismatches = [];
for (const testCase of cases) {
  assert.ok(testCase.entry, `${testCase.name}: missing manifest entry`);
  const source = await fs.readFile(path.join(ROOT, testCase.file), 'utf8');
  const scripts = passthroughScriptMap(source);
  const jqFiles = regressionJqFiles(source);
  const out = convert(testCase.entry, source, scripts, STAMP, new Map(), jqFiles);

  validateQX(out.qx, testCase.entry);
  validateSurgeModule(out.surge, testCase.entry);

  assert.match(out.qx, /^#?!.+|^# /m);
  assert.ok(out.qx.includes('# [filter_local]'));
  assert.ok(out.qx.includes('# [rewrite_local]'));
  assert.ok(out.qx.includes('# [mitm]'));
  assert.equal(/^\[(?:filter_local|rewrite_local|mitm)\]$/mi.test(out.qx), false);

  assert.match(out.surge, /^#!name=.+$/m);
  assert.match(out.surge, /^#!desc=.+$/m);
  assert.equal(/^#!(?:author|icon|date|loon_version)=/mi.test(out.surge), false);

  // Conversion may create target helper scripts for rewrite/mock semantics, but
  // original Script-section JavaScript is never rewritten or wrapped.
  for (const url of discoverSourceScriptUrls(source)) {
    assert.ok(![...out.generatedScripts.values()].some(body => body.includes('Source: ' + url) && body.includes('Script v2 ->')));
  }

  const actual = {
    name:testCase.name,
    source:testCase.file,
    qxSha256:sha256(out.qx),
    surgeSha256:sha256(out.surge),
    qxBytes:Buffer.byteLength(out.qx),
    surgeBytes:Buffer.byteLength(out.surge),
    sourceScriptCount:scripts.size,
    generatedScriptCount:out.generatedScripts.size,
    qxReview:count(out.qx, /REVIEW REQUIRED/g),
    surgeReview:count(out.surge, /REVIEW REQUIRED/g),
    sections:[...out.surge.matchAll(/^\[([^\]]+)\]$/gm)].map(m => m[1]),
  };

  const expected = golden.cases[testCase.name];
  assert.ok(expected, testCase.name + ': missing golden fixture');
  for (const key of ['qxSha256','surgeSha256','qxBytes','surgeBytes','sourceScriptCount','generatedScriptCount','qxReview','surgeReview']) {
    if (actual[key] !== expected[key]) {
      goldenMismatches.push({
        case:testCase.name,
        key,
        expected:expected[key],
        actual:actual[key],
      });
    }
  }
  if (JSON.stringify(actual.sections) !== JSON.stringify(expected.sections)) {
    goldenMismatches.push({
      case:testCase.name,
      key:'sections',
      expected:expected.sections,
      actual:actual.sections,
    });
  }

  const qxActive = activeLines(out.qx);
  const surgeActive = activeLines(out.surge);

  if (testCase.name === 'HTTPDNS') {
    assert.match(out.surge, /^#!requirement=CORE_VERSION>=20$/m);
    assert.match(out.surge, /AND,\(\(URL-REGEX,/);
    assert.match(out.surge, /USER-AGENT,/);
    assert.equal(/^#!(?:author|icon|date|loon_version)=/mi.test(out.surge), false);
    assert.ok(qxActive.some(line => /url reject-200$/.test(line)), 'HTTPDNS: QX URL-REGEX reject mapping missing');
  }

  if (testCase.name === 'PinDuoDuo') {
    assert.match(out.surge, /AND,\(\(DOMAIN,\s*api\.pinduoduo\.com\),\s*\(PROTOCOL,\s*QUIC\)\),REJECT/);
    assert.match(out.surge, /^\[Body Rewrite\]$/m);
    assert.match(out.surge, /^\[Map Local\]$/m);
    assert.match(out.surge, /^\[Script\]$/m);
    assert.match(out.surge, /^hostname = %APPEND% api\.pinduoduo\.com, m\.pinduoduo\.net$/m);
    assert.ok(surgeActive.some(line => line.includes('script-path=https://kelee.one/Resource/JavaScript/PinDuoDuo/PinDuoDuo_remove_ads.js')));
  }

  if (testCase.name === 'MyBlockAds') {
    assert.doesNotMatch(out.qx, /jq-path=/);
    assert.doesNotMatch(out.surge, /jq-path=/);
    assert.match(out.qx, /url jsonjq-response-body 'walk\(if type=="object" and \.__typename=="AdPost" then empty else \. end\)'/);
    assert.match(out.surge, /http-response-jq .*'walk\(if type=="object" and \.__typename=="AdPost" then empty else \. end\)'/);
    assert.match(out.surge, /^\[Body Rewrite\]$/m);
    assert.match(out.surge, /^\[Map Local\]$/m);
  }

  if (testCase.name === 'YouTube') {
    assert.doesNotMatch(out.qx, /Source \[Argument\]|Argument usage:/, 'YouTube QX must not emit Loon plugin parameter UI/declarations');
    assert.match(out.surge, /^#!arguments=.*captionLang:zh-Hans/m);
    assert.match(out.surge, /argument="\{\\\"captionLang\\\":\\\"\{\{\{captionLang\}\}\}\\\"\}"/);
    assert.ok(qxActive.some(line => /youtube\/request\.js$/.test(line)), 'YouTube: request binary scripts must follow KOP-XIAO and remain active as script-request-body');
    assert.match(out.qx, /binary_body_mode=true ignored for Quantumult X/);
    assert.doesNotMatch(out.qx, /SCRIPT V2 REVIEW REQUIRED/);
    assert.doesNotMatch(out.surge, /SCRIPT V2 REVIEW REQUIRED/);
  }

  if (testCase.name === 'Bilibili') {
    assert.match(out.qx, /^\{# 空降助手 #\} host, bsbsb\.top, PROXY$/m, 'Bilibili: one-to-one source comment must become a QX leading note while PROXY remains literal');
    assert.doesNotMatch(out.qx, /Source \[Argument\]|Argument usage:/, 'Bilibili QX must not emit Loon plugin parameter UI/declarations');
    assert.doesNotMatch(out.qx, /QUANTUMULT X (?:UNSUPPORTED|REVIEW REQUIRED) - source script disabled/);
    assert.ok(qxActive.some(line => /bilibili\/(?:request|response|json)\.js/.test(line)), 'Bilibili Source Script declarations must keep original URLs without runtime compatibility gating');
    assert.match(out.qx, /binary_body_mode=true ignored for Quantumult X/);
    assert.doesNotMatch(out.qx, /SCRIPT V2 REVIEW REQUIRED/);
    assert.doesNotMatch(out.surge, /Source Loon plugin policy PROXY requires a Surge module policy parameter binding/);
    assert.doesNotMatch(out.surge, /Source declaration:.*PROXY[\s\S]*REVIEW REQUIRED: Surge Module requires an external policy binding/);
    assert.match(out.surge, /^#!arguments=.*displayUpList:auto.*sponsorBlock:true.*wayx_proxy_policy:DIRECT/m);
    assert.match(out.surge, /^DOMAIN,bsbsb\.top,\{\{\{wayx_proxy_policy\}\}\}$/m);
    assert.match(out.surge, /#!REQUIREMENT "'\{\{\{sponsorBlock\}\}\}'=='true'"/);
    assert.doesNotMatch(out.surge, /SCRIPT V2 REVIEW REQUIRED/);
    assert.match(
      out.surge,
      /#response if \$\{url\} ~= \/\^https:\\\/\\\/app\\\.bilibili\\\.com\\\/x\\\/v2\\\/splash\\\/list\\\?\/i then response\.body\.mock\("text", "OK", 200\)/,
      'Bilibili: disabled source mock line must be preserved as a comment',
    );
    assert.ok(
      out.surge.includes('# ^https:\\/\\/app\\.bilibili\\.com\\/x\\/v2\\/splash\\/list\\? data-type=text data="OK" status-code=200 header="Content-Type:text/plain"'),
      'Bilibili: disabled response.body.mock must have a disabled Surge Map Local equivalent',
    );
    assert.ok(
      out.surge.includes("# http-response-jq ^https:\\/\\/app\\.bilibili\\.com\\/x\\/v2\\/splash\\/(show|event\\/list2)\\? '.data |= with_entries("),
      'Bilibili: disabled response.json.jq must have a disabled Surge Body Rewrite equivalent',
    );
  }

  if (testCase.name === 'JingDong') {
    assert.match(out.surge, /^#!arguments=Capture:false,Cookies:/m);
    assert.match(out.surge, /#!REQUIREMENT "'\{\{\{Capture\}\}\}'=='true'"/);
    assert.ok(qxActive.some(line => /Scripts\/jingdong\.js$/.test(line)), 'JingDong native script declaration missing');
    assert.ok(qxActive.some(line => /Scripts\/manmanbuy_ck\.js$/.test(line)), 'JingDong dynamic-enable request script must default to active in QX');
    assert.ok(qxActive.some(line => /Scripts\/jd_price\.js$/.test(line)), 'JingDong argument-bearing response script must remain active in QX');
    assert.doesNotMatch(out.qx, /SCRIPT V2 REVIEW REQUIRED/);
    assert.match(out.qx, /Source dynamic enable=Capture ignored for Quantumult X; converted rule defaults to enabled/);
    assert.match(out.qx, /Source Script argument ignored for Quantumult X/);
  }

  report.push(actual);
}

console.log('End-to-end conversion report:');
console.log(JSON.stringify(report, null, 2));
if (goldenMismatches.length) {
  console.error('Golden mismatches:');
  console.error(JSON.stringify(goldenMismatches, null, 2));
}
assert.deepEqual(goldenMismatches, [], 'end-to-end golden mismatches detected');
console.log('End-to-end conversion golden passed');
}

if (selectedCase === "generic-identity.mjs") {
// Suite case: generic-identity.mjs
const sourceA = `#!name=Unknown Alpha
#!desc=Generic conversion fixture
#!author=Someone

[Rule]
DOMAIN-SUFFIX,example.com,REJECT
IP-CIDR,192.0.2.0/24,DIRECT,no-resolve

[Rewrite]
^https:\\/\\/ads\\.example\\.com reject-dict
^https:\\/\\/old\\.example\\.com 302 https://new.example.com
^https:\\/\\/api\\.example\\.com response-body-replace-regex enabled:true enabled:false
^https:\\/\\/api\\.example\\.com response-body-json-del data.ads
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/v2/ then request.header.set("X-WayX", "1")

[Script]
http-response ^https:\\/\\/api\\.example\\.com script-path=https://scripts.example.com/generic.js,tag=generic_response,requires-body=true

[MitM]
hostname = api.example.com, ads.example.com
`;

const sourceB = sourceA
  .replace('#!name=Unknown Alpha', '#!name=Totally Different Plugin')
  .replace('#!author=Someone', '#!author=Another Author');

const scriptMap = new Map([
  ['https://scripts.example.com/generic.js', {
    qx:'https://scripts.example.com/generic.js',
    surge:'https://scripts.example.com/generic.js',
    source:'const isQX=typeof $task!=="undefined"; if(isQX){$done({body:$response.body});}else{$done({body:$response.body});}',
    qxAdapted:false,
  }],
]);

const entryA = {
  id:'AlphaIdentity',
  source:'https://source-a.invalid/plugin.lpx',
  qx:'Alpha.snippet',
  surge:'Alpha.sgmodule',
  category:'测试',
};
const entryB = {
  id:'CompletelyDifferentIdentity',
  source:'https://another-source.invalid/random-name.lpx',
  qx:'Different.snippet',
  surge:'Different.sgmodule',
  category:'另一分类',
};

const stamp='2026-09-29 12:00:00 +08:00';
const ctx={scriptMap,stamp,mockFiles:new Map(),jqFiles:new Map(),rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
const outA=convertPlugin(entryA,sourceA,ctx);
const outB=convertPlugin(entryB,sourceB,ctx);

validateQX(outA.qx, entryA);
validateQX(outB.qx, entryB);
validateSurgeModule(outA.surge, entryA);
validateSurgeModule(outB.surge, entryB);

function normalizeGeneratedIdentityPath(line, entryId){
  return line.replaceAll('/Script/' + entryId + '/', '/Script/<identity>/');
}
function qxSemantics(text, entryId){
  return text.split('\n')
    .map(x=>normalizeGeneratedIdentityPath(x.trim(), entryId))
    .filter(x=>x && !x.startsWith('#'));
}
function surgeSemantics(text, entryId){
  return text.split('\n')
    .map(x=>normalizeGeneratedIdentityPath(x.trim(), entryId))
    .filter(x=>x && !x.startsWith('#') && !/^\[[^\]]+\]$/.test(x));
}

assert.deepEqual(qxSemantics(outA.qx, entryA.id), qxSemantics(outB.qx, entryB.id));
assert.deepEqual(surgeSemantics(outA.surge, entryA.id), surgeSemantics(outB.surge, entryB.id));
function generatedScriptSemantics(map){
  return [...map].map(([name, body]) => [
    name,
    String(body)
      .split('\n')
      .filter(line => !/^\/\/ (?:Converted:|Converted by:|Category:)/.test(line))
      .join('\n'),
  ]);
}
assert.deepEqual(generatedScriptSemantics(outA.generatedScripts), generatedScriptSemantics(outB.generatedScripts));

assert.ok(qxSemantics(outA.qx, entryA.id).includes('^https:\\/\\/ads\\.example\\.com url reject-dict'));
assert.ok(surgeSemantics(outA.surge, entryA.id).includes('^https:\\/\\/ads\\.example\\.com data-type=text data="{}" status-code=200 header="Content-Type:application/json"'));
assert.ok(surgeSemantics(outA.surge, entryA.id).some(x=>x.startsWith('http-response ^https:\\/\\/api\\.example\\.com enabled:true enabled:false')));
assert.ok(qxSemantics(outA.qx, entryA.id).some(x=>x.includes("jsonjq-response-body 'del(.data.ads)'")));
assert.ok(qxSemantics(outA.qx, entryA.id).some(x=>x.includes('script-response-body https://scripts.example.com/generic.js')));

console.log('Generic identity-invariance conversion test passed');
}

if (selectedCase === "loon-new-syntax-cases.mjs") {
// Suite case: loon-new-syntax-cases.mjs
// User-supplied Loon new-syntax reference cases.
// Source semantics are asserted; script source files are never rewritten here.

const deleteAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.delete(["activity_switch", "video_report_config", "wl_config.pb_banner_funad_cache_strategy", "scheme_whitelist"])'
);
const deleteQx = qxDirectRewritePlan(deleteAst);
const deleteSurge = surgeDirectRewritePlan(deleteAst);
assert.equal(deleteQx.ok, true);
assert.match(deleteQx.line, /jsonjq-response-body/);
assert.doesNotMatch(deleteQx.line, /delpaths/);
assert.match(deleteQx.line, /del\(\.activity_switch, \.video_report_config, \.wl_config\.pb_banner_funad_cache_strategy, \.scheme_whitelist\)/);
assert.equal(deleteSurge.ok, true);
assert.match(deleteSurge.line, /^http-response-jq /);
assert.match(deleteSurge.line, /del\(\.activity_switch, \.video_report_config, \.wl_config\.pb_banner_funad_cache_strategy, \.scheme_whitelist\)/);

const replaceAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.replace(["wl_config.home_ad_num", "wl_config.frs_ad_num", "wl_config.index_bear_first_floor_max"], [0, 0, 999999999])'
);
assert.equal(qxDirectRewritePlan(replaceAst).ok, true);
const replaceQx = qxDirectRewritePlan(replaceAst);
const replaceSurge = surgeDirectRewritePlan(replaceAst);
assert.match(replaceQx.line, /getpath/);
assert.match(replaceQx.line, /setpath/);
assert.equal(replaceSurge.ok, true);
assert.match(replaceSurge.line, /getpath/);

const addAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tiebac\\.baidu\\.com\\/c\\/s\\/sync$/i then response.json.add("wl_config.new_flag", true)'
);
const addQx = qxDirectRewritePlan(addAst);
const addSurge = surgeDirectRewritePlan(addAst);
assert.equal(addQx.ok, true);
assert.match(addQx.line, /getpath/);
assert.match(addQx.line, /== null/);
assert.equal(addSurge.ok, true);
assert.match(addSurge.line, /^http-response-jq /);

const scalarDeleteAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.delete("data.ad")'
);
assert.match(qxDirectRewritePlan(scalarDeleteAst).line, /'del\(\.data\.ad\)'$/);

const indexedDeleteAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.delete(["items[0]", "items[1]"])'
);
const indexedDeleteQx = qxDirectRewritePlan(indexedDeleteAst);
const indexedDeleteSurge = surgeDirectRewritePlan(indexedDeleteAst);
assert.match(indexedDeleteQx.line, /del\(\.items\[0\]\) \| del\(\.items\[1\]\)/);
assert.match(indexedDeleteSurge.line, /del\(\.items\[0\]\) \| del\(\.items\[1\]\)/);

const jqAst = parseRewriteV2(
  'response if ${url} ~= /^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/mtop\\.taobao\\.idle\\.trade\\.full\\.info\\//i then response.json.jq(".data.components |= map(select(.render | . == \\"orderStatusVO\\" or . == \\"addressInfoVO\\" or . == \\"orderInfoVO\\"))")'
);
const jqQx = qxDirectRewritePlan(jqAst);
assert.equal(jqQx.ok, true);
assert.match(jqQx.line, /jsonjq-response-body/);
assert.equal(surgeDirectRewritePlan(jqAst).ok, true);

const preserveJqSource = '.a |= (. + 1) | .b = [1, 2] | .c = {"x": true}';
const preserveJqAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.jq("' + preserveJqSource.replace(/"/g, '\\"') + '")'
);
const preserveJqQx = qxDirectRewritePlan(preserveJqAst);
const preserveJqSurge = surgeDirectRewritePlan(preserveJqAst);
assert.ok(preserveJqQx.line.endsWith("'" + preserveJqSource + "'"));
assert.ok(preserveJqSurge.line.endsWith("'" + preserveJqSource + "'"));

const preserveDelpathsSource = 'delpaths([["ads"],["promo"]])';
const preserveDelpathsAst = parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.jq("' + preserveDelpathsSource.replace(/"/g, '\\"') + '")'
);
const preserveDelpathsQx = qxDirectRewritePlan(preserveDelpathsAst);
const preserveDelpathsSurge = surgeDirectRewritePlan(preserveDelpathsAst);
assert.ok(preserveDelpathsQx.line.endsWith("'" + preserveDelpathsSource + "'"));
assert.ok(preserveDelpathsSurge.line.endsWith("'" + preserveDelpathsSource + "'"));

const mockAst = parseRewriteV2(
  'response if ${url} ~= /^https?:\\/\\/tieba\\.baidu\\.com\\/mo\\/q\\/search\\/startPage\\?/i then response.body.mock("json", "{\\"no\\":0,\\"error\\":\\"success\\"}", 200)'
);
const qxMock = renderQxInlineMockScript(mockAst, {category:'Adblock'});
assert.equal(qxMock.qxAction, 'script-echo-response');
assert.match(qxMock.script, /__wayxBody = /);
assert.match(qxMock.script, /success/);
const surgeMock = surgeInlineMockPlan(mockAst);
assert.equal(surgeMock.ok, true);
assert.equal(surgeMock.section, 'map');

const rejectDictAst = parseRewriteV2(
  'request if ${url} ~= /^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/mtop\\.taobao\\.idle\\.user\\.strategy\\.list\\//i then reject_dict(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectDictAst.actions[0]), 'reject-dict');

const reject404Ast = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-access\\.pangolin-sdk-toutiao\\.com\\/api\\/ad\\/union\\/sdk/i then reject(404)'
);
const reject404Qx = qxDirectRewritePlan(reject404Ast);
assert.equal(reject404Qx.ok, true);
assert.match(reject404Qx.line, / url reject$/);
const reject404Surge = surgeRejectRewritePlan(reject404Ast);
assert.equal(reject404Surge.ok, true);
assert.equal(reject404Surge.section, 'url');
assert.match(reject404Surge.line, / _ reject$/);

const rejectImgAst = parseRewriteV2(
  'request if ${url} ~= /^https?:\\/\\/api-mifit\\.huami\\.com\\/discovery\\/mi\\/discovery\\/sport_summary_ad\\?/i then reject_img(200)'
);
assert.equal(qxPrimitiveForRewriteV2Action(rejectImgAst.actions[0]), 'reject-img');
const rejectImgSurge = surgeRejectRewritePlan(rejectImgAst);
assert.equal(rejectImgSurge.ok, true);
assert.equal(rejectImgSurge.section, 'map');
assert.match(rejectImgSurge.line, /data-type=tiny-gif status-code=200/);

const loonUrlImg = 'URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG';
assert.equal(qxRule(loonUrlImg).line, '^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\? url reject-img');
assert.equal(
  surgeRule(loonUrlImg),
  'URL-REGEX,^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?,REJECT-TINYGIF'
);

const loonLogicalRule = 'AND,((URL-REGEX,"^http:\\/\\/119\\.29\\.29\\.90\\/d\\?"),(USER-AGENT,"Example*")),DIRECT';
assert.equal(
  surgeRule(loonLogicalRule),
  'AND,((URL-REGEX,^http:\\/\\/119\\.29\\.29\\.90\\/d\\?),(USER-AGENT,"Example*")),DIRECT',
);

const loonNestedLogicalRule = 'AND,((DOMAIN-KEYWORD,tnc),(OR,((DOMAIN-SUFFIX,capcutapi.com),(DOMAIN-SUFFIX,zijieapi.com)))),DIRECT';
assert.equal(surgeRule(loonNestedLogicalRule), loonNestedLogicalRule);

const loonProtocolRule = 'AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT';
assert.equal(surgeRule(loonProtocolRule), loonProtocolRule);

const loonIpRule = 'IP-CIDR,39.156.140.30/32,REJECT,no-resolve';
assert.equal(surgeRule(loonIpRule), loonIpRule);

const loonUrlDrop = 'URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP';
assert.equal(qxRule(loonUrlDrop).line, '^https:\\/\\/drop\\.example\\.com url reject');
const surgeUrlDrop = surgeRule(loonUrlDrop);
assert.equal(surgeUrlDrop, 'URL-REGEX,^https:\\/\\/drop\\.example\\.com,REJECT-DROP');

const loonUrlNoDrop = 'URL-REGEX,"^https:\\/\\/nodrop\\.example\\.com",REJECT-NO-DROP';
const surgeUrlNoDrop = surgeRule(loonUrlNoDrop);
assert.equal(surgeUrlNoDrop, 'URL-REGEX,^https:\\/\\/nodrop\\.example\\.com,REJECT-NO-DROP');

console.log('Loon new-syntax reference cases passed');
}

if (selectedCase === "domain-migration.mjs") {
// Suite case: domain-migration.mjs
// Semantic domain migration regression tests
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Architecture / Semantics










// Poison provenance: target output must depend only on semantic IR fields.
for(const source of [
 'response if ${url} ~= /api/ then response.json.jq(".items")',
 'request if ${url} ~= /api/ then reject(404)',
]){
 const ir=rewriteV2AstToSemanticIr(parseRewriteV2(source),{source});
 const withoutProvenance={...ir,sourcePayload:null,ast:{actions:[],condition:null}};
 for(const planner of [planQxRewrite,planSurgeRewrite]){
  const ctx=()=>({generatedScripts:new Map(),rawBase:'https://example.com',id:'Synthetic',stamp:'2026-10-03',category:'Test'});
  assert.deepEqual(planner(withoutProvenance,ctx()),planner(ir,ctx()));
 }
}
const legacy=legacyRewriteToSemanticIr('^https://example.com','302 https://target.example');
for(const planner of [planQxRewrite,planSurgeRewrite]){
 assert.deepEqual(planner({...legacy,sourcePayload:null}),planner(legacy));
}
for(const source of [
 'http-response ^https://example.com script-path=https://example.com/a.js, requires-body=true, timeout=9, tag=Demo',
 'request if ${url} ~= /api/ then script("https://example.com/a.js") with requires_body=true, tag="Demo"',
 'cron "0 0 * * *" then script("https://example.com/a.js") with tag="Demo"',
]){
 const ir=parseScriptDeclaration(source);
 for(const planner of [planQxScript,planSurgeScript]){
  assert.deepEqual(planner({...ir,sourcePayload:null},{name:'Demo'}),planner(ir,{name:'Demo'}));
 }
}

const ir=parseConfigurationDeclaration('hostname = -private.example, *.example.com:8443, api.example, api.example');
assert.deepEqual(ir.hosts,['-private.example','*.example.com:8443','api.example','api.example']);
assert.equal(planConfiguration(ir,'qx').line,'hostname = -private.example, *.example.com:8443, api.example, api.example');
assert.equal(planConfiguration(ir,'surge').line,'hostname = %APPEND% -private.example, *.example.com:8443, api.example, api.example');
assert.throws(()=>planConfiguration(ir,'egern'),/Unknown configuration target/);
assert.match(planConfiguration(parseConfigurationDeclaration('hostname ='),'surge').line,/REVIEW REQUIRED/);
assert.match(planConfiguration(parseConfigurationDeclaration('h2 = true'),'qx').line,/unknown-mitm-option/);

const out=convertPlugin({id:'Synthetic',source:'https://example.com/demo.lpx',category:'Test'},[
 '#!name=Demo','[MITM]','# first section','hostname = one.example',
 '[MitM]','# second section','hostname = two.example','# trailing note',
].join('\n'),{stamp:'2026-10-03',rawBase:'https://example.com',scriptMap:new Map(),mockFiles:new Map(),jqFiles:new Map()});
for(const text of [out.qx,out.surge]){
 assert.ok(text.indexOf('one.example')<text.indexOf('two.example'));
 assert.ok(text.includes('# first section') && text.includes('# second section') && text.includes('# trailing note'));
}

// Every executable workflow command must resolve to an existing repository file.
for(const name of await fs.readdir('.github/workflows')){
 const text=await fs.readFile('.github/workflows/'+name,'utf8');
 for(const [,file] of text.matchAll(/\b(?:node|python)\s+(\.github\/[\w/.-]+\.(?:mjs|py))\b/g)){
  assert.ok((await fs.stat(file)).isFile(),'missing workflow executable: '+file);
 }
}
const scheduled=await fs.readFile('.github/workflows/upstream-monitor.yml','utf8');
assert.doesNotMatch(scheduled,/^\s+schedule:/m);
assert.match(scheduled,/workflow_dispatch:/);
console.log('Semantic domain migration passed: IR provenance independence, MITM order/comments, workflow paths/pause');
}

if (selectedCase === "source-section-comments.mjs") {
// Suite case: source-section-comments.mjs
// Source section / comment / metadata architecture contract
// Author: chance
// Category: Converter / Source Structure Validation






const grouped=groupSourceSectionItems([
  '# group',
  '',
  'DOMAIN-SUFFIX,example.com,REJECT',
  '; note',
  'DOMAIN,api.example.com,REJECT',
  '// trailing',
]);
assert.equal(grouped.length,3);
assert.deepEqual(grouped[0],{
  comments:['# group',''],
  line:'DOMAIN-SUFFIX,example.com,REJECT',
  sourceIndex:2,
});
assert.deepEqual(grouped[1],{
  comments:['; note'],
  line:'DOMAIN,api.example.com,REJECT',
  sourceIndex:4,
});
assert.deepEqual(grouped[2],{
  comments:['// trailing'],
  line:null,
  sourceIndex:6,
});

assert.deepEqual(cleanSourceComments(['# a','','','; b']),['# a','','; b']);
assert.equal(sourceCommentText('# hello'),'hello');
assert.equal(sourceCommentText('; hello'),'hello');
assert.equal(sourceCommentText('// hello'),'hello');
assert.equal(sourceCommentText('DOMAIN,example.com,REJECT'),null);

assert.deepEqual(
  [...WAYX_SUPPORTED_SOURCE_SECTIONS],
  ['Argument','General','Rule','Rewrite','Script','MITM','MitM'],
);
for(const name of ['Argument','General','Rule','Rewrite','Script','MITM','MitM']) {
  assert.equal(isSupportedSourceSection(name),true);
}
assert.equal(isSupportedSourceSection('MITMExtra'),false);

const metadata=parseSourceMetadataHeader([
  '#!name=Demo',
  '#!desc=Demo Loon plugin',
  '#!author=chance',
  '# source header comment',
  '',
]);
assert.equal(metadata.directives.get('name'),'Demo');
assert.equal(metadata.directives.get('desc'),'Demo Loon plugin');
assert.equal(metadata.directives.get('author'),'chance');
assert.deepEqual(metadata.comments,['# source header comment','']);

const qxHeader=renderQxSnippetHeader(
  ['#!name=Demo','#!desc=Demo Loon plugin','#!author=chance','# source header comment'],
  {id:'Fallback',category:'去广告',source:'https://example.com/demo.lpx'},
  '2026-10-01 12:00:00 +08:00',
);
assert.equal(qxHeader[0],'# Name: Demo');
assert.equal(qxHeader[1],'# Description: Demo Quantumult X plugin');
assert.ok(qxHeader.includes('# Author: chance'));
assert.ok(qxHeader.includes('# source header comment'));

const surgeHeader=renderSurgeModuleHeader(
  ['#!name=Demo','#!desc=Demo Loon plugin','#!author=chance','# source header comment'],
  {id:'Fallback',category:'去广告',source:'https://example.com/demo.lpx'},
  '2026-10-01 12:00:00 +08:00',
);
assert.equal(surgeHeader[0],'#!name=Demo');
assert.equal(surgeHeader[1],'#!desc=Demo Surge plugin');
assert.ok(surgeHeader.includes('# Author: chance'));
assert.ok(surgeHeader.includes('# source header comment'));

const oneCommentOneRule=['# ads','DOMAIN-SUFFIX,example.com,REJECT'];
const oneItem=groupSourceSectionItems(oneCommentOneRule)[0];
assert.deepEqual(
  attachQxInlineNote({
    sectionLines:oneCommentOneRule,
    item:oneItem,
    sectionKind:'rule',
    lines:['host-suffix, example.com, reject'],
  }),
  {comments:[],lines:['{# ads #} host-suffix, example.com, reject']},
);

const groupComment=['# ads','DOMAIN-SUFFIX,a.example,REJECT','DOMAIN-SUFFIX,b.example,REJECT'];
const groupItem=groupSourceSectionItems(groupComment)[0];
const groupRendered=attachQxInlineNote({
  sectionLines:groupComment,
  item:groupItem,
  sectionKind:'rule',
  lines:['host-suffix, a.example, reject'],
});
assert.deepEqual(groupRendered.comments,['# ads']);
assert.deepEqual(groupRendered.lines,['host-suffix, a.example, reject']);

const multiComment=['# ads','# group','DOMAIN-SUFFIX,a.example,REJECT'];
const multiItem=groupSourceSectionItems(multiComment)[0];
assert.deepEqual(
  attachQxInlineNote({
    sectionLines:multiComment,
    item:multiItem,
    sectionKind:'rule',
    lines:['host-suffix, a.example, reject'],
  }).comments,
  ['# ads','# group'],
);

const disabledSource=['# DOMAIN-SUFFIX,disabled.example,REJECT','DOMAIN-SUFFIX,a.example,REJECT'];
const disabledItem=groupSourceSectionItems(disabledSource)[0];
const disabledRendered=attachQxInlineNote({
  sectionLines:disabledSource,
  item:disabledItem,
  sectionKind:'rule',
  lines:['host-suffix, a.example, reject'],
});
assert.deepEqual(disabledRendered.comments,['# DOMAIN-SUFFIX,disabled.example,REJECT']);
assert.equal(disabledRendered.lines[0],'host-suffix, a.example, reject');

assert.equal(looksLikeCommentedSourceDeclaration('DOMAIN,example.com,REJECT','rule'),true);
assert.equal(looksLikeCommentedSourceDeclaration('response if ${url} ~= /api/ then reject(200)','rewrite'),true);
assert.equal(looksLikeCommentedSourceDeclaration('http-response ^https://api script-path=https://example.com/a.js','script'),true);
assert.equal(looksLikeCommentedSourceDeclaration('human explanation','rule'),false);

const expansion=attachQxInlineNote({
  sectionLines:oneCommentOneRule,
  item:oneItem,
  sectionKind:'rule',
  lines:['host-suffix, example.com, reject','host-keyword, example, reject'],
});
assert.deepEqual(expansion.comments,['# ads']);
assert.equal(expansion.lines.length,2);

console.log('Source section/comment/metadata architecture contract passed');
}

if (selectedCase === "target-output-builders.mjs") {
// Suite case: target-output-builders.mjs
// Target output builder contract
// Author: chance
// Category: Converter / Output / Validation






assert.deepEqual(compactOutputLines(['a','','','b','','']),['a','','b']);
assert.equal(hasActiveOutputLines(['# note','; note','// note','']),false);
assert.equal(hasActiveOutputLines(['# note','DOMAIN,example.com,DIRECT']),true);
assert.equal(finalizeOutputLines(['a','','']),'a\n');

const entry={
  id:'Demo',
  category:'去广告',
  source:'https://example.com/demo.lpx',
};
const stamp='2026-10-01 12:00:00 +08:00';
const header=['#!name=Demo','#!desc=Demo Loon plugin','# source comment'];

const qx=createQxOutputState();
assert.equal(qxOutputDestination(qx,'comment'),qx.notes);
assert.equal(qxRuleOutputDestination(qx,'comment'),qx.filter);
assert.equal(qxRuleOutputDestination(qx,'rewrite'),qx.rewrite);
assert.equal(qxRewriteOutputDestination(qx,'drop'),qx.rewrite);
assert.equal(qxRewriteOutputDestination(qx,'comment'),qx.notes);
assert.equal(appendQxOutput(qx,'notes','# global note'),true);
assert.equal(appendQxOutput(qx,'filter','host-suffix, example.com, reject','',''),true);
assert.equal(appendQxOutput(qx,'rewrite','^https://ads\\.example\\.com url reject-dict'),true);
assert.equal(appendQxOutput(qx,'task','event-interaction https://example.com/tool.js, tag=Tool, enabled=true'),true);

const qxText=renderQxOutput({state:qx,headerLines:header,entry,stamp});
assert.match(qxText,/^# Name: Demo$/m);
assert.match(qxText,/^# Description: Demo Quantumult X plugin$/m);
assert.match(qxText,/^# \[filter_local\]$/m);
assert.match(qxText,/^# \[rewrite_local\]$/m);
assert.match(qxText,/^# \[task_local\]$/m);
assert.match(qxText,/^# \[mitm\]$/m);
assert.ok(qxText.indexOf('# global note') < qxText.indexOf('# [filter_local]'));
assert.ok(qxText.indexOf('# [filter_local]') < qxText.indexOf('# [rewrite_local]'));
assert.ok(qxText.indexOf('# [rewrite_local]') < qxText.indexOf('# [task_local]'));
assert.ok(qxText.indexOf('# [task_local]') < qxText.indexOf('# [mitm]'));
assert.doesNotMatch(qxText,/\n\n\nhost-suffix/);
assert.equal(qxText.endsWith('\n'),true);

const qxEmpty=renderQxOutput({
  state:createQxOutputState(),
  headerLines:['#!name=Empty'],
  entry:{...entry,id:'Empty'},
  stamp,
});
assert.match(qxEmpty,/# \[filter_local\]\n\n# \[rewrite_local\]\n\n# \[mitm\]\n$/);
assert.doesNotMatch(qxEmpty,/# \[task_local\]/);

const sg=createSurgeOutputState();
assert.equal(surgeOutputDestination(sg,'comment'),sg.notes);
assert.equal(surgeRuleOutputDestination(sg,'map'),sg.map);
assert.equal(surgeRuleOutputDestination(sg,'comment'),sg.rule);
assert.equal(surgeRewriteOutputDestination(sg,'drop'),sg.notes);
assert.equal(surgeRewriteOutputDestination(sg,'unknown'),sg.notes);

appendSurgeOutput(sg,'notes','# module note');
appendSurgeOutput(sg,'rule','DOMAIN-SUFFIX,example.com,REJECT');
appendSurgeOutput(sg,'url','^https://old\\.example\\.com https://new.example.com 302');
appendSurgeOutput(sg,'header','http-request ^https://api\\.example\\.com header-del X-Test');
appendSurgeOutput(sg,'body','http-response-jq ^https://api\\.example\\.com del(.ads)');
appendSurgeOutput(sg,'map','^https://mock\\.example\\.com data-type=text data="{}" status-code=200');
appendSurgeOutput(sg,'script','demo = type=http-response,pattern=^https://api\\.example\\.com,script-path=https://example.com/a.js');
appendSurgeOutput(sg,'mitm','hostname = %APPEND% api.example.com');

const sgText=renderSurgeOutput({
  state:sg,
  headerLines:header,
  entry,
  stamp,
  argumentMetadata:['#!arguments=mode:on'],
  needsLineRequirement:false,
});
assert.match(sgText,/^#!name=Demo$/m);
assert.match(sgText,/^#!desc=Demo Surge plugin$/m);
assert.match(sgText,/^#!category=WayX$/m);
assert.doesNotMatch(sgText,/^# Category:/m);
assert.match(sgText,/^#!requirement=CORE_VERSION>=20$/m);
assert.match(sgText,/^#!arguments=mode:on$/m);
const surgeOrder=[
  '[Rule]',
  '[URL Rewrite]',
  '[Header Rewrite]',
  '[Body Rewrite]',
  '[Map Local]',
  '[Script]',
  '[MITM]',
].map(section=>sgText.indexOf(section));
assert.ok(surgeOrder.every(index=>index>=0));
assert.deepEqual([...surgeOrder].sort((a,b)=>a-b),surgeOrder);
assert.ok(sgText.indexOf('# module note') < sgText.indexOf('[Rule]'));
assert.equal(sgText.endsWith('\n'),true);

const sgSparse=createSurgeOutputState();
appendSurgeOutput(sgSparse,'url','^https://old\\.example\\.com https://new.example.com 302');
const sgSparseText=renderSurgeOutput({
  state:sgSparse,
  headerLines:['#!name=Sparse'],
  entry:{...entry,id:'Sparse'},
  stamp,
});
assert.doesNotMatch(sgSparseText,/^\[Rule\]$/m);
assert.match(sgSparseText,/^\[URL Rewrite\]$/m);
assert.doesNotMatch(sgSparseText,/^\[Header Rewrite\]$/m);
assert.doesNotMatch(sgSparseText,/^#!requirement=/m);

const sgCommentsOnly=createSurgeOutputState();
appendSurgeOutput(sgCommentsOnly,'body','# source body comment');
const sgCommentsText=renderSurgeOutput({
  state:sgCommentsOnly,
  headerLines:['#!name=Comments'],
  entry:{...entry,id:'Comments'},
  stamp,
});
assert.match(sgCommentsText,/^\[Body Rewrite\]$/m);
assert.doesNotMatch(sgCommentsText,/^#!requirement=CORE_VERSION>=20$/m);

const sgLineRequirement=createSurgeOutputState();
appendSurgeOutput(sgLineRequirement,'map','^https://mock\\.example\\.com data-type=text data="{}" status-code=200');
const sgLineRequirementText=renderSurgeOutput({
  state:sgLineRequirement,
  headerLines:['#!name=LineReq'],
  entry:{...entry,id:'LineReq'},
  stamp,
  needsLineRequirement:true,
});
assert.match(sgLineRequirementText,/^#!requirement=CORE_VERSION>=22$/m);
assert.doesNotMatch(sgLineRequirementText,/^#!requirement=CORE_VERSION>=20$/m);

console.log('Target output builder contract passed');
}

if (selectedCase === "conversion-policy.mjs") {
// Suite case: conversion-policy.mjs
// Conversion policy metadata and canonical-validator regression
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Validation / Regression





const entry={id:'Synthetic'};
const qx=`# Converted: 2026-10-03
# Converted by: chance
# Category: Test
# Target: Quantumult X
# Source: https://example.com/demo.lpx
# [filter_local]
{# Domain #} host, example.com, reject
# [rewrite_local]
^https://example.com/ url jsonjq-response-body '.items'
# [task_local]
event-interaction https://example.com/task.js, tag=Demo, enabled=true
# [mitm]
hostname = example.com
`;
validateConversionMetadata(qx,entry,'qx');validateQX(qx,entry);
assert.throws(()=>validateQX(qx.replace("^https://example.com/ url jsonjq-response-body '.items'",'response if ${url} ~= /api/ then reject(404)'),entry));
assert.throws(()=>validateConversionMetadata(qx.replace('# Converted by: chance',''),entry,'qx'),/metadata/);
const surge=`#!name=Demo
#!desc=Demo
#!category=WayX
# Converted: 2026-10-03
# Converted by: chance
# Target: Surge
# Source: https://example.com/demo.lpx
[General]
always-real-ip = %APPEND% api.example.com
[Rule]
DOMAIN,example.com,REJECT
[MITM]
hostname = %APPEND% example.com
`;
validateConversionMetadata(surge,entry,'surge');validateSurgeModule(surge,entry);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=Other'),entry,'surge'),/exactly one/);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=WayX\n#!category=WayX'),entry,'surge'),/exactly one/);
assert.throws(()=>validateConversionMetadata(surge.replace('#!category=WayX','#!category=WayX\n# Category: Test'),entry,'surge'),/legacy/);
assert.throws(()=>validateConversionMetadata(surge.replace('hostname = %APPEND%','hostname ='),entry,'surge'),/%APPEND%/);
// Previously rejected legal task/header/General declarations use the same
// validators as converter execution; no second capability allowlist is copied.
for(const [target,file] of [
 ['qx','Adblock/Quantumult X/Auto_Join_TF.snippet'],
 ['qx','Adblock/Quantumult X/NodeLinkCheck.snippet'],
 ['qx','Adblock/Quantumult X/Bilibili_remove_ads.snippet'],
 ['surge','Adblock/Surge/SeasunJX3_remove_ads.sgmodule'],
]){
 const text=await fs.readFile(file,'utf8');validateConversionMetadata(text,entry,target);
 if(target==='qx')validateQX(text,entry);else validateSurgeModule(text,entry);
}
console.log('Conversion policy canonical validator regression passed');
}
