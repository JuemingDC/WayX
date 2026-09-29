import assert from 'node:assert/strict';
import { convert, validateQX } from '../../.github/scripts/sync-convert.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';

const sourceA = `#!name=Unknown Alpha
#!desc=Generic conversion fixture
#!author=Someone

[Rule]
DOMAIN-SUFFIX,example.com,REJECT
IP-CIDR,192.0.2.0/24,DIRECT,no-resolve

[Rewrite]
^https:\\/\\/ads\\.example\\.com reject-dict
^https:\\/\\/old\\.example\\.com 302 https://new.example.com
^https:\\/\\/api\\.example\\.com response-body-replace-regex enabled:true enabled:false
^https:\\/\\/api\\.example\\.com response-body-json-del data.ads
request if \${url} ~= /^https:\\/\\/api\\.example\\.com\\/v2/ then request.header.set("X-WayX", "1")

[Script]
http-response ^https:\\/\\/api\\.example\\.com script-path=https://scripts.example.com/generic.js,tag=generic_response,requires-body=true

[MitM]
hostname = api.example.com, ads.example.com
`;

const sourceB = sourceA
  .replace('#!name=Unknown Alpha', '#!name=Totally Different Plugin')
  .replace('#!author=Someone', '#!author=Another Author');

const scriptMap = new Map([
  ['https://scripts.example.com/generic.js', {
    qx:'https://scripts.example.com/generic.js',
    surge:'https://scripts.example.com/generic.js',
    source:'const isQX=typeof $task!=="undefined"; if(isQX){$done({body:$response.body});}else{$done({body:$response.body});}',
    qxAdapted:false,
  }],
]);

const entryA = {
  id:'AlphaIdentity',
  source:'https://source-a.invalid/plugin.lpx',
  qx:'Alpha.snippet',
  surge:'Alpha.sgmodule',
  category:'测试',
};
const entryB = {
  id:'CompletelyDifferentIdentity',
  source:'https://another-source.invalid/random-name.lpx',
  qx:'Different.snippet',
  surge:'Different.sgmodule',
  category:'另一分类',
};

const stamp='2026-09-29 12:00:00 +08:00';
const outA=convert(entryA, sourceA, scriptMap, stamp, new Map(), new Map());
const outB=convert(entryB, sourceB, scriptMap, stamp, new Map(), new Map());

validateQX(outA.qx, entryA);
validateQX(outB.qx, entryB);
validateSurgeModule(outA.surge, entryA);
validateSurgeModule(outB.surge, entryB);

function normalizeGeneratedIdentityPath(line, entryId){
  return line.replaceAll('/script/' + entryId + '/', '/script/<identity>/');
}
function qxSemantics(text, entryId){
  return text.split('\n')
    .map(x=>normalizeGeneratedIdentityPath(x.trim(), entryId))
    .filter(x=>x && !x.startsWith('#'));
}
function surgeSemantics(text, entryId){
  return text.split('\n')
    .map(x=>normalizeGeneratedIdentityPath(x.trim(), entryId))
    .filter(x=>x && !x.startsWith('#') && !/^\[[^\]]+\]$/.test(x));
}

assert.deepEqual(qxSemantics(outA.qx, entryA.id), qxSemantics(outB.qx, entryB.id));
assert.deepEqual(surgeSemantics(outA.surge, entryA.id), surgeSemantics(outB.surge, entryB.id));
function generatedScriptSemantics(map){
  return [...map].map(([name, body]) => [
    name,
    String(body)
      .split('\n')
      .filter(line => !/^\/\/ (?:Converted:|Converted by:|Category:)/.test(line))
      .join('\n'),
  ]);
}
assert.deepEqual(generatedScriptSemantics(outA.generatedScripts), generatedScriptSemantics(outB.generatedScripts));

assert.ok(qxSemantics(outA.qx, entryA.id).includes('^https:\\/\\/ads\\.example\\.com url reject-dict'));
assert.ok(surgeSemantics(outA.surge, entryA.id).includes('^https:\\/\\/ads\\.example\\.com data-type=text data="{}" status-code=200 header="Content-Type:application/json"'));
assert.ok(surgeSemantics(outA.surge, entryA.id).some(x=>x.startsWith('http-response ^https:\\/\\/api\\.example\\.com enabled:true enabled:false')));
assert.ok(qxSemantics(outA.qx, entryA.id).some(x=>x.includes("jsonjq-response-body 'del(.data.ads)'")));
assert.ok(qxSemantics(outA.qx, entryA.id).some(x=>x.includes('script-response-body https://scripts.example.com/generic.js')));

console.log('Generic identity-invariance conversion test passed');
