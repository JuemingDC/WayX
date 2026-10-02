// Surge official evidence gate for Loon ad-block conversion
// Author: chance
// Category: Converter / Surge / Validation

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  SURGE_WAYX_RULE_TYPES,
  SURGE_WAYX_RULE_BUILTIN_POLICIES,
  SURGE_WAYX_REWRITE_SECTIONS,
  SURGE_WAYX_URL_REWRITE_TYPES,
  SURGE_WAYX_HEADER_REWRITE_ACTIONS,
  SURGE_WAYX_BODY_REWRITE_TYPES,
  SURGE_WAYX_MAP_LOCAL_DATA_TYPES,
  SURGE_WAYX_SCRIPT_TYPES,
  SURGE_WAYX_MITM_KEYS,
} from '../src/surge-official-capabilities.mjs';

const ROOT=process.cwd();
const fixture=JSON.parse(await fs.readFile(
  path.join(ROOT,'.github/converter/fixtures/surge-official-capabilities.json'),
  'utf8',
));

const sorted=values=>[...values].sort();

async function fetchText(url) {
  let lastError=null;
  for (let attempt=1;attempt<=3;attempt++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error('HTTP '+response.status);
      return await response.text();
    } catch (error) {
      lastError=error;
      if (attempt<3) await new Promise(resolve=>setTimeout(resolve,500*attempt));
    }
  }
  throw new Error('failed to fetch official Surge document '+url+': '+String(lastError?.message||lastError));
}

function assertEvidence(text, token, label) {
  assert.ok(
    text.includes(token),
    label+' lost official Surge Manual evidence: '+token,
  );
}

assert.deepEqual(sorted(SURGE_WAYX_RULE_TYPES), fixture.ruleTypes, 'Surge Rule registry drifted from reviewed WayX adblock baseline');
assert.deepEqual(sorted(SURGE_WAYX_RULE_BUILTIN_POLICIES), fixture.ruleBuiltinPolicies, 'Surge built-in Rule policy registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_REWRITE_SECTIONS), fixture.rewrite.sections, 'Surge Rewrite section registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_URL_REWRITE_TYPES), fixture.rewrite.urlRewriteTypes, 'Surge URL Rewrite registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_HEADER_REWRITE_ACTIONS), fixture.rewrite.headerRewriteActions, 'Surge Header Rewrite registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_BODY_REWRITE_TYPES), fixture.rewrite.bodyRewriteTypes, 'Surge Body Rewrite registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_MAP_LOCAL_DATA_TYPES), fixture.rewrite.mapLocalDataTypes, 'Surge Map Local registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_SCRIPT_TYPES), fixture.rewrite.scriptTypes, 'Surge HTTP Script registry drifted');
assert.deepEqual(sorted(SURGE_WAYX_MITM_KEYS), fixture.mitmKeys, 'Surge MITM hostname registry drifted');

const docs=fixture.docs;
const [rules,policyOverview,builtInPolicies,rejectPolicy,urlRewrite,headerRewrite,bodyRewrite,mapLocal,httpRequestScript,httpResponseScript,mitm]=await Promise.all([
  fetchText(docs.ruleOverview),
  fetchText(docs.policyOverview),
  fetchText(docs.builtInPolicies),
  fetchText(docs.rejectPolicy),
  fetchText(docs.urlRewrite),
  fetchText(docs.headerRewrite),
  fetchText(docs.bodyRewrite),
  fetchText(docs.mapLocal),
  fetchText(docs.httpRequestScript),
  fetchText(docs.httpResponseScript),
  fetchText(docs.mitm),
]);

for (const type of fixture.ruleTypes) assertEvidence(rules,type,'Surge Rule type');

const policyEvidence=policyOverview+'\n'+builtInPolicies+'\n'+rejectPolicy;
for (const policy of fixture.ruleBuiltinPolicies) {
  assertEvidence(policyEvidence,policy,'Surge built-in Rule policy');
}

for (const type of fixture.rewrite.urlRewriteTypes) {
  const token=type==='header' ? '>header<' : type;
  if (urlRewrite.includes(token) || urlRewrite.includes(type)) continue;
  assert.fail('Surge URL Rewrite type lost official Manual evidence: '+type);
}

for (const action of fixture.rewrite.headerRewriteActions) assertEvidence(headerRewrite,action,'Surge Header Rewrite action');
for (const type of fixture.rewrite.bodyRewriteTypes) assertEvidence(bodyRewrite,type,'Surge Body Rewrite type');
for (const type of fixture.rewrite.mapLocalDataTypes) assertEvidence(mapLocal,type,'Surge Map Local data-type');
assertEvidence(httpRequestScript,'type=http-request','Surge HTTP request Script');
assertEvidence(httpResponseScript,'type=http-response','Surge HTTP response Script');
assertEvidence(mitm,'hostname','Surge MITM key');

console.log(
  'Surge scoped adblock capability gate passed: '+
  fixture.ruleTypes.length+' Rule types / '+
  fixture.ruleBuiltinPolicies.length+' built-in Rule policies / '+
  fixture.rewrite.sections.length+' Rewrite sections / hostname'
);
