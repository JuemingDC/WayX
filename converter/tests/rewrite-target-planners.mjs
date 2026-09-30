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

const observedSource='response if ${url} ~= /api/ then response.body.mock("text","{}",200,false) | response.header.set("X-Test","ok")';
const observedIr=v2(observedSource);
const qxObservedCtx=ctx();
const qxObserved=planQxRewrite(observedIr,qxObservedCtx);
assert.equal(qxObserved.section,'rewrite');
assert.equal(qxObservedCtx.generatedScripts.size,1);
const surgeObserved=planSurgeRewrite(observedIr,ctx());
assert.equal(surgeObserved.section,'map');

const unknownComplexSource='response if ${url} ~= /api/ then response.header.del("Server") | response.body.replace(/x/,"y")';
const unknownComplex=v2(unknownComplexSource);
const qxUnknown=planQxRewrite(unknownComplex,ctx());
assert.equal(qxUnknown.section,'comment');
assert.equal(qxUnknown.issue,true);
assert.equal(qxUnknown.issueCode,'unknown-complex-rewrite');
const surgeUnknown=planSurgeRewrite(unknownComplex,ctx());
assert.equal(surgeUnknown.section,'comment');
assert.equal(surgeUnknown.issue,true);
assert.equal(surgeUnknown.issueCode,'unknown-complex-rewrite');

const qxArgument=planQxRewrite(
  v2('response if ${enabled} == true && ${url} ~= /api/ then response.json.replace("data.ok",true)'),
  ctx({argumentRefs:['enabled']}),
);
assert.equal(qxArgument.section,'comment');
assert.match(qxArgument.line,/cannot carry Loon plugin \[Argument\]/);

console.log('Rewrite target planner contract passed');
