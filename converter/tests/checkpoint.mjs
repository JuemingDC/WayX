import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  analyzeSafeRewriteV2,
  dependencySpecFromAction,
  jqDependencySpecFromAction,
  isDiscardedLegacyJqPathAction,
  inlineResolvedDependency,
  listRewriteV2Dependencies,
  qxMockPlanFromAction,
  compileRegexForTarget,
  qxDirectRewritePlan,
  surgeDirectRewritePlan,
  surgeRedirectRewritePlan,
  surgeRejectRewritePlan,
  surgeHeaderRewritePlan,
  surgeInlineMockPlan,
  surgeMockFilePlan,
  renderQxRedirectScript,
  renderQxRejectScript,
  renderQxHeaderScript,
  renderQxInlineMockScript,
  renderQxMockFileScript,
  renderSurgeRequestMockScript,
  LOON_REWRITE_V2_ACTIONS,
  minifyJq,
  minifyJqFile,
  quoteJq,
  classifyLegacyRewrite,
  planLegacyRewrite,
  validateLoonSourceCatalog,
  planMitmLine,
  resolveOriginalUrl,
  parseLoonArguments,
  surgeArgumentMetadata,
  surgePluginObjectArgument,
  surgeRewriteArgumentPayload,
  surgeEnableRequirement,
  parseLegacyLoonPluginObjectRefs,
  analyzePluginArgumentUsage,
  rewriteV2PluginArgumentRefs,
  parseRewriteV2,
  qxPrimitiveForRewriteV2Action,
  qxRule,
  qxTargetPath,
  rewriteV2ToSource,
  selectQxScriptAction,
  parseScriptV2,
  scriptV2ToSource,
  scriptV2ArgumentRefs,
  scriptV2DynamicOptionRefs,
  scriptOptionBoolean,
  qxScriptV2Plan,
  surgeScriptV2Plan,
  surgeRule,
  surgeModuleRule,
  renderSurgeModuleHeader,
  renderQxSnippetHeader,
  validateSurgeModule,
  surgeTargetPath,
  validateRewriteV2Ast,
} from '../src/index.mjs';
import { classifyComplexRewrite, complexConditionKinds } from '../src/complex-rewrite.mjs';
import { registerComplexRewriteHandler, planComplexRewrite, listComplexRewriteHandlers } from '../src/complex-rewrite-registry.mjs';
import { renderMixedRewriteScript, renderSingleJsonMutationScript, renderObservedComplexRewriteScript } from '../src/complex-rewrite-script.mjs';
import { observedComplexRewriteType, complexRewriteSignature } from '../src/complex-rewrite-types.mjs';

assert.equal(qxRule('URL-REGEX, "^https:\\/\\/ad\\.example\\.com", REJECT').line, '^https:\\/\\/ad\\.example\\.com url reject-200');
assert.equal(
  quoteJq('select(.title == "I\'m here")'),
  '\'select(.title == "I\\u0027m here")\'',
);
assert.throws(
  () => quoteJq(".foo'bar"),
  /single quote outside a JSON string/,
);
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
assert.equal(surgeDropModule.kind, 'comment');
assert.equal(surgeDropModule.reason, 'unsupported-surge-module-policy');
assert.match(surgeDropModule.lines.join('\n'), /REJECT-DROP commented out/);
const surgeNoDropModule = surgeModuleRule('DOMAIN,drop.example.com,REJECT-NO-DROP');
assert.equal(surgeNoDropModule.reason, 'unsupported-surge-module-policy');
assert.match(surgeNoDropModule.lines.join('\n'), /REJECT-NO-DROP commented out/);
const surgeCellularModule = surgeModuleRule('DOMAIN,cell.example.com,CELLULAR');
assert.equal(surgeCellularModule.reason, 'unsupported-surge-module-policy');
assert.match(surgeCellularModule.lines.join('\n'), /CELLULAR commented out/);
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
assert.equal(surgeModuleRule('FINAL,DIRECT').line, '');
assert.deepEqual(surgeModuleRule('FINAL,DIRECT').lines, []);
assert.equal(
  surgeModuleRule('AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT').line,
  'AND,((DOMAIN,api.pinduoduo.com),(PROTOCOL,QUIC)),REJECT',
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
  'unsupported-rule-type',
);


const surgeHeader = renderSurgeModuleHeader([
  '#!name=Demo',
  '#!desc=Demo module',
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
assert.equal(surgeHeader[2], '#!requirement=CORE_VERSION>=20');
assert.ok(surgeHeader.includes('# Author: Source Author'));
assert.ok(surgeHeader.includes('# Icon: https://example.com/icon.png'));
assert.equal(surgeHeader.some(line => /loon_version/i.test(line)), false);
assert.ok(surgeHeader.includes('# Converted by: chance'));
assert.ok(surgeHeader.includes('# Category: 去广告 / 测试'));
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
assert.throws(
  () => validateSurgeModule(validSurgeModule.replace('DOMAIN,ads.example.com,REJECT', 'DOMAIN,ads.example.com,REJECT-DROP'), {id:'Demo'}),
  /official Module set DIRECT\/REJECT\/REJECT-TINYGIF/,
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
assert.doesNotThrow(
  () => validateSurgeModule(validSurgeModule.replace('hostname = %APPEND% api.example.com', 'hostname = api.example.com'), {id:'Demo'}),
);

const compact = minifyJq('walk( if type == "object" then .a = [] | del(.b, .c) else . end )');
assert.equal(compact.includes('"object"'), true);
assert.equal(compact.includes('del(.b,.c)'), true);


assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:true,scriptUrl:'https://example.com/request.js',sourceText:'$done({status:"HTTP/1.1 200 OK",body:$request.body});'}).action, 'script-analyze-echo-response');
assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:false,scriptUrl:'https://example.com/header.js',sourceText:'$done({headers:$request.headers});'}).action, 'script-request-header');
assert.equal(selectQxScriptAction({phase:'http-response',requiresBody:true,scriptUrl:'https://example.com/a.js'}).action, 'script-response-body');
const unavailableRequestAction = selectQxScriptAction({phase:'http-request',requiresBody:true,scriptUrl:'https://example.com/unavailable.js',sourceText:''});
assert.equal(unavailableRequestAction.action, null);
assert.match(unavailableRequestAction.reason, /cannot distinguish request mutation from synthetic response/);
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
assert.equal(identityActionA.action, 'script-analyze-echo-response');
const crossPlatformEcho = selectQxScriptAction({
  phase:'http-request',
  requiresBody:true,
  sourceText:'const b=$request.body; const q=typeof $task!=="undefined"; if(q)$done({body:b}); else $done({response:{body:b}});',
});
assert.equal(crossPlatformEcho.action, 'script-analyze-echo-response');

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
const unobservedComplex = planComplexRewrite(complexFixture, 'qx');
assert.equal(unobservedComplex.ok, false);
assert.equal(unobservedComplex.terminal, true);
assert.equal(unobservedComplex.issue, true);
assert.equal(unobservedComplex.issueCode, 'unknown-complex-rewrite');
assert.match(unobservedComplex.reason, /response\.header\.del \| response\.json\.replace/);

const observedComplexFixture = parseRewriteV2('response if ${url} ~= /api/ then response.body.mock("text", "{}", 200, false) | response.header.set("X-Test", "ok")');
assert.equal(complexRewriteSignature(observedComplexFixture), 'response.body.mock | response.header.set');
assert.equal(observedComplexRewriteType(observedComplexFixture)?.id, 'response-mock-header-set');
const observedClass = classifyComplexRewrite(observedComplexFixture);
assert.equal(observedClass.ok, true);
assert.deepEqual(observedClass.families, ['mock-pipeline','header-pipeline']);
registerComplexRewriteHandler({
  id:'checkpoint-observed-response',
  targets:['qx','surge'],
  match:(_ast, _info, ctx) => ctx.observedComplexType?.id === 'response-mock-header-set',
  plan:(_ast, target) => ({ok:true, section:'test', line:'handled-'+target}),
});
assert.equal(planComplexRewrite(observedComplexFixture, 'qx').line, 'handled-qx');
assert.equal(planComplexRewrite(observedComplexFixture, 'surge').line, 'handled-surge');
assert.deepEqual(listComplexRewriteHandlers(), [{id:'checkpoint-observed-response',targets:['qx','surge']}]);

const observedQxScript = renderObservedComplexRewriteScript(observedComplexFixture, {target:'qx'});
assert.equal(observedQxScript.qxAction, 'script-echo-response');
assert.match(observedQxScript.script, /X-Test/);
assert.throws(
  () => renderObservedComplexRewriteScript(complexFixture, {target:'qx'}),
  /unregistered source-authored complex Rewrite signature/,
);
const singleComplexRejected = parseRewriteV2('response if ${url} ~= /api/ then response.header.del("Server")');
assert.equal(planComplexRewrite(singleComplexRejected, 'qx').ok, false);
assert.match(planComplexRewrite(singleComplexRejected, 'qx').reason, /multi-action/);
assert.throws(
  () => renderMixedRewriteScript(singleComplexRejected, {target:'qx'}),
  /multi-action/,
);

const mixedResponse = parseRewriteV2('response if ${response.status} == 200 && ${url} ~= /api\\/v2/ then response.header.del("Server") | response.body.replace(/ads/, "ok")');
const mixedQx = renderMixedRewriteScript(mixedResponse, {target:'qx'});
assert.equal(mixedQx.qxAction, 'script-response-body');
assert.equal(mixedQx.requiresBody, true);
assert.match(mixedQx.script, /response\.statusCode/);
assert.ok(mixedQx.script.indexOf('__wayxDel("Server");') < mixedQx.script.indexOf('.replace(new RegExp("ads")'));
const mixedSurge = renderMixedRewriteScript(mixedResponse, {target:'surge'});
assert.equal(mixedSurge.surgeType, 'http-response');
assert.match(mixedSurge.script, /\$response\.status/);
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
assert.ok(mixedJsonCapture.script.includes('__wayxTpl([["c","hit",1]])'));
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
const firstBody=orderedBodyJson.script.indexOf('.replace(new RegExp("one")');
const jsonStep=orderedBodyJson.script.indexOf('__wayxJsonReplace(j,["data","ok"],true)');
const secondBody=orderedBodyJson.script.indexOf('.replace(new RegExp("three")');
assert.ok(firstBody >= 0 && firstBody < jsonStep && jsonStep < secondBody);

const pureBodyBatch = renderMixedRewriteScript(
  parseRewriteV2('response if ${url} ~= /api/ then response.body.replace([/one/, /two/], ["1", "2"]) | response.json.replace("data.ok", true)'),
  {target:'surge'},
);
assert.ok(pureBodyBatch.script.indexOf('new RegExp("one")') < pureBodyBatch.script.indexOf('new RegExp("two")'));
assert.ok(pureBodyBatch.script.indexOf('new RegExp("two")') < pureBodyBatch.script.indexOf('__wayxJsonReplace(j,["data","ok"],true)'));

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
  /header value contains unsupported interpolation/,
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
  captureMixedQx.script.includes('new RegExp(' + JSON.stringify(preservedCapturePattern) + ')'),
  'complex helper must preserve the regex body exactly while discarding source flags',
);
assert.equal(captureMixedQx.script.includes('"ims"'), false);
assert.ok(captureMixedQx.script.includes('__wayxTpl([["c","hit",0],["s",":"],["c","hit",1],["s",":"],["c","hit",2]])'));
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
assert.equal(flaggedHeaderHelper.pattern, 'api');
assert.equal(flaggedHeaderHelper.script.includes('"i"'), false);
assert.equal(flaggedHeaderHelper.script.includes('"ms"'), false);
assert.match(flaggedHeaderHelper.script, /__wayxReplace\("X-Test", "value", "ok"\)/);

const flaggedRedirectSource = 'request if ${url} ~= /\\/old\\/(.*)/ims as hit then redirect(302, \"/new/${hit.1}\")';
const flaggedRedirectHelper = renderQxRedirectScript(parseRewriteV2(flaggedRedirectSource));
assert.equal(flaggedRedirectHelper.pattern, '\\/old\\/(.*)');
assert.equal(flaggedRedirectHelper.script.includes('"ims"'), false);
assert.ok(flaggedRedirectHelper.script.includes('new RegExp(' + JSON.stringify(flaggedRedirectHelper.pattern) + ')'));

const complexConditionFlags = renderMixedRewriteScript(
  parseRewriteV2('response if (${url} ~= /API/i || ${response.status} == 204) && ${response.header["Content-Type"]} == "application/json" then response.header.del("Server") | response.body.replace(/ADS/ms, "ok")'),
  {target:'qx'},
);
assert.match(complexConditionFlags.script, /new RegExp\("API"\)/);
assert.equal(complexConditionFlags.script.includes('"i")'), false);
assert.equal(complexConditionFlags.script.includes('"ms")'), false);
assert.match(complexConditionFlags.script, /response\.statusCode/);
assert.match(complexConditionFlags.script, /__wayxHeader\("response","Content-Type"\)/);
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
assert.match(planMitmLine('ca-passphrase = secret', 'qx').line, /REVIEW REQUIRED: unsupported source MITM option/);
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-body-json-del data.ads', 'qx', legacyCtx).line,
  '^https:\\/\\/api\\.example\\.com url jsonjq-response-body \'del(.data.ads)\'',
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
assert.match(legacyHeaderRegexHelper, /new RegExp\(source\), replacement/);

const legacyQxHeaderAddBulk = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'header-add X-A one X-B two',
  'qx',
  legacyCtx,
);
assert.equal(legacyQxHeaderAddBulk.section, 'rewrite');
assert.match(legacyQxHeaderAddBulk.line, /request-header \$1\$2X-A: one\$2X-B: two\$2$/);

assert.match(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-header-add Set-Cookie a=1', 'qx', legacyCtx).line,
  /REVIEW REQUIRED: QX header\.add cannot be represented losslessly/,
);

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
assert.match(legacyJsonAddQx.line, /url script-response-body .*legacy_json_add_qx_.*\.js$/);
assert.ok([...legacyCtx.generatedScripts.values()].some(script => /__wayxJsonAdd/.test(script) && /"enabled"/.test(script)));

const legacyJsonAddSurge = planLegacyRewrite(
  '^https:\\/\\/api\\.example\\.com',
  'response-body-json-add data.enabled true',
  'surge',
  legacyCtx,
);
assert.equal(legacyJsonAddSurge.section, 'script');
assert.match(legacyJsonAddSurge.line, /type=http-response,.*requires-body=true/);

const jqFileAst = parseRewriteV2('response if ${url} ~= /api/ then response.json.jq_file("filters/remove-ads.jq")');
const deps = listRewriteV2Dependencies(jqFileAst, {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(deps.length, 1);
assert.equal(deps[0].url, 'https://example.com/Plugins/filters/remove-ads.jq');
const inlinedJq = inlineResolvedDependency(jqFileAst.actions[0], 'del(.ads)', {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(inlinedJq.action.name, 'response.json.jq');
assert.equal(inlinedJq.action.args[0].value, 'del(.ads)');

const legacyJqPathAst = parseRewriteV2(
  'response if ${url} ~= /reddit/i then response.json.jq("jq-path=https://rucu6.pages.dev/JQLang/reddit.jq")'
);
assert.equal(isDiscardedLegacyJqPathAction(legacyJqPathAst.actions[0]), true);
assert.equal(jqDependencySpecFromAction(legacyJqPathAst.actions[0], {
  pluginSourceUrl:'https://example.com/demo.lpx',
}), null);
assert.deepEqual(listRewriteV2Dependencies(legacyJqPathAst, {
  pluginSourceUrl:'https://example.com/demo.lpx',
}), []);

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
assert.equal(mockSpec.strategy, 'generated-qx-script');
assert.equal(mockSpec.qxAction, 'script-echo-response');
assert.throws(
  () => inlineResolvedDependency(mockFileAst.actions[0], '{"ok":true}', {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'}),
  /generated target script/,
);
const responseMockPlan = qxMockPlanFromAction(mockFileAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(responseMockPlan.url, 'https://example.com/Plugins/mock.json');
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
assert.match(qxDeleteV2.line, /\["data","apps",0,"promo"\]/);

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

assert.throws(
  () => renderQxInlineMockScript(
    parseRewriteV2('response if ${url} ~= /api/i then response.body.mock("text", "x", 200) | response.header.add("X-Test", "a=1")'),
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

const qxRequestBinaryUnsupported = qxScriptV2Plan(
  parseScriptV2('request if ${url} ~= /upload/i then script("https://example.com/binary.js") with requires_body=true, binary_body_mode=true'),
  {scriptUrl:'https://example.com/binary.js', sourceText:'$done({bodyBytes:$request.bodyBytes});'},
);
assert.equal(qxRequestBinaryUnsupported.ok, false);
assert.match(qxRequestBinaryUnsupported.reason, /request-body bodyBytes example/);

const surgeScriptV2Native = surgeScriptV2Plan(
  parseScriptV2('request if ${url} ~= /submit/i then script("https://example.com/request.js") with requires_body=true, binary_body_mode=true'),
  {scriptUrl:'https://example.com/request.js', name:'request_script'},
);
assert.equal(surgeScriptV2Native.ok, true);
assert.match(surgeScriptV2Native.line, /^request_script = type=http-request,/);
assert.match(surgeScriptV2Native.line, /requires-body=true/);
assert.match(surgeScriptV2Native.line, /binary-body-mode=true/);

const qxScriptV2NeedsReview = qxScriptV2Plan(scriptV2ObjectArg, {scriptUrl:'request.js'});
assert.equal(qxScriptV2NeedsReview.ok, false);
assert.match(qxScriptV2NeedsReview.reason, /dynamic enable|argument/);

const surgeScriptV2NeedsReview = surgeScriptV2Plan(scriptV2ObjectArg, {scriptUrl:'request.js', name:'x'});
assert.equal(surgeScriptV2NeedsReview.ok, false);
assert.match(surgeScriptV2NeedsReview.reason, /dynamic enable|argument/);

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
assert.equal(fixedQxArgument.ok, false);
assert.match(fixedQxArgument.reason, /cannot be carried by the official Quantumult X rewrite declaration/);

console.log('WayX converter checkpoint tests passed');
