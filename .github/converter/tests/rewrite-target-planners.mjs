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
assert.equal(qxResponseHeader.section,'comment');
assert.equal(qxResponseHeader.reason,'unsupported-qx-response-header-add-comment');

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
assert.match(qxJson.line,/script-response-body/);
assert.equal(qxJsonCtx.generatedScripts.size,1);
const surgeJsonCtx=ctx();
const surgeJson=planSurgeRewrite(jsonAddIr,surgeJsonCtx);
assert.equal(surgeJson.section,'script');
assert.equal(surgeJsonCtx.generatedScripts.size,1);

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

console.log('Rewrite target planner contract passed');
