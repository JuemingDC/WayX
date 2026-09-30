// Plugin parser / pure conversion pipeline contract
// Author: chance
// Category: Converter / Pipeline / Validation

import assert from 'node:assert/strict';
import { normalizePluginSource, parseLoonPlugin } from '../src/plugin-parser.mjs';
import { convertPlugin } from '../src/conversion-pipeline.mjs';

const normalized=normalizePluginSource('\uFEFF#!name=Demo\r\n[Rule]\r\nDOMAIN-SUFFIX,ads.example,REJECT\r\n');
assert.equal(normalized,'#!name=Demo\n[Rule]\nDOMAIN-SUFFIX,ads.example,REJECT\n');

const parsed=parseLoonPlugin(normalized);
assert.deepEqual(parsed.header,['#!name=Demo']);
assert.deepEqual(parsed.sections.get('Rule'),['DOMAIN-SUFFIX,ads.example,REJECT','']);

const entry={
  id:'Demo',
  category:'去广告',
  source:'https://example.com/Demo.lpx',
};
const source=[
  '#!name=Demo',
  '#!desc=Demo Loon plugin',
  '',
  '[Rule]',
  '# ad domain',
  'DOMAIN-SUFFIX,ads.example,REJECT',
  '',
  '[Rewrite]',
  '^https://api\\.example\\.com/ads url reject-dict',
  '',
  '[Script]',
  'http-response ^https://api\\.example\\.com script-path=https://example.com/resp.js, requires-body=true, tag=Resp',
  '',
  '[Unknown]',
  'ACTIVE,unknown',
  '',
].join('\n');

const out=convertPlugin(entry,source,{
  stamp:'2026-10-01 12:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
  scriptMap:new Map([[
    'https://example.com/resp.js',
    {
      qx:'https://example.com/resp.js',
      surge:'https://example.com/resp.js',
      source:'const x=$response.body; $done({body:x});',
      sourceError:null,
    },
  ]]),
  mockFiles:new Map(),
  jqFiles:new Map(),
});

assert.match(out.qx,/^# Name: Demo$/m);
assert.match(out.qx,/\{# ad domain #\} host-suffix, ads\.example, reject/);
assert.match(out.qx,/\^https:\/\/api\\\.example\\\.com\/ads url reject-dict/);
assert.match(out.qx,/script-response-body https:\/\/example\.com\/resp\.js/);
assert.match(out.qx,/ISSUE REQUIRED \[unknown-source-section\]/);
assert.match(out.qx,/# Source declaration: ACTIVE,unknown/);

assert.match(out.surge,/^#!name=Demo$/m);
assert.match(out.surge,/^\[Rule\]$/m);
assert.match(out.surge,/DOMAIN-SUFFIX,ads\.example,REJECT/);
assert.match(out.surge,/^\[Map Local\]$/m);
assert.match(out.surge,/data-type=text/);
assert.match(out.surge,/^\[Script\]$/m);
assert.match(out.surge,/Resp = type=http-response/);
assert.match(out.surge,/ISSUE REQUIRED \[unknown-source-section\]/);

assert.ok(out.generatedScripts instanceof Map);
assert.equal(out.qx.endsWith('\n'),true);
assert.equal(out.surge.endsWith('\n'),true);

console.log('Plugin parser / conversion pipeline contract passed');
