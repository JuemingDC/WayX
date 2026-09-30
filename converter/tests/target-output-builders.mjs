// Target output builder contract
// Author: chance
// Category: Converter / Output / Validation

import assert from 'node:assert/strict';
import {
  compactOutputLines,
  finalizeOutputLines,
  hasActiveOutputLines,
} from '../src/output-lines.mjs';
import {
  appendQxOutput,
  createQxOutputState,
  qxOutputDestination,
  qxRuleOutputDestination,
  qxRewriteOutputDestination,
  renderQxOutput,
} from '../src/qx-output.mjs';
import {
  appendSurgeOutput,
  createSurgeOutputState,
  renderSurgeOutput,
  surgeOutputDestination,
  surgeRuleOutputDestination,
  surgeRewriteOutputDestination,
} from '../src/surge-output.mjs';

assert.deepEqual(compactOutputLines(['a','','','b','','']),['a','','b']);
assert.equal(hasActiveOutputLines(['# note','; note','// note','']),false);
assert.equal(hasActiveOutputLines(['# note','DOMAIN,example.com,DIRECT']),true);
assert.equal(finalizeOutputLines(['a','','']),'a\n');

const entry={
  id:'Demo',
  category:'去广告',
  source:'https://example.com/demo.lpx',
};
const stamp='2026-10-01 12:00:00 +08:00';
const header=['#!name=Demo','#!desc=Demo Loon plugin','# source comment'];

const qx=createQxOutputState();
assert.equal(qxOutputDestination(qx,'comment'),qx.notes);
assert.equal(qxRuleOutputDestination(qx,'comment'),qx.filter);
assert.equal(qxRuleOutputDestination(qx,'rewrite'),qx.rewrite);
assert.equal(qxRewriteOutputDestination(qx,'drop'),qx.rewrite);
assert.equal(qxRewriteOutputDestination(qx,'comment'),qx.notes);
assert.equal(appendQxOutput(qx,'notes','# global note'),true);
assert.equal(appendQxOutput(qx,'filter','host-suffix, example.com, reject','',''),true);
assert.equal(appendQxOutput(qx,'rewrite','^https://ads\\.example\\.com url reject-dict'),true);

const qxText=renderQxOutput({state:qx,headerLines:header,entry,stamp});
assert.match(qxText,/^# Name: Demo$/m);
assert.match(qxText,/^# Description: Demo Quantumult X plugin$/m);
assert.match(qxText,/^# \[filter_local\]$/m);
assert.match(qxText,/^# \[rewrite_local\]$/m);
assert.match(qxText,/^# \[mitm\]$/m);
assert.ok(qxText.indexOf('# global note') < qxText.indexOf('# [filter_local]'));
assert.ok(qxText.indexOf('# [filter_local]') < qxText.indexOf('# [rewrite_local]'));
assert.ok(qxText.indexOf('# [rewrite_local]') < qxText.indexOf('# [mitm]'));
assert.doesNotMatch(qxText,/\n\n\nhost-suffix/);
assert.equal(qxText.endsWith('\n'),true);

const qxEmpty=renderQxOutput({
  state:createQxOutputState(),
  headerLines:['#!name=Empty'],
  entry:{...entry,id:'Empty'},
  stamp,
});
assert.match(qxEmpty,/# \[filter_local\]\n\n# \[rewrite_local\]\n\n# \[mitm\]\n$/);

const sg=createSurgeOutputState();
assert.equal(surgeOutputDestination(sg,'comment'),sg.notes);
assert.equal(surgeRuleOutputDestination(sg,'map'),sg.map);
assert.equal(surgeRuleOutputDestination(sg,'comment'),sg.rule);
assert.equal(surgeRewriteOutputDestination(sg,'drop'),sg.notes);
assert.equal(surgeRewriteOutputDestination(sg,'unknown'),sg.notes);

appendSurgeOutput(sg,'notes','# module note');
appendSurgeOutput(sg,'rule','DOMAIN-SUFFIX,example.com,REJECT');
appendSurgeOutput(sg,'url','^https://old\\.example\\.com https://new.example.com 302');
appendSurgeOutput(sg,'header','http-request ^https://api\\.example\\.com header-del X-Test');
appendSurgeOutput(sg,'body','http-response-jq ^https://api\\.example\\.com del(.ads)');
appendSurgeOutput(sg,'map','^https://mock\\.example\\.com data-type=text data="{}" status-code=200');
appendSurgeOutput(sg,'script','demo = type=http-response,pattern=^https://api\\.example\\.com,script-path=https://example.com/a.js');
appendSurgeOutput(sg,'mitm','hostname = %APPEND% api.example.com');

const sgText=renderSurgeOutput({
  state:sg,
  headerLines:header,
  entry,
  stamp,
  argumentMetadata:['#!arguments=mode:on'],
  needsLineRequirement:false,
});
assert.match(sgText,/^#!name=Demo$/m);
assert.match(sgText,/^#!desc=Demo Surge plugin$/m);
assert.match(sgText,/^#!requirement=CORE_VERSION>=20$/m);
assert.match(sgText,/^#!arguments=mode:on$/m);
const surgeOrder=[
  '[Rule]',
  '[URL Rewrite]',
  '[Header Rewrite]',
  '[Body Rewrite]',
  '[Map Local]',
  '[Script]',
  '[MITM]',
].map(section=>sgText.indexOf(section));
assert.ok(surgeOrder.every(index=>index>=0));
assert.deepEqual([...surgeOrder].sort((a,b)=>a-b),surgeOrder);
assert.ok(sgText.indexOf('# module note') < sgText.indexOf('[Rule]'));
assert.equal(sgText.endsWith('\n'),true);

const sgSparse=createSurgeOutputState();
appendSurgeOutput(sgSparse,'url','^https://old\\.example\\.com https://new.example.com 302');
const sgSparseText=renderSurgeOutput({
  state:sgSparse,
  headerLines:['#!name=Sparse'],
  entry:{...entry,id:'Sparse'},
  stamp,
});
assert.doesNotMatch(sgSparseText,/^\[Rule\]$/m);
assert.match(sgSparseText,/^\[URL Rewrite\]$/m);
assert.doesNotMatch(sgSparseText,/^\[Header Rewrite\]$/m);
assert.doesNotMatch(sgSparseText,/^#!requirement=/m);

const sgCommentsOnly=createSurgeOutputState();
appendSurgeOutput(sgCommentsOnly,'body','# source body comment');
const sgCommentsText=renderSurgeOutput({
  state:sgCommentsOnly,
  headerLines:['#!name=Comments'],
  entry:{...entry,id:'Comments'},
  stamp,
});
assert.match(sgCommentsText,/^\[Body Rewrite\]$/m);
assert.doesNotMatch(sgCommentsText,/^#!requirement=CORE_VERSION>=20$/m);

const sgLineRequirement=createSurgeOutputState();
appendSurgeOutput(sgLineRequirement,'map','^https://mock\\.example\\.com data-type=text data="{}" status-code=200');
const sgLineRequirementText=renderSurgeOutput({
  state:sgLineRequirement,
  headerLines:['#!name=LineReq'],
  entry:{...entry,id:'LineReq'},
  stamp,
  needsLineRequirement:true,
});
assert.match(sgLineRequirementText,/^#!requirement=CORE_VERSION>=22$/m);
assert.doesNotMatch(sgLineRequirementText,/^#!requirement=CORE_VERSION>=20$/m);

console.log('Target output builder contract passed');
