import assert from 'node:assert/strict';
import {
  analyzeSafeRewriteV2,
  dependencySpecFromAction,
  jqDependencySpecFromAction,
  inlineResolvedDependency,
  inspectQxScriptCompatibility,
  listRewriteV2Dependencies,
  qxMockPlanFromAction,
  compileRegexForTarget,
  qxDirectRewritePlan,
  surgeDirectRewritePlan,
  surgeRedirectRewritePlan,
  surgeRejectRewritePlan,
  surgeHeaderRewritePlan,
  surgeInlineMockPlan,
  renderQxRedirectScript,
  renderQxRejectScript,
  renderQxHeaderScript,
  renderQxInlineMockScript,
  renderQxMockFileScript,
  LOON_REWRITE_V2_ACTIONS,
  minifyJq,
  minifyJqFile,
  classifyLegacyRewrite,
  planLegacyRewrite,
  mergeBoxJsSubscription,
  parseLoonArguments,
  parseRewriteV2,
  qxPrimitiveForRewriteV2Action,
  qxRule,
  qxTargetPath,
  renderBoxJsApp,
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

assert.equal(qxRule('URL-REGEX, "^https:\\/\\/ad\\.example\\.com", REJECT').line, '^https:\\/\\/ad\\.example\\.com url reject-200');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG').line, '^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\? url reject-img');
assert.equal(qxRule('URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP').line, '^https:\\/\\/drop\\.example\\.com url reject');
assert.equal(surgeRule('URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-IMG'), 'URL-REGEX,"^https:\\/\\/a\\.line\\.me\\/er\\/lads\\/v\\d\\/ei\\?",REJECT-TINYGIF');
const surgeDropModule = surgeModuleRule('URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP');
assert.equal(surgeDropModule.kind, 'rule');
assert.equal(surgeDropModule.line, 'URL-REGEX,"^https:\\/\\/drop\\.example\\.com",REJECT-DROP');
assert.equal(surgeModuleRule('DOMAIN,drop.example.com,REJECT-NO-DROP').line, 'DOMAIN,drop.example.com,REJECT-NO-DROP');
assert.equal(surgeModuleRule('DOMAIN,cell.example.com,CELLULAR').line, 'DOMAIN,cell.example.com,CELLULAR');
assert.match(qxRule('AND, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)), REJECT').line, /^# Unsupported logical rule for Quantumult X/);
assert.equal(qxRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve').line, 'ip-cidr, 1.1.1.1/32, reject');
assert.equal(surgeRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve'), 'IP-CIDR,1.1.1.1/32,REJECT,no-resolve');
assert.equal(surgeRule('DOMAIN, example.com, PROXY'), '# [WayX] Surge Module policy binding required: DOMAIN, example.com, PROXY');
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
assert.equal(surgeModuleRule('FINAL,DIRECT').line, 'FINAL,DIRECT');
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
  'http-response-jq ^https:\\/\\/api\\.example\\.com \'del(.ads)\'',
  '',
  '[Map Local]',
  '^https:\\/\\/mock\\.example\\.com data-type=text data="{}" status-code=200 header="Content-Type:application/json"',
  '',
  '[Script]',
  'demo = type=http-response,pattern=^https:\\/\\/api\\.example\\.com,script-path=https://example.com/demo.js,requires-body=true',
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
assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:false,scriptUrl:'https://example.com/header.js',sourceText:'$done({headers:$request.headers});'}).action, 'script-response-header');
assert.equal(selectQxScriptAction({phase:'http-response',requiresBody:true,scriptUrl:'https://example.com/a.js'}).action, 'script-response-body');

assert.equal(qxTargetPath({qx:'A.snippet'}), 'Adblock/Quantumult X/A.snippet');
assert.equal(surgeTargetPath({surge:'A.sgmodule'}), 'Adblock/Surge/A.sgmodule');

const args = parseLoonArguments([
  'Capture=switch, false, true, tag="捕获", desc="测试"',
  'Lang=select, "zh-Hans", "zh-Hant", tag="语言"',
]);
assert.equal(args.length, 2);
assert.equal(args[0].defaultValue, 'false');
assert.equal(args[1].values[1], 'zh-Hant');
const app = renderBoxJsApp({id:'Demo',name:'Demo'}, ['Capture=switch, false, true, tag="捕获"']);
assert.equal(app.settings[0].type, 'boolean');
assert.equal(app.settings[0].id, 'wayx.demo.Capture');

const managedApp = renderBoxJsApp({id:'Tieba',name:'百度贴吧去广告'}, [
  'per_filter_video_thread=select, "true", "false", tag=拦截推荐页面视频帖',
]);
const mergedBoxJs = mergeBoxJsSubscription(
  {id:'juemingdc.qx.sub',apps:[{id:'keep.me',name:'Keep'}]},
  [managedApp],
);
assert.equal(mergedBoxJs.apps.length, 2);
assert.equal(mergedBoxJs.apps[0].id, 'keep.me');
assert.equal(mergedBoxJs.apps[1].settings[0].id, 'wayx.tieba.per_filter_video_thread');
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
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/i then reject(200)').safe, false);
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
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-body-json-del data.ads', 'qx', legacyCtx).line,
  '^https:\\/\\/api\\.example\\.com url jsonjq-response-body \'delpaths([["data","ads"]])\'',
);
assert.equal(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-header-del Server', 'surge', legacyCtx).line,
  'http-response ^https:\\/\\/api\\.example\\.com header-del Server',
);
assert.match(
  planLegacyRewrite('^https:\\/\\/api\\.example\\.com', 'response-header-del Server', 'qx', legacyCtx).line,
  /REVIEW REQUIRED/,
);

const explicitQxReject = inspectQxScriptCompatibility({
  scriptUrl:'https://alpha.invalid/runtime.js',
  sourceText:'throw new Error("QuantumultX is not supported"); const x=$utils.ungzip(data);',
});
assert.equal(explicitQxReject.executable, false);
assert.equal(explicitQxReject.status, 'unsupported');

const sameRejectedSourceDifferentIdentity = inspectQxScriptCompatibility({
  scriptUrl:'https://totally-different.invalid/renamed.js',
  sourceText:'throw new Error("QuantumultX is not supported"); const x=$utils.ungzip(data);',
});
assert.equal(sameRejectedSourceDifferentIdentity.executable, explicitQxReject.executable);
assert.equal(sameRejectedSourceDifferentIdentity.status, explicitQxReject.status);

const qxRuntimeEvidence = inspectQxScriptCompatibility({
  scriptUrl:'https://unknown.invalid/response.js',
  sourceText:'const platform = typeof $task < "u" ? "QuanX" : "Surge"; const x=$prefs.valueForKey("a");',
});
assert.equal(qxRuntimeEvidence.executable, true);
assert.equal(qxRuntimeEvidence.status, 'runtime-evidence');

const missingSourceReview = inspectQxScriptCompatibility({
  scriptUrl:'https://unknown.invalid/no-source.js',
  sourceText:'',
});
assert.equal(missingSourceReview.executable, false);
assert.equal(missingSourceReview.status, 'review');

const genericReject = inspectQxScriptCompatibility({
  scriptUrl:'https://example.com/a.js',
  sourceText:'throw new Error("Quantumult X is not supported");',
});
assert.equal(genericReject.executable, false);

const surgeOnlyScript = inspectQxScriptCompatibility({
  scriptUrl:'https://example.com/surge-only.js',
  sourceText:'$httpClient.get("https://example.com", () => $done({})); const x=$persistentStore.read("x");',
});
assert.equal(surgeOnlyScript.executable, false);
assert.match(surgeOnlyScript.reason, /\$httpClient/);

const dualRuntimeScript = inspectQxScriptCompatibility({
  scriptUrl:'https://example.com/cross-platform.js',
  sourceText:'const isQX = typeof $task !== "undefined"; if (isQX) $task.fetch({url:"https://example.com"}); else $httpClient.get("https://example.com",()=>{});',
});
assert.equal(dualRuntimeScript.executable, true);

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
const legacyJqSpec = jqDependencySpecFromAction(legacyJqPathAst.actions[0], {
  pluginSourceUrl:'https://example.com/demo.lpx',
});
assert.equal(legacyJqSpec.kind, 'jq');
assert.equal(legacyJqSpec.legacyAlias, true);
assert.equal(legacyJqSpec.url, 'https://rucu6.pages.dev/JQLang/reddit.jq');
const legacyJqDeps = listRewriteV2Dependencies(legacyJqPathAst, {
  pluginSourceUrl:'https://example.com/demo.lpx',
});
assert.equal(legacyJqDeps.length, 1);
assert.equal(legacyJqDeps[0].legacyAlias, true);
const legacyJqInline = inlineResolvedDependency(
  legacyJqPathAst.actions[0],
  'walk(if type == "object" then . else . end)',
  {pluginSourceUrl:'https://example.com/demo.lpx'},
);
assert.equal(legacyJqInline.action.name, 'response.json.jq');
assert.equal(
  legacyJqInline.action.args[0].value,
  'walk(if type == "object" then . else . end)',
);
assert.doesNotMatch(legacyJqInline.action.args[0].value, /^jq-path=/);

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
assert.ok(bareUrl.notes.includes('i-source-flag-not-expressed-in-target-declaration'));
assert.equal(compileRegexForTarget(parseRewriteV2('response if ${url} ~= /api/ then response.body.replace(/a.b/s, "x")').actions[0].args[0], {subject:'body'}).ok, false);

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
  () => renderQxHeaderScript(parseRewriteV2('response if ${url} ~= /api/i then response.header.add("X-A", "1")')),
  /set\/del\/replace/,
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
  () => renderQxInlineMockScript(parseRewriteV2('response if ${url} ~= /api/i then response.body.mock("text", "x", 200) | response.header.add("Set-Cookie", "a=1")')),
  /header set\/del\/replace/,
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

const qxScriptV2Native = qxScriptV2Plan(
  parseScriptV2('response if ${url} ~= /^https:\\/\\/api\\.example\\.com/i then script("https://example.com/a.js") with tag="API", requires_body=true'),
  {scriptUrl:'https://example.com/a.js', sourceText:'$done({body:$response.body});'},
);
assert.equal(qxScriptV2Native.ok, true);
assert.match(qxScriptV2Native.line, /url script-response-body https:\/\/example\.com\/a\.js$/);

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
