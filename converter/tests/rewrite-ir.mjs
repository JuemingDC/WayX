// Target-neutral Rewrite Semantic IR contract
// Author: chance
// Category: Converter / Rewrite / Semantic IR Validation

import assert from 'node:assert/strict';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import {
  legacyRewriteToSemanticIr,
  rewriteV2AstToSemanticIr,
  singleRewriteOperation,
  rewriteOperationKinds,
} from '../src/rewrite-ir.mjs';

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
