// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / rewrite / Regression Suite

import { jsonActionToJq, analyzeSafeRewriteV2, dependencySpecFromAction, jqDependencySpecFromAction, inlineResolvedDependency, inlineResolvedLegacyJqPathIr, legacyJqPathDependencySpecFromIr, listRewriteV2Dependencies, qxMockPlanFromAction, compileRegexForTarget, qxDirectRewritePlan, surgeDirectRewritePlan, surgeRedirectRewritePlan, surgeRejectRewritePlan, surgeHeaderRewritePlan, surgeInlineMockPlan, surgeMockFilePlan, renderQxRedirectScript, renderQxRejectScript, renderQxHeaderScript, renderQxInlineMockScript, renderQxMockFileScript, renderSurgeRequestMockScript, LOON_REWRITE_V2_ACTIONS, minifyJq, minifyJqFile, quoteJq, renderFixedPathDeleteJq, classifyLegacyRewrite, legacyRewriteToSemanticIr, planLegacyRewrite, planLegacyRewriteIr, validateLoonSourceCatalog, planMitmLine, resolveOriginalUrl, parseLoonArguments, surgeArgumentMetadata, surgePluginObjectArgument, surgeRewriteArgumentPayload, surgeEnableRequirement, parseLegacyLoonPluginObjectRefs, analyzePluginArgumentUsage, rewriteV2PluginArgumentRefs, parseRewriteV2, qxPrimitiveForRewriteV2Action, qxRule, qxTargetPath, rewriteV2ToSource, selectQxScriptAction, parseScriptV2, scriptV2ToSource, scriptV2ArgumentRefs, scriptV2DynamicOptionRefs, scriptOptionBoolean, qxScriptV2Plan, surgeScriptV2Plan, surgeRule, surgeModuleRule, renderSurgeModuleHeader, renderQxSnippetHeader, validateSurgeModule, surgeTargetPath, validateRewriteV2Ast, classifyComplexRewrite, complexConditionKinds, registerComplexRewriteHandler, planComplexRewrite, listComplexRewriteHandlers, renderMixedRewriteScript, renderSingleJsonMutationScript, isEmptyJsonJqIr, isEmptyLegacyJsonJqIr, rewriteV2AstToSemanticIr, singleRewriteOperation, rewriteOperationKinds, planQxRewrite, jsonPipelineToSafeNativeJq, qxExactRewriteMatcherPlan, qxRewriteMatcherPlan, planSurgeRewrite } from "../src/index.mjs";
import assert from "node:assert/strict";
import vm from "node:vm";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["checkpoint.mjs","rewrite-ir.mjs","rewrite-target-planners.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "checkpoint.mjs") {
// Suite case: checkpoint.mjs
assert.equal(qxRule('URL-REGEX, "^https:\\/\\/ad\\.example\\.com", REJECT').line, '^https:\\/\\/ad\\.example\\.com url reject-200');
assert.equal(
  quoteJq('select(.title == "I\'m here")'),
  '\'select(.title == "I\\u0027m here")\'',
);
assert.throws(
  () => quoteJq(".foo'bar"),
  /single quote outside a JSON string/,
);

const jqDeletePolicy=jsonPipelineToSafeNativeJq(parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.delete(["activity_switch","wl_config.pb_banner_funad_cache_strategy","scheme_whitelist"])'
));
assert.match(jqDeletePolicy.jq,/delpaths/);
assert.doesNotMatch(jqDeletePolicy.jq,/getpath|setpath/);

const jqAddPolicy=jsonPipelineToSafeNativeJq(parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.add(["meta.count","flag"],[1,true])'
));
assert.match(jqAddPolicy.jq,/if \.meta\.count == null then \.meta\.count = 1/);
assert.match(jqAddPolicy.jq,/if \.flag == null then \.flag = true/);
assert.doesNotMatch(jqAddPolicy.jq,/getpath|setpath|has\(/);

const jqReplacePolicy=jsonPipelineToSafeNativeJq(parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.replace(["wl_config.home_ad_num","wl_config.index_bear_first_floor_max"],[0,999999999])'
));
assert.doesNotMatch(jqReplacePolicy.jq,/getpath|has\(|if /);
assert.match(jqReplacePolicy.jq,/setpath\(\["wl_config","home_ad_num"\]; 0\)/);

for (const [source,input,expected] of [
  ['response.json.replace("data.recProductList", `[]`)', '{}', {data:{recProductList:[]}}],
  ['response.json.replace("data.recProductList", "[]")', '{}', {data:{recProductList:"[]"}}],
  ['response.json.replace("data.vip", true)', '{"data":{"vip":null}}', {data:{vip:true}}],
  ['response.json.replace("items[2]", 9)', '{"items":[0]}', {items:[0,null,9]}],
  ['response.json.replace(`data["a.b"]`, false)', '{}', {data:{"a.b":false}}],
]) {
  const plan=jsonActionToJq(parseRewriteV2('response if ${url} ~= /api/ then '+source).actions[0]);
  assert.equal(plan.ok,true);
  assert.doesNotMatch(plan.jq,/getpath|has\(|if /);
  const checked=runIsolatedCase('jq',['-c',plan.jq],{input,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  assert.deepEqual(JSON.parse(checked.stdout),expected);
}

for (const [program,input,expected] of [
  [jqDeletePolicy.jq,'{"activity_switch":1,"wl_config":{"pb_banner_funad_cache_strategy":2,"keep":3},"scheme_whitelist":[]}','{"wl_config":{"keep":3}}'],
  [jqAddPolicy.jq,'{"meta":{},"flag":false}','{"meta":{"count":1},"flag":false}'],
  [jqReplacePolicy.jq,'{"wl_config":{"home_ad_num":5,"index_bear_first_floor_max":1,"keep":2}}','{"wl_config":{"home_ad_num":0,"index_bear_first_floor_max":999999999,"keep":2}}'],
]) {
  const checked=runIsolatedCase('jq',['-c',program],{input,encoding:'utf8'});
  assert.equal(checked.status,0,checked.stderr);
  assert.deepEqual(JSON.parse(checked.stdout),JSON.parse(expected));
}
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/empty\\.example\\.com",REJECT-200').line, '^https:\\/\\/empty\\.example\\.com url reject-200');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/image\\.example\\.com",REJECT-IMG').line, '^https:\\/\\/image\\.example\\.com url reject-img');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/dict\\.example\\.com",REJECT-DICT').line, '^https:\\/\\/dict\\.example\\.com url reject-dict');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/array\\.example\\.com",REJECT-ARRAY').line, '^https:\\/\\/array\\.example\\.com url reject-array');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP').line, '^https:\\/\\/drop\\.example\\.com url reject');
assert.equal(qxRule('DOMAIN,example.com,DIRECT').line, 'host, example.com, direct');
assert.equal(qxRule('DOMAIN,example.com,PROXY').line, 'host, example.com, PROXY');
const surgeUrlReject200 = surgeModuleRule('URL-REGEX,"^https:\\/\\/empty\\.example\\.com",REJECT-200');
assert.equal(surgeUrlReject200.section, 'map');
assert.equal(surgeUrlReject200.line, '^https:\\/\\/empty\\.example\\.com data-type=text data="" status-code=200');
const surgeUrlRejectDict = surgeModuleRule('URL-REGEX,"^https:\\/\\/dict\\.example\\.com",REJECT-DICT');
assert.equal(surgeUrlRejectDict.section, 'map');
assert.equal(surgeUrlRejectDict.line, '^https:\\/\\/dict\\.example\\.com data-type=text data="{}" status-code=200 header="Content-Type:application/json"');
const surgeUrlRejectArray = surgeModuleRule('URL-REGEX,"^https:\\/\\/array\\.example\\.com",REJECT-ARRAY');
assert.equal(surgeUrlRejectArray.section, 'map');
assert.equal(surgeUrlRejectArray.line, '^https:\\/\\/array\\.example\\.com data-type=text data="[]" status-code=200 header="Content-Type:application/json"');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG').line, '^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\? url reject-img');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP').line, '^https:\\/\\/drop\\.example\\.com url reject');
assert.equal(surgeRule('URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG'), 'URL-REGEX,^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?,REJECT-TINYGIF');
const surgeDropModule = surgeModuleRule('URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP');
assert.equal(surgeDropModule.kind, 'rule');
assert.equal(surgeDropModule.line, 'URL-REGEX,^https:\\/\\/drop\\.example\\.com,REJECT-DROP');
const surgeNoDropModule = surgeModuleRule('DOMAIN,drop.example.com,REJECT-NO-DROP');
assert.equal(surgeNoDropModule.kind, 'rule');
assert.equal(surgeNoDropModule.line, 'DOMAIN,drop.example.com,REJECT-NO-DROP');
const surgeCellularModule = surgeModuleRule('DOMAIN,cell.example.com,CELLULAR');
assert.equal(surgeCellularModule.kind, 'rule');
assert.equal(surgeCellularModule.line, 'DOMAIN,cell.example.com,CELLULAR');
assert.match(qxRule('AND, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)), REJECT').line, /unsupported Rule type commented out/);
assert.equal(qxRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve').line, 'ip-cidr, 1.1.1.1/32, reject');
assert.equal(surgeRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve'), 'IP-CIDR,1.1.1.1/32,REJECT,no-resolve');
const proxyPolicyArgs = surgeArgumentMetadata([], {proxyPolicyBinding:true});
assert.match(proxyPolicyArgs.lines[0], /^#!arguments=wayx_proxy_policy:DIRECT$/);
assert.match(proxyPolicyArgs.lines[1], /wayx_proxy_policy: Loon PROXY policy binding/);
assert.equal(proxyPolicyArgs.policyBinding.placeholder, '{{{wayx_proxy_policy}}}');
const surgeProxyBound = surgeModuleRule('DOMAIN, example.com, PROXY', {
  proxyPolicyPlaceholder: proxyPolicyArgs.policyBinding.placeholder,
});
assert.equal(surgeProxyBound.kind, 'rule');
assert.equal(surgeProxyBound.reason, 'proxy-policy-argument');
assert.equal(surgeProxyBound.line, 'DOMAIN,example.com,{{{wayx_proxy_policy}}}');
const qxUnsupportedPort = qxRule('DEST-PORT,443,REJECT');
assert.equal(qxUnsupportedPort.reason, 'unsupported-qx-rule-comment');
assert.match(qxUnsupportedPort.line, /DEST-PORT/);
assert.doesNotMatch(qxUnsupportedPort.line, /script-/);

assert.equal(surgeModuleRule('DOMAIN-WILDCARD,api-*.example.com,REJECT').line, 'DOMAIN-WILDCARD,api-*.example.com,REJECT');
assert.equal(surgeModuleRule('IP-ASN,13335,REJECT,no-resolve').line, 'IP-ASN,13335,REJECT,no-resolve');
assert.equal(surgeModuleRule('USER-AGENT,"Example*",REJECT').line, 'USER-AGENT,"Example*",REJECT');
assert.equal(surgeModuleRule('URL-REGEX,"^https:\\/\\/example\\.com\\/(a|b),?c",REJECT').line, 'URL-REGEX,"^https:\\/\\/example\\.com\\/(a|b),?c",REJECT');
assert.equal(surgeModuleRule('DEST-PORT,443,REJECT').line, 'DEST-PORT,443,REJECT');
assert.equal(surgeModuleRule('PROTOCOL,QUIC,REJECT').line, 'PROTOCOL,QUIC,REJECT');
assert.equal(surgeModuleRule('SUBNET,TYPE:CELLULAR,DIRECT').line, 'SUBNET,TYPE:CELLULAR,DIRECT');
assert.equal(surgeModuleRule('CELLULAR-RADIO,NR,DIRECT').line, 'CELLULAR-RADIO,NR,DIRECT');
assert.equal(surgeModuleRule('HOSTNAME-TYPE,IPv6,REJECT').line, 'HOSTNAME-TYPE,IPv6,REJECT');
assert.equal(surgeModuleRule('RULE-SET,https://example.com/list.list,REJECT,no-resolve').line, 'RULE-SET,https://example.com/list.list,REJECT,no-resolve');
assert.equal(surgeModuleRule('SCRIPT,ssid-rule,DIRECT,requires-resolve').line, 'SCRIPT,ssid-rule,DIRECT,requires-resolve');
assert.equal(
  surgeModuleRule('AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT').line,
  'AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT',
);
assert.equal(
  surgeModuleRule('AND,((DOMAIN-SUFFIX,example.com),(PROTOCOL,TCP)),REJECT-NO-DROP').line,
  'AND,((DOMAIN-SUFFIX,example.com),(PROTOCOL,TCP)),REJECT-NO-DROP',
);
assert.equal(
  surgeModuleRule('AND,((DOMAIN-KEYWORD,tnc),(OR,((DOMAIN-SUFFIX,capcutapi.com),(DOMAIN-SUFFIX,zijieapi.com)))),DIRECT').line,
  'AND,((DOMAIN-KEYWORD,tnc),(OR,((DOMAIN-SUFFIX,capcutapi.com),(DOMAIN-SUFFIX,zijieapi.com)))),DIRECT',
);
assert.equal(surgeModuleRule('LOON-ONLY,foo,REJECT').reason, 'unsupported-rule-type');
assert.equal(
  surgeModuleRule('AND,((DOMAIN,example.com),(LOON-ONLY,foo)),REJECT').reason,
  'unsupported-rule-type',
);
assert.equal(
  surgeModuleRule('NOT,((DOMAIN,example.com),(DOMAIN,example.org)),REJECT').reason,
  'invalid-rule',
);


const surgeHeader = renderSurgeModuleHeader([
  '#!name=Demo',
  '#!desc=Demo module',
  '#!category=SourceCategory',
  '#!author=Source Author',
  '#!icon=https://example.com/icon.png',
  '#!date=2026-09-29',
  '#!loon_version=3.5.1(978)',
  '# source comment',
], {
  id:'Demo',
  category:'去广告 / 测试',
  source:'https://example.com/demo.lpx',
}, '2026-09-29 12:00:00 +08:00', {needsCore20:true});
assert.equal(surgeHeader[0], '#!name=Demo');
assert.equal(surgeHeader[1], '#!desc=Demo module');
assert.equal(surgeHeader[2], '#!category=WayX');
assert.equal(surgeHeader[3], '#!requirement=CORE_VERSION>=20');
assert.ok(surgeHeader.includes('# Author: Source Author'));
assert.ok(surgeHeader.includes('# Icon: https://example.com/icon.png'));
assert.equal(surgeHeader.some(line => /loon_version/i.test(line)), false);
assert.ok(surgeHeader.includes('# Converted by: chance'));
assert.equal(surgeHeader.includes('# Category: 去广告 / 测试'), false);
assert.equal(surgeHeader.includes('# Category: SourceCategory'), false);
assert.equal(surgeHeader.filter(line => line === '#!category=WayX').length, 1);
assert.equal(surgeHeader.some(line => /^#!(?:author|icon|date|loon_version)=/i.test(line)), false);

const qxHeader = renderQxSnippetHeader([
  '#!name=Demo',
  '#!desc=Works in Loon DNS framework',
  '#!author=Source Author',
  '#!homepage=https://example.com',
  '#!icon=https://example.com/icon.png',
  '#!loon_version=3.5.1(978)',
  '# original comment',
], {
  id:'Demo',
  category:'测试',
  source:'https://example.com/demo.lpx',
}, '2026-09-29 12:00:00 +08:00');
assert.equal(qxHeader[0], '# Name: Demo');
assert.ok(qxHeader.includes('# Description: Works in Quantumult X DNS framework'));
assert.ok(qxHeader.includes('# Author: Source Author'));
assert.ok(qxHeader.includes('# Homepage: https://example.com'));
assert.ok(qxHeader.includes('# Icon: https://example.com/icon.png'));
assert.equal(qxHeader.some(line => line.startsWith('#!')), false);
assert.equal(qxHeader.some(line => /loon_version/i.test(line)), false);
assert.ok(qxHeader.includes('# Converted by: chance'));

const validSurgeModule = [
  ...surgeHeader,
  '',
  '[Rule]',
  'DOMAIN,ads.example.com,REJECT',
  'IP-CIDR,1.1.1.1/32,REJECT,no-resolve',
  'DOMAIN-WILDCARD,api-*.example.com,REJECT',
  'PROTOCOL,QUIC,REJECT',
  'DEST-PORT,443,REJECT',
  'AND,((DOMAIN-SUFFIX,example.com),(PROTOCOL,TCP)),REJECT',
  '',
  '[URL Rewrite]',
  '^https:\\/\\/ads\\.example\\.com _ reject',
  '',
  '[Header Rewrite]',
  'http-response ^https:\\/\\/api\\.example\\.com header-del Server',
  '',
  '[Body Rewrite]',
  'http-response-jq ^https://api\\.example\\.com \'del(.ads)\'',
  '',
  '[Map Local]',
  '^https:\\/\\/mock\\.example\\.com data-type=text data="{}" status-code=200 header="Content-Type:application/json"',
  '',
  '[Script]',
  'demo = type=http-response,pattern=^https://api\\.example\\.com,script-path=https://example.com/demo.js,requires-body=true',
  '',
  '[MITM]',
  'hostname = %APPEND% api.example.com',
  '',
].join('\n');
assert.doesNotThrow(() => validateSurgeModule(validSurgeModule, {id:'Demo'}));
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('#!requirement=CORE_VERSION>=20\n', ''), {id:'Demo'}),
  /CORE_VERSION>=20/,
);
assert.doesNotThrow(
  () => validateSurgeModule(validSurgeModule.replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,REJECT-DROP'), {id:'Demo'}),
);
assert.doesNotThrow(
  () => validateSurgeModule(validSurgeModule.replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,REJECT-NO-DROP'), {id:'Demo'}),
);
assert.doesNotThrow(
  () => validateSurgeModule(validSurgeModule.replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,CELLULAR'), {id:'Demo'}),
);
const parameterizedPolicyModule = validSurgeModule
  .replace('#!desc=Demo module', '#!desc=Demo module\n#!arguments=wayx_proxy_policy:DIRECT')
  .replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,{{{wayx_proxy_policy}}}');
assert.doesNotThrow(() => validateSurgeModule(parameterizedPolicyModule, {id:'Demo'}));
assert.throws(
  () => validateSurgeModule(
    validSurgeModule.replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,{{{missing_policy}}}'),
    {id:'Demo'},
  ),
  /undeclared policy argument missing_policy/,
);
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('DOMAIN-WILDCARD,api-*.example.com,REJECT', 'LOON-ONLY,foo,REJECT'), {id:'Demo'}),
  /unsupported Surge rule type/,
);
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('# Author: Source Author', '#!author=Source Author'), {id:'Demo'}),
  /unsupported Surge module directive/,
);
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('#!category=WayX', '#!category=Other'), {id:'Demo'}),
  /must declare #!category=WayX|unsupported Surge module directive/,
);
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('#!category=WayX\n', ''), {id:'Demo'}),
  /must declare #!category=WayX/,
);
assert.doesNotThrow(
  () => validateSurgeModule(validSurgeModule.replace('hostname = %APPEND% api.example.com', 'hostname = api.example.com'), {id:'Demo'}),
);

const compact = minifyJq('walk( if type == "object" then .a = [] | del(.b, .c) else . end )');
assert.equal(compact.includes('"object"'), true);
assert.equal(compact.includes('del(.b,.c)'), true);

assert.equal(
  renderFixedPathDeleteJq([
    {parts:['a'], selector:'.a'},
    {parts:['b','c'], selector:'.b.c'},
  ]),
  'delpaths([["a"],["b","c"]])',
);
assert.equal(
  renderFixedPathDeleteJq([
    {parts:['items',0], selector:'.items[0]'},
    {parts:['items',1], selector:'.items[1]'},
  ]),
  'delpaths([["items",0]]) | delpaths([["items",1]])',
);

assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:true,scriptUrl:'https://example.com/request.js',sourceText:'$done({status:"HTTP/1.1 200 OK",body:$request.body});'}).action, 'script-request-body');
assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:false,scriptUrl:'https://example.com/header.js',sourceText:'$done({headers:$request.headers});'}).action, 'script-request-header');
assert.equal(selectQxScriptAction({phase:'http-response',requiresBody:true,scriptUrl:'https://example.com/a.js'}).action, 'script-response-body');
const unavailableRequestAction = selectQxScriptAction({phase:'http-request',requiresBody:true,scriptUrl:'https://example.com/unavailable.js',sourceText:''});
assert.equal(unavailableRequestAction.action, 'script-request-body');
assert.match(unavailableRequestAction.reason, /request-phase declaration/);
const identityActionA = selectQxScriptAction({
  phase:'http-request',
  requiresBody:true,
  scriptUrl:'https://one.invalid/a.js',
  sourceText:'$done({status:"HTTP/1.1 200 OK",body:$request.body});',
});
const identityActionB = selectQxScriptAction({
  phase:'http-request',
  requiresBody:true,
  scriptUrl:'https://two.invalid/completely-different-name.js',
  sourceText:'$done({status:"HTTP/1.1 200 OK",body:$request.body});',
});
assert.equal(identityActionA.action, identityActionB.action);
assert.equal(identityActionA.action, 'script-request-body');
const crossPlatformEcho = selectQxScriptAction({
  phase:'http-request',
  requiresBody:true,
  sourceText:'const b=$request.body; const q=typeof $task!=="undefined"; if(q)$done({body:b}); else $done({response:{body:b}});',
});
assert.equal(crossPlatformEcho.action, 'script-request-body');

const catalogFixture = validateLoonSourceCatalog([
  {
    id:'UnknownPlugin',
    file:'Vendor/unknown.lpx',
    source:'https://example.invalid/plugins/unknown.lpx',
    qx:'Unknown.snippet',
    surge:'Unknown.sgmodule',
    category:'测试',
  },
]);
assert.equal(catalogFixture[0].id, 'UnknownPlugin');
assert.equal(
  resolveOriginalUrl('../Scripts/response.js', 'https://author.example.invalid/Plugins/demo.lpx'),
  'https://author.example.invalid/Scripts/response.js',
);
assert.equal(
  resolveOriginalUrl('https://author.example.invalid/Scripts/request.js', 'https://ignored.example.invalid/demo.lpx'),
  'https://author.example.invalid/Scripts/request.js',
);
assert.throws(() => resolveOriginalUrl('../Scripts/request.js'), /requires original plugin URL/);
assert.throws(
  () => validateLoonSourceCatalog([
    {
      id:'NoMirror',
      file:'no-mirror.lpx',
      source:'https://author.example.invalid/no-mirror.lpx',
      qx:'NoMirror.snippet',
      surge:'NoMirror.sgmodule',
      category:'测试',
      mirrors:['https://mirror.example.invalid/no-mirror.lpx'],
    },
  ]),
  /mirrors are forbidden/,
);
assert.throws(
  () => validateLoonSourceCatalog([
    {id:'A',file:'a.lpx',source:'https://a.invalid/a.lpx',qx:'same.snippet',surge:'a.sgmodule',category:'x'},
    {id:'B',file:'b.lpx',source:'https://b.invalid/b.lpx',qx:'same.snippet',surge:'b.sgmodule',category:'x'},
  ]),
  /duplicate catalog qx/,
);

assert.equal(qxTargetPath({qx:'A.snippet'}), 'Adblock/Quantumult X/A.snippet');
assert.equal(surgeTargetPath({surge:'A.sgmodule'}), 'Adblock/Surge/A.sgmodule');

const args = parseLoonArguments([
  'Capture=switch, false, true, tag="捕获", desc="测试"',
  'Lang=select, "zh-Hans", "zh-Hant", tag="语言"',
]);
assert.equal(args.length, 2);
assert.equal(args[0].defaultValue, 'false');
assert.equal(args[1].values[1], 'zh-Hant');

const surgeArgs = surgeArgumentMetadata([
  'region=select,"CN","US",tag=地区,desc=选择区域',
  'level=select,2,3,type=number,tag=等级',
  'enabled=switch,true,false,tag=启用',
]);
assert.equal(surgeArgs.lines[0], '#!arguments=region:CN,level:2,enabled:true');
assert.match(surgeArgs.lines[1], /^#!arguments-desc=/);
assert.equal(surgeEnableRequirement('enabled', surgeArgs.table), '#!REQUIREMENT "\'{{{enabled}}}\'==\'true\'"');
const surgeRewritePayload = surgeRewriteArgumentPayload(['region','level','enabled'], surgeArgs.table);
assert.equal(surgeRewritePayload.ok, true);
assert.match(surgeRewritePayload.value, /region/);
assert.match(surgeRewritePayload.value, /\{\{\{level\}\}\}/);

const surgeObject = surgePluginObjectArgument(['region','level','enabled'], surgeArgs.table);
assert.equal(surgeObject.ok, true);
assert.equal(
  surgeObject.value,
  '"{\\\"region\\\":\\\"{{{region}}}\\\",\\\"level\\\":{{{level}}},\\\"enabled\\\":{{{enabled}}}}"',
);
assert.deepEqual(parseLegacyLoonPluginObjectRefs('[{region},{level},{enabled}]'), ['region','level','enabled']);
assert.deepEqual(parseLegacyLoonPluginObjectRefs('{region,level,enabled}'), ['region','level','enabled']);

const noDefaultArgs = surgeArgumentMetadata(['optional=input,tag=可选']);
assert.equal(noDefaultArgs.lines[0], '#!arguments=optional');
assert.equal(surgePluginObjectArgument(['optional'], noDefaultArgs.table).ok, false);

const surgeArgumentScript = surgeScriptV2Plan(
  parseScriptV2('request if ${url} ~= /api/ then script("https://example.com/a.js", {${region}, ${level}, ${enabled}}) with enable=${enabled}, timeout=${level}, debug=${enabled}, requires_body=true'),
  {
    scriptUrl:'https://example.com/a.js',
    name:'argument_script',
    argumentIds:new Set(['region','level','enabled']),
    argumentTable:surgeArgs.table,
  },
);
assert.equal(surgeArgumentScript.ok, true);
assert.equal(surgeArgumentScript.usesLineRequirement, true);
assert.match(surgeArgumentScript.line, /^#!REQUIREMENT "\'\{\{\{enabled\}\}\}\'==\'true\'" argument_script = /);
assert.match(surgeArgumentScript.line, /timeout=\{\{\{level\}\}\}/);
assert.match(surgeArgumentScript.line, /debug=\{\{\{enabled\}\}\}/);
assert.match(surgeArgumentScript.line, /argument="\{\\\"region\\\":\\\"\{\{\{region\}\}\}\\\"/);

const argumentAnalysis = analyzePluginArgumentUsage({
  argumentLines:[
    'enabled=switch,true,tag=启用',
    'region=select,"CN","US",tag=地区',
    'price=input,9.99,type=number,tag=价格',
    'unused=input,"x",tag=未使用',
  ],
  rewriteLines:[
    'response if ${enabled} == true && ${url} ~= /api/ then response.json.replace("data.price", ${price})',
  ],
  scriptLines:[
    'request if ${enabled} == true && ${url} ~= /order/ then script("request.js", {${region}}) with enable=${enabled}, requires_body=true',
  ],
  ruleLines:['DOMAIN,example.com,PROXY'],
});
assert.equal(argumentAnalysis.policyBindings.length, 1);
assert.equal(argumentAnalysis.arguments.find(x => x.id === 'unused').used, false);
assert.ok(argumentAnalysis.arguments.find(x => x.id === 'region').uses.some(x => x.kind === 'argument-object'));
assert.ok(argumentAnalysis.arguments.find(x => x.id === 'enabled').uses.some(x => x.kind === 'dynamic-option' && x.option === 'enable'));
assert.ok(argumentAnalysis.arguments.find(x => x.id === 'price').uses.some(x => x.section === 'Rewrite' && x.kind === 'action'));
assert.deepEqual(
  rewriteV2PluginArgumentRefs(
    parseRewriteV2('response if ${enabled} == true && ${url} ~= /api/ then response.json.replace("data.price", ${price})'),
    new Set(['enabled','price']),
  ).all,
  ['enabled','price'],
);
const undeclaredArgumentAnalysis = analyzePluginArgumentUsage({
  argumentLines:['enabled=switch,true'],
  scriptLines:['request if ${url} ~= /api/ then script("request.js", {${missing}}) with enable=${alsoMissing}'],
});
assert.deepEqual(
  [...new Set(undeclaredArgumentAnalysis.undeclaredRefs.map(x => x.id))].sort(),
  ['alsoMissing','missing'],
);

const simpleV2 = parseRewriteV2('request if ${url} ~= /^https:\\/\\/ad\\.example\\.com/i as hit then reject_dict(200)');
assert.equal(simpleV2.phase, 'request');
assert.equal(simpleV2.condition.capture, 'hit');
assert.equal(simpleV2.condition.right.flags, 'i');
assert.equal(simpleV2.actions[0].name, 'reject_dict');
validateRewriteV2Ast(simpleV2);
assert.equal(qxPrimitiveForRewriteV2Action(simpleV2.actions[0]), 'reject-dict');

const pipelineV2 = parseRewriteV2('response if ${response.status} == 200 && (${url} ~= /api/ || ${url} ~= /v2/) then response.header.del("Server") | response.json.jq("del(.ads)")');
assert.equal(pipelineV2.condition.operator, '&&');
assert.equal(pipelineV2.actions.length, 2);
validateRewriteV2Ast(pipelineV2);
assert.match(rewriteV2ToSource(pipelineV2), /response\.header\.del.*\| response\.json\.jq/);

const complexFixture = parseRewriteV2('response if ${response.status} == 200 && (${url} ~= /api/ || ${url} ~= /v2/) then response.header.del("Server") | response.json.replace("data.ads", false)');
const complexClass = classifyComplexRewrite(complexFixture);
assert.equal(complexClass.ok, true);
assert.deepEqual(complexClass.families, ['header-pipeline','json-pipeline']);
assert.deepEqual(complexConditionKinds(complexFixture.condition), ['&&','==','response.status','||','~=','url','~=','url']);
const unhandledGeneric = planComplexRewrite(complexFixture, 'unit');
assert.equal(unhandledGeneric.ok, false);
assert.equal(unhandledGeneric.terminal, true);
assert.notEqual(unhandledGeneric.issue, true);
assert.match(unhandledGeneric.reason, /no verified generic complex Rewrite handler/);

registerComplexRewriteHandler({
  id:'checkpoint-generic-family',
  targets:['unit'],
  match:(_ast, info) => info.families.includes('header-pipeline') && info.families.includes('json-pipeline'),
  plan:(_ast, target) => ({ok:true, section:'test', line:'handled-'+target}),
});
assert.equal(planComplexRewrite(complexFixture, 'unit').line, 'handled-unit');
assert.deepEqual(listComplexRewriteHandlers(), [{id:'checkpoint-generic-family',targets:['unit']}]);

const genericMockFixture = parseRewriteV2('response if ${url} ~= /api/ then response.body.mock("text", "{}", 200, false) | response.header.set("X-Test", "ok")');
const genericMockClass = classifyComplexRewrite(genericMockFixture);
assert.equal(genericMockClass.ok, true);
assert.deepEqual(genericMockClass.families, ['mock-pipeline','header-pipeline']);
const genericQxMockScript = renderQxInlineMockScript(genericMockFixture);
assert.equal(genericQxMockScript.qxAction, 'script-echo-response');
assert.match(genericQxMockScript.script, /X-Test/);
const singleComplexRejected = parseRewriteV2('response if ${url} ~= /api/ then response.header.del("Server")');
assert.equal(planComplexRewrite(singleComplexRejected, 'qx').ok, false);
assert.match(planComplexRewrite(singleComplexRejected, 'qx').reason, /generated-script context/);
assert.throws(
  () => renderMixedRewriteScript(singleComplexRejected, {target:'qx'}),
  /multi-action/,
);

const mixedResponse = parseRewriteV2('response if ${response.status} == 200 && ${url} ~= /api\\/v2/ then response.header.del("Server") | response.body.replace(/ads/, "ok")');
const mixedQx = renderMixedRewriteScript(mixedResponse, {target:'qx'});
assert.equal(mixedQx.qxAction, 'script-response-body');
assert.equal(mixedQx.requiresBody, true);
assert.match(mixedQx.script, /response\?\.statusCode/);
assert.ok(mixedQx.script.indexOf('__wayxDel("Server");') < mixedQx.script.indexOf('__wayxRegexReplace(String(__wayxBody ?? ""),"ads",""'));
const mixedSurge = renderMixedRewriteScript(mixedResponse, {target:'surge'});
assert.equal(mixedSurge.surgeType, 'http-response');
assert.match(mixedSurge.script, /response\?\.status/);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=1") | response.body.replace(/x/,"y")'), {target:'qx'}),
  /header\.add duplicate semantics are not verified for qx/,
);

const mixedJson = parseRewriteV2('response if ${url} ~= /api/ then response.header.del("Server") | response.json.replace("data.ads", false) | response.json.delete("data.tracking")');
const mixedJsonQx = renderMixedRewriteScript(mixedJson, {target:'qx'});
assert.equal(mixedJsonQx.qxAction, 'script-response-body');
assert.ok(mixedJsonQx.script.indexOf('__wayxDel("Server");') < mixedJsonQx.script.indexOf('__wayxJsonAction(j=>__wayxJsonReplace(j,["data","ads"],false));'));
assert.ok(mixedJsonQx.script.indexOf('__wayxJsonReplace(j,["data","ads"],false)') < mixedJsonQx.script.indexOf('__wayxJsonDelete(j,["data","tracking"])'));
assert.match(mixedJsonQx.script, /function __wayxJsonAction\(fn\)\{try\{const j=JSON\.parse/);
assert.match(mixedJsonQx.script, /catch\{\}\}/);

const mixedJsonNull = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("X-Test", "ok") | response.json.replace("data.value", null)'),
  {target:'qx'},
);
assert.match(mixedJsonNull.script, /__wayxJsonReplace\(j,\["data","value"\],null\)/);

const mixedJsonCapture = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /\\/users\\/(\\d+)/ims as hit then response.header.set("X-User", "${hit.1}") | response.json.replace("data.user", "${hit.1}")'),
  {target:'qx'},
);
assert.ok(mixedJsonCapture.script.includes('__wayxTpl([["v","hit.1"]])'));
assert.ok(mixedJsonCapture.script.includes('v=>__wayxJsonAction(j=>__wayxJsonReplace(j,["data","user"],v))'));
assert.equal(mixedJsonCapture.script.includes('"ims"'), false);

const mixedJsonTyped = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("X-Test", "ok") | response.json.replace("data.n", 7) | response.json.replace("data.ok", true) | response.json.replace("data.none", null)'),
  {target:'qx'},
);
assert.match(mixedJsonTyped.script, /\["data","n"\],7\)/);
assert.match(mixedJsonTyped.script, /\["data","ok"\],true\)/);
assert.match(mixedJsonTyped.script, /\["data","none"\],null\)/);

const orderedBodyJson = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.body.replace(/one/, "two") | response.json.replace("data.ok", true) | response.body.replace(/three/, "four")'),
  {target:'qx'},
);
const firstBody=orderedBodyJson.script.indexOf('__wayxRegexReplace(String(__wayxBody ?? ""),"one",""');
const jsonStep=orderedBodyJson.script.indexOf('__wayxJsonReplace(j,["data","ok"],true)');
const secondBody=orderedBodyJson.script.indexOf('__wayxRegexReplace(String(__wayxBody ?? ""),"three",""');
assert.ok(firstBody >= 0 && firstBody < jsonStep && jsonStep < secondBody);

const pureBodyBatch = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.body.replace([/one/, /two/], ["1", "2"]) | response.json.replace("data.ok", true)'),
  {target:'surge'},
);
assert.ok(pureBodyBatch.script.indexOf('"one",""') < pureBodyBatch.script.indexOf('"two",""'));
assert.ok(pureBodyBatch.script.indexOf('"two",""') < pureBodyBatch.script.indexOf('__wayxJsonReplace(j,["data","ok"],true)'));

const rawCaptureLiteral = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /item\\/(\\d+)/ as hit then response.header.set("X-Test", `literal ${hit.1}`) | response.body.replace(/x/, `raw ${hit.1}`)'),
  {target:'qx'},
);
assert.ok(rawCaptureLiteral.script.includes('"literal ${hit.1}"'));
assert.ok(rawCaptureLiteral.script.includes('"raw ${hit.1}"'));
assert.equal(rawCaptureLiteral.script.includes('__wayxTpl([["s","literal '), false);
const rawJsonLiteral = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("X-Test", "ok") | response.json.replace("data.raw", `{"literal":"${hit.1}"}`)'),
  {target:'qx'},
);
assert.ok(rawJsonLiteral.script.includes('${hit.1}'));
assert.equal((rawJsonLiteral.script.match(/__wayxTpl\(/g) || []).length, 1);


assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /api/ as hit then response.header.set("X-Test", "${other.1}") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /unknown capture alias: other/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /item\\/(\\d+)/ as hit then response.header.set("X-Test", "${hit.2}") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /capture index exceeds regex capture-group count: hit\.2/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /a(\\d+)/ as hit || ${url} ~= /b/ then response.header.set("X-Test", "${hit.1}") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /capture alias is not guaranteed on every successful condition path: hit/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /a(\\d+)/ as hit && ${request.header[\'X-Test\']} ~= /b(\\d+)/ as hit then response.header.set("X-Test", "${hit.1}") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /duplicate capture alias: hit/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /api/ as hit then response.header.set("X-Test", "${hit.name}") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /unknown plugin argument interpolation/,
);
const jsonAddDelete = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.json.add("data.new.enabled", true) | response.json.delete("items[0]") | response.body.replace(/done/, "ok")'),
  {target:'qx'},
);
assert.match(jsonAddDelete.script, /__wayxJsonAdd\(j,\["data","new","enabled"\],true\)/);
assert.match(jsonAddDelete.script, /Array\.isArray\(p\).*p\.splice\(k,1\)/);
assert.ok(jsonAddDelete.script.indexOf('__wayxJsonAdd(j,["data","new","enabled"],true)') < jsonAddDelete.script.indexOf('__wayxJsonDelete(j,["items",0])'));
const jsonAddBatch = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.json.add(["data.a", "data.b"], [1, true]) | response.body.replace(/x/, "y")'),
  {target:'surge'},
);
assert.ok(jsonAddBatch.script.indexOf('__wayxJsonAdd(j,["data","a"],1)') < jsonAddBatch.script.indexOf('__wayxJsonAdd(j,["data","b"],true)'));

const captureMixedQx = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /\\/api\\/(foo)-(bar)/ims as hit then response.header.set("X-Capture", "${hit.0}:${hit.1}:${hit.2}") | response.body.replace(/token/, "${hit.2}")'),
  {target:'qx'},
);
assert.match(captureMixedQx.script, /const __wayxCaptures=Object\.create\(null\)/);
const preservedCapturePattern='\\/api\\/(foo)-(bar)';
assert.ok(
  captureMixedQx.script.includes(JSON.stringify(preservedCapturePattern)),
  'complex helper must preserve the regex body while dropping source flags',
);
assert.equal(captureMixedQx.script.includes('"ims"'), false);
assert.ok(captureMixedQx.script.includes('__wayxTpl([["v","hit.0"],["s",":"],["v","hit.1"],["s",":"],["v","hit.2"]])'));
const surgeHeaderAddMixed = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.add("Set-Cookie", "b=2") | response.header.set("X-Test", "ok") | response.body.replace(/ads/, "clean")'),
  {target:'surge'},
);
assert.equal(surgeHeaderAddMixed.fullHeaderMode, true);
assert.equal(surgeHeaderAddMixed.requiresBody, true);
assert.equal(mixedSurge.requiresBody, true);
assert.equal(mixedSurge.fullHeaderMode, false);

function runComplexScript(script, {request={}, response={}, argument=''}={}) {
  let result;
  const sandbox = {
    $request:{url:'https://example.com/api',method:'GET',headers:{},body:'',...request},
    $response:{status:200,headers:{},body:'',...response},
    $argument:argument,
    $done(value={}){ result=value; },
  };
  vm.runInNewContext(script, sandbox, {timeout:1000});
  return JSON.parse(JSON.stringify(result));
}
const runtimeSurgeArgument = renderSingleJsonMutationScript(
  parseRewriteV2('response if ${enabled} == true && ${url} ~= /api/ then response.json.replace("n", ${level})'),
  {target:'surge', argumentTable:surgeArgs.table},
);
assert.deepEqual(
  runComplexScript(runtimeSurgeArgument.script, {
    argument:'{"enabled":true,"level":2,"region":"CN"}',
    response:{body:'{"n":0}'},
  }),
  {body:'{"n":2}'},
);

const runtimeOrdered = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("X-Step", "one") | response.body.replace(/"a":1/, "\\"a\\":2") | response.json.add("b", true) | response.json.delete("items[0]") | response.header.del("Server")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeOrdered.script, {response:{headers:{Server:'origin'},body:'{"a":1,"items":["x","y"]}'}}),
  {headers:{'X-Step':'one'},body:'{"a":2,"items":["y"],"b":true}'},
);
const runtimeNoMatch = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /private/ then response.header.set("X-Test", "changed") | response.body.replace(/x/, "y")'),
  {target:'qx'},
);
assert.deepEqual(runComplexScript(runtimeNoMatch.script, {response:{headers:{Keep:'yes'},body:'x'}}), {});
const runtimeCapture = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api\\/(\\d+)/ as hit then response.header.set("X-ID", "${hit.1}") | response.json.replace("id", "${hit.1}")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeCapture.script, {request:{url:'https://example.com/api/42'},response:{headers:{},body:'{"id":"old"}'}}),
  {headers:{'X-ID':'42'},body:'{"id":"42"}'},
);
const runtimeInvalidJson = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("X-Before", "yes") | response.json.replace("id", 2) | response.header.set("X-After", "yes")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeInvalidJson.script, {response:{headers:{},body:'not-json'}}),
  {headers:{'X-Before':'yes','X-After':'yes'},body:'not-json'},
);
const runtimeSurgeAdd = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.add("Set-Cookie", "b=2") | response.body.replace(/x/, "y")'),
  {target:'surge'},
);
assert.deepEqual(
  runComplexScript(runtimeSurgeAdd.script, {response:{headers:[{field:'Set-Cookie',value:'a=1'}],body:'x'}}),
  {headers:[{field:'Set-Cookie',value:'a=1'},{field:'Set-Cookie',value:'b=2'}],body:'y'},
);

const runtimeRequest = renderMixedRewriteScript(
  parseRewriteV2('request if ${request.method} == "POST" && ${request.header[\'X-Mode\']} ~= /edit/ then request.header.set("X-WayX", "1") | request.body.replace(/old/, "new")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeRequest.script, {request:{url:'https://example.com/api',method:'POST',headers:{'X-Mode':'edit'},body:'old value'}}),
  {headers:{'X-Mode':'edit','X-WayX':'1'},body:'new value'},
);
assert.deepEqual(
  runComplexScript(runtimeRequest.script, {request:{url:'https://example.com/api',method:'GET',headers:{'X-Mode':'edit'},body:'old value'}}),
  {},
);

const runtimeResponseCondition = renderMixedRewriteScript(
  parseRewriteV2('response if (${response.status} == 201 || ${response.status} == 202) && ${response.header[\'Content-Type\']} ~= /json/ then response.header.replace("Content-Type", /json/, "problem+json") | response.body.replace(/ok/, "accepted")'),
  {target:'surge'},
);
assert.deepEqual(
  runComplexScript(runtimeResponseCondition.script, {response:{status:202,headers:{'Content-Type':'application/json'},body:'ok'}}),
  {headers:{'Content-Type':'application/problem+json'},body:'accepted'},
);

const runtimeJsonAddExisting = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.json.add("data.keep", 2) | response.json.add("data.new.deep", true)'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeJsonAddExisting.script, {response:{body:'{"data":{"keep":1}}'}}),
  {body:'{"data":{"keep":1,"new":{"deep":true}}}'},
);

const runtimeJsonTyped = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.json.replace("n", 7) | response.json.replace("ok", false) | response.json.replace("none", null)'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeJsonTyped.script, {response:{body:'{"n":0,"ok":true,"none":"x"}'}}),
  {body:'{"n":7,"ok":false,"none":null}'},
);

const runtimeRawLiteral = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api\\/(\\d+)/ as hit then response.header.set("X-Raw", `literal ${hit.1}`) | response.body.replace(/x/, `raw ${hit.1}`)'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeRawLiteral.script, {request:{url:'https://example.com/api/9'},response:{body:'x'}}),
  {headers:{'X-Raw':'literal ${hit.1}'},body:'raw ${hit.1}'},
);

const runtimeOptionalCapture = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api\\/(foo)?/ as hit then response.header.set("X-Optional", "${hit.1}") | response.body.replace(/x/, "y")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeOptionalCapture.script, {request:{url:'https://example.com/api/'},response:{headers:{Keep:'yes'},body:'x'}}),
  {headers:{Keep:'yes'},body:'y'},
);

const runtimeHeaderCase = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.set("x-test", "new") | response.header.del("SERVER") | response.body.replace(/x/, "y")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeHeaderCase.script, {response:{headers:{'X-Test':'old',Server:'origin'},body:'x'}}),
  {headers:{'X-Test':'new'},body:'y'},
);

const runtimeNumericStatus = renderMixedRewriteScript(
  parseRewriteV2('response if ${response.status} == 204 then response.header.set("X-Status", "matched") | response.body.replace(/x/, "y")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeNumericStatus.script, {response:{statusCode:204,status:204,headers:{},body:'x'}}),
  {headers:{'X-Status':'matched'},body:'y'},
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${response.status} == "204" then response.header.set("X-Status", "string") | response.body.replace(/x/, "y")'), {target:'surge'}),
  /response\.status equality requires Number or typed variable/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('request if ${response.status} == 200 then request.header.set("X-Test", "bad") | request.body.replace(/x/, "y")'), {target:'qx'}),
  /request phase cannot reference response data/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('request if ${request.header[\'X-Test\']} == 1 then request.header.set("X-Test", "bad") | request.body.replace(/x/, "y")'), {target:'qx'}),
  /header equality requires String, null, or String variable/,
);

assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('request if ${request.method} == 1 then request.header.set("X-Test", "bad") | request.body.replace(/x/, "y")'), {target:'qx'}),
  /request\.method equality requires String or typed variable/,
);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('request if ${url} == true then request.header.set("X-Test", "bad") | request.body.replace(/x/, "y")'), {target:'surge'}),
  /url equality requires String or typed variable/,
);
const runtimeNullHeader = renderMixedRewriteScript(
  parseRewriteV2('response if ${response.header[\'X-Missing\']} == null then response.header.set("X-Null", "yes") | response.body.replace(/x/, "y")'),
  {target:'qx'},
);
assert.deepEqual(
  runComplexScript(runtimeNullHeader.script, {response:{headers:{},body:'x'}}),
  {headers:{'X-Null':'yes'},body:'y'},
);
assert.equal(surgeHeaderAddMixed.surgeType, 'http-response');
assert.match(surgeHeaderAddMixed.script, /__wayxHeaders\.push\(\{field:n,value:v\}\)/);
assert.match(surgeHeaderAddMixed.script, /Array\.isArray\(\$response\.headers\)/);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${url} ~= /api/ then response.header.add("Set-Cookie", "b=2") | response.body.replace(/ads/, "clean")'), {target:'qx'}),
  /header\.add duplicate semantics are not verified for qx/,
);
const mixedJsonAdd = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.header.del("Server") | response.json.add("data.new", true)'),
  {target:'qx'},
);
assert.match(mixedJsonAdd.script, /__wayxJsonAdd\(j,\["data","new"\],true\)/);

const flaggedHeaderHelper = renderQxHeaderScript(parseRewriteV2('request if ${url} ~= /api/i then request.header.replace("X-Test", /value/ms, "ok")'));
assert.equal(flaggedHeaderHelper.pattern, '^');
assert.equal(flaggedHeaderHelper.script.includes('"flags":"i"'), false);
assert.equal(flaggedHeaderHelper.script.includes('"ms"'), false);
assert.match(flaggedHeaderHelper.script, /__wayxHeaderReplace\("X-Test","value",v,""\)/);

const flaggedRedirectSource = 'request if ${url} ~= /\\/old\\/(.*)/ims as hit then redirect(302, \"/new/${hit.1}\")';
const flaggedRedirectHelper = renderQxRedirectScript(parseRewriteV2(flaggedRedirectSource));
assert.equal(flaggedRedirectHelper.pattern, '\\/old\\/(.*)');
assert.equal(flaggedRedirectHelper.script.includes('"ims"'), false);
assert.ok(flaggedRedirectHelper.script.includes('new RegExp(' + JSON.stringify(flaggedRedirectHelper.pattern) + ', "")'));

const complexConditionFlags = renderMixedRewriteScript(
  parseRewriteV2('response if (${url} ~= /API/i || ${response.status} == 204) && ${response.header["Content-Type"]} == "application/json" then response.header.del("Server") | response.body.replace(/ADS/ms, "ok")'),
  {target:'qx'},
);
assert.match(complexConditionFlags.script, /"pattern":"API","flags":""/);
assert.equal(complexConditionFlags.script.includes('"i")'), false);
assert.equal(complexConditionFlags.script.includes('"ms"'), false);
assert.match(complexConditionFlags.script, /response\?\.statusCode/);
assert.match(complexConditionFlags.script, /Content-Type/);
assert.throws(
  () => renderMixedRewriteScript(parseRewriteV2('response if ${unsupported.value} == "x" then response.header.del("Server") | response.body.replace(/x/, "y")'), {target:'qx'}),
  /unsupported (?:complex|Rewrite v2) condition variable/,
);

const bulkV2 = parseRewriteV2('request if ${url} ~= /api/ then request.header.set(["X-A","X-B"],["1","2"])');
validateRewriteV2Ast(bulkV2);
assert.equal(LOON_REWRITE_V2_ACTIONS.size, 31);

const invalidBulk = parseRewriteV2('request if ${url} ~= /api/ then request.header.set(["X-A"],["1","2"])');
assert.throws(() => validateRewriteV2Ast(invalidBulk), /equal lengths/);
const unknownAction = parseRewriteV2('request if ${url} ~= /api/ then request.unknown("x")');
assert.throws(() => validateRewriteV2Ast(unknownAction), /not present in the current official Loon Rewrite v2 registry/);

const safeReject = analyzeSafeRewriteV2('request if ${url} ~= /^https:\\/\\/ad\\.example\\.com/ then reject(200)');
assert.equal(safeReject.safe, true);
assert.equal(safeReject.action, 'reject-200');
assert.equal(safeReject.status, 200);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/i then reject(200)').safe, true);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/ then reject(451, "blocked")').safe, false);
assert.equal(analyzeSafeRewriteV2('response if ${url} ~= /ads/ then reject_dict(200)').safe, true);
assert.equal(analyzeSafeRewriteV2('response if ${url} ~= /ads/ then reject_dict(451)').safe, false);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/ then reject_dict(200) | request.header.del("X")').safe, false);

assert.equal(classifyLegacyRewrite('reject').kind, 'reject');
assert.equal(classifyLegacyRewrite('302 https://example.com/new').kind, 'redirect');
assert.equal(classifyLegacyRewrite('response-header-del Server').kind, 'header');
assert.equal(classifyLegacyRewrite('response-body-json-del data.ads').kind, 'json');
assert.equal(classifyLegacyRewrite('mock-response-body data-type=json data="{}" status-code=200').kind, 'mock');

const legacyCtx = {id:'UnknownFixture', rawBase:'https://raw.githubusercontent.com/example/repo/main', generatedScripts:new Map()};
assert.equal(
  planLegacyRewrite('^https:\\/\\/ads\\.example\\.com', 'reject', 'qx', legacyCtx).line,
  '^https:\\/\\/ads\\.example\\.com url reject',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/ads\\.example\\.com', 'reject-dict', 'surge', legacyCtx).section,
  'map',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject', 'qx', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com url reject',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject', 'surge', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com _ reject',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject-200', 'qx', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com url reject-200',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject-img', 'qx', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com url reject-img',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject-dict', 'qx', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com url reject-dict',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/legacy\\.example\\.com', 'reject-array', 'qx', legacyCtx).line,
  '^https:\\/\\/legacy\\.example\\.com url reject-array',
);

assert.equal(planMitmLine('hostname = api.example.com, *.example.com', 'qx').line, 'hostname = api.example.com, *.example.com');
assert.equal(planMitmLine('hostname = api.example.com, *.example.com', 'surge').line, 'hostname = %APPEND% api.example.com, *.example.com');
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-body-json-del data.ads', 'qx', legacyCtx).line,
  '^https:\\/\\/api\\.example\\.com url jsonjq-response-body \'delpaths([["data","ads"]])\'',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', "response-body-json-jq ''", 'qx', legacyCtx).section,
  'drop',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-body-json-jq ""', 'surge', legacyCtx).section,
  'drop',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-header-del Server', 'surge', legacyCtx).lines[0],
  'http-response ^https:\\/\\/api\\.example\\.com header-del Server',
);
const legacyQxHeaderDel = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-header-del Server',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxHeaderDel.section, 'rewrite');
assert.match(legacyQxHeaderDel.line, /url script-response-header .*legacy_header_.*\.js$/);
assert.ok([...legacyCtx.generatedScripts.values()].some(script => /__wayxDel\("Server"\)/.test(script)));

const legacyQxHeaderSet = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'header-replace User-Agent Unknown',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxHeaderSet.section, 'rewrite');
assert.match(legacyQxHeaderSet.line, /url script-request-header .*legacy_header_.*\.js$/);

const legacyQxHeaderRegex = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'header-replace-regex X-Test v(\\d+) n$1',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxHeaderRegex.section, 'rewrite');
assert.match(legacyQxHeaderRegex.line, /url script-request-header .*legacy_header_.*\.js$/);
const legacyHeaderRegexHelper = [...legacyCtx.generatedScripts.values()].find(script => script.includes('"X-Test"') && script.includes('n$1'));
assert.ok(legacyHeaderRegexHelper, 'legacy QX header-replace-regex must use helper when replacement captures are local');
assert.match(legacyHeaderRegexHelper, /__wayxRegexReplace/);

const legacyQxHeaderAddBulk = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'header-add X-A one X-B two',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxHeaderAddBulk.section, 'rewrite');
assert.match(legacyQxHeaderAddBulk.line, /request-header \$1\$2X-A: one\$2X-B: two\$2$/);

const legacyQxResponseHeaderAdd=planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-header-add Set-Cookie a=1',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxResponseHeaderAdd.section,'rewrite');
assert.match(legacyQxResponseHeaderAdd.line,/url response-header .*Set-Cookie: a=1/);

const legacyQxUnsafeResponseHeaderAdd=planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-header-add Set-Cookie a=$1',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxUnsafeResponseHeaderAdd.section,'comment');
assert.match(legacyQxUnsafeResponseHeaderAdd.line,/cannot be safely encoded by native response-header/);

const legacyNestedMock = classifyLegacyRewrite(
  'mock-response-body data-type=json data="{"no":0,"error":"success"}" status-code=200',
);
assert.equal(legacyNestedMock.mock.data, '{"no":0,"error":"success"}');

const legacyResponseMockQx = planLegacyRewrite(
  '^https:\\/\\/tieba\\.example\\.com/mock',
  'mock-response-body data-type=json data="{"no":0,"error":"success"}" status-code=200',
  'qx',
  legacyCtx,
);
assert.equal(legacyResponseMockQx.section, 'rewrite');
assert.match(legacyResponseMockQx.line, /url script-echo-response .*legacy_mock_.*\.js$/);
assert.ok([...legacyCtx.generatedScripts.values()].some(script => script.includes('{"no":0,"error":"success"}')));

const legacyResponseMockSurge = planLegacyRewrite(
  '^https:\\/\\/tieba\\.example\\.com/mock',
  'mock-response-body data-type=json data="{"no":0,"error":"success"}" status-code=200',
  'surge',
  legacyCtx,
);
assert.equal(legacyResponseMockSurge.section, 'map');
assert.match(legacyResponseMockSurge.line, /data="\{\\\"no\\\":0,\\\"error\\\":\\\"success\\\"\}"/);

const legacyRequestMockQx = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com/submit',
  'mock-request-body data-type=json data="{"x":1}"',
  'qx',
  legacyCtx,
);
assert.equal(legacyRequestMockQx.section, 'rewrite');
assert.match(legacyRequestMockQx.line, /url script-request-body .*legacy_mock_.*\.js$/);

const legacyRequestMockSurge = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com/submit',
  'mock-request-body data-type=json data="{"x":1}"',
  'surge',
  legacyCtx,
);
assert.equal(legacyRequestMockSurge.section, 'script');
assert.match(legacyRequestMockSurge.line, /type=http-request,.*requires-body=true/);

const legacyJsonAddQx = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-body-json-add data.enabled true data.count 2',
  'qx',
  legacyCtx,
);
assert.equal(legacyJsonAddQx.section, 'rewrite');
assert.match(legacyJsonAddQx.line, /url jsonjq-response-body/);
assert.match(legacyJsonAddQx.line, /if \.data\.enabled == null/);
assert.match(legacyJsonAddQx.line, /\.data\.count = 2/);

const legacyJsonAddSurge = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-body-json-add data.enabled true',
  'surge',
  legacyCtx,
);
assert.equal(legacyJsonAddSurge.section, 'body');
assert.match(legacyJsonAddSurge.line, /^http-response-jq /);
assert.match(legacyJsonAddSurge.line, /if \.data\.enabled == null/);

const legacyJsonReplaceQx = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-body-json-replace data.enabled false data.count 0',
  'qx',
  legacyCtx,
);
assert.equal(legacyJsonReplaceQx.section, 'rewrite');
assert.match(legacyJsonReplaceQx.line, /url jsonjq-response-body/);
assert.match(legacyJsonReplaceQx.line, /setpath\(\["data","enabled"\]; false\)/);
assert.match(legacyJsonReplaceQx.line, /setpath\(\["data","count"\]; 0\)/);

const legacyJsonReplaceSurge = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'request-body-json-replace data.enabled true',
  'surge',
  legacyCtx,
);
assert.equal(legacyJsonReplaceSurge.section, 'body');
assert.match(legacyJsonReplaceSurge.line, /^http-request-jq /);
assert.match(legacyJsonReplaceSurge.line, /setpath\(\["data","enabled"\]; true\)/);

const legacyJsonDelBatch = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-body-json-del data.ads data.items[0]',
  'qx',
  legacyCtx,
);
assert.equal(legacyJsonDelBatch.section, 'rewrite');
assert.ok(legacyJsonDelBatch.line.includes('delpaths([["data","ads"]]) | delpaths([["data","items",0]])'));

const jqFileAst = parseRewriteV2('response if ${url} ~= /api/ then response.json.jq_file("filters/remove-ads.jq")');
const deps = listRewriteV2Dependencies(jqFileAst, {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(deps.length, 1);
assert.equal(deps[0].url, 'https://example.com/Plugins/filters/remove-ads.jq');
const inlinedJq = inlineResolvedDependency(jqFileAst.actions[0], 'del(.ads)', {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(inlinedJq.action.name, 'response.json.jq');
assert.equal(inlinedJq.action.args[0].value, 'del(.ads)');

const inlinedDelpathsJq = inlineResolvedDependency(
  jqFileAst.actions[0],
  'delpaths([["ads"],["promo"]])',
  {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'},
);
assert.equal(inlinedDelpathsJq.action.args[0].value, 'delpaths([["ads"],["promo"]])');

const legacyJqPathAst = parseRewriteV2(
  'response if ${url} ~= /reddit/i then response.json.jq("jq-path=https://rucu6.pages.dev/JQLang/reddit.jq")'
);
const legacyV2JqSpec=jqDependencySpecFromAction(legacyJqPathAst.actions[0], {
  pluginSourceUrl:'https://example.com/demo.lpx',
});
assert.equal(legacyV2JqSpec.url,'https://rucu6.pages.dev/JQLang/reddit.jq');
assert.equal(legacyV2JqSpec.legacyAlias,true);
assert.deepEqual(
  listRewriteV2Dependencies(legacyJqPathAst, {pluginSourceUrl:'https://example.com/demo.lpx'}).map(x=>x.url),
  ['https://rucu6.pages.dev/JQLang/reddit.jq'],
);
const legacyV2Inlined=inlineResolvedDependency(
  legacyJqPathAst.actions[0],
  'del(.subredditInfoByName)',
  {pluginSourceUrl:'https://example.com/demo.lpx'},
);
assert.equal(legacyV2Inlined.action.name,'response.json.jq');
assert.equal(legacyV2Inlined.action.args[0].value,'del(.subredditInfoByName)');

const legacyJqPathIr=legacyRewriteToSemanticIr(
  '^https:\\/\\/acs\\.m\\.goofish\\.com\\/gw\\/adapter\\/',
  'response-body-json-jq jq-path="https://kelee.one/Resource/JQLang/FleaMarket/adapter_FleaMarket_remove_ads.jq"'
);
const legacyIrJqSpec=legacyJqPathDependencySpecFromIr(legacyJqPathIr,{
  pluginSourceUrl:'https://example.com/demo.lpx',
});
assert.equal(
  legacyIrJqSpec.url,
  'https://kelee.one/Resource/JQLang/FleaMarket/adapter_FleaMarket_remove_ads.jq',
);
const legacyIrInlined=inlineResolvedLegacyJqPathIr(legacyJqPathIr,'del(.data.ad)').ir;
const legacyIrQx=planLegacyRewriteIr(legacyIrInlined,'qx',{
  generatedScripts:new Map(),
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  id:'Fixture',
});
assert.equal(legacyIrQx.section,'rewrite');
assert.match(legacyIrQx.line,/jsonjq-response-body 'del\(\.data\.ad\)'$/);

const jqFileWithComments = `# file comment
walk(
  if .tag == "#keep" then
    # executable comment
    .value
  else . end
)`;
const minifiedJqFile = minifyJqFile(jqFileWithComments);
assert.equal(
  minifiedJqFile,
  'walk(if .tag=="#keep" then .value else . end)',
);
assert.match(minifiedJqFile, /"#keep"/);
assert.doesNotMatch(minifiedJqFile, /file comment|executable comment/);

const mockFileAst = parseRewriteV2('response if ${url} ~= /api/ then response.body.mock_file("json", "mock.json", 200)');
const mockSpec = dependencySpecFromAction(mockFileAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(mockSpec.kind, 'mock');
assert.equal(mockSpec.phase, 'response');
assert.equal(mockSpec.url, 'https://example.com/Plugins/mock.json');
assert.equal(mockSpec.base64, false);
assert.equal(mockSpec.binary, false);
assert.equal(Object.hasOwn(mockSpec, 'strategy'), false);
assert.equal(Object.hasOwn(mockSpec, 'qxAction'), false);
assert.throws(
  () => inlineResolvedDependency(mockFileAst.actions[0], '{"ok":true}', {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'}),
  /generated target script/,
);
const responseMockPlan = qxMockPlanFromAction(mockFileAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(responseMockPlan.url, 'https://example.com/Plugins/mock.json');
assert.equal(responseMockPlan.qxAction, 'script-echo-response');
const responseMockScript = renderQxMockFileScript(responseMockPlan, {
  stamp:'2026-09-29 09:00:00 +08:00',
  category:'Adblock',
  bodyText:'{"ok":true}',
});
assert.doesNotMatch(responseMockScript, /\$task\.fetch/);
assert.match(responseMockScript, /HTTP\/1\.1 200 OK/);
assert.match(responseMockScript, /const __wayxBody =/);
assert.match(responseMockScript, /output\.body = __wayxBody/);

const binaryMockAst = parseRewriteV2('response if ${url} ~= /image/ then response.body.mock_file("png", "image.png", 200)');
const binaryMockPlan = qxMockPlanFromAction(binaryMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(binaryMockPlan.binary, true);
const binaryMockScript = renderQxMockFileScript(binaryMockPlan, {bodyBase64:'iVBORw0KGgo='});
assert.doesNotMatch(binaryMockScript, /\$task\.fetch/);
assert.match(binaryMockScript, /output\.bodyBytes = __wayxBase64ToArrayBuffer\(__wayxBodyBase64\)/);

const requestMockAst = parseRewriteV2('request if ${url} ~= /api/ then request.body.mock_file("json", "request.json")');
const requestMockPlan = qxMockPlanFromAction(requestMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(requestMockPlan.qxAction, 'script-request-body');
const requestMockScript = renderQxMockFileScript(requestMockPlan, {bodyText:'{"request":true}'});
assert.doesNotMatch(requestMockScript, /\$task\.fetch/);
assert.match(requestMockScript, /\$done\(\{headers, body: __wayxBody\}\)/);

const requestBinaryMockAst = parseRewriteV2('request if ${url} ~= /upload/ then request.body.mock_file("png", "image.png")');
const requestBinaryMockPlan = qxMockPlanFromAction(requestBinaryMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.throws(() => renderQxMockFileScript(requestBinaryMockPlan), /request mock binary\/bodyBytes output is not enabled/);

// Target declarations follow official bare-regex syntax. Loon /i is not
// expanded into per-character case classes and no undocumented inline modifier
// is invented.
const bareUrl = compileRegexForTarget(parseRewriteV2('request if ${url} ~= /^https:\\/\\/Api\\.Example\\.com\\/[a-z]+/i then reject_dict(200)').condition.right, {subject:'url'});
assert.equal(bareUrl.ok, true);
assert.equal(bareUrl.pattern, '^https:\\/\\/Api\\.Example\\.com\\/[a-z]+');
assert.equal(bareUrl.sourceFlags, 'i');
assert.deepEqual(bareUrl.notes, []);
assert.equal(compileRegexForTarget(parseRewriteV2('response if ${url} ~= /api/ then response.body.replace(/a.b/s, "x")').actions[0].args[0], {subject:'body'}).ok, true);

const qxDeleteV2 = qxDirectRewritePlan(parseRewriteV2('response if ${url} ~= /^https:\\/\\/api\\.example\\.com\\/feed/i then response.json.delete(["data.ads", "data.apps[0].promo"])'));
assert.equal(qxDeleteV2.ok, true);
assert.match(qxDeleteV2.line, /url jsonjq-response-body/);
assert.match(qxDeleteV2.line, /delpaths/);
assert.ok(qxDeleteV2.line.includes('delpaths([["data","ads"]]) | delpaths([["data","apps",0,"promo"]])'));

const qxDeleteObjectsV2 = qxDirectRewritePlan(parseRewriteV2('response if ${url} ~= /api/ then response.json.delete(["data.ads", "data.promo"])'));
assert.equal(qxDeleteObjectsV2.ok, true);
assert.ok(qxDeleteObjectsV2.line.includes('delpaths([["data","ads"],["data","promo"]])'));

const qxReplaceV2 = qxDirectRewritePlan(parseRewriteV2('response if ${url} ~= /search/i then response.json.replace("data.items", `[]`)'));
assert.equal(qxReplaceV2.ok, true);
assert.match(qxReplaceV2.line, /setpath\(\["data","items"\]; \[\]\)/);

const qxJqV2 = qxDirectRewritePlan(parseRewriteV2('response if ${url} ~= /profile/i then response.json.jq("del(.ads)")'));
assert.equal(qxJqV2.ok, true);
assert.match(qxJqV2.line, /jsonjq-response-body 'del\(\.ads\)'/);

const surgeJqV2 = surgeDirectRewritePlan(parseRewriteV2('response if ${url} ~= /profile/i then response.json.jq("del(.ads)")'));
assert.equal(surgeJqV2.ok, true);
assert.match(surgeJqV2.line, /^http-response-jq /);

const redirectV2 = parseRewriteV2('request if ${url} ~= /(^https:\\/\\/live\\.bilibili\\.com\\/\\d+)(?:\\/?\\?.*)/i as urlMatch then redirect(302, "${urlMatch.1}")');
const redirectScript = renderQxRedirectScript(redirectV2, {stamp:'2026-09-29 10:00:00 +08:00', category:'Adblock'});
assert.equal(redirectScript.qxAction, 'script-echo-response');
assert.equal(redirectScript.pattern, '(^https:\\/\\/live\\.bilibili\\.com\\/\\d+)(?:\\/?\\?.*)');
assert.match(redirectScript.script, /__wayxLocation/);
assert.match(redirectScript.script, /HTTP\/1\.1 302 Found/);

const reject404V2 = parseRewriteV2('request if ${url} ~= /^https:\\/\\/ads\\.example\\.com/i then reject(404)');
const reject404Qx = qxDirectRewritePlan(reject404V2);
assert.equal(reject404Qx.ok, true);
assert.match(reject404Qx.line, / url reject$/);
assert.equal(qxPrimitiveForRewriteV2Action(reject404V2.actions[0]), 'reject');


const surgeRedirectV2 = surgeRedirectRewritePlan(redirectV2);
assert.equal(surgeRedirectV2.ok, true);
assert.equal(
  surgeRedirectV2.line,
  '(^https:\\/\\/live\\.bilibili\\.com\\/\\d+)(?:\\/?\\?.*) $1 302',
);
assert.match(surgeRedirectV2.line, /^\(\^/);
assert.equal(surgeRedirectV2.line.includes('\\/'), true);
assert.match(surgeRedirectV2.line, /\$1 302$/);

// URL values retain their source lexical kind; native text cannot silently
// reinterpret raw or escaped literals as capture/plugin substitutions.
for (const action of ['redirect(302, VALUE)','url.replace(VALUE)']) {
  for (const value of ['`${hit.1}`', String.raw`"\${hit.1}"`, '"a b"', '"${hit.0}"']) {
    const ast=parseRewriteV2('request if ${url} ~= /(old)/ as hit then '+action.replace('VALUE',value));
    assert.equal(surgeRedirectRewritePlan(ast).ok,false,value);
  }
  const ast=parseRewriteV2('request if ${url} ~= /(old)/ as hit then '+action.replace('VALUE','"new-${hit.1}"'));
  assert.equal(surgeRedirectRewritePlan(ast).line,'(old) new-$1 '+(action.startsWith('redirect')?'302':'header'));
}

const surgeReject404 = surgeRejectRewritePlan(reject404V2);
assert.equal(surgeReject404.ok, true);
assert.equal(surgeReject404.section, 'url');
assert.match(surgeReject404.line, / _ reject$/);

const reject451V2 = parseRewriteV2('request if ${url} ~= /blocked/ then reject(451, "blocked")');
const reject451Script = renderQxRejectScript(reject451V2, {category:'Adblock'});
assert.equal(reject451Script.qxAction, 'script-echo-response');
assert.match(reject451Script.script, /HTTP\/1\.1 451 Unavailable For Legal Reasons/);

const qxHeaderV2 = parseRewriteV2('request if ${url} ~= /https:\\/\\/rule\\.example\\.com/i then request.header.set("user-agent", "Loon") | request.header.del("Cookie")');
const qxHeaderScript = renderQxHeaderScript(qxHeaderV2, {category:'Rewrite'});
assert.equal(qxHeaderScript.qxAction, 'script-request-header');
assert.match(qxHeaderScript.script, /__wayxSet/);
assert.match(qxHeaderScript.script, /__wayxDel/);
assert.throws(
  () => renderQxHeaderScript(
    parseRewriteV2('response if ${url} ~= /api/i then response.header.add("X-A", "1")'),
    {category:'Rewrite'},
  ),
  /header\.add cannot be represented losslessly/,
);

const inlineTextMock = renderQxInlineMockScript(
  parseRewriteV2('response if ${url} ~= /api/i then response.body.mock("text", "{\\\"ok\\\":true}", 200)'),
  {category:'Adblock'},
);
assert.equal(inlineTextMock.qxAction, 'script-echo-response');
assert.doesNotMatch(inlineTextMock.script, /\$task\.fetch/);
assert.match(inlineTextMock.script, /output\.body = __wayxBody/);

const grpcMock = renderQxInlineMockScript(
  parseRewriteV2('response if ${url} ~= /grpc/i then response.body.mock("text", "AAAAAAA=", 200, true) | response.header.set("grpc-status", "0")'),
  {category:'Adblock'},
);
assert.equal(grpcMock.qxAction, 'script-echo-response');
assert.match(grpcMock.script, /output\.bodyBytes = __wayxBase64ToArrayBuffer/);
assert.match(grpcMock.script, /grpc-status/);
assert.match(grpcMock.script, /__wayxHeaderSet/);

const requestInlineMock = renderQxInlineMockScript(
  parseRewriteV2('request if ${url} ~= /submit/i then request.body.mock("json", "{\\\"x\\\":1}")'),
  {category:'Rewrite'},
);
assert.equal(requestInlineMock.qxAction, 'script-request-body');
assert.match(requestInlineMock.script, /\$done\(\{headers, body: __wayxBody\}\)/);

const safeMockHeaderAdd = renderQxInlineMockScript(
  parseRewriteV2('response if ${url} ~= /api/i then response.body.mock("text", "x", 200) | response.header.add("X-Test", "a=1")'),
  {category:'Rewrite'},
);
assert.equal(safeMockHeaderAdd.qxAction, 'script-echo-response');
assert.match(safeMockHeaderAdd.script, /X-Test/);
assert.match(safeMockHeaderAdd.script, /a=1/);

assert.throws(
  () => renderQxInlineMockScript(
    parseRewriteV2('response if ${url} ~= /api/i then response.body.mock("text", "x", 200) | response.header.add("Content-Type", "text/plain")'),
    {category:'Rewrite'},
  ),
  /header\.add cannot be represented losslessly/,
);

const surgeHeaderSet = surgeHeaderRewritePlan(
  parseRewriteV2('request if ${url} ~= /api/i then request.header.set("X-Test", "1") | request.header.del("Cookie")')
);
assert.equal(surgeHeaderSet.ok, true);
assert.equal(surgeHeaderSet.section, 'header');
assert.equal(surgeHeaderSet.lines.length, 3);
assert.match(surgeHeaderSet.lines[0], /header-del X-Test$/);
assert.match(surgeHeaderSet.lines[1], /header-add X-Test 1$/);
assert.match(surgeHeaderSet.lines[2], /header-del Cookie$/);

const surgeHeaderAdd = surgeHeaderRewritePlan(
  parseRewriteV2('response if ${url} ~= /api/i then response.header.add("Set-Cookie", "a=1")')
);
assert.equal(surgeHeaderAdd.ok, true);
assert.equal(surgeHeaderAdd.lines.length, 1);
assert.match(surgeHeaderAdd.lines[0], /header-add Set-Cookie a=1$/);

const surgeMockFile = surgeMockFilePlan(
  parseRewriteV2('response if ${url} ~= /file/i then response.body.mock_file("json", "mock.json", 201)'),
  {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'},
);
assert.equal(surgeMockFile.ok, true);
assert.equal(surgeMockFile.section, 'map');
assert.match(surgeMockFile.line, /data-type=file/);
assert.match(surgeMockFile.line, /https:\/\/example\.com\/Plugins\/mock\.json/);
assert.match(surgeMockFile.line, /status-code=201/);

const surgeMockFileHeaders = surgeMockFilePlan(
  parseRewriteV2('response if ${url} ~= /file/i then response.body.mock_file("json", "mock.json", 200) | response.header.set("X-Test", "1")'),
  {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'},
);
assert.equal(surgeMockFileHeaders.ok, true);
assert.match(surgeMockFileHeaders.line, /Content-Type:application\/json\|X-Test:1/);

const surgeRequestMock = renderSurgeRequestMockScript(
  parseRewriteV2('request if ${url} ~= /submit/i then request.body.mock("json", "{\\\"x\\\":1}")'),
  {category:'Rewrite'},
);
assert.equal(surgeRequestMock.surgeType, 'http-request');
assert.equal(surgeRequestMock.requiresBody, true);
assert.match(surgeRequestMock.script, /\$done\(\{headers,body:__wayxBody\}\)/);

const surgeGrpcMock = surgeInlineMockPlan(
  parseRewriteV2('response if ${url} ~= /grpc/i then response.body.mock("text", "AAAAAAA=", 200, true) | response.header.set("grpc-status", "0")')
);
assert.equal(surgeGrpcMock.ok, true);
assert.equal(surgeGrpcMock.section, 'map');
assert.match(surgeGrpcMock.line, /data-type=base64/);
assert.match(surgeGrpcMock.line, /status-code=200/);
assert.match(surgeGrpcMock.line, /Content-Type:text\/plain\|grpc-status:0/);

const scriptV2Basic = parseScriptV2('response if ${url} ~= /^https:\\/\\/api\\.example\\.com/i then script("https://example.com/a.js") with tag="API", requires_body=true, binary_body_mode=false');
assert.equal(scriptV2Basic.phase, 'response');
assert.equal(scriptV2Basic.script.path, 'https://example.com/a.js');
assert.equal(scriptOptionBoolean(scriptV2Basic, 'requires_body'), true);
assert.equal(scriptOptionBoolean(scriptV2Basic, 'binary_body_mode'), false);
assert.match(scriptV2ToSource(scriptV2Basic), /then script\("https:\/\/example\.com\/a\.js"\)/);

const scriptV2ObjectArg = parseScriptV2('request if ${url} ~= /grpc/i then script("request.js", {${enabled}, ${lang}}) with enable=${enabled}, timeout=20, requires_body=true, binary_body_mode=true');
assert.deepEqual(scriptV2ArgumentRefs(scriptV2ObjectArg), ['enabled','lang']);
assert.deepEqual(scriptV2DynamicOptionRefs(scriptV2ObjectArg), [{option:'enable',id:'enabled'}]);
assert.equal(scriptOptionBoolean(scriptV2ObjectArg, 'binary_body_mode'), true);
assert.throws(
  () => parseScriptV2('response if ${url} ~= /api/ then script("a.js") with requires_body=${enabled}'),
  /requires_body: invalid value type/,
);
assert.throws(
  () => parseScriptV2('response if ${url} ~= /api/ then script("a.js") with unknown=true'),
  /unknown Script v2 option/,
);

const scriptV2ArgumentCondition = parseScriptV2(
  'request if ${enabled} == true && ${url} ~= /api/ then script("https://example.com/a.js") with requires_body=true'
);
const qxScriptV2ArgumentCondition = qxScriptV2Plan(
  scriptV2ArgumentCondition,
  {scriptUrl:'https://example.com/a.js', sourceText:'$done({body:$request.body});', argumentIds:new Set(['enabled'])},
);
assert.equal(qxScriptV2ArgumentCondition.ok, false);
assert.match(qxScriptV2ArgumentCondition.reason, /plugin \[Argument\] condition/);
const surgeScriptV2ArgumentCondition = surgeScriptV2Plan(
  scriptV2ArgumentCondition,
  {scriptUrl:'https://example.com/a.js', name:'arg_condition', argumentIds:new Set(['enabled'])},
);
assert.equal(surgeScriptV2ArgumentCondition.ok, false);
assert.match(surgeScriptV2ArgumentCondition.reason, /plugin \[Argument\] condition/);

const qxScriptV2Native = qxScriptV2Plan(
  parseScriptV2('response if ${url} ~= /^https:\\/\\/api\\.example\\.com/i then script("https://example.com/a.js") with tag="API", requires_body=true'),
  {scriptUrl:'https://example.com/a.js', sourceText:'$done({body:$response.body});'},
);
assert.equal(qxScriptV2Native.ok, true);
assert.match(qxScriptV2Native.line, /url script-response-body https:\/\/example\.com\/a\.js$/);

const qxResponseBinaryNative = qxScriptV2Plan(
  parseScriptV2('response if ${url} ~= /image/i then script("https://example.com/binary.js") with requires_body=true, binary_body_mode=true'),
  {scriptUrl:'https://example.com/binary.js', sourceText:'$done({bodyBytes:$response.bodyBytes});'},
);
assert.equal(qxResponseBinaryNative.ok, true);
assert.match(qxResponseBinaryNative.line, /url script-response-body /);
assert.ok(qxResponseBinaryNative.notes.some(note => /binary_body_mode=true ignored/i.test(note)));

const qxRequestBinaryUnsupported = qxScriptV2Plan(
  parseScriptV2('request if ${url} ~= /upload/i then script("https://example.com/binary.js") with binary_body_mode=true'),
  {scriptUrl:'https://example.com/binary.js', sourceText:'$done({});'},
);
assert.equal(qxRequestBinaryUnsupported.ok, true);
assert.match(qxRequestBinaryUnsupported.line, /url script-request-header /);
assert.doesNotMatch(qxRequestBinaryUnsupported.line, /script-request-body/);
assert.ok(qxRequestBinaryUnsupported.notes.some(note => /binary_body_mode=true ignored/i.test(note)));

const surgeScriptV2Native = surgeScriptV2Plan(
  parseScriptV2('request if ${url} ~= /submit/i then script("https://example.com/request.js") with requires_body=true, binary_body_mode=true'),
  {scriptUrl:'https://example.com/request.js', name:'request_script'},
);
assert.equal(surgeScriptV2Native.ok, true);
assert.match(surgeScriptV2Native.line, /^request_script = type=http-request,/);
assert.match(surgeScriptV2Native.line, /requires-body=true/);
assert.match(surgeScriptV2Native.line, /binary-body-mode=true/);

const qxScriptV2NeedsReview = qxScriptV2Plan(scriptV2ObjectArg, {scriptUrl:'request.js', sourceText:'$done({body:$request.body});'});
assert.equal(qxScriptV2NeedsReview.ok,true);
assert.match(qxScriptV2NeedsReview.notes.join('\n'),/forced to enabled/);
const surgeScriptV2NeedsReview = surgeScriptV2Plan(scriptV2ObjectArg, {scriptUrl:'request.js', name:'x'});
assert.equal(surgeScriptV2NeedsReview.ok, false);
assert.match(surgeScriptV2NeedsReview.reason, /dynamic enable|argument/i);

const fixedSurgeArgument = surgeScriptV2Plan(
  parseScriptV2('response if ${url} ~= /api/ then script("a.js", "plain-string") with requires_body=true'),
  {scriptUrl:'a.js', name:'fixed_arg'},
);
assert.equal(fixedSurgeArgument.ok, true);
assert.match(fixedSurgeArgument.line, /argument="plain-string"/);

const fixedQxArgument = qxScriptV2Plan(
  parseScriptV2('response if ${url} ~= /api/ then script("a.js", "plain-string") with requires_body=true'),
  {scriptUrl:'a.js'},
);
assert.equal(fixedQxArgument.ok, true);
assert.match(fixedQxArgument.line, /url script-response-body a\.js$/);
assert.ok(fixedQxArgument.notes.some(note => /argument ignored/i.test(note)));

const qxUnsupportedDynamicOptions = qxScriptV2Plan(
  parseScriptV2('response if ${url} ~= /api/ then script("a.js", {${enabled}}) with enable=${enabled}, timeout=60, requires_body=true'),
  {scriptUrl:'a.js', argumentIds:new Set(['enabled']), sourceText:'$done({body:$response.body});'},
);
assert.equal(qxUnsupportedDynamicOptions.ok,true);
assert.match(qxUnsupportedDynamicOptions.notes.join('\n'),/forced to enabled/);

const surgeBinaryOnly = surgeScriptV2Plan(
  parseScriptV2('request if ${url} ~= /raw/ then script("raw.js") with binary_body_mode=true'),
  {scriptUrl:'raw.js', name:'raw'},
);
assert.equal(surgeBinaryOnly.ok, true);
assert.match(surgeBinaryOnly.line, /binary-body-mode=true/);
assert.doesNotMatch(surgeBinaryOnly.line, /requires-body=true/);

console.log('WayX converter checkpoint tests passed');
}

if (selectedCase === "rewrite-ir.mjs") {
// Suite case: rewrite-ir.mjs
// Target-neutral Rewrite Semantic IR contract
// Author: chance
// Category: Converter / Rewrite / Semantic IR Validation


const legacyReject=legacyRewriteToSemanticIr('^https://ad\\.example\\.com','reject-dict');
assert.equal(legacyReject.sourceSyntax,'legacy');
assert.equal(legacyReject.phase,'request');
assert.equal(legacyReject.pipeline,false);
assert.deepEqual(
  {kind:legacyReject.operations[0].kind,variant:legacyReject.operations[0].variant,status:legacyReject.operations[0].status},
  {kind:'reject',variant:'dict',status:200},
);

const v2RejectSource='response if ${url} ~= /ads/ then reject_dict(200)';
const v2Reject=rewriteV2AstToSemanticIr(parseRewriteV2(v2RejectSource),{source:v2RejectSource});
assert.equal(v2Reject.sourceSyntax,'v2');
assert.equal(v2Reject.phase,'response');
assert.equal(singleRewriteOperation(v2Reject).kind,'reject');
assert.equal(singleRewriteOperation(v2Reject).variant,'dict');
assert.equal(singleRewriteOperation(v2Reject).status,200);

const legacyRedirect=legacyRewriteToSemanticIr('^https://old\\.example\\.com','302 https://new.example.com/');
assert.equal(singleRewriteOperation(legacyRedirect).kind,'redirect');
assert.equal(singleRewriteOperation(legacyRedirect).redirectMode,'absolute-location');
assert.equal(singleRewriteOperation(legacyRedirect).target,'https://new.example.com/');

const v2RedirectSource='request if ${url} ~= /(^https:\\/\\/old\\.example\\.com\\/)(.*)/ as hit then redirect(302, "${hit.1}new")';
const v2Redirect=rewriteV2AstToSemanticIr(parseRewriteV2(v2RedirectSource));
assert.equal(singleRewriteOperation(v2Redirect).kind,'redirect');
assert.equal(singleRewriteOperation(v2Redirect).redirectMode,'matched-range-template');
assert.equal(singleRewriteOperation(v2Redirect).status,302);

const legacyHeader=legacyRewriteToSemanticIr('^https://api\\.example\\.com','response-header-add Set-Cookie a=1');
assert.deepEqual(
  {kind:singleRewriteOperation(legacyHeader).kind,phase:singleRewriteOperation(legacyHeader).phase,operation:singleRewriteOperation(legacyHeader).operation},
  {kind:'header',phase:'response',operation:'add'},
);

const v2HeaderSource='response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=1")';
const v2Header=rewriteV2AstToSemanticIr(parseRewriteV2(v2HeaderSource));
assert.deepEqual(
  {kind:singleRewriteOperation(v2Header).kind,phase:singleRewriteOperation(v2Header).phase,operation:singleRewriteOperation(v2Header).operation},
  {kind:'header',phase:'response',operation:'add'},
);

const legacyBody=legacyRewriteToSemanticIr('^https://api\\.example\\.com','response-body-replace-regex ads clean');
assert.equal(singleRewriteOperation(legacyBody).kind,'body-regex');
assert.equal(singleRewriteOperation(legacyBody).phase,'response');

const v2BodySource='response if ${url} ~= /api/ then response.body.replace(/ads/,"clean")';
const v2Body=rewriteV2AstToSemanticIr(parseRewriteV2(v2BodySource));
assert.equal(singleRewriteOperation(v2Body).kind,'body-regex');
assert.equal(singleRewriteOperation(v2Body).phase,'response');

const legacyJson=legacyRewriteToSemanticIr('^https://api\\.example\\.com','response-body-json-jq "del(.ads)"');
assert.equal(singleRewriteOperation(legacyJson).kind,'json');
assert.equal(singleRewriteOperation(legacyJson).operation,'jq');
assert.equal(isEmptyLegacyJsonJqIr(legacyJson),false);
assert.equal(isEmptyLegacyJsonJqIr(legacyRewriteToSemanticIr('^https://api\\.example\\.com',"response-body-json-jq ''")),true);
assert.equal(isEmptyLegacyJsonJqIr(legacyRewriteToSemanticIr('^https://api\\.example\\.com','request-body-json-jq ""')),true);
assert.equal(isEmptyLegacyJsonJqIr(legacyRewriteToSemanticIr('^https://api\\.example\\.com',"response-body-json-jq ''\u200b")),true);
const emptyV2Jq=rewriteV2AstToSemanticIr(parseRewriteV2('response if ${url} ~= /api/ then response.json.jq("")'));
assert.equal(isEmptyJsonJqIr(emptyV2Jq),true);
assert.equal(isEmptyJsonJqIr(rewriteV2AstToSemanticIr(parseRewriteV2('response if ${url} ~= /api/ then response.json.jq(".")'))),false);

const v2JsonSource='response if ${url} ~= /api/ then response.json.jq("del(.ads)")';
const v2Json=rewriteV2AstToSemanticIr(parseRewriteV2(v2JsonSource));
assert.equal(singleRewriteOperation(v2Json).kind,'json');
assert.equal(singleRewriteOperation(v2Json).operation,'jq');

const legacyMock=legacyRewriteToSemanticIr(
  '^https://api\\.example\\.com',
  'mock-response-body data-type=json data="{}" status-code=201',
);
assert.equal(singleRewriteOperation(legacyMock).kind,'mock');
assert.equal(singleRewriteOperation(legacyMock).operation,'inline');
assert.equal(singleRewriteOperation(legacyMock).mock.status,201);

const legacyMockReordered=legacyRewriteToSemanticIr(
  '^https://api\\.example\\.com',
  'mock-response-body status-code=202 data="ok" data-type=text',
);
assert.equal(singleRewriteOperation(legacyMockReordered).kind,'mock');
assert.equal(singleRewriteOperation(legacyMockReordered).mock.status,202);

const legacyMockUnknown=legacyRewriteToSemanticIr(
  '^https://api\\.example\\.com',
  'mock-response-body data-type=text data="ok" future-option=true',
);
assert.equal(singleRewriteOperation(legacyMockUnknown).kind,'unknown');
assert.match(singleRewriteOperation(legacyMockUnknown).reason,/future-option/);

const v2MockSource='response if ${url} ~= /api/ then response.body.mock("json","{}",201,false)';
const v2Mock=rewriteV2AstToSemanticIr(parseRewriteV2(v2MockSource));
assert.equal(singleRewriteOperation(v2Mock).kind,'mock');
assert.equal(singleRewriteOperation(v2Mock).operation,'inline');

const pipelineSource='response if ${url} ~= /api/ then response.header.del("Server") | response.json.replace("data.ads",false) | response.body.replace(/x/,"y")';
const pipeline=rewriteV2AstToSemanticIr(parseRewriteV2(pipelineSource));
assert.equal(pipeline.pipeline,true);
assert.deepEqual(rewriteOperationKinds(pipeline),['header','json','body-regex']);
assert.equal(pipeline.operations[0].sourceAction.name,'response.header.del');
assert.equal(pipeline.operations[1].sourceAction.name,'response.json.replace');
assert.equal(pipeline.operations[2].sourceAction.name,'response.body.replace');

const legacyUrlRewrite=legacyRewriteToSemanticIr('^http://old\\.example\\.com','header https://new.example.com');
assert.equal(singleRewriteOperation(legacyUrlRewrite).kind,'url-rewrite');
assert.equal(singleRewriteOperation(legacyUrlRewrite).rewriteMode,'transparent-replace');

const unknownLegacy=legacyRewriteToSemanticIr('^https://api\\.example\\.com','future-action foo');
assert.equal(singleRewriteOperation(unknownLegacy).kind,'unknown');

console.log('Rewrite semantic IR contract passed');
}

if (selectedCase === "rewrite-target-planners.mjs") {
// Suite case: rewrite-target-planners.mjs
// Rewrite target planner contract
// Author: chance
// Category: Converter / Rewrite / Target Planning Validation


function ctx(extra={}) {
  return {
    id:'Fixture',
    rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
    sourceUrl:'https://example.com/fixture.lpx',
    stamp:'2026-10-01 00:00:00 +08:00',
    category:'Rewrite / Test',
    generatedScripts:new Map(),
    mockFiles:new Map(),
    jqFiles:new Map(),
    argumentRefs:[],
    argumentTable:{byId:new Map()},
    ...extra,
  };
}

function v2(source) {
  return rewriteV2AstToSemanticIr(parseRewriteV2(source),{source});
}

const legacyReject=legacyRewriteToSemanticIr('^https://ads\\.example\\.com','reject-dict');
assert.equal(planQxRewrite(legacyReject,ctx()).line,'^https://ads\\.example\\.com url reject-dict');
assert.equal(planSurgeRewrite(legacyReject,ctx()).section,'map');

const legacyQuotedKey=legacyRewriteToSemanticIr(
  '^https://api\\.example\\.com',
  'response-body-json-replace data["3D_AVATAR_UPDATE"] false',
);
const qxLegacyQuotedKey=planQxRewrite(legacyQuotedKey,ctx());
assert.equal(qxLegacyQuotedKey.section,'rewrite');
assert.match(qxLegacyQuotedKey.line,/jsonjq-response-body/);
assert.match(qxLegacyQuotedKey.line,/3D_AVATAR_UPDATE/);
const surgeLegacyQuotedKey=planSurgeRewrite(legacyQuotedKey,ctx());
assert.equal(surgeLegacyQuotedKey.section,'body');
assert.match(surgeLegacyQuotedKey.line,/http-response-jq/);

const rawUrlPattern='^https:\\/\\/api\\.example\\.com\\/v1\\/(?:a|b)\\?x=1$';
const rawUrlMatcher=qxExactRewriteMatcherPlan(parseRewriteV2(
  'request if ${url} ~= /'+rawUrlPattern+'/ then request.header.add("X-Test","1")'
));
assert.equal(rawUrlMatcher.urlPattern,rawUrlPattern);
assert.equal(rawUrlMatcher.prefix,rawUrlPattern+' url ');

const droppedFlagsAst=parseRewriteV2(
  'response if ${url} ~= /^https:\\/\\/flags\\.example\\/api$/ims then reject_dict(200)'
);
const droppedFlagsMatcher=qxExactRewriteMatcherPlan(droppedFlagsAst,{compatibility:true});
assert.equal(qxExactRewriteMatcherPlan(droppedFlagsAst).ok,false);
assert.equal(droppedFlagsMatcher.urlPattern,'^https:\\/\\/flags\\.example\\/api$');
assert.equal(droppedFlagsMatcher.prefix,'^https:\\/\\/flags\\.example\\/api$ url ');
const droppedFlagsDirect=qxDirectRewritePlan(droppedFlagsAst,{matcher:droppedFlagsMatcher});
assert.equal(droppedFlagsDirect.ok,true);
assert.equal(droppedFlagsDirect.line,'^https:\\/\\/flags\\.example\\/api$ url reject-dict');
assert.doesNotMatch(droppedFlagsDirect.line,/\(\?[ims]+\)|\/ims?\b/);

const methodRejectNativeAst=parseRewriteV2(
  'response if ${url} ~= /api/ && ${request.method} == "POST" then reject_dict(200)'
);
const methodRejectNativeMatcher=qxExactRewriteMatcherPlan(methodRejectNativeAst);
const methodRejectNative=qxDirectRewritePlan(methodRejectNativeAst,{matcher:methodRejectNativeMatcher});
assert.equal(methodRejectNative.ok,true);
assert.equal(methodRejectNative.line,'api ^POST[ ] url-and-header reject-dict');

const methodJqNativeAst=parseRewriteV2(
  'response if ${request.method} == "POST" then response.json.jq(".data")'
);
const methodJqNativeMatcher=qxExactRewriteMatcherPlan(methodJqNativeAst);
const methodJqNative=qxDirectRewritePlan(methodJqNativeAst,{matcher:methodJqNativeMatcher});
assert.equal(methodJqNative.ok,true);
assert.equal(methodJqNative.line,"^ ^POST[ ] url-and-header jsonjq-response-body '.data'");

const methodBodyNativeAst=parseRewriteV2(
  'request if ${url} ~= /upload/ && ${request.method} == "PUT" then request.body.replace(/foo/,"bar")'
);
const methodBodyNativeMatcher=qxExactRewriteMatcherPlan(methodBodyNativeAst);
const methodBodyNative=qxDirectRewritePlan(methodBodyNativeAst,{matcher:methodBodyNativeMatcher});
assert.equal(methodBodyNative.ok,true);
assert.equal(methodBodyNative.line,'upload ^PUT[ ] url-and-header request-body foo request-body bar');

const nonExactHeaderDirectAst=parseRewriteV2(
  'response if ${request.header[\'X-Region\']} == "CN" then response.json.jq(".data")'
);
const nonExactHeaderDirectMatcher=qxExactRewriteMatcherPlan(nonExactHeaderDirectAst);
assert.equal(nonExactHeaderDirectMatcher.ok,false);
const nonExactHeaderDirect=qxDirectRewritePlan(nonExactHeaderDirectAst,{matcher:qxRewriteMatcherPlan(nonExactHeaderDirectAst)});
assert.equal(nonExactHeaderDirect.ok,false);
assert.match(nonExactHeaderDirect.reason,/requires an exact matcher plan/);

const rejectSource='response if ${url} ~= /ads/ then reject_dict(200)';
const rejectIr=v2(rejectSource);
assert.match(planQxRewrite(rejectIr,ctx()).line,/ url reject-dict$/);
const surgeReject=planSurgeRewrite(rejectIr,ctx());
assert.equal(surgeReject.section,'map');
assert.match(surgeReject.line,/data="\{\}"/);

const requestHeaderSource='request if ${url} ~= /api/ then request.header.add("X-Test","1")';
const requestHeaderIr=v2(requestHeaderSource);
const qxRequestHeader=planQxRewrite(requestHeaderIr,ctx());
assert.equal(qxRequestHeader.section,'rewrite');
assert.match(qxRequestHeader.line,/ url request-header /);

const responseHeaderSource='response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=1")';
const qxResponseHeader=planQxRewrite(v2(responseHeaderSource),ctx());
assert.equal(qxResponseHeader.section,'rewrite');
assert.match(qxResponseHeader.line,/ url response-header /);
assert.match(qxResponseHeader.line,/Set-Cookie: a=1/);

const unsafeResponseHeaderSource='response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=$1")';
const qxUnsafeResponseHeader=planQxRewrite(v2(unsafeResponseHeaderSource),ctx());
assert.equal(qxUnsafeResponseHeader.section,'comment');
assert.equal(qxUnsafeResponseHeader.reason,'unsupported-qx-response-header-add-comment');

const redirectSource='request if ${url} ~= /(^https:\\/\\/old\\.example\\.com\\/)(.*)/ as hit then redirect(302, "${hit.1}new")';
const redirectIr=v2(redirectSource);
const qxRedirectCtx=ctx();
const qxRedirect=planQxRewrite(redirectIr,qxRedirectCtx);
assert.equal(qxRedirect.section,'rewrite');
assert.match(qxRedirect.line,/script-echo-response/);
assert.equal(qxRedirectCtx.generatedScripts.size,1);
const surgeRedirect=planSurgeRewrite(redirectIr,ctx());
assert.equal(surgeRedirect.section,'url');
assert.match(surgeRedirect.line,/ 302$/);

const redirectMethodSource='request if ${url} ~= /\\/old\\/(\\d+)/ as hit && ${request.method} == "POST" then redirect(302, "/new/${hit.1}")';
const redirectMethodCtx=ctx();
const redirectMethod=planQxRewrite(v2(redirectMethodSource),redirectMethodCtx);
assert.equal(redirectMethod.section,'rewrite');
assert.match(redirectMethod.line,/^\\\/old\\\/\(\\d\+\) \^POST\[ \] url-and-header script-echo-response /);
const redirectMethodScript=[...redirectMethodCtx.generatedScripts.values()][0];
assert.ok(redirectMethodScript.includes(JSON.stringify('\\/old\\/(\\d+)')));
assert.match(redirectMethodScript,/"name":"request.method".*"value":"POST"/);
assert.match(redirectMethodScript,/\.exec\(__wayxUrl\)/);
assert.match(redirectMethodScript,/__wayxMatch\[1\] === undefined/);

const redirectHeaderSource='request if ${url} ~= /api\\/(\\d+)/ as hit && ${request.header[\'X-Region\']} == "CN" then redirect(307, "/v/${hit.1}")';
const redirectHeaderCtx=ctx();
const redirectHeader=planQxRewrite(v2(redirectHeaderSource),redirectHeaderCtx);
assert.equal(redirectHeader.section,'comment');
assert.match(redirectHeader.line,/echo-response requires an exact condition/);
assert.equal(redirectHeaderCtx.generatedScripts.size,0);

const redirectResponseStatusSource='response if ${url} ~= /api\\/(\\d+)/ as hit && ${response.status} == 201 then redirect(302, "/ok/${hit.1}")';
const redirectResponseStatusCtx=ctx();
const redirectResponseStatus=planQxRewrite(v2(redirectResponseStatusSource),redirectResponseStatusCtx);
assert.equal(redirectResponseStatus.section,'comment');
assert.match(redirectResponseStatus.line,/echo-response requires an exact condition/);
assert.equal(redirectResponseStatusCtx.generatedScripts.size,0);

const redirectOrSource='request if (${url} ~= /a\\/(\\d+)/ as a && ${request.method} == "POST") || ${url} ~= /b\\/(\\d+)/ as b then redirect(302, "/x")';
const redirectOrCtx=ctx();
const redirectOr=planQxRewrite(v2(redirectOrSource),redirectOrCtx);
assert.equal(redirectOr.section,'comment');
assert.match(redirectOr.line,/REVIEW REQUIRED/);
assert.equal(redirectOrCtx.generatedScripts.size,0);

const quotedV2JsonSource='response if ${url} ~= /api/ then response.json.delete(["data.resp_map[\\"/apihub/api/getAppConfig\\"].enabled", "data[\\"3D_AVATAR_UPDATE\\"]"])';
const quotedV2Json=planQxRewrite(v2(quotedV2JsonSource),ctx());
assert.equal(quotedV2Json.section,'rewrite');
assert.match(quotedV2Json.line,/jsonjq-response-body/);
assert.ok(quotedV2Json.line.includes('/apihub/api/getAppConfig'));
assert.match(quotedV2Json.line,/3D_AVATAR_UPDATE/);

const jsonAddSource='response if ${url} ~= /api/ then response.json.add("data.new",true)';
const jsonAddIr=v2(jsonAddSource);
const qxJsonCtx=ctx();
const qxJson=planQxRewrite(jsonAddIr,qxJsonCtx);
assert.equal(qxJson.section,'rewrite');
assert.match(qxJson.line,/jsonjq-response-body/);
assert.match(qxJson.line,/\.data\.new = true/);
assert.match(qxJson.line,/== null/);
assert.equal(qxJsonCtx.generatedScripts.size,0);
const surgeJsonCtx=ctx();
const surgeJson=planSurgeRewrite(jsonAddIr,surgeJsonCtx);
assert.equal(surgeJson.section,'body');
assert.match(surgeJson.line,/^http-response-jq /);
assert.match(surgeJson.line,/\.data\.new = true/);
assert.equal(surgeJsonCtx.generatedScripts.size,0);

const mockHeaderSource='response if ${url} ~= /api/ then response.body.mock("text","{}",200,false) | response.header.set("X-Test","ok")';
const mockHeaderIr=v2(mockHeaderSource);
const qxMockHeaderCtx=ctx();
const qxMockHeader=planQxRewrite(mockHeaderIr,qxMockHeaderCtx);
assert.equal(qxMockHeader.section,'rewrite');
assert.equal(qxMockHeaderCtx.generatedScripts.size,1);
const surgeMockHeader=planSurgeRewrite(mockHeaderIr,ctx());
assert.equal(surgeMockHeader.section,'map');

const mockDelSource='response if ${url} ~= /api/ then response.body.mock("text","{}",200,false) | response.header.del("Server")';
const qxMockDelCtx=ctx();
const qxMockDel=planQxRewrite(v2(mockDelSource),qxMockDelCtx);
assert.equal(qxMockDel.section,'rewrite');
assert.equal(qxMockDelCtx.generatedScripts.size,1);
assert.equal(planSurgeRewrite(v2(mockDelSource),ctx()).section,'map');

const mockFileHeaderSource='response if ${url} ~= /settings\\/Enhanced/ then response.body.mock_file("html","https://example.com/settings.html",200) | response.header.add("Cache-Control","no-store")';
const mockFileHeaderMaterialized=new Map([[mockFileHeaderSource,{
  bodyText:'<html><body>settings</body></html>',
  sourceFile:'https://example.com/settings.html',
}]]);
const qxMockFileHeaderCtx=ctx({mockFiles:mockFileHeaderMaterialized});
const qxMockFileHeader=planQxRewrite(v2(mockFileHeaderSource),qxMockFileHeaderCtx);
assert.equal(qxMockFileHeader.section,'rewrite');
assert.match(qxMockFileHeader.line,/script-echo-response/);
assert.equal(qxMockFileHeaderCtx.generatedScripts.size,1);
const qxMockFileHeaderScript=[...qxMockFileHeaderCtx.generatedScripts.values()][0];
assert.match(qxMockFileHeaderScript,/Cache-Control/);
assert.match(qxMockFileHeaderScript,/no-store/);
const surgeMockFileHeader=planSurgeRewrite(
  v2(mockFileHeaderSource),
  ctx({mockFiles:mockFileHeaderMaterialized}),
);
assert.equal(surgeMockFileHeader.section,'map');
assert.match(surgeMockFileHeader.line,/data-type=file/);
assert.match(surgeMockFileHeader.line,/Cache-Control:no-store/);

const duplicateMockHeaderSource='response if ${url} ~= /settings\\/Enhanced/ then response.body.mock_file("html","https://example.com/settings.html",200) | response.header.add("Content-Type","text/plain")';
const duplicateMockHeaderMaterialized=new Map([[duplicateMockHeaderSource,{
  bodyText:'<html></html>',
  sourceFile:'https://example.com/settings.html',
}]]);
const duplicateMockHeaderCtx=ctx({mockFiles:duplicateMockHeaderMaterialized});
const duplicateMockHeader=planQxRewrite(v2(duplicateMockHeaderSource),duplicateMockHeaderCtx);
assert.equal(duplicateMockHeader.section,'comment');
assert.match(duplicateMockHeader.line,/REVIEW REQUIRED/);
assert.equal(duplicateMockHeaderCtx.generatedScripts.size,0);

const mixedSource='response if ${url} ~= /api/ then response.header.del("Server") | response.body.replace(/x/,"y")';
const mixedIr=v2(mixedSource);
const qxMixedCtx=ctx();
const qxMixed=planQxRewrite(mixedIr,qxMixedCtx);
assert.equal(qxMixed.section,'rewrite');
assert.equal(qxMixed.issue,undefined);
assert.equal(qxMixedCtx.generatedScripts.size,1);
const surgeMixedCtx=ctx();
const surgeMixed=planSurgeRewrite(mixedIr,surgeMixedCtx);
assert.equal(surgeMixed.section,'script');
assert.equal(surgeMixed.issue,undefined);
assert.equal(surgeMixedCtx.generatedScripts.size,1);

const threeActionSource='response if ${url} ~= /api/ then response.header.del("Server") | response.body.replace(/x/,"y") | response.json.delete("data.ad")';
const qxThreeCtx=ctx();
const qxThree=planQxRewrite(v2(threeActionSource),qxThreeCtx);
assert.equal(qxThree.section,'rewrite');
assert.equal(qxThreeCtx.generatedScripts.size,1);
const qxThreeScript=[...qxThreeCtx.generatedScripts.values()][0];
const qxActionBody=qxThreeScript.slice(qxThreeScript.indexOf('if('));
assert.ok(qxActionBody.indexOf('__wayxDel("Server");') < qxActionBody.indexOf('__wayxBody=__wayxRegexReplace'));
assert.ok(qxActionBody.indexOf('__wayxBody=__wayxRegexReplace') < qxActionBody.indexOf('__wayxJsonAction(j=>__wayxJsonDelete'));

const surgeThreeCtx=ctx();
const surgeThree=planSurgeRewrite(v2(threeActionSource),surgeThreeCtx);
assert.equal(surgeThree.section,'script');
assert.equal(surgeThreeCtx.generatedScripts.size,1);

const mixedScriptMatrix=[
  {
    source:'request if ${url} ~= /hb/ then request.header.set("X-Test","1") | request.body.replace(/a/,"b")',
    action:'script-request-body',
  },
  {
    source:'request if ${url} ~= /hj/ then request.header.del("Cookie") | request.json.replace("data.ok",true)',
    action:'script-request-body',
  },
  {
    source:'request if ${url} ~= /bj/ then request.body.replace(/false/,"true") | request.json.add("data.flag",1)',
    action:'script-request-body',
  },
  {
    source:'request if ${url} ~= /hjb/ then request.header.replace("User-Agent",/Old/,"New") | request.json.delete("data.ad") | request.body.replace(/x/,"y")',
    action:'script-request-body',
  },
  {
    source:'response if ${url} ~= /hb/ then response.header.set("X-Test","1") | response.body.replace(/a/,"b")',
    action:'script-response-body',
  },
  {
    source:'response if ${url} ~= /hj/ then response.header.del("Server") | response.json.replace("data.ok",true)',
    action:'script-response-body',
  },
  {
    source:'response if ${url} ~= /bj/ then response.body.replace(/false/,"true") | response.json.add("data.flag",1)',
    action:'script-response-body',
  },
];
for(const item of mixedScriptMatrix){
  const c=ctx();
  const planned=planQxRewrite(v2(item.source),c);
  assert.equal(planned.section,'rewrite');
  assert.match(planned.line,new RegExp(' '+item.action+' https://raw\\.githubusercontent\\.com/JuemingDC/WayX/main/Script/Fixture/features_qx_[0-9a-f]{10}\\.js$'));
  assert.equal(c.generatedScripts.size,1);
}

const nativeUnavailableMatrix=[
  'request if ${url} ~= /url/ then url.replace("https://example.com") | request.header.set("X-Test","1")',
  'request if ${url} ~= /redirect/ then redirect(302,"https://example.com") | request.header.set("X-Test","1")',
  'request if ${url} ~= /reject/ then reject_dict(200) | request.header.set("X-Test","1")',
  'response if ${url} ~= /jq/ then response.json.jq(".data") | response.body.replace(/x/,"y")',
];
for(const source of nativeUnavailableMatrix){
  const c=ctx();
  const planned=planQxRewrite(v2(source),c);
  assert.equal(planned.section,'comment');
  assert.match(planned.line,/REVIEW REQUIRED/);
  assert.equal(c.generatedScripts.size,0);
}

const requestMockMixedSource='request if ${url} ~= /api/ then request.header.set("X-A","1") | request.body.mock("json", `{"ok":false}`) | request.body.replace(/false/,"true") | request.json.add("flag",1) | request.header.del("Cookie")';
const requestMockMixedCtx=ctx();
const requestMockMixed=planQxRewrite(v2(requestMockMixedSource),requestMockMixedCtx);
assert.equal(requestMockMixed.section,'rewrite');
assert.match(requestMockMixed.line,/^api url script-request-body https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/Script\/Fixture\/features_qx_[0-9a-f]{10}\.js$/);
assert.equal(requestMockMixedCtx.generatedScripts.size,1);
const requestMockMixedScript=[...requestMockMixedCtx.generatedScripts.values()][0];
const requestMockBody=requestMockMixedScript.slice(requestMockMixedScript.indexOf('if('));
assert.ok(requestMockBody.indexOf('__wayxSet("X-A","1")') < requestMockBody.indexOf('__wayxSet("Content-Type","application/json")'));
assert.ok(requestMockBody.indexOf('__wayxSet("Content-Type","application/json")') < requestMockBody.indexOf('__wayxBody=__wayxRegexReplace'));
assert.ok(requestMockBody.indexOf('__wayxBody=__wayxRegexReplace') < requestMockBody.indexOf('__wayxJsonAction(j=>__wayxJsonAdd'));
assert.ok(requestMockBody.indexOf('__wayxJsonAction(j=>__wayxJsonAdd') < requestMockBody.indexOf('__wayxDel("Cookie")'));

const requestMockHeaderConditionSource='request if ${request.header[\'X-Region\']} == "CN" then request.body.mock("text","hello") | request.header.set("X-Test","ok")';
const requestMockHeaderConditionCtx=ctx();
const requestMockHeaderCondition=planQxRewrite(v2(requestMockHeaderConditionSource),requestMockHeaderConditionCtx);
assert.equal(requestMockHeaderCondition.section,'rewrite');
assert.match(requestMockHeaderCondition.line,/url-and-header script-request-body /);
assert.match([...requestMockHeaderConditionCtx.generatedScripts.values()][0],/X-Region/);

const requestMockFileMixedSource='request if ${request.header[\'X-Region\']} == "CN" then request.header.set("X-Before","1") | request.body.mock_file("json","request.json") | request.json.replace("ok",true) | request.header.del("Cookie")';
const requestMockFileMixedCtx=ctx({
  mockFiles:new Map([[requestMockFileMixedSource,{
    bodyText:'{"ok":false}',
    sourceFile:'https://example.com/request.json',
  }]]),
});
const requestMockFileMixed=planQxRewrite(v2(requestMockFileMixedSource),requestMockFileMixedCtx);
assert.equal(requestMockFileMixed.section,'rewrite');
assert.match(requestMockFileMixed.line,/url-and-header script-request-body /);
assert.equal(requestMockFileMixedCtx.generatedScripts.size,1);
const requestMockFileMixedScript=[...requestMockFileMixedCtx.generatedScripts.values()][0];
assert.ok(requestMockFileMixedScript.includes('__wayxWith("{\\\"ok\\\":false}"'));
assert.ok(requestMockFileMixedScript.indexOf('__wayxSet("X-Before","1")') < requestMockFileMixedScript.indexOf('__wayxSet("Content-Type","application/json")'));
assert.ok(requestMockFileMixedScript.indexOf('__wayxSet("Content-Type","application/json")') < requestMockFileMixedScript.indexOf('__wayxJsonAction(j=>__wayxJsonReplace'));
assert.ok(requestMockFileMixedScript.indexOf('__wayxJsonAction(j=>__wayxJsonReplace') < requestMockFileMixedScript.indexOf('__wayxDel("Cookie")'));

const requestBinaryMockMixedSource='request if ${url} ~= /upload/ then request.body.mock("png","AA==",true) | request.header.set("X-Test","1")';
const requestBinaryMockMixedCtx=ctx();
const requestBinaryMockMixed=planQxRewrite(v2(requestBinaryMockMixedSource),requestBinaryMockMixedCtx);
assert.equal(requestBinaryMockMixed.section,'comment');
assert.match(requestBinaryMockMixed.line,/REVIEW REQUIRED/);
assert.match(requestBinaryMockMixed.line,/text request mock requires/);
assert.equal(requestBinaryMockMixedCtx.generatedScripts.size,0);

const unsupportedKnownComplexSource='response if ${url} ~= /api/ then response.json.jq(".data") | response.header.set("X-Test","ok")';
const qxUnsupportedKnown=planQxRewrite(v2(unsupportedKnownComplexSource),ctx());
assert.equal(qxUnsupportedKnown.section,'comment');
assert.notEqual(qxUnsupportedKnown.issue,true);
assert.match(qxUnsupportedKnown.line,/REVIEW REQUIRED/);
const surgeUnsupportedKnown=planSurgeRewrite(v2(unsupportedKnownComplexSource),ctx());
assert.equal(surgeUnsupportedKnown.section,'comment');
assert.notEqual(surgeUnsupportedKnown.issue,true);
assert.match(surgeUnsupportedKnown.line,/REVIEW REQUIRED/);

const qxArgument=planQxRewrite(
  v2('response if ${enabled} == true && ${url} ~= /api/ then response.json.replace("data.ok",true)'),
  ctx({argumentRefs:['enabled']}),
);
assert.equal(qxArgument.section,'comment');
assert.match(qxArgument.line,/cannot carry Loon plugin \[Argument\]/);

const methodMatchedMultiSource='response if ${url} ~= /api/ && ${request.method} == "POST" then response.header.del("Server") | response.body.replace(/x/,"y")';
const methodMatchedMultiCtx=ctx();
const methodMatchedMulti=planQxRewrite(v2(methodMatchedMultiSource),methodMatchedMultiCtx);
assert.equal(methodMatchedMulti.section,'rewrite');
assert.match(methodMatchedMulti.line,/^api \^POST\[ \] url-and-header script-response-body /);
assert.equal(methodMatchedMultiCtx.generatedScripts.size,1);
const methodMatchedMultiScript=[...methodMatchedMultiCtx.generatedScripts.values()][0];
assert.match(methodMatchedMultiScript,/"name":"request.method".*"value":"POST"/);
assert.match(methodMatchedMultiScript,/"pattern":"api"/);

const unsafeOrPushdownSource='response if (${url} ~= /api/ && ${request.method} == "POST") || ${url} ~= /fallback/ then response.header.del("Server") | response.body.replace(/x/,"y")';
const unsafeOrPushdownCtx=ctx();
const unsafeOrPushdown=planQxRewrite(v2(unsafeOrPushdownSource),unsafeOrPushdownCtx);
assert.equal(unsafeOrPushdown.section,'rewrite');
assert.match(unsafeOrPushdown.line,/^\^ url script-response-body /);
assert.doesNotMatch(unsafeOrPushdown.line,/url-and-header/);

const sharedMethodOrSource='response if (${url} ~= /api/ && ${request.method} == "POST") || (${url} ~= /other/ && ${request.method} == "POST") then response.header.del("Server") | response.body.replace(/x/,"y")';
const sharedMethodOrCtx=ctx();
const sharedMethodOr=planQxRewrite(v2(sharedMethodOrSource),sharedMethodOrCtx);
assert.equal(sharedMethodOr.section,'rewrite');
assert.match(sharedMethodOr.line,/^\^ \^POST\[ \] url-and-header script-response-body /);

const responseHeaderConditionSource='response if ${url} ~= /api/ && ${response.header["X-Test"]} == "1" then response.header.del("Server") | response.body.replace(/x/,"y")';
const responseHeaderConditionCtx=ctx();
const responseHeaderCondition=planQxRewrite(v2(responseHeaderConditionSource),responseHeaderConditionCtx);
assert.equal(responseHeaderCondition.section,'rewrite');
assert.match(responseHeaderCondition.line,/^api url script-response-body /);
assert.doesNotMatch(responseHeaderCondition.line,/url-and-header/);
assert.match([...responseHeaderConditionCtx.generatedScripts.values()][0],/X-Test/);

const urlOnlyMatcher=qxExactRewriteMatcherPlan(parseRewriteV2(
  'request if ${url} ~= /api/ then request.header.add("X-One","1")'
));
assert.equal(urlOnlyMatcher.matcher,'url');
assert.equal(urlOnlyMatcher.matchScope,'url-only');
assert.equal(urlOnlyMatcher.headersPattern,null);
assert.equal(urlOnlyMatcher.prefix,'api url ');

const headersOnlyMatcher=qxExactRewriteMatcherPlan(parseRewriteV2(
  'request if ${request.method} == "POST" then request.header.add("X-One","1")'
));
assert.equal(headersOnlyMatcher.matcher,'url-and-header');
assert.equal(headersOnlyMatcher.matchScope,'headers-only');
assert.equal(headersOnlyMatcher.urlPattern,'^');
assert.equal(headersOnlyMatcher.headersPattern,'^POST[ ]');
assert.equal(headersOnlyMatcher.prefix,'^ ^POST[ ] url-and-header ');

const combinedMatcher=qxExactRewriteMatcherPlan(parseRewriteV2(
  'request if ${url} ~= /api/ && ${request.method} == "POST" then request.header.add("X-One","1")'
));
assert.equal(combinedMatcher.matcher,'url-and-header');
assert.equal(combinedMatcher.matchScope,'url-and-headers');
assert.equal(combinedMatcher.urlPattern,'api');
assert.equal(combinedMatcher.headersPattern,'^POST[ ]');

const noNativeHeadersMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${url} ~= /api/ && ${response.status} == 204 then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(noNativeHeadersMatcher.matcher,'url');
assert.equal(noNativeHeadersMatcher.matchScope,'url-only');
assert.equal(noNativeHeadersMatcher.headersPattern,null);

const requestHeaderEqMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${url} ~= /api/ && ${request.header[\'X-Region\']} == "CN" then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(requestHeaderEqMatcher.matcher,'url-and-header');
assert.equal(requestHeaderEqMatcher.matchScope,'url-and-headers');
assert.equal(requestHeaderEqMatcher.headersPattern,'\\r\\n[Xx]-[Rr][Ee][Gg][Ii][Oo][Nn]:[ \\t]*CN[ \\t]*(?:\\r\\n|$)');

const requestHeaderOnlyMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${request.header[\'X-Region\']} == "CN" then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(requestHeaderOnlyMatcher.matcher,'url-and-header');
assert.equal(requestHeaderOnlyMatcher.matchScope,'headers-only');
assert.equal(requestHeaderOnlyMatcher.urlPattern,'^');

const methodAndHeaderMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${url} ~= /api/ && ${request.method} == "POST" && ${request.header[\'X-Region\']} == "CN" then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(methodAndHeaderMatcher.headersPattern,'^POST[ ][\\s\\S]*\\r\\n[Xx]-[Rr][Ee][Gg][Ii][Oo][Nn]:[ \\t]*CN[ \\t]*(?:\\r\\n|$)');

const requestHeaderRegexMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${request.header[\'User-Agent\']} ~= /iPhone/ then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(requestHeaderRegexMatcher.headersPattern,'\\r\\n[Uu][Ss][Ee][Rr]-[Aa][Gg][Ee][Nn][Tt]:[ \\t]*[^\\r\\n]*(?:\\r\\n|$)');
assert.doesNotMatch(requestHeaderRegexMatcher.headersPattern,/iPhone/);

const requestHeaderNullMatcher=qxRewriteMatcherPlan(parseRewriteV2(
  'response if ${request.header[\'X-Optional\']} == null then response.header.del("Server") | response.body.replace(/x/,"y")'
));
assert.equal(requestHeaderNullMatcher.matcher,'url');
assert.equal(requestHeaderNullMatcher.matchScope,'unfiltered');

const requestHeaderExact=qxExactRewriteMatcherPlan(parseRewriteV2(
  'response if ${request.header[\'X-Region\']} == "CN" then response.header.add("X-Test","1")'
));
assert.equal(requestHeaderExact.ok,false);

const directMethodPlanSource='response if ${url} ~= /api/ && ${request.method} == "POST" then response.json.jq(".data")';
const directMethodPlanCtx=ctx();
const directMethodPlan=planQxRewrite(v2(directMethodPlanSource),directMethodPlanCtx);
assert.equal(directMethodPlan.section,'rewrite');
assert.equal(directMethodPlan.line,"api ^POST[ ] url-and-header jsonjq-response-body '.data'");
assert.equal(directMethodPlanCtx.generatedScripts.size,0);

const directMethodRejectSource='response if ${request.method} == "POST" then reject_dict(200)';
const directMethodRejectCtx=ctx();
const directMethodReject=planQxRewrite(v2(directMethodRejectSource),directMethodRejectCtx);
assert.equal(directMethodReject.section,'rewrite');
assert.equal(directMethodReject.line,'^https?:// ^POST[ ] url-and-header reject-dict');
assert.equal(directMethodRejectCtx.generatedScripts.size,0);

const requestHeaderPrefilterSource='response if ${url} ~= /api/ && ${request.header[\'X-Region\']} == "CN" then response.header.del("Server") | response.body.replace(/x/,"y")';
const requestHeaderPrefilterCtx=ctx();
const requestHeaderPrefilter=planQxRewrite(v2(requestHeaderPrefilterSource),requestHeaderPrefilterCtx);
assert.equal(requestHeaderPrefilter.section,'rewrite');
assert.match(requestHeaderPrefilter.line,/ url-and-header script-response-body /);
assert.match([...requestHeaderPrefilterCtx.generatedScripts.values()][0],/X-Region/);

const nativeRequestAddPipelineSource='request if ${url} ~= /api/ && ${request.method} == "POST" then request.header.add("X-One","1") | request.header.add("X-Two","2")';
const nativeRequestAddPipelineCtx=ctx();
const nativeRequestAddPipeline=planQxRewrite(v2(nativeRequestAddPipelineSource),nativeRequestAddPipelineCtx);
assert.equal(nativeRequestAddPipeline.section,'rewrite');
assert.match(nativeRequestAddPipeline.line,/^api \^POST\[ \] url-and-header request-header /);
assert.ok(nativeRequestAddPipeline.line.indexOf('X-One: 1') < nativeRequestAddPipeline.line.indexOf('X-Two: 2'));
assert.equal(nativeRequestAddPipelineCtx.generatedScripts.size,0);

const headersOnlyNativeAddPipelineSource='request if ${request.method} == "POST" then request.header.add("X-One","1") | request.header.add("X-Two","2")';
const headersOnlyNativeAddPipelineCtx=ctx();
const headersOnlyNativeAddPipeline=planQxRewrite(v2(headersOnlyNativeAddPipelineSource),headersOnlyNativeAddPipelineCtx);
assert.equal(headersOnlyNativeAddPipeline.section,'rewrite');
assert.match(headersOnlyNativeAddPipeline.line,/^\^https\?:\/\/ \^POST\[ \] url-and-header request-header /);
assert.equal(headersOnlyNativeAddPipelineCtx.generatedScripts.size,0);

const urlOnlyNativeAddPipelineSource='request if ${url} ~= /api/ then request.header.add("X-One","1") | request.header.add("X-Two","2")';
const urlOnlyNativeAddPipelineCtx=ctx();
const urlOnlyNativeAddPipeline=planQxRewrite(v2(urlOnlyNativeAddPipelineSource),urlOnlyNativeAddPipelineCtx);
assert.equal(urlOnlyNativeAddPipeline.section,'rewrite');
assert.match(urlOnlyNativeAddPipeline.line,/^api url request-header /);
assert.doesNotMatch(urlOnlyNativeAddPipeline.line,/url-and-header/);
assert.equal(urlOnlyNativeAddPipelineCtx.generatedScripts.size,0);

const methodOnlyHeaderSetSource='request if ${request.method} == "POST" then request.header.set("X-Test","1")';
const methodOnlyHeaderSetCtx=ctx();
const methodOnlyHeaderSet=planQxRewrite(v2(methodOnlyHeaderSetSource),methodOnlyHeaderSetCtx);
assert.equal(methodOnlyHeaderSet.section,'rewrite');
assert.match(methodOnlyHeaderSet.line,/^\^ \^POST\[ \] url-and-header script-request-header /);
assert.equal(methodOnlyHeaderSetCtx.generatedScripts.size,1);

const headerConditionSingleSetSource='request if ${request.header[\'X-Region\']} == "CN" then request.header.set("X-Test","1")';
const headerConditionSingleSetCtx=ctx();
const headerConditionSingleSet=planQxRewrite(v2(headerConditionSingleSetSource),headerConditionSingleSetCtx);
assert.equal(headerConditionSingleSet.section,'rewrite');
assert.match(headerConditionSingleSet.line,/url-and-header script-request-header /);
assert.match([...headerConditionSingleSetCtx.generatedScripts.values()][0],/X-Region/);

const headerConditionBodySource='response if ${request.header[\'X-Region\']} == "CN" then response.body.replace(/foo/,"bar")';
const headerConditionBodyCtx=ctx();
const headerConditionBody=planQxRewrite(v2(headerConditionBodySource),headerConditionBodyCtx);
assert.equal(headerConditionBody.section,'rewrite');
assert.match(headerConditionBody.line,/url-and-header script-response-body /);
assert.match([...headerConditionBodyCtx.generatedScripts.values()][0],/X-Region/);

const headerConditionJsonReplaceSource='response if ${request.header[\'X-Region\']} == "CN" then response.json.replace("data.ok",true)';
const headerConditionJsonReplaceCtx=ctx();
const headerConditionJsonReplace=planQxRewrite(v2(headerConditionJsonReplaceSource),headerConditionJsonReplaceCtx);
assert.equal(headerConditionJsonReplace.section,'rewrite');
assert.match(headerConditionJsonReplace.line,/url-and-header script-response-body /);
assert.match([...headerConditionJsonReplaceCtx.generatedScripts.values()][0],/X-Region/);

const methodRejectSource='response if ${request.method} == "POST" then reject_dict(418)';
const methodRejectCtx=ctx();
const methodReject=planQxRewrite(v2(methodRejectSource),methodRejectCtx);
assert.equal(methodReject.section,'rewrite');
assert.match(methodReject.line,/^\^https\?:\/\/ \^POST\[ \] url-and-header script-echo-response /);
assert.equal(methodRejectCtx.generatedScripts.size,1);

const methodInlineMockSource='response if ${request.method} == "POST" then response.body.mock("text","{}",200,false)';
const methodInlineMockCtx=ctx();
const methodInlineMock=planQxRewrite(v2(methodInlineMockSource),methodInlineMockCtx);
assert.equal(methodInlineMock.section,'rewrite');
assert.match(methodInlineMock.line,/^\^https\?:\/\/ \^POST\[ \] url-and-header script-echo-response /);
assert.equal(methodInlineMockCtx.generatedScripts.size,1);

const safeJsonPipelineAst=parseRewriteV2(
  'response if ${url} ~= /api/ then response.json.add("flag",true) | response.json.replace("count",2) | response.json.delete("old")'
);
const safeJsonPipelineJq=jsonPipelineToSafeNativeJq(safeJsonPipelineAst);
assert.equal(safeJsonPipelineJq.ok,true);
assert.match(safeJsonPipelineJq.jq,/^if \.flag == null/);
assert.ok(safeJsonPipelineJq.jq.indexOf('.flag = true') < safeJsonPipelineJq.jq.indexOf('setpath(["count"]; 2)'));
assert.ok(safeJsonPipelineJq.jq.indexOf('setpath(["count"]; 2)') < safeJsonPipelineJq.jq.indexOf('delpaths([["old"]])'));
assert.match(safeJsonPipelineJq.jq,/delpaths/);
assert.doesNotMatch(safeJsonPipelineJq.jq,/getpath|has\(/);

const nativeJsonPipelineSource='response if ${url} ~= /api/ then response.json.add("flag",true) | response.json.replace("count",2) | response.json.delete("old")';
const nativeJsonPipelineCtx=ctx();
const nativeJsonPipeline=planQxRewrite(v2(nativeJsonPipelineSource),nativeJsonPipelineCtx);
assert.equal(nativeJsonPipeline.section,'rewrite');
assert.match(nativeJsonPipeline.line,/^api url jsonjq-response-body '/);
assert.doesNotMatch(nativeJsonPipeline.line,/__wayx_before|try |catch |type == "object"/);
assert.ok(nativeJsonPipeline.line.indexOf('.flag = true') < nativeJsonPipeline.line.indexOf('setpath(["count"]; 2)'));
assert.ok(nativeJsonPipeline.line.indexOf('setpath(["count"]; 2)') < nativeJsonPipeline.line.indexOf('delpaths([["old"]])'));
assert.equal(nativeJsonPipelineCtx.generatedScripts.size,0);

const methodNativeJsonPipelineSource='request if ${url} ~= /api/ && ${request.method} == "POST" then request.json.add(["one","two"],[1,2]) | request.json.delete(["old","unused"])';
const methodNativeJsonPipelineCtx=ctx();
const methodNativeJsonPipeline=planQxRewrite(v2(methodNativeJsonPipelineSource),methodNativeJsonPipelineCtx);
assert.equal(methodNativeJsonPipeline.section,'rewrite');
assert.match(methodNativeJsonPipeline.line,/^api \^POST\[ \] url-and-header jsonjq-request-body '/);
assert.ok(methodNativeJsonPipeline.line.indexOf('.one = 1') < methodNativeJsonPipeline.line.indexOf('.two = 2'));
assert.ok(methodNativeJsonPipeline.line.indexOf('.two = 2') < methodNativeJsonPipeline.line.indexOf('delpaths([["old"],["unused"]])'));
assert.ok(methodNativeJsonPipeline.line.includes('delpaths([["old"],["unused"]])'));
assert.equal(methodNativeJsonPipelineCtx.generatedScripts.size,0);

const flagsNativeJsonPipelineSource='response if ${url} ~= /api/ims then response.json.add("a",1) | response.json.delete("b")';
const flagsNativeJsonPipelineCtx=ctx();
const flagsNativeJsonPipeline=planQxRewrite(v2(flagsNativeJsonPipelineSource),flagsNativeJsonPipelineCtx);
assert.equal(flagsNativeJsonPipeline.section,'rewrite');
assert.match(flagsNativeJsonPipeline.line,/^api url jsonjq-response-body '/);
assert.match(flagsNativeJsonPipeline.lines[0],/COMPATIBILITY LIMITATION.*ims/);
assert.doesNotMatch(flagsNativeJsonPipeline.line,/\(\?[ims]+\)|\/ims?\b/);
assert.equal(flagsNativeJsonPipelineCtx.generatedScripts.size,0);

const nestedJsonPipelineSource='response if ${url} ~= /api/ then response.json.add("data.flag",true) | response.json.replace("data.count",2)';
const nestedJsonPipelineCtx=ctx();
const nestedJsonPipeline=planQxRewrite(v2(nestedJsonPipelineSource),nestedJsonPipelineCtx);
assert.equal(nestedJsonPipeline.section,'rewrite');
assert.match(nestedJsonPipeline.line,/^api url jsonjq-response-body /);
assert.equal(nestedJsonPipelineCtx.generatedScripts.size,0);

const indexedJsonPipelineSource='response if ${url} ~= /api/ then response.json.delete("items[0]") | response.json.add("flag",true)';
const indexedJsonPipelineCtx=ctx();
const indexedJsonPipeline=planQxRewrite(v2(indexedJsonPipelineSource),indexedJsonPipelineCtx);
assert.equal(indexedJsonPipeline.section,'rewrite');
assert.match(indexedJsonPipeline.line,/^api url script-response-body /);
assert.equal(indexedJsonPipelineCtx.generatedScripts.size,1);

const nonExactJsonPipelineSource='response if ${request.header[\'X-Region\']} == "CN" then response.json.add("flag",true) | response.json.delete("old")';
const nonExactJsonPipelineCtx=ctx();
const nonExactJsonPipeline=planQxRewrite(v2(nonExactJsonPipelineSource),nonExactJsonPipelineCtx);
assert.equal(nonExactJsonPipeline.section,'rewrite');
assert.match(nonExactJsonPipeline.line,/url-and-header script-response-body /);
assert.equal(nonExactJsonPipelineCtx.generatedScripts.size,1);

const nativeResponseAddPipelineSource='response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=1") | response.header.add("Set-Cookie","b=2")';
const nativeResponseAddPipelineCtx=ctx();
const nativeResponseAddPipeline=planQxRewrite(v2(nativeResponseAddPipelineSource),nativeResponseAddPipelineCtx);
assert.equal(nativeResponseAddPipeline.section,'rewrite');
assert.match(nativeResponseAddPipeline.line,/^api url response-header /);
assert.ok(nativeResponseAddPipeline.line.indexOf('Set-Cookie: a=1') < nativeResponseAddPipeline.line.indexOf('Set-Cookie: b=2'));
assert.equal(nativeResponseAddPipelineCtx.generatedScripts.size,0);

const unsafeNativeAddPipelineSource='response if ${url} ~= /api/ then response.header.add("Set-Cookie","a=1") | response.header.add("Set-Cookie","b=$1")';
const unsafeNativeAddPipelineCtx=ctx();
const unsafeNativeAddPipeline=planQxRewrite(v2(unsafeNativeAddPipelineSource),unsafeNativeAddPipelineCtx);
assert.equal(unsafeNativeAddPipeline.section,'comment');
assert.match(unsafeNativeAddPipeline.line,/REVIEW REQUIRED/);
assert.equal(unsafeNativeAddPipelineCtx.generatedScripts.size,0);

const nonExactNativeAddPipelineSource='request if (${url} ~= /api/ && ${request.method} == "POST") || ${url} ~= /fallback/ then request.header.add("X-One","1") | request.header.add("X-Two","2")';
const nonExactNativeAddPipelineCtx=ctx();
const nonExactNativeAddPipeline=planQxRewrite(v2(nonExactNativeAddPipelineSource),nonExactNativeAddPipelineCtx);
assert.equal(nonExactNativeAddPipeline.section,'comment');
assert.match(nonExactNativeAddPipeline.line,/REVIEW REQUIRED/);
assert.equal(nonExactNativeAddPipelineCtx.generatedScripts.size,0);

console.log('Rewrite target planner contract passed');
}
