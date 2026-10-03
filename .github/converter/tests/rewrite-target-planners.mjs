// Rewrite target planner contract
// Author: chance
// Category: Converter / Rewrite / Target Planning Validation

import assert from 'node:assert/strict';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { legacyRewriteToSemanticIr, rewriteV2AstToSemanticIr } from '../src/rewrite-ir.mjs';
import { planQxRewrite } from '../src/rewrite-qx.mjs';
import { jsonPipelineToSafeNativeJq, qxDirectRewritePlan } from '../src/rewrite-v2-semantic.mjs';
import { qxExactRewriteMatcherPlan, qxRewriteMatcherPlan } from '../src/qx-rewrite-matcher.mjs';
import { planSurgeRewrite } from '../src/rewrite-surge.mjs';

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

const rawUrlPattern='^https:\\/\\/api\\.example\\.com\\/v1\\/(?:a|b)\\?x=1$';
const rawUrlMatcher=qxExactRewriteMatcherPlan(parseRewriteV2(
  'request if ${url} ~= /'+rawUrlPattern+'/ then request.header.add("X-Test","1")'
));
assert.equal(rawUrlMatcher.urlPattern,rawUrlPattern);
assert.equal(rawUrlMatcher.prefix,rawUrlPattern+' url ');

const droppedFlagsAst=parseRewriteV2(
  'response if ${url} ~= /^https:\\/\\/flags\\.example\\/api$/ims then reject_dict(200)'
);
const droppedFlagsMatcher=qxExactRewriteMatcherPlan(droppedFlagsAst);
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
assert.equal(methodJqNative.line,"^https?:// ^POST[ ] url-and-header jsonjq-response-body '.data'");

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
assert.ok(redirectMethodScript.includes('new RegExp("\\\\/old\\\\/(\\\\d+)")'));
assert.match(redirectMethodScript,/String\(\$request\.method \?\? ""\) === "POST"/);
assert.match(redirectMethodScript,/__wayxCaptures\["hit"\]/);
assert.match(redirectMethodScript,/__wayxMatch\[Number\(n\)\]/);

const redirectHeaderSource='request if ${url} ~= /api\\/(\\d+)/ as hit && ${request.header[\'X-Region\']} == "CN" then redirect(307, "/v/${hit.1}")';
const redirectHeaderCtx=ctx();
const redirectHeader=planQxRewrite(v2(redirectHeaderSource),redirectHeaderCtx);
assert.equal(redirectHeader.section,'rewrite');
assert.match(redirectHeader.line,/url-and-header script-echo-response /);
const redirectHeaderScript=[...redirectHeaderCtx.generatedScripts.values()][0];
assert.match(redirectHeaderScript,/__wayxHeader\("request","X-Region"\)/);
assert.ok(redirectHeaderScript.includes('new RegExp("api\\\\/(\\\\d+)")'));

const redirectResponseStatusSource='response if ${url} ~= /api\\/(\\d+)/ as hit && ${response.status} == 201 then redirect(302, "/ok/${hit.1}")';
const redirectResponseStatusCtx=ctx();
const redirectResponseStatus=planQxRewrite(v2(redirectResponseStatusSource),redirectResponseStatusCtx);
assert.equal(redirectResponseStatus.section,'rewrite');
assert.match(redirectResponseStatus.line,/^api\\\/\(\\d\+\) url script-echo-response /);
assert.doesNotMatch(redirectResponseStatus.line,/url-and-header/);
assert.match([...redirectResponseStatusCtx.generatedScripts.values()][0],/\$response\.statusCode/);

const redirectOrSource='request if (${url} ~= /a\\/(\\d+)/ as a && ${request.method} == "POST") || ${url} ~= /b\\/(\\d+)/ as b then redirect(302, "/x")';
const redirectOrCtx=ctx();
const redirectOr=planQxRewrite(v2(redirectOrSource),redirectOrCtx);
assert.equal(redirectOr.section,'comment');
assert.match(redirectOr.line,/REVIEW REQUIRED/);
assert.equal(redirectOrCtx.generatedScripts.size,0);

const jsonAddSource='response if ${url} ~= /api/ then response.json.add("data.new",true)';
const jsonAddIr=v2(jsonAddSource);
const qxJsonCtx=ctx();
const qxJson=planQxRewrite(jsonAddIr,qxJsonCtx);
assert.equal(qxJson.section,'rewrite');
assert.match(qxJson.line,/jsonjq-response-body/);
assert.match(qxJson.line,/getpath/);
assert.match(qxJson.line,/== null/);
assert.equal(qxJsonCtx.generatedScripts.size,0);
const surgeJsonCtx=ctx();
const surgeJson=planSurgeRewrite(jsonAddIr,surgeJsonCtx);
assert.equal(surgeJson.section,'body');
assert.match(surgeJson.line,/^http-response-jq /);
assert.match(surgeJson.line,/getpath/);
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
assert.ok(qxActionBody.indexOf('__wayxDel("Server");') < qxActionBody.indexOf('__wayxBody=String'));
assert.ok(qxActionBody.indexOf('__wayxBody=String') < qxActionBody.indexOf('__wayxJsonAction(j=>__wayxJsonDelete'));

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
  assert.match(planned.line,new RegExp(' '+item.action+' https://raw\\.githubusercontent\\.com/JuemingDC/WayX/main/Script/Fixture/complex_qx_[0-9a-f]{10}\\.js$'));
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
assert.match(requestMockMixed.line,/^api url script-request-body https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/Script\/Fixture\/request_mixed_[0-9a-f]{10}\.js$/);
assert.equal(requestMockMixedCtx.generatedScripts.size,1);
const requestMockMixedScript=[...requestMockMixedCtx.generatedScripts.values()][0];
const requestMockBody=requestMockMixedScript.slice(requestMockMixedScript.indexOf('if('));
assert.ok(requestMockBody.indexOf('__wayxSet("X-A","1")') < requestMockBody.indexOf('__wayxSet("Content-Type","application/json")'));
assert.ok(requestMockBody.indexOf('__wayxSet("Content-Type","application/json")') < requestMockBody.indexOf('__wayxBody=String'));
assert.ok(requestMockBody.indexOf('__wayxBody=String') < requestMockBody.indexOf('__wayxJsonAction(j=>__wayxJsonAdd'));
assert.ok(requestMockBody.indexOf('__wayxJsonAction(j=>__wayxJsonAdd') < requestMockBody.indexOf('__wayxDel("Cookie")'));

const requestMockHeaderConditionSource='request if ${request.header[\'X-Region\']} == "CN" then request.body.mock("text","hello") | request.header.set("X-Test","ok")';
const requestMockHeaderConditionCtx=ctx();
const requestMockHeaderCondition=planQxRewrite(v2(requestMockHeaderConditionSource),requestMockHeaderConditionCtx);
assert.equal(requestMockHeaderCondition.section,'rewrite');
assert.match(requestMockHeaderCondition.line,/url-and-header script-request-body /);
assert.match([...requestMockHeaderConditionCtx.generatedScripts.values()][0],/__wayxHeader\("request","X-Region"\)/);

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
assert.match(requestBinaryMockMixed.line,/request mock binary\/bodyBytes output is not enabled/);
assert.equal(requestBinaryMockMixedCtx.generatedScripts.size,0);

const unsupportedKnownComplexSource='response if ${url} ~= /api/ then response.json.jq(".") | response.header.set("X-Test","ok")';
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
assert.match(methodMatchedMultiScript,/String\(\$request\.method \?\? ""\) === "POST"/);
assert.match(methodMatchedMultiScript,/new RegExp\("api"\)/);

const unsafeOrPushdownSource='response if (${url} ~= /api/ && ${request.method} == "POST") || ${url} ~= /fallback/ then response.header.del("Server") | response.body.replace(/x/,"y")';
const unsafeOrPushdownCtx=ctx();
const unsafeOrPushdown=planQxRewrite(v2(unsafeOrPushdownSource),unsafeOrPushdownCtx);
assert.equal(unsafeOrPushdown.section,'rewrite');
assert.match(unsafeOrPushdown.line,/^\^https\?:\/\/ url script-response-body /);
assert.doesNotMatch(unsafeOrPushdown.line,/url-and-header/);

const sharedMethodOrSource='response if (${url} ~= /api/ && ${request.method} == "POST") || (${url} ~= /other/ && ${request.method} == "POST") then response.header.del("Server") | response.body.replace(/x/,"y")';
const sharedMethodOrCtx=ctx();
const sharedMethodOr=planQxRewrite(v2(sharedMethodOrSource),sharedMethodOrCtx);
assert.equal(sharedMethodOr.section,'rewrite');
assert.match(sharedMethodOr.line,/^\^https\?:\/\/ \^POST\[ \] url-and-header script-response-body /);

const responseHeaderConditionSource='response if ${url} ~= /api/ && ${response.header["X-Test"]} == "1" then response.header.del("Server") | response.body.replace(/x/,"y")';
const responseHeaderConditionCtx=ctx();
const responseHeaderCondition=planQxRewrite(v2(responseHeaderConditionSource),responseHeaderConditionCtx);
assert.equal(responseHeaderCondition.section,'rewrite');
assert.match(responseHeaderCondition.line,/^api url script-response-body /);
assert.doesNotMatch(responseHeaderCondition.line,/url-and-header/);
assert.match([...responseHeaderConditionCtx.generatedScripts.values()][0],/__wayxHeader\("response","X-Test"\)/);

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
assert.equal(headersOnlyMatcher.urlPattern,'^https?://');
assert.equal(headersOnlyMatcher.headersPattern,'^POST[ ]');
assert.equal(headersOnlyMatcher.prefix,'^https?:// ^POST[ ] url-and-header ');

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
assert.equal(requestHeaderOnlyMatcher.urlPattern,'^https?://');

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
assert.match([...requestHeaderPrefilterCtx.generatedScripts.values()][0],/__wayxHeader\("request","X-Region"\)/);

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
assert.match(methodOnlyHeaderSet.line,/^\^https\?:\/\/ \^POST\[ \] url-and-header script-request-header /);
assert.equal(methodOnlyHeaderSetCtx.generatedScripts.size,1);

const headerConditionSingleSetSource='request if ${request.header[\'X-Region\']} == "CN" then request.header.set("X-Test","1")';
const headerConditionSingleSetCtx=ctx();
const headerConditionSingleSet=planQxRewrite(v2(headerConditionSingleSetSource),headerConditionSingleSetCtx);
assert.equal(headerConditionSingleSet.section,'rewrite');
assert.match(headerConditionSingleSet.line,/url-and-header script-request-header /);
assert.match([...headerConditionSingleSetCtx.generatedScripts.values()][0],/__wayxHeader\("request","X-Region"\)/);

const headerConditionBodySource='response if ${request.header[\'X-Region\']} == "CN" then response.body.replace(/foo/,"bar")';
const headerConditionBodyCtx=ctx();
const headerConditionBody=planQxRewrite(v2(headerConditionBodySource),headerConditionBodyCtx);
assert.equal(headerConditionBody.section,'rewrite');
assert.match(headerConditionBody.line,/url-and-header script-response-body /);
assert.match([...headerConditionBodyCtx.generatedScripts.values()][0],/__wayxHeader\("request","X-Region"\)/);

const headerConditionJsonReplaceSource='response if ${request.header[\'X-Region\']} == "CN" then response.json.replace("data.ok",true)';
const headerConditionJsonReplaceCtx=ctx();
const headerConditionJsonReplace=planQxRewrite(v2(headerConditionJsonReplaceSource),headerConditionJsonReplaceCtx);
assert.equal(headerConditionJsonReplace.section,'rewrite');
assert.match(headerConditionJsonReplace.line,/url-and-header script-response-body /);
assert.match([...headerConditionJsonReplaceCtx.generatedScripts.values()][0],/__wayxHeader\("request","X-Region"\)/);

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
assert.match(safeJsonPipelineJq.jq,/^if type == "object" then if getpath\(\["flag"\]\) == null/);
assert.ok(safeJsonPipelineJq.jq.indexOf('setpath(["flag"]; true)') < safeJsonPipelineJq.jq.indexOf('setpath(["count"]; 2)'));
assert.ok(safeJsonPipelineJq.jq.indexOf('setpath(["count"]; 2)') < safeJsonPipelineJq.jq.indexOf('del(.["old"])'));
assert.doesNotMatch(safeJsonPipelineJq.jq,/delpaths|\btry\b/);

const nativeJsonPipelineSource='response if ${url} ~= /api/ then response.json.add("flag",true) | response.json.replace("count",2) | response.json.delete("old")';
const nativeJsonPipelineCtx=ctx();
const nativeJsonPipeline=planQxRewrite(v2(nativeJsonPipelineSource),nativeJsonPipelineCtx);
assert.equal(nativeJsonPipeline.section,'rewrite');
assert.match(nativeJsonPipeline.line,/^api url jsonjq-response-body '/);
assert.match(nativeJsonPipeline.line,/type == "object"/);
assert.ok(nativeJsonPipeline.line.indexOf('setpath(["flag"]; true)') < nativeJsonPipeline.line.indexOf('setpath(["count"]; 2)'));
assert.ok(nativeJsonPipeline.line.indexOf('setpath(["count"]; 2)') < nativeJsonPipeline.line.indexOf('del(.["old"])'));
assert.equal(nativeJsonPipelineCtx.generatedScripts.size,0);

const methodNativeJsonPipelineSource='request if ${url} ~= /api/ && ${request.method} == "POST" then request.json.add(["one","two"],[1,2]) | request.json.delete(["old","unused"])';
const methodNativeJsonPipelineCtx=ctx();
const methodNativeJsonPipeline=planQxRewrite(v2(methodNativeJsonPipelineSource),methodNativeJsonPipelineCtx);
assert.equal(methodNativeJsonPipeline.section,'rewrite');
assert.match(methodNativeJsonPipeline.line,/^api \^POST\[ \] url-and-header jsonjq-request-body '/);
assert.ok(methodNativeJsonPipeline.line.indexOf('setpath(["one"]; 1)') < methodNativeJsonPipeline.line.indexOf('setpath(["two"]; 2)'));
assert.ok(methodNativeJsonPipeline.line.indexOf('setpath(["two"]; 2)') < methodNativeJsonPipeline.line.indexOf('del(.["old"])'));
assert.ok(methodNativeJsonPipeline.line.indexOf('del(.["old"])') < methodNativeJsonPipeline.line.indexOf('del(.["unused"])'));
assert.equal(methodNativeJsonPipelineCtx.generatedScripts.size,0);

const flagsNativeJsonPipelineSource='response if ${url} ~= /api/ims then response.json.add("a",1) | response.json.delete("b")';
const flagsNativeJsonPipelineCtx=ctx();
const flagsNativeJsonPipeline=planQxRewrite(v2(flagsNativeJsonPipelineSource),flagsNativeJsonPipelineCtx);
assert.equal(flagsNativeJsonPipeline.section,'rewrite');
assert.match(flagsNativeJsonPipeline.line,/^api url jsonjq-response-body '/);
assert.doesNotMatch(flagsNativeJsonPipeline.line,/\(\?[ims]+\)|\/ims?\b/);
assert.equal(flagsNativeJsonPipelineCtx.generatedScripts.size,0);

const nestedJsonPipelineSource='response if ${url} ~= /api/ then response.json.add("data.flag",true) | response.json.replace("data.count",2)';
const nestedJsonPipelineCtx=ctx();
const nestedJsonPipeline=planQxRewrite(v2(nestedJsonPipelineSource),nestedJsonPipelineCtx);
assert.equal(nestedJsonPipeline.section,'rewrite');
assert.match(nestedJsonPipeline.line,/^api url script-response-body /);
assert.equal(nestedJsonPipelineCtx.generatedScripts.size,1);

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
