import assert from 'node:assert/strict';
import {
  analyzeSafeRewriteV2,
  dependencySpecFromAction,
  inlineResolvedDependency,
  inspectQxScriptCompatibility,
  listRewriteV2Dependencies,
  qxMockPlanFromAction,
  renderQxMockFileScript,
  LOON_REWRITE_V2_ACTIONS,
  minifyJq,
  mergeBoxJsSubscription,
  parseLoonArguments,
  renderQxPrefsObjectBridge,
  parseRewriteV2,
  qxPrimitiveForRewriteV2Action,
  qxRule,
  qxTargetPath,
  renderBoxJsApp,
  rewriteV2ToSource,
  selectQxScriptAction,
  surgeRule,
  surgeTargetPath,
  validateRewriteV2Ast,
} from '../src/index.mjs';

assert.equal(qxRule('URL-REGEX, "^https:\\/\\/ad\\.example\\.com", REJECT').line, '^https:\\/\\/ad\\.example\\.com url reject-200');
assert.match(qxRule('AND, ((DOMAIN-SUFFIX, example.com), (PROTOCOL, TCP)), REJECT').line, /^# Loon logical rule/);
assert.equal(qxRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve').line, 'ip-cidr, 1.1.1.1/32, reject');
assert.equal(surgeRule('IP-CIDR, 1.1.1.1/32, REJECT, no-resolve'), 'IP-CIDR, 1.1.1.1/32, REJECT, no-resolve');
assert.equal(surgeRule('DOMAIN, example.com, PROXY'), '# [WayX] Surge Module policy binding required: DOMAIN, example.com, PROXY');

const compact = minifyJq('walk( if type == "object" then .a = [] | del(.b, .c) else . end )');
assert.equal(compact.includes('"object"'), true);
assert.equal(compact.includes('del(.b,.c)'), true);

assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:true,scriptUrl:'https://rucu6.pages.dev/Scripts/12306.js'}).action, 'script-analyze-echo-response');
assert.equal(selectQxScriptAction({phase:'http-request',requiresBody:false,scriptUrl:'https://rucu6.pages.dev/Scripts/header.js'}).action, 'script-response-header');
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
const prefBridge = renderQxPrefsObjectBridge(
  'Tieba',
  ['per_filter_video_thread=select, "true", "false", tag=拦截推荐页面视频帖'],
  ['per_filter_video_thread'],
  {per_filter_video_thread:'boolean'},
);
assert.match(prefBridge, /\$prefs\.valueForKey/);
assert.match(prefBridge, /wayx\.tieba\.per_filter_video_thread/);
assert.match(prefBridge, /const \$argument =/);

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

const bilibiliCompat = inspectQxScriptCompatibility({
  scriptUrl:'https://rucu6.pages.dev/Scripts/bilibili/request.js',
  sourceText:'if (typeof $task < "u") throw new Error("QuantumultX is not supported"); function unzip(x){ return $utils.ungzip(x); }',
});
assert.equal(bilibiliCompat.executable, false);
assert.equal(bilibiliCompat.status, 'unsupported');
const bilibiliForkAttempt = inspectQxScriptCompatibility({
  scriptUrl:'https://rucu6.pages.dev/Scripts/bilibili/request.js',
  sourceText:'throw new Error("QuantumultX is not supported"); const x=$utils.ungzip(data);',
  forkUrl:'https://raw.githubusercontent.com/JuemingDC/WayX/main/script/RuCu6/bilibili/request.js',
});
assert.equal(bilibiliForkAttempt.executable, false);
assert.equal(bilibiliForkAttempt.status, 'unsupported');

const youtubeCompat = inspectQxScriptCompatibility({
  scriptUrl:'https://rucu6.pages.dev/Scripts/youtube/response.js',
  sourceText:'const platform = typeof $task < "u" ? "QuanX" : "Surge"; const x=$prefs.valueForKey("a");',
});
assert.equal(youtubeCompat.executable, true);
assert.equal(youtubeCompat.status, 'native-adapter');

const genericReject = inspectQxScriptCompatibility({
  scriptUrl:'https://example.com/a.js',
  sourceText:'throw new Error("Quantumult X is not supported");',
});
assert.equal(genericReject.executable, false);

const jqFileAst = parseRewriteV2('response if ${url} ~= /api/ then response.json.jq_file("filters/remove-ads.jq")');
const deps = listRewriteV2Dependencies(jqFileAst, {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(deps.length, 1);
assert.equal(deps[0].url, 'https://example.com/Plugins/filters/remove-ads.jq');
const inlinedJq = inlineResolvedDependency(jqFileAst.actions[0], 'del(.ads)', {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(inlinedJq.action.name, 'response.json.jq');
assert.equal(inlinedJq.action.args[0].value, 'del(.ads)');

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
const responseMockScript = renderQxMockFileScript(responseMockPlan, {stamp:'2026-09-29 09:00:00 +08:00', category:'Adblock'});
assert.match(responseMockScript, /\$task\.fetch/);
assert.match(responseMockScript, /HTTP\/1\.1 200 OK/);
assert.match(responseMockScript, /output\.body = response\.body/);

const binaryMockAst = parseRewriteV2('response if ${url} ~= /image/ then response.body.mock_file("png", "image.png", 200)');
const binaryMockPlan = qxMockPlanFromAction(binaryMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(binaryMockPlan.binary, true);
assert.match(renderQxMockFileScript(binaryMockPlan), /output\.bodyBytes = response\.bodyBytes/);

const requestMockAst = parseRewriteV2('request if ${url} ~= /api/ then request.body.mock_file("json", "request.json")');
const requestMockPlan = qxMockPlanFromAction(requestMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.equal(requestMockPlan.qxAction, 'script-request-body');
assert.match(renderQxMockFileScript(requestMockPlan), /\$done\(\{headers, body: response\.body\}\)/);

const requestBinaryMockAst = parseRewriteV2('request if ${url} ~= /upload/ then request.body.mock_file("png", "image.png")');
const requestBinaryMockPlan = qxMockPlanFromAction(requestBinaryMockAst.actions[0], {pluginSourceUrl:'https://example.com/Plugins/demo.lpx'});
assert.throws(() => renderQxMockFileScript(requestBinaryMockPlan), /request mock_file binary\/bodyBytes output is not enabled/);

console.log('WayX converter checkpoint tests passed');
