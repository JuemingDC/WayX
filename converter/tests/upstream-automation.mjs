import assert from 'node:assert/strict';
import {
  buildSyncFailure,
  failureDeclarationContext,
} from '../src/upstream-run-report.mjs';
import {
  syncFailureIssueBody,
  targetProblemIssueBody,
} from '../../.github/scripts/propose-conversion-issues.mjs';

const previous=`#!name=Demo
[Rule]
DOMAIN,old.example,REJECT
[Rewrite]
^https://old.example reject
`;
const current=`#!name=Demo
[Rule]
DOMAIN,new.example,REJECT
[Rewrite]
^https://old.example reject
`;

const context=failureDeclarationContext(previous,current);
assert.equal(context.kind,'changed-upstream-declarations');
assert.deepEqual(context.items,[{section:'Rule',line:'DOMAIN,new.example,REJECT'}]);

const entry={
  id:'Demo',
  file:'Demo.lpx',
  source:'https://example.com/Demo.lpx',
  qx:'Demo.snippet',
  surge:'Demo.sgmodule',
};
const failure=buildSyncFailure({
  entry,
  stage:'convert',
  error:new Error('unsupported source action'),
  previousSource:previous,
  fetchedSource:current,
});
assert.equal(failure.plugin.id,'Demo');
assert.equal(failure.stage,'convert');
assert.match(failure.reason,/unsupported source action/);
assert.deepEqual(failure.declarations,[{section:'Rule',line:'DOMAIN,new.example,REJECT'}]);

const hardBody=syncFailureIssueBody(failure);
for(const required of [
  'Plugin: Demo',
  'Source file: Resource/Loon/Demo.lpx',
  'Upstream: https://example.com/Demo.lpx',
  'Stage: convert',
  'Reason: unsupported source action',
  '[Rule] DOMAIN,new.example,REJECT',
]){
  assert.ok(hardBody.includes(required),required);
}

const targetBody=targetProblemIssueBody({
  kind:'unknown',
  code:'unknown-rewrite-action',
  plugin:entry,
  source:'response if ${url} ~= /api/ then response.future.action()',
  sourceSection:'Rewrite',
  reasons:['unsupported action response.future.action'],
  locations:[
    {file:'Adblock/Quantumult X/Demo.snippet',line:20},
    {file:'Adblock/Surge/Demo.sgmodule',line:18},
  ],
});
for(const required of [
  'Plugin: Demo',
  'Source file: Resource/Loon/Demo.lpx',
  'unsupported action response.future.action',
  '[Rewrite] response if ${url} ~= /api/ then response.future.action()',
  'Adblock/Quantumult X/Demo.snippet:20',
]){
  assert.ok(targetBody.includes(required),required);
}

console.log('Automated upstream issue content contract passed');
