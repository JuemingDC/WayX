// Semantic domain migration regression tests
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Architecture / Semantics
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {parseRewriteV2,rewriteV2AstToSemanticIr,legacyRewriteToSemanticIr} from '../src/rewrite.mjs';
import {planQxRewrite} from '../src/rewrite-qx.mjs';
import {planSurgeRewrite} from '../src/rewrite-surge.mjs';
import {parseScriptDeclaration} from '../src/script.mjs';
import {planQxScript,planSurgeScript} from '../src/script-target.mjs';
import {parseConfigurationDeclaration,planConfiguration} from '../src/configuration.mjs';
import {convertPlugin} from '../src/conversion-pipeline.mjs';

// Poison provenance: target output must depend only on semantic IR fields.
for(const source of [
 'response if ${url} ~= /api/ then response.json.jq(".items")',
 'request if ${url} ~= /api/ then reject(404)',
]){
 const ir=rewriteV2AstToSemanticIr(parseRewriteV2(source),{source});
 const withoutProvenance={...ir,sourcePayload:null,ast:{actions:[],condition:null}};
 for(const planner of [planQxRewrite,planSurgeRewrite]){
  const ctx=()=>({generatedScripts:new Map(),rawBase:'https://example.com',id:'Synthetic',stamp:'2026-10-03',category:'Test'});
  assert.deepEqual(planner(withoutProvenance,ctx()),planner(ir,ctx()));
 }
}
const legacy=legacyRewriteToSemanticIr('^https://example.com','302 https://target.example');
for(const planner of [planQxRewrite,planSurgeRewrite]){
 assert.deepEqual(planner({...legacy,sourcePayload:null}),planner(legacy));
}
for(const source of [
 'http-response ^https://example.com script-path=https://example.com/a.js, requires-body=true, timeout=9, tag=Demo',
 'request if ${url} ~= /api/ then script("https://example.com/a.js") with requires_body=true, tag="Demo"',
 'cron "0 0 * * *" then script("https://example.com/a.js") with tag="Demo"',
]){
 const ir=parseScriptDeclaration(source);
 for(const planner of [planQxScript,planSurgeScript]){
  assert.deepEqual(planner({...ir,sourcePayload:null},{name:'Demo'}),planner(ir,{name:'Demo'}));
 }
}

const ir=parseConfigurationDeclaration('hostname = -private.example, *.example.com:8443, api.example, api.example');
assert.deepEqual(ir.hosts,['-private.example','*.example.com:8443','api.example','api.example']);
assert.equal(planConfiguration(ir,'qx').line,'hostname = -private.example, *.example.com:8443, api.example, api.example');
assert.equal(planConfiguration(ir,'surge').line,'hostname = %APPEND% -private.example, *.example.com:8443, api.example, api.example');
assert.throws(()=>planConfiguration(ir,'egern'),/Unknown configuration target/);
assert.match(planConfiguration(parseConfigurationDeclaration('hostname ='),'surge').line,/REVIEW REQUIRED/);
assert.match(planConfiguration(parseConfigurationDeclaration('h2 = true'),'qx').line,/unknown-mitm-option/);

const out=convertPlugin({id:'Synthetic',source:'https://example.com/demo.lpx',category:'Test'},[
 '#!name=Demo','[MITM]','# first section','hostname = one.example',
 '[MitM]','# second section','hostname = two.example','# trailing note',
].join('\n'),{stamp:'2026-10-03',rawBase:'https://example.com',scriptMap:new Map(),mockFiles:new Map(),jqFiles:new Map()});
for(const text of [out.qx,out.surge]){
 assert.ok(text.indexOf('one.example')<text.indexOf('two.example'));
 assert.ok(text.includes('# first section') && text.includes('# second section') && text.includes('# trailing note'));
}

// Every executable workflow command must resolve to an existing repository file.
for(const name of await fs.readdir('.github/workflows')){
 const text=await fs.readFile('.github/workflows/'+name,'utf8');
 for(const [,file] of text.matchAll(/\b(?:node|python)\s+(\.github\/[\w/.-]+\.(?:mjs|py))\b/g)){
  assert.ok((await fs.stat(file)).isFile(),'missing workflow executable: '+file);
 }
}
const scheduled=await fs.readFile('.github/workflows/upstream-monitor.yml','utf8');
assert.doesNotMatch(scheduled,/^\s+schedule:/m);
assert.match(scheduled,/workflow_dispatch:/);
console.log('Semantic domain migration passed: IR provenance independence, MITM order/comments, workflow paths/pause');
