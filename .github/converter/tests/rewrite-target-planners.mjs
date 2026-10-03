// Rewrite target planner contract
// Author: chance
// Category: Converter / Rewrite / Target Planning Validation

import assert from 'node:assert/strict';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { legacyRewriteToSemanticIr, rewriteV2AstToSemanticIr } from '../src/rewrite-ir.mjs';
import { planQxRewrite } from '../src/rewrite-qx.mjs';
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

const nativeRequestAddPipelineSource='request if ${url} ~= /api/ && ${request.method} == "POST" then request.header.add("X-One","1") | request.header.add("X-Two","2")';
const nativeRequestAddPipelineCtx=ctx();
const nativeRequestAddPipeline=planQxRewrite(v2(nativeRequestAddPipelineSource),nativeRequestAddPipelineCtx);
assert.equal(nativeRequestAddPipeline.section,'rewrite');
assert.match(nativeRequestAddPipeline.line,/^api \^POST\[ \] url-and-header request-header /);
assert.ok(nativeRequestAddPipeline.line.indexOf('X-One: 1') < nativeRequestAddPipeline.line.indexOf('X-Two: 2'));
assert.equal(nativeRequestAddPipelineCtx.generatedScripts.size,0);

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
