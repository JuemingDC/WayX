import assert from 'node:assert/strict';
import {
  analyzeSafeRewriteV2,
  LOON_REWRITE_V2_ACTIONS,
  minifyJq,
  parseLoonArguments,
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
assert.match(surgeRule('DOMAIN, example.com, PROXY'), /^# \\[WayX\\] Surge Module policy binding required:/);

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
assert.equal(safeReject.action, 'reject');
assert.equal(safeReject.status, 200);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/i then reject(200)').safe, false);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/ then reject(451, "blocked")').safe, false);
assert.equal(analyzeSafeRewriteV2('response if ${url} ~= /ads/ then reject_dict(200)').safe, false);
assert.equal(analyzeSafeRewriteV2('request if ${url} ~= /ads/ then reject_dict(200) | request.header.del("X")').safe, false);

console.log('WayX converter checkpoint tests passed');
