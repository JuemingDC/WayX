// Conversion-context materializer contract
// Author: chance
// Category: Converter / Context / Validation

import assert from 'node:assert/strict';
import { parseLoonPlugin } from '../src/plugin-parser.mjs';
import {
  materializeJqFiles,
  materializeMockFiles,
} from '../src/dependency-materializer.mjs';
import {
  discoverSourceScriptUrls,
  inspectSourceScript,
  materializeSourceScripts,
} from '../src/source-script-materializer.mjs';
import { materializeConversionContext } from '../src/conversion-context.mjs';
import { convertPlugin } from '../src/conversion-pipeline.mjs';

const entry={
  id:'MaterializerFixture',
  source:'https://example.com/plugins/demo.lpx',
  category:'测试',
};

const source=[
  '#!name=MaterializerFixture',
  '',
  '[Rewrite]',
  'response if ${url} ~= /jq/ then response.json.jq_file("filters/remove-ads.jq")',
  'response if ${url} ~= /jq-alias/ then response.json.jq("jq-path=filters/legacy-alias.jq")',
  '^https://legacy\\.example\\.com - response-body-json-jq jq-path=filters/legacy-rewrite.jq',
  'response if ${url} ~= /jq-missing/ then response.json.jq_file("filters/missing.jq")',
  'response if ${url} ~= /mock/ then response.body.mock_file("json", "mock.json", 200)',
  'response if ${url} ~= /image/ then response.body.mock_file("png", "image.bin", 200)',
  '',
  '[Script]',
  'http-response ^https://api\\.example\\.com script-path=./legacy.js,tag=legacy',
  'response if ${url} ~= /v2/ then script("scripts/v2.js") with tag="v2", requires_body=true',
  'response if ${url} ~= /bad/ then script("https://bad.example/fail.js") with tag="bad"',
  '',
].join('\n');

const textByUrl=new Map([
  ['https://example.com/plugins/filters/remove-ads.jq','.ads | del(.banner)\n'],
  ['https://example.com/plugins/filters/legacy-alias.jq','del(.legacyAlias)\n'],
  ['https://example.com/plugins/filters/legacy-rewrite.jq','del(.legacyRewrite)\n'],
  ['https://example.com/plugins/mock.json','{"ok":true}'],
  ['https://example.com/plugins/legacy.js','const legacy = true;\r\n$done({});\r\n'],
  ['https://example.com/plugins/scripts/v2.js','const v2 = true;\n$done({});\n'],
]);

const fetchedText=[];
const fetchedBytes=[];
async function fetchText(url) {
  fetchedText.push(url);
  if (url==='https://bad.example/fail.js') throw new Error('fixture source unavailable');
  if (!textByUrl.has(url)) throw new Error('unexpected text URL: '+url);
  return textByUrl.get(url);
}
async function fetchBytes(url) {
  fetchedBytes.push(url);
  if (url!=='https://example.com/plugins/image.bin') {
    throw new Error('unexpected bytes URL: '+url);
  }
  return Uint8Array.from([0,1,2,255]);
}

const parsed=parseLoonPlugin(source);

const jqFiles=await materializeJqFiles(entry,parsed,{fetchText});
const jqLine='response if ${url} ~= /jq/ then response.json.jq_file("filters/remove-ads.jq")';
assert.equal(jqFiles.get(jqLine).sourceFile,'https://example.com/plugins/filters/remove-ads.jq');
assert.match(jqFiles.get(jqLine).content,/del\(\.banner\)/);

const jqAliasLine='response if ${url} ~= /jq-alias/ then response.json.jq("jq-path=filters/legacy-alias.jq")';
assert.equal(jqFiles.get(jqAliasLine).sourceFile,'https://example.com/plugins/filters/legacy-alias.jq');
assert.equal(jqFiles.get(jqAliasLine).content,'del(.legacyAlias)');
assert.equal(jqFiles.get(jqAliasLine).legacyAlias,true);

const legacyJqLine='^https://legacy\\.example\\.com - response-body-json-jq jq-path=filters/legacy-rewrite.jq';
assert.equal(jqFiles.get(legacyJqLine).sourceFile,'https://example.com/plugins/filters/legacy-rewrite.jq');
assert.equal(jqFiles.get(legacyJqLine).content,'del(.legacyRewrite)');
assert.equal(jqFiles.get(legacyJqLine).legacyAlias,true);

const missingJqLine='response if ${url} ~= /jq-missing/ then response.json.jq_file("filters/missing.jq")';
assert.match(jqFiles.get(missingJqLine).error,/unexpected text URL/);

const mockFiles=await materializeMockFiles(entry,parsed,{fetchText,fetchBytes});
const textMockLine='response if ${url} ~= /mock/ then response.body.mock_file("json", "mock.json", 200)';
assert.deepEqual(mockFiles.get(textMockLine),{
  bodyText:'{"ok":true}',
  sourceFile:'https://example.com/plugins/mock.json',
});
const binaryMockLine='response if ${url} ~= /image/ then response.body.mock_file("png", "image.bin", 200)';
assert.deepEqual(mockFiles.get(binaryMockLine),{
  bodyBase64:'AAEC/w==',
  sourceFile:'https://example.com/plugins/image.bin',
});

const refs=discoverSourceScriptUrls(source,{parsed});
assert.deepEqual(refs,[
  './legacy.js',
  'scripts/v2.js',
  'https://bad.example/fail.js',
]);

const inspected=await inspectSourceScript('./legacy.js',entry.source,{fetchText});
assert.equal(inspected.qx,'https://example.com/plugins/legacy.js');
assert.equal(inspected.surge,'https://example.com/plugins/legacy.js');
assert.equal(inspected.source,'const legacy = true;\n$done({});\n');
assert.equal(inspected.sourceError,null);

const scriptMap=await materializeSourceScripts(source,entry.source,{parsed,fetchText});
assert.equal(scriptMap.get('./legacy.js').qx,'https://example.com/plugins/legacy.js');
assert.equal(scriptMap.get('scripts/v2.js').surge,'https://example.com/plugins/scripts/v2.js');
assert.equal(scriptMap.get('https://bad.example/fail.js').qx,'https://bad.example/fail.js');
assert.equal(scriptMap.get('https://bad.example/fail.js').source,'');
assert.match(scriptMap.get('https://bad.example/fail.js').sourceError,/fixture source unavailable/);

fetchedText.length=0;
fetchedBytes.length=0;
const context=await materializeConversionContext(entry,source,{fetchText,fetchBytes});
assert.ok(context.parsed.sections instanceof Map);
assert.equal(context.jqFiles.get(jqLine).sourceFile,'https://example.com/plugins/filters/remove-ads.jq');
assert.equal(context.jqFiles.get(jqAliasLine).content,'del(.legacyAlias)');
assert.equal(context.jqFiles.get(legacyJqLine).content,'del(.legacyRewrite)');
assert.match(context.jqFiles.get(missingJqLine).error,/unexpected text URL/);
assert.equal(context.mockFiles.get(binaryMockLine).bodyBase64,'AAEC/w==');
assert.equal(context.scriptMap.get('./legacy.js').qx,'https://example.com/plugins/legacy.js');
assert.equal(context.scriptMap.get('scripts/v2.js').qx,'https://example.com/plugins/scripts/v2.js');
assert.match(context.scriptMap.get('https://bad.example/fail.js').sourceError,/fixture source unavailable/);
assert.ok(fetchedText.includes('https://example.com/plugins/filters/remove-ads.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/filters/legacy-alias.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/filters/legacy-rewrite.jq'));
assert.ok(fetchedText.includes('https://example.com/plugins/mock.json'));
assert.ok(fetchedText.includes('https://example.com/plugins/legacy.js'));
assert.ok(fetchedText.includes('https://example.com/plugins/scripts/v2.js'));
assert.ok(fetchedBytes.includes('https://example.com/plugins/image.bin'));

const conversionOptions={
  parsed:context.parsed,
  scriptMap:context.scriptMap,
  mockFiles:context.mockFiles,
  jqFiles:context.jqFiles,
  stamp:'2026-10-01 00:00:00 +08:00',
  rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',
};
const baseline=convertPlugin(entry,source,conversionOptions);
assert.match(baseline.qx,/jsonjq-response-body 'del\(\.legacyAlias\)'/);
assert.match(baseline.qx,/jsonjq-response-body 'del\(\.legacyRewrite\)'/);
assert.match(baseline.surge,/http-response-jq .*'del\(\.legacyAlias\)'/);
assert.match(baseline.surge,/http-response-jq .*'del\(\.legacyRewrite\)'/);
assert.doesNotMatch(baseline.qx,/jq-path=/);
assert.doesNotMatch(baseline.surge,/jq-path=/);
assert.match(baseline.qx,/REVIEW REQUIRED: unexpected text URL: https:\/\/example\.com\/plugins\/filters\/missing\.jq/);
assert.match(baseline.surge,/REVIEW REQUIRED: unexpected text URL: https:\/\/example\.com\/plugins\/filters\/missing\.jq/);
assert.doesNotMatch(
  baseline.qx.split(/\r?\n/).filter(line=>line.trim() && !line.trim().startsWith('#')).join('\n'),
  /jq-missing.*url script-/,
  'unresolved jq_file must not generate a QX Script helper',
);
assert.doesNotMatch(
  baseline.surge.split(/\r?\n/).filter(line=>line.trim() && !line.trim().startsWith('#')).join('\n'),
  /jq-missing.*script-path=/,
  'unresolved jq_file must not generate a Surge Script helper',
);
const reused=convertPlugin(entry,'#!name=Different\\n[Rule]\\nDOMAIN,wrong.example,DIRECT\\n',conversionOptions);
assert.equal(reused.qx,baseline.qx,'convertPlugin must consume the provided parsed plugin instead of reparsing source');
assert.equal(reused.surge,baseline.surge,'Surge output must use the same materialized parsed plugin');
assert.deepEqual([...reused.generatedScripts], [...baseline.generatedScripts]);

console.log('Conversion-context materializer contract passed');
