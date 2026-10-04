// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / runtime / Regression Suite

import { parseRewriteV2, renderMixedRewriteScript, renderQxInlineMockScript } from "../src/index.mjs";
import assert from "node:assert/strict";
import vm from "node:vm";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["generated-helper-runtime.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "generated-helper-runtime.mjs") {
// Suite case: generated-helper-runtime.mjs
// WayX generated helper runtime fixtures
// Author: chance
// Category: Converter / Runtime Validation



function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

function runGenerated(script, { request = {}, response = {}, argument = '' } = {}) {
  let calls = 0;
  let output;
  const context = {
    $request: clone({ url:'https://example.invalid/', method:'GET', headers:{}, body:'', ...request }),
    $response: clone({ statusCode:200, status:200, headers:{}, body:'', ...response }),
    $argument: argument,
    $done(value = {}) {
      calls += 1;
      output = value;
    },
  };
  vm.runInNewContext(script, context, { timeout: 1000 });
  assert.equal(calls, 1, 'generated helper must call $done exactly once');
  return output;
}

// Response phase: URL capture + status/header conditions + ordered Body -> JSON -> Header mutations.
{
  const ast = parseRewriteV2('response if ${url} ~= /item-(\\d+)/ as hit && ${response.status} == 200 && ${response.header["X-FLAG"]} == "yes" then response.body.replace(/OLD/, `{"value":1}`) | response.json.add("meta.seen", true) | response.header.set("x-test", "ok") | response.header.set("X-ID", "${hit.1}")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/item-123' },
    response:{ statusCode:200, headers:{'x-flag':'yes','X-Test':'old'}, body:'OLD' },
  }));
  assert.deepEqual(JSON.parse(result.body), { value:1, meta:{seen:true} });
  assert.equal(result.headers['X-Test'], 'ok');
  assert.equal(result.headers['X-ID'], '123');

  const miss = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/other-123' },
    response:{ statusCode:200, headers:{'x-flag':'yes'}, body:'OLD' },
  }));
  assert.deepEqual(miss, {});
}

// Request phase: grouped AND/OR logic with method/header and URL fallback.
{
  const ast = parseRewriteV2('request if (${request.method} == "POST" && ${request.header["Content-Type"]} == "application/json") || ${url} ~= /fallback$/ then request.header.set("X-Mode", "hit") | request.body.replace(/foo/, "bar")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });

  const methodBranch = normalize(runGenerated(plan.script, {
    request:{ method:'POST', url:'https://example.test/api', headers:{'content-type':'application/json'}, body:'foo' },
  }));
  assert.equal(methodBranch.headers['X-Mode'], 'hit');
  assert.equal(methodBranch.body, 'bar');

  const urlBranch = normalize(runGenerated(plan.script, {
    request:{ method:'GET', url:'https://example.test/fallback', headers:{}, body:'foo' },
  }));
  assert.equal(urlBranch.headers['X-Mode'], 'hit');
  assert.equal(urlBranch.body, 'bar');
}

// JSON semantics follow the selected Stash-compatible add/replace rules:
 // add writes missing/null paths; replace skips missing/null/false; delete removes directly.
{
  const ast = parseRewriteV2('response if ${url} ~= /json/ then response.json.add("meta.count", 1) | response.json.add("keep", 9) | response.json.add("nullable", 3) | response.json.replace("flag", true) | response.json.delete("remove")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/json' },
    response:{ body:'{"keep":5,"nullable":null,"flag":false,"remove":null}' },
  }));
  assert.deepEqual(JSON.parse(result.body), { keep:5, nullable:3, flag:false, meta:{count:1} });
}

// Invalid JSON must fail only that action; later actions still execute in source order.
{
  const ast = parseRewriteV2('response if ${url} ~= /badjson/ then response.json.add("x", 1) | response.body.replace(/not-json/, "recovered")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/badjson' },
    response:{ body:'not-json' },
  }));
  assert.equal(result.body, 'recovered');
}

// Raw strings are literal and do not interpolate capture aliases.
{
  const ast = parseRewriteV2('response if ${url} ~= /raw-(\\d+)/ as cap then response.header.set("X-Raw", `${cap.1}`) | response.body.replace(/foo/, `${cap.1}`)');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/raw-7' },
    response:{ body:'foo' },
  }));
  assert.equal(result.headers['X-Raw'], '${cap.1}');
  assert.equal(result.body, '${cap.1}');
}

// Optional capture groups: an undefined capture skips only the dependent action.
{
  const ast = parseRewriteV2('response if ${url} ~= /opt-(foo)?bar/ as cap then response.header.set("X-Optional", "${cap.1}") | response.header.set("X-Fixed", "yes")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/opt-bar' },
    response:{ headers:{} },
  }));
  assert.equal(result.headers['X-Optional'], undefined);
  assert.equal(result.headers['X-Fixed'], 'yes');
}

// QX request mock mixed pipeline: mock occurs at its source position, then later Body/JSON/Header actions continue.
{
  const ast = parseRewriteV2('request if ${url} ~= /request-mock/ then request.header.set("X-Before", "1") | request.body.mock("json", `{"ok":false}`) | request.body.replace(/false/, "true") | request.json.add("flag", 1) | request.header.del("Cookie")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  assert.equal(plan.qxAction, 'script-request-body');
  const result = normalize(runGenerated(plan.script, {
    request:{
      url:'https://example.test/request-mock',
      headers:{Cookie:'a=1','Content-Type':'text/plain'},
      body:'original',
    },
  }));
  assert.equal(result.headers['X-Before'], '1');
  assert.equal(result.headers.Cookie, undefined);
  assert.equal(result.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(result.body), {ok:true,flag:1});
}

// QX request mock_file mixed pipeline: materialized text is treated as file content, not template input.
{
  const ast = parseRewriteV2('request if ${url} ~= /request-file/ then request.body.mock_file("json", "request.json") | request.json.replace("ok", true)');
  const plan = renderMixedRewriteScript(ast, {
    target:'qx',
    mockMaterialized:{bodyText:'{"ok":1,"literal":"${notExpanded}"}',sourceFile:'https://example.test/request.json'},
  });
  const result = normalize(runGenerated(plan.script, {
    request:{url:'https://example.test/request-file',headers:{},body:'old'},
  }));
  assert.deepEqual(JSON.parse(result.body), {ok:true,literal:'${notExpanded}'});
  assert.equal(result.headers['Content-Type'], 'application/json');
}

// Surge full-header-mode: duplicate fields must survive header.add and retain array order.
{
  const ast = parseRewriteV2('response if ${url} ~= /dup/ then response.header.add("Set-Cookie", "b=2") | response.header.set("X-Test", "new")');
  const plan = renderMixedRewriteScript(ast, { target:'surge' });
  assert.equal(plan.fullHeaderMode, true);
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/dup' },
    response:{ headers:[
      {field:'Set-Cookie', value:'a=1'},
      {field:'X-Test', value:'old'},
    ] },
  }));
  assert.deepEqual(result.headers, [
    {field:'Set-Cookie', value:'a=1'},
    {field:'X-Test', value:'new'},
    {field:'Set-Cookie', value:'b=2'},
  ]);
}

// Generic QX inline mock pipeline: response mock + header.set.
{
  const ast = parseRewriteV2('response if ${url} ~= /mock/ then response.body.mock("json", `{"ok":true}`, 201, false) | response.header.set("X-Test", "ok")');
  const plan = renderQxInlineMockScript(ast);
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/mock' },
  }));
  assert.equal(result.status, 'HTTP/1.1 201 Created');
  assert.equal(result.headers['Content-Type'], 'application/json');
  assert.equal(result.headers['X-Test'], 'ok');
  assert.equal(result.body, '{"ok":true}');
}

// Generic QX inline mock pipeline: binary response mock returns bodyBytes losslessly.
{
  const ast = parseRewriteV2('response if ${url} ~= /binary/ then response.body.mock("png", "AQID", 200, true) | response.header.set("X-Binary", "yes")');
  const plan = renderQxInlineMockScript(ast);
  const result = runGenerated(plan.script, { request:{ url:'https://example.test/binary' } });
  assert.equal(result.status, 'HTTP/1.1 200 OK');
  assert.equal(result.headers['Content-Type'], 'image/png');
  assert.equal(result.headers['X-Binary'], 'yes');
  assert.deepEqual([...new Uint8Array(result.bodyBytes)], [1,2,3]);
}

console.log('WayX generated helper runtime fixtures passed');
}

// Behavior oracle: source evaluator against both emitted target adapters,
// including all flag combinations and capture-dependent substitutions.
if (selectedCase==='generated-helper-runtime.mjs') {
  const {evaluateRewriteActions}=await import('../src/core.mjs');
  const {parseJsonKeyPath}=await import('../src/rewrite.mjs');
  const {renderSingleRewriteMutationScript,renderRewritePhaseDispatcher}=await import('../src/runtime.mjs');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const run=(script,context)=>{
    let calls=0,out;
    vm.runInNewContext(script+'\nif(Object.prototype.hasOwnProperty.call(Object.prototype,"safe"))throw new Error("JSON prototype mutation");',{$request:structuredClone(context.request),$response:structuredClone(context.response),$done(value){calls++;out=value;}},{timeout:1000});
    assert.equal(calls,1);
    return JSON.parse(JSON.stringify(out));
  };
  let checked=0;
  for (const target of ['qx','surge']) for (const flags of ['','i','m','s','im','is','ms','ims']) for(const body of ['a.b','A\nB','a\nb','prefix\na.b\nsuffix']) {
    const ast=parseRewriteV2('response if ${url} ~= /api-(\\d+)/i as hit && ${response.header["X-Mode"]} ~= /^READY$/i then response.body.replace(/^a.b$/'+flags+', "$0:$0:${hit.1}") | response.header.replace("X-Mode", /ready/i, "$0-done") | response.json.add("meta.ok",true)');
    const context={url:'https://example.test/API-42',request:{url:'https://example.test/API-42',headers:{},method:'GET'},response:{headers:{'x-mode':'READY'},body,status:200,statusCode:200}};
    const oracle=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath});
    const generated=run(renderMixedRewriteScript(ast,{target}).script,context);
    assert.equal(generated.body,oracle.state.response.body);
    assert.deepEqual(generated.headers,oracle.state.response.headers);
    if (flags==='ims' && body==='A\nB') assert.equal(generated.body,'A\nB:A\nB:42','source $0 is the complete action match, with i/m/s preserved');
    checked++;
  }
  for(const target of ['qx','surge']) {
    // Missing and empty headers are distinct; /=^$/ must not match absence.
    for(const headers of [{},{'X-Empty':''},{'x-empty':'present'}]) {
      const ast=parseRewriteV2('request if ${request.header["X-Empty"]} == null || ${request.header["X-Empty"]} ~= /^$/ then request.header.set("X-Matched","yes")');
      const context={url:'https://example.test/api',request:{url:'https://example.test/api',headers,method:'GET'},response:{}};
      const oracle=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath});
      const generated=run(renderSingleRewriteMutationScript(ast,{target}).script,context);
      assert.deepEqual(generated.headers || headers,oracle.state.request.headers);
      checked++;
    }
    // All declarations run, the next condition sees prior changes, each
    // declaration owns its captures, and all-miss emits the official no-op.
    const entries=[
      'response if ${url} ~= /api-(\\d+)/i as hit then response.header.set("X-Step","${hit.1}")',
      'response if ${response.header["X-Step"]} == "42" then response.body.replace(/old/is,"new") | response.header.set("X-Final","yes")',
      'response if ${url} ~= /miss/ then response.body.replace(/new/,"wrong")',
    ].map(parseRewriteV2);
    for(const url of ['https://example.test/API-42','HTTPS://example.test/API-42','https://example.test/none']) {
      const context={url,request:{url,headers:{},method:'GET'},response:{headers:{},body:'OLD',status:200,statusCode:200}};
      let state=context;
      for(const ast of entries)state=evaluateRewriteActions(ast,state,{parsePath:parseJsonKeyPath}).state;
      const plan=renderRewritePhaseDispatcher(entries,{target});
      assert.equal(new RegExp(plan.pattern).test(url),true,'phase prefilter must not exclude uppercase URL schemes');
      const generated=run(plan.script,context);
      assert.deepEqual(generated.headers || context.response.headers,state.response.headers);
      assert.equal(generated.body ?? context.response.body,state.response.body);
      checked++;
    }
  }
  const entry={id:'PhaseOracle',source:'https://example.test/plugin.lpx',category:'Test'};
  const source='[Rewrite]\nresponse if ${url} ~= /api/i then response.header.set("X-Step","42")\nresponse if ${response.header["X-Step"]} == "42" then response.body.replace(/old/i,"new")';
  const output=convertPlugin(entry,source,{stamp:'2026-10-03',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  validateConvertedPlugin(entry,output);
  assert.equal(output.generatedScripts.size,2);
  assert.match(output.qx,/phase_qx_response_/);
  assert.match(output.surge,/phase_surge_response_/);
  assert.doesNotMatch([...output.generatedScripts.keys()].join('\n'),/^(?:body|header|json_)/m);
  console.log('New syntax behavior oracle passed: '+checked+' flag/capture/header/dispatcher cases across QX and Surge');
}

if(selectedCase==='generated-helper-runtime.mjs') {
  const {readFile}=await import('node:fs/promises');
  const fixture=JSON.parse(await readFile(new URL('../fixtures/loon-feature-semantics.json',import.meta.url),'utf8'));
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {renderRewritePhaseDispatcher}=await import('../src/runtime.mjs');
  const {classifyComplexRewrite}=await import('../src/rewrite.mjs');
  const run=(script,{request={},response={},argument=''}={})=>{
    let calls=0,result;
    vm.runInNewContext(script+'\nif(Object.prototype.hasOwnProperty.call(Object.prototype,"safe"))throw new Error("JSON prototype mutation");',{$request:{url:'https://example.test/',method:'GET',headers:{},body:'',...structuredClone(request)},$response:{status:200,statusCode:200,headers:{},body:'',...structuredClone(response)},$argument:argument,$done(value){calls++;result=value;}},{timeout:1000});
    assert.equal(calls,1);return JSON.parse(JSON.stringify(result));
  };
  const fixtureMockFiles=item=>{
    const data=Object.hasOwn(item,'mockByAction')?{byAction:structuredClone(item.mockByAction)}:Object.hasOwn(item,'mockText')?{bodyText:item.mockText,sourceFile:'https://example.test/body.txt'}:null;
    return data?new Map([[item.source,data]]):new Map();
  };
  let checked=0;
  for(const item of fixture.cases) {
    const mockFiles=fixtureMockFiles(item);
    const output=convertPlugin({id:'FeatureCollection',source:'https://example.test/source.lpx',category:'Test'},'[Rewrite]\n'+item.source,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main',mockFiles});
    validateConvertedPlugin({id:'FeatureCollection'},output);
    for(const target of item.targets) {
      assert.doesNotMatch(target==='qx'?output.qx:output.surge,/REVIEW REQUIRED/,item.id+' '+target);
      const scripts=[...output.generatedScripts].filter(([name])=>name.startsWith('features_'+target+'_'));
      assert.equal(scripts.length,1,item.id+' must use a generic feature helper');
      assert.deepEqual(run(scripts[0][1],item),item.expected,item.id+' '+target);
      checked++;
    }
  }
  const {evaluateRewriteActions}=await import('../src/core.mjs');
  const {parseJsonKeyPath}=await import('../src/rewrite.mjs');
  for(const item of fixture.cases.slice(18)) {
    const ast=parseRewriteV2(item.source);
    const context={url:item.request?.url||'https://example.test/',request:{method:'GET',headers:{},body:'',...structuredClone(item.request)},response:{status:200,headers:{},body:'',...structuredClone(item.response)}};
    const oracle=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath,mockFiles:fixtureMockFiles(item)});
    for(const [field,expected] of Object.entries(item.expected))assert.deepEqual(oracle.state[ast.phase][field],expected,item.id+' independent source oracle');
  }
  const profile=classifyComplexRewrite(parseRewriteV2(fixture.cases.find(c=>c.id==='paired-body-batch').source));
  assert.ok(profile.features.kinds.includes('regex-flags'));
  assert.ok(profile.features.kinds.includes('batch-arguments'));
  assert.ok(profile.features.kinds.includes('string-templates'));
  // A body phase owner must return the unchanged body with a header-only hit.
  const headersOnly=[parseRewriteV2('response if ${url} ~= /example/i then response.header.set("X-Only","yes")'),parseRewriteV2('response if ${url} ~= /miss/ then response.body.replace(/old/,"new")')];
  assert.deepEqual(run(renderRewritePhaseDispatcher(headersOnly,{target:'qx'}).script,{response:{body:'old'}}),{headers:{'X-Only':'yes'},body:'old'});
  assert.deepEqual(run(renderRewritePhaseDispatcher(headersOnly,{target:'qx'}).script,{request:{url:'https://none.test/'}}),{});
  // Surge full-header-mode preserves duplicate entries and configuration order.
  const duplicates=[parseRewriteV2('response if ${url} ~= /example/i then response.header.add("X-Dup","second")'),parseRewriteV2('response if ${url} ~= /example/i then response.header.replace("X-Dup",/s/i,"S")')];
  const duplicatePlan=renderRewritePhaseDispatcher(duplicates,{target:'surge'});
  assert.equal(duplicatePlan.fullHeaderMode,true);
  assert.throws(()=>renderRewritePhaseDispatcher([...duplicates,parseRewriteV2('response if ${response.header["X-Dup"]} == "first" then response.header.set("X-Read","yes")')],{target:'surge'}),/source lookup\/template semantics are not verified/);
  assert.deepEqual(run(duplicatePlan.script,{response:{headers:[{field:'X-Dup',value:'first'}]}}),{headers:[{field:'X-Dup',value:'firSt'},{field:'X-Dup',value:'Second'}]});
  // Typed plugin arguments are transported once, then read by both entries.
  const dynamicDuplicate=renderRewritePhaseDispatcher([parseRewriteV2('response if ${url} ~= /\\/(X-Dup)/i as name then response.header.add(${name.1},"third")')],{target:'surge'});
  assert.equal(dynamicDuplicate.fullHeaderMode,true);
  assert.deepEqual(run(dynamicDuplicate.script,{request:{url:'https://example.test/X-Dup'},response:{headers:[{field:'X-Dup',value:'first'}]}}),{headers:[{field:'X-Dup',value:'first'},{field:'X-Dup',value:'third'}]});
  const args={byId:new Map([['token',{id:'token'}],['count',{id:'count'}]])};
  const argumentEntries=[parseRewriteV2('request if ${url} ~= /example/i then request.header.set("X-Token","${token}")'),parseRewriteV2('request if ${request.header["X-Token"]} == "${token}" then request.json.add("count",${count})')];
  assert.deepEqual(run(renderRewritePhaseDispatcher(argumentEntries,{target:'surge',argumentTable:args}).script,{request:{body:'{}'},argument:'{"token":"a,b=汉字","count":3}'}),{headers:{'X-Token':'a,b=汉字'},body:'{"count":3}'});
  const addressArgs={byId:new Map(['name','path','replacement'].map(id=>[id,{id}]))};
  const addressEntries=[parseRewriteV2('request if ${url} ~= /example/i then request.header.set(${name},${replacement})'),parseRewriteV2('request if ${url} ~= /example/i then request.json.add(${path},true)')];
  assert.deepEqual(run(renderRewritePhaseDispatcher(addressEntries,{target:'surge',argumentTable:addressArgs}).script,{request:{body:'{}'},argument:JSON.stringify({name:'X-Dynamic',path:'data[0].flag',replacement:'${literal}:汉字'})}),{headers:{'X-Dynamic':'${literal}:汉字'},body:'{"data":[{"flag":true}]}'});
  assert.deepEqual(run(renderRewritePhaseDispatcher(addressEntries,{target:'surge',argumentTable:addressArgs}).script,{request:{body:'{}'},argument:JSON.stringify({name:3,path:false,replacement:'value'})}),{headers:{},body:'{}'});
  const orderedAddresses=[parseRewriteV2('request if ${url} ~= /example/i then request.header.set("Path","data.flag")'),parseRewriteV2('request if ${url} ~= /example/i then request.json.add(${request.header["Path"]},true)')];
  for(const target of ['qx','surge'])assert.deepEqual(run(renderRewritePhaseDispatcher(orderedAddresses,{target}).script,{request:{body:'{}'}}),{headers:{Path:'data.flag'},body:'{"data":{"flag":true}}'});
  assert.throws(()=>renderRewritePhaseDispatcher([parseRewriteV2('request if ${url} ~= /x/ as token then request.header.set("X","${token.0}")')],{target:'surge',argumentTable:args}),/duplicates plugin argument/);
  assert.throws(()=>renderRewritePhaseDispatcher([parseRewriteV2('request if ${url} ~= /x/ then request.header.set("X","${response.status}")')],{target:'qx'}),/cannot reference response/);
  // Introducing a helper must not shadow an original HTTP Script. Keep the
  // historical native flag path when its phase cannot be wholly composed.
  const entry={id:'CompatibilityOwner',source:'https://example.test/plugin.lpx',category:'Test'};
  const source='[Rewrite]\nresponse if ${url} ~= /api/i then response.json.add("flag",true)\n[Script]\nhttp-response ^https://example.test/api script-path=https://example.test/original.js, requires-body=true';
  const owner=convertPlugin(entry,source,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  assert.match(owner.qx,/api url jsonjq-response-body/);
  assert.match(owner.qx,/script-response-body https:\/\/example.test\/original.js/);
  assert.match(owner.surge,/http-response-jq api /);
  assert.match(owner.surge,/script-path=https:\/\/example.test\/original.js/);
  assert.equal(owner.generatedScripts.size,0);
  // Templates are argument references too; QX cannot invent their transport.
  const parameterSource='[Argument]\napp=select,"tg","sg",tag=Client\n[Rewrite]\nrequest if ${url} ~= /example/ then redirect(307,"${app}://open")';
  const parameter=convertPlugin(entry,parameterSource,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  assert.match(parameter.qx,/Known Quantumult X target limitation.*plugin \[Argument\].*app/);
  assert.doesNotMatch(parameter.qx,/^[^#\n]*script-echo-response/m);
  assert.doesNotMatch(parameter.surge,/REVIEW REQUIRED/);
  // Entire request phase, including a native Header between two text files.
  const mockEntry={id:'RequestMockPhase',source:'https://example.test/plugin/main.lpx',category:'Test'};
  const mockLines=[
    'request if ${url} ~= /example/i then request.body.mock_file("text","first.txt") | request.header.set("X-Step","one")',
    'request if ${request.header["X-Step"]} == "one" then request.header.set("X-Native","yes")',
    'request if ${request.header["X-Native"]} == "yes" then request.body.mock_file("text","second.txt") | request.body.replace(/old/i,"new") | request.header.set("X-Step","two")',
  ];
  const {materializeConversionContext}=await import('../src/conversion.mjs');
  const fetched=[];
  const mockSource='[Rewrite]\n'+mockLines.join('\n');
  const mockContext=await materializeConversionContext(mockEntry,mockSource,{fetchText:async url=>{fetched.push(url);if(url.endsWith('/first.txt'))return 'first';if(url.endsWith('/second.txt'))return 'old ${literal} 汉字\n';throw Error('unexpected source dependency: '+url);}});
  assert.deepEqual(fetched.sort(),['https://example.test/plugin/first.txt','https://example.test/plugin/second.txt']);
  const mockOutput=convertPlugin(mockEntry,mockSource,{...mockContext,stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  validateConvertedPlugin(mockEntry,mockOutput);
  for(const target of ['qx','surge']) {
    const phaseScripts=[...mockOutput.generatedScripts].filter(([name])=>name.startsWith('phase_'+target+'_request_'));
    assert.equal(phaseScripts.length,1);
    assert.doesNotMatch(target==='qx'?mockOutput.qx:mockOutput.surge,/REVIEW REQUIRED/);
    assert.deepEqual(run(phaseScripts[0][1],{request:{body:'original'}}),{headers:{'Content-Type':'text/plain; charset=utf-8','X-Step':'two','X-Native':'yes'},body:'new ${literal} 汉字\n'});
    assert.deepEqual(run(phaseScripts[0][1],{request:{url:'https://none.test/',body:'original'}}),{});
    for(const url of fetched)assert.ok(phaseScripts[0][1].includes('// Source mock file: '+url));
  }
  assert.doesNotMatch([...mockOutput.generatedScripts.keys()].join('\n'),/^(?:mock_|request_mixed_|request_mock_)/m);
  assert.equal(mockOutput.generatedScripts.size,2);
  assert.doesNotMatch(mockOutput.qx,/script-echo-response/);
  assert.doesNotMatch([...mockOutput.generatedScripts.values()].join('\n'),/\$done\(\{response:/);
  const mockArgs={byId:new Map([['body',{id:'body'}]])};
  const argumentMock=renderRewritePhaseDispatcher([parseRewriteV2('request if ${url} ~= /example/i then request.body.mock("text",${body}) | request.header.set("X-Later","yes")')],{target:'surge',argumentTable:mockArgs});
  assert.deepEqual(run(argumentMock.script,{argument:'{"body":"${literal}:汉字"}'}),{headers:{'Content-Type':'text/plain; charset=utf-8','X-Later':'yes'},body:'${literal}:汉字'});
  assert.deepEqual(run(argumentMock.script,{request:{body:'old'},argument:'{"body":3}'}),{headers:{'X-Later':'yes'},body:'old'});
  const requestDuplicate=renderRewritePhaseDispatcher([parseRewriteV2('request if ${url} ~= /example/i then request.header.add("X-Dup","second") | request.body.mock("text","new")')],{target:'surge'});
  assert.equal(requestDuplicate.fullHeaderMode,true);
  assert.deepEqual(run(requestDuplicate.script,{request:{headers:[{field:'X-Dup',value:'first'},{field:'content-type',value:'old'}],body:'old'}}),{headers:[{field:'X-Dup',value:'first'},{field:'content-type',value:'text/plain; charset=utf-8'},{field:'X-Dup',value:'second'}],body:'new'});
  for(const target of ['qx','surge']) {
    const badFile=convertPlugin(mockEntry,'[Rewrite]\nrequest if ${url} ~= /example/i then request.body.mock_file("text","missing.txt")',{mockFiles:new Map(),stamp:'2026-10-04'});
    assert.match(target==='qx'?badFile.qx:badFile.surge,/REVIEW REQUIRED/);
    assert.equal([...badFile.generatedScripts].filter(([name])=>name.startsWith('features_'+target+'_')).length,0);
    const binaryPipeline=convertPlugin(mockEntry,'[Rewrite]\nrequest if ${url} ~= /example/i then request.body.mock("png","AA==",true) | request.header.set("X","yes")',{stamp:'2026-10-04'});
    assert.match(target==='qx'?binaryPipeline.qx:binaryPipeline.surge,/REVIEW REQUIRED/);
  }
  const parameterMockSource='[Argument]\nbody=input,"default",tag=Body\n[Rewrite]\nrequest if ${url} ~= /example/i then request.body.mock("text",${body})';
  const parameterMockOutput=convertPlugin(mockEntry,parameterMockSource,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  assert.match(parameterMockOutput.qx,/REVIEW REQUIRED/);
  assert.doesNotMatch(parameterMockOutput.surge,/REVIEW REQUIRED/);
  const parameterMockScripts=[...parameterMockOutput.generatedScripts].filter(([name])=>name.startsWith('features_surge_'));
  assert.equal(parameterMockScripts.length,1);
  assert.match(parameterMockOutput.surge,/argument=/);
  assert.deepEqual(run(parameterMockScripts[0][1],{argument:'{"body":"a,b=汉字:${literal}"}'}),{headers:{'Content-Type':'text/plain; charset=utf-8'},body:'a,b=汉字:${literal}'});
  const authorMockSource='[Rewrite]\nrequest if ${url} ~= /example/i then request.body.mock("text","new")\n[Script]\nhttp-request ^https://example.test/ script-path=https://example.test/original.js, requires-body=true';
  const authorMockOutput=convertPlugin(mockEntry,authorMockSource,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  for(const target of ['qx','surge']) {
    const text=target==='qx'?authorMockOutput.qx:authorMockOutput.surge;
    assert.match(text,/COMPATIBILITY LIMITATION/);
    assert.ok(text.includes('https://example.test/original.js'));
    assert.doesNotMatch([...authorMockOutput.generatedScripts.keys()].join('\n'),/phase_/);
  }
  // Multiple files in one declaration use absolute action indexes, while
  // repeated relative URLs resolve to one fetch and immutable body snapshots.
  const multiLine='request if ${url} ~= /example/i then request.header.set("X-Before","yes") | request.body.mock_file("json","same.json") | request.json.add("discard",true) | request.body.mock_file("json","./same.json") | request.json.add("keep",true)';
  const laterLine='request if ${request.header["X-Before"]} == "yes" then request.json.add("later",true)';
  const multiSource='[Rewrite]\n'+multiLine+'\n'+laterLine;
  const multiFetch=[];
  const multiContext=await materializeConversionContext(mockEntry,multiSource,{fetchText:async url=>{multiFetch.push(url);return '{"original":1}';}});
  assert.deepEqual(multiFetch,['https://example.test/plugin/same.json']);
  assert.deepEqual(multiContext.mockFiles.get(multiLine),{byAction:{1:{bodyText:'{"original":1}',sourceFile:multiFetch[0]},3:{bodyText:'{"original":1}',sourceFile:multiFetch[0]}}});
  const multiOutput=convertPlugin(mockEntry,multiSource,{...multiContext,stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  validateConvertedPlugin(mockEntry,multiOutput);
  for(const target of ['qx','surge']) {
    const scripts=[...multiOutput.generatedScripts].filter(([name])=>name.startsWith('phase_'+target+'_request_'));
    assert.equal(scripts.length,1);assert.doesNotMatch(target==='qx'?multiOutput.qx:multiOutput.surge,/REVIEW REQUIRED/);
    assert.deepEqual(run(scripts[0][1]),{headers:{'X-Before':'yes','Content-Type':'application/json'},body:'{"original":1,"keep":true,"later":true}'});
    assert.deepEqual(run(scripts[0][1],{request:{url:'https://none.test/',body:'old'}}),{});
  }
  const {materializeMockFiles,parseLoonPlugin}=await import('../src/input.mjs');
  const escapedPathLine='request if ${url} ~= /example/i then request.body.mock_file("text",`file${literal}.txt`) | request.body.mock_file("text","file\\${literal}.txt")';
  const literalFetch=[];
  const literalFiles=await materializeMockFiles(mockEntry,parseLoonPlugin('[Rewrite]\n'+escapedPathLine),{fetchText:async url=>{literalFetch.push(url);return 'literal';}});
  assert.deepEqual(literalFetch,['https://example.test/plugin/file$%7Bliteral%7D.txt']);
  assert.equal(literalFiles.get(escapedPathLine).byAction[1].bodyText,'literal');
  for(const target of ['qx','surge']) {
    const converted=convertPlugin(mockEntry,'[Rewrite]\n'+escapedPathLine,{mockFiles:literalFiles,stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
    assert.doesNotMatch(target==='qx'?converted.qx:converted.surge,/REVIEW REQUIRED/);
    const script=[...converted.generatedScripts].find(([name])=>name.startsWith('features_'+target+'_'))[1];
    assert.deepEqual(run(script),{headers:{'Content-Type':'text/plain; charset=utf-8'},body:'literal'});
  }
  const failLine='request if ${url} ~= /example/i then request.body.mock_file("text","missing.txt") | request.header.set("X-Mid","yes") | request.body.mock_file("text","./missing.txt") | request.body.mock_file("text","last.txt")';
  const failureFetch=[];
  const failedFiles=await materializeMockFiles(mockEntry,parseLoonPlugin('[Rewrite]\n'+failLine),{fetchText:async url=>{failureFetch.push(url);if(url.endsWith('/missing.txt'))throw Error('source unavailable');return 'last';}});
  assert.deepEqual(failureFetch,['https://example.test/plugin/missing.txt','https://example.test/plugin/last.txt']);
  const failed=failedFiles.get(failLine);
  assert.match(failed.error,/action 0: source unavailable; action 2: source unavailable/);
  assert.equal(failed.byAction[3].bodyText,'last');
  assert.equal(failed.byAction[0].sourceFile,'https://example.test/plugin/missing.txt');
  assert.equal(failed.byAction[2].sourceFile,'https://example.test/plugin/missing.txt');
  for(const target of ['qx','surge']) {
    const output=convertPlugin(mockEntry,'[Rewrite]\n'+failLine,{mockFiles:failedFiles,stamp:'2026-10-04'});
    assert.match(target==='qx'?output.qx:output.surge,/REVIEW REQUIRED/);
    assert.equal([...output.generatedScripts].filter(([name])=>name.includes(target)).length,0);
    // A legacy object cannot accidentally provide both file bodies.
    const oldData=convertPlugin(mockEntry,'[Rewrite]\n'+multiLine,{mockFiles:new Map([[multiLine,{bodyText:'{}'}]]),stamp:'2026-10-04'});
    assert.match(target==='qx'?oldData.qx:oldData.surge,/REVIEW REQUIRED/);
  }
  const dynamicLine='request if ${url} ~= /example/i then request.body.mock_file("text","${request.method}.txt")';
  const dynamicFiles=await materializeMockFiles(mockEntry,parseLoonPlugin('[Rewrite]\n'+dynamicLine),{fetchText:async()=>{throw Error('dynamic file must not be fetched');}});
  assert.match(dynamicFiles.get(dynamicLine).error,/dynamic file dependency paths are not materialized/);
  const {dependencySpecFromAction}=await import('../src/rewrite.mjs');
  assert.throws(()=>dependencySpecFromAction(parseRewriteV2('response if ${url} ~= /x/ then response.json.jq_file("${request.method}.jq")').actions[0],{pluginSourceUrl:mockEntry.source}),/dynamic file dependency/);
  let unsupportedFetches=0;
  for(const line of ['response if ${url} ~= /example/ then response.body.mock_file("text","one",200) | response.body.mock_file("text","two",200)','request if ${url} ~= /example/ then request.body.mock_file("png","one",true) | request.body.mock_file("png","two",true)']) {
    const files=await materializeMockFiles(mockEntry,parseLoonPlugin('[Rewrite]\n'+line),{fetchText:async()=>{unsupportedFetches++;return '';},fetchBytes:async()=>{unsupportedFetches++;return new Uint8Array();}});
    assert.equal(files.size,0);
  }
  assert.equal(unsupportedFetches,0);
  console.log('Loon feature collection passed: '+checked+' independent expected-output cases, plus phase/body/duplicate/argument contracts');
}

if(selectedCase==='generated-helper-runtime.mjs') {
  const {fixedJqOperations,supportsRewritePhaseActions}=await import('../src/rewrite.mjs');
  const {renderRewritePhaseDispatcher}=await import('../src/runtime.mjs');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const filters=['.','.a = false','.a = null','del(.ads)','.a = {"x":"a|b=汉字","v":[false,null,2]} | del(.ads)','.["__proto__"] = {"safe":true} | .["constructor"] = 2','.["a.b"] = "${literal}" | del(.["odd|key"])','.a = 1 | .b = 2','.["x"] = {"__proto__":{"safe":true},"constructor":false}'];
  const inputs=['{"ads":1,"a":false,"odd|key":2}','null','[1,2]','false','3','"text"','broken'];
  let cases=0;
  function execute(script,phase,body) {
    let result,calls=0;
    const context={$request:{url:'HTTPS://example.test/API',headers:{},body},$response:{status:200,statusCode:200,headers:{},body},$done:r=>{result=r;calls++}};
    vm.runInNewContext(script,context,{timeout:1000});assert.equal(calls,1);
    return JSON.parse(JSON.stringify(result));
  }
  for(const phase of ['request','response'])for(const filter of filters)for(const input of inputs) {
    // Raw Loon string keeps ${literal} literal; quotes/backticks remain data.
    const source=phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`'+filter+'`) | '+phase+'.header.set("X-After","yes")';
    const ast=parseRewriteV2(source);assert.ok(fixedJqOperations(ast.actions[0]));
    const reference=runIsolatedCase('jq',['-c',filter],{input,encoding:'utf8'});
    if(reference.error)throw reference.error;
    const expected=reference.status===0 ? reference.stdout.trim() : input;
    for(const target of ['qx','surge']) {
      const result=execute(renderRewritePhaseDispatcher([ast],{target}).script,phase,input);
      assert.deepEqual(result.headers,{'X-After':'yes'});
      if(reference.status===0)assert.deepEqual(JSON.parse(result.body),JSON.parse(expected));
      else assert.equal(result.body,expected);
      cases++;
    }
  }
  for(const filter of ['.a[0].b = 1','.a |= 2','.[]','select(.a)','del(.a,.b)','.a = 9007199254740993','.a = 1 | error("x")','.a = 1 # comment','.[0] = 1','.a = 1 || .b = 2']) {
    const ast=parseRewriteV2('response if ${url} ~= /api/ then response.json.jq(`'+filter+'`)');
    assert.equal(fixedJqOperations(ast.actions[0]),null,filter);
    assert.equal(supportsRewritePhaseActions(ast,'qx'),false,filter);
  }
  assert.equal(fixedJqOperations(parseRewriteV2('response if ${url} ~= /api/ then response.json.jq(".a = ${request.method}")').actions[0]),null);
  const entry={id:'FixedJqPhase',source:'https://example.test/plugin.lpx',category:'Test'};
  for(const phase of ['request','response']) {
    const lines=[phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`.a = false | del(.ads)`) | '+phase+'.header.set("X-Start","yes")',phase+' if ${url} ~= /api/i then '+phase+'.json.replace("a",true) | '+phase+'.body.replace(/false/,"true")',phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`.b = 2`) | '+phase+'.header.set("X-End","yes")'];
    const output=convertPlugin(entry,'[Rewrite]\n'+lines.join('\n'),{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});validateConvertedPlugin(entry,output);
    assert.equal(output.generatedScripts.size,2);assert.doesNotMatch(output.qx+output.surge,/REVIEW REQUIRED|COMPATIBILITY LIMITATION/);
    for(const target of ['qx','surge']) {
      const script=[...output.generatedScripts].find(([name])=>name.startsWith('phase_'+target))[1];
      assert.deepEqual(execute(script,phase,'{"ads":1}'),{headers:{'X-Start':'yes','X-End':'yes'},body:'{"a":true,"b":2}'});
      let miss,calls=0;vm.runInNewContext(script,{$request:{url:'https://none.test/',headers:{}},$response:{headers:{}},$done:r=>{miss=r;calls++}});assert.equal(calls,1);assert.equal(Object.keys(miss).length,0);
    }
  }
  const rollback=parseRewriteV2('request if ${url} ~= /api/i then request.body.mock("json","[]") | request.json.jq(`.a = 1`) | request.body.replace(/\\[\\]/,"{}") | request.json.jq(`.b = 2`)');
  for(const target of ['qx','surge'])assert.equal(execute(renderRewritePhaseDispatcher([rollback],{target}).script,'request','old').body,'{"b":2}');
  const guarded=parseRewriteV2('response if ${response.status} == 200 && ${request.header["X-Run"]} == "yes" then response.json.jq(`.["汉字"] = "a|b"`)');
  const guardedOutput=convertPlugin(entry,'[Rewrite]\n'+guarded.raw,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
  assert.equal(guardedOutput.generatedScripts.size,0);
  assert.match(guardedOutput.qx+guardedOutput.surge,/REVIEW REQUIRED/);
  const protectedSource='[Rewrite]\nresponse if ${url} ~= /api/i then response.json.jq(`.a = 1`)\n[Script]\nhttp-response ^https://example.test/api script-path=https://example.test/original.js,requires-body=true';
  const protectedOut=convertPlugin(entry,protectedSource,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});assert.equal(protectedOut.generatedScripts.size,0);assert.match(protectedOut.qx,/jsonjq-response-body/);assert.match(protectedOut.surge,/http-response-jq/);
  console.log('Fixed JQ subset passed: '+cases+' target outputs against independent jq, plus dispatcher/failure/compatibility contracts');
}

if(selectedCase==='generated-helper-runtime.mjs') {
  const {materializeJqFiles,parseLoonPlugin}=await import('../src/input.mjs');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const entry={id:'JqFileActions',source:'https://example.test/plugin/main.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  function execute(script,phase,body) {
    let result,calls=0;vm.runInNewContext(script,{$request:{url:'HTTPS://example.test/API',body,headers:{}},$response:{status:200,statusCode:200,body,headers:{}},$done:r=>{result=r;calls++}},{timeout:1000});assert.equal(calls,1);return JSON.parse(JSON.stringify(result));
  }
  let cases=0;
  for(const phase of ['request','response']) {
    const line=phase+' if ${url} ~= /api/i then '+phase+'.header.set("X-Before","yes") | '+phase+'.json.jq_file("one.jq") | '+phase+'.json.replace("count",2) | '+phase+'.json.jq_file("./one.jq") | '+phase+'.json.jq_file("two.jq")';
    const after=phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`.end = true`) | '+phase+'.header.set("X-Before","yes")';
    const source='[Rewrite]\n'+line+'\n'+after;const calls=[];
    const files=await materializeJqFiles(entry,parseLoonPlugin(source),{fetchText:async url=>{calls.push(url);return url.endsWith('one.jq')?'.count = 1 # comment\n':'.literal = "${request.method}" | .["__proto__"] = {"safe":true}';}});
    assert.deepEqual(calls,['https://example.test/plugin/one.jq','https://example.test/plugin/two.jq']);assert.deepEqual(Object.keys(files.get(line).byAction),['1','3','4']);
    const output=convertPlugin(entry,source,{...options,jqFiles:files});validateConvertedPlugin(entry,output);assert.equal(output.generatedScripts.size,2);assert.doesNotMatch(output.qx+output.surge,/REVIEW REQUIRED|COMPATIBILITY LIMITATION/);
    for(const target of ['qx','surge']) {
      const script=[...output.generatedScripts].find(([name])=>name.startsWith('phase_'+target))[1];assert.match(script,/Source JQ file: https:\/\/example.test\/plugin\/one.jq/);assert.match(script,/Source JQ file: https:\/\/example.test\/plugin\/two.jq/);
      const result=execute(script,phase,'{}');assert.deepEqual(JSON.parse(result.body),JSON.parse('{"count":1,"literal":"${request.method}","__proto__":{"safe":true},"end":true}'));assert.deepEqual(result.headers,{'X-Before':'yes'});cases++;
    }
    // Only one dependency in a mixed declaration still needs an indexed map.
    const one=phase+' if ${url} ~= /api/i then '+phase+'.json.jq_file("one.jq") | '+phase+'.header.set("X-After","yes")';
    const indexed=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+one),{fetchText:async()=>'.flag = true'});assert.deepEqual(Object.keys(indexed.get(one).byAction),['0']);
    const valid=convertPlugin(entry,'[Rewrite]\n'+one,{...options,jqFiles:indexed});assert.equal(valid.generatedScripts.size,2);
    const stale=convertPlugin(entry,'[Rewrite]\n'+one,{...options,jqFiles:new Map([[one,{content:'.flag = true'}]])});assert.match(stale.qx+stale.surge,/REVIEW REQUIRED/);assert.equal(stale.generatedScripts.size,0);
    const missing=convertPlugin(entry,'[Rewrite]\n'+one,{...options,jqFiles:new Map([[one,{byAction:{1:{content:'.flag = true'}}}]])});assert.equal(missing.generatedScripts.size,0);assert.match(missing.qx+missing.surge,/JQ dependency action 0/);
    const single=phase+' if ${url} ~= /api/ then '+phase+'.json.jq_file("single.jq")';
    const nativeFiles=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+single),{fetchText:async()=>'.data | map(select(.active))'});assert.equal(nativeFiles.get(single).content,'.data|map(select(.active))');assert.equal(nativeFiles.get(single).byAction,undefined);
    const native=convertPlugin(entry,'[Rewrite]\n'+single,{...options,jqFiles:nativeFiles});assert.equal(native.generatedScripts.size,0);assert.match(native.qx,/jsonjq-/);assert.match(native.surge,/http-.*-jq/);validateConvertedPlugin(entry,native);
    const failure=phase+' if ${url} ~= /api/ then '+phase+'.json.jq_file("bad.jq") | '+phase+'.header.set("X","yes") | '+phase+'.json.jq_file("./bad.jq") | '+phase+'.json.jq_file("ok.jq")';
    const fetches=[];const failed=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+failure),{fetchText:async url=>{fetches.push(url);if(url.endsWith('/bad.jq'))throw Error('unavailable');return '.';}});assert.equal(fetches.length,2);assert.match(failed.get(failure).error,/action 0: unavailable.*action 2: unavailable/);assert.equal(failed.get(failure).byAction[3].content,'.');
    const review=convertPlugin(entry,'[Rewrite]\n'+failure,{...options,jqFiles:failed});assert.equal(review.generatedScripts.size,0);assert.match(review.qx+review.surge,/REVIEW REQUIRED/);
    const arbitrary=phase+' if ${url} ~= /api/i then '+phase+'.json.jq_file("complex.jq") | '+phase+'.header.set("X","yes")';
    const arbitraryFiles=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+arbitrary),{fetchText:async()=>'.data | map(select(.active))'});
    const arbitraryOut=convertPlugin(entry,'[Rewrite]\n'+arbitrary,{...options,jqFiles:arbitraryFiles});assert.equal(arbitraryOut.generatedScripts.size,0);assert.match(arbitraryOut.qx+arbitraryOut.surge,/REVIEW REQUIRED/);
    const dynamic=phase+' if ${url} ~= /api/ then '+phase+'.json.jq_file("${request.method}.jq") | '+phase+'.json.jq_file("ok.jq")';let fetchCount=0;
    const dynamicFiles=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+dynamic),{fetchText:async()=>{fetchCount++;return '.';}});assert.equal(fetchCount,1);assert.match(dynamicFiles.get(dynamic).error,/dynamic file dependency/);
    const empty=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+single),{fetchText:async()=> '# nothing\n'});assert.match(empty.get(single).error,/empty content/);
    const alias=phase+' if ${url} ~= /api/i then '+phase+'.json.jq("jq-path=one.jq") | '+phase+'.header.set("X","yes")';const aliasFiles=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+alias),{fetchText:async()=>'.flag = true'});assert.equal(aliasFiles.get(alias).byAction[0].legacyAlias,true);const aliasOut=convertPlugin(entry,'[Rewrite]\n'+alias,{...options,jqFiles:aliasFiles});assert.equal(aliasOut.generatedScripts.size,2);
  }
  const mock='request if ${url} ~= /api/i then request.body.mock("json","null") | request.json.jq_file("make.jq") | request.body.replace(/true/,"false")';const files=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+mock),{fetchText:async()=>'.flag = true'});const output=convertPlugin(entry,'[Rewrite]\n'+mock,{...options,jqFiles:files});for(const [name,script] of output.generatedScripts){assert.equal(execute(script,'request','old').body,'{"flag":false}');cases++;}
  const original='response if ${url} ~= /api/i then response.json.jq_file("one.jq")';const originalSource='[Rewrite]\n'+original+'\n[Script]\nhttp-response ^https://example.test/api script-path=https://example.test/original.js,requires-body=true';const protectedFiles=await materializeJqFiles(entry,parseLoonPlugin(originalSource),{fetchText:async()=>'.flag = true'});const protectedOut=convertPlugin(entry,originalSource,{...options,jqFiles:protectedFiles});assert.equal(protectedOut.generatedScripts.size,0);assert.match(protectedOut.qx,/jsonjq-response-body/);assert.match(protectedOut.surge,/http-response-jq/);
  console.log('JQ file dependency contracts passed: '+cases+' independent ordered target outputs, plus indexes/dedup/failure/literal/alias/native/author-script preservation');
}

if(selectedCase==='generated-helper-runtime.mjs') {
  const {fixedJqOperations}=await import('../src/rewrite.mjs');
  const {renderRewritePhaseDispatcher}=await import('../src/runtime.mjs');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {materializeJqFiles,parseLoonPlugin}=await import('../src/input.mjs');
  const filters=['.data.ads = []','.data.deep.flag = true','del(.data.ads)','del(.data.deep.flag)','.first = 1 | del(.data.deep.flag)','.["a.b"]["odd|key"].value = {"__proto__":{"ok":true}}','.data.ads = [] | del(.data.deep.flag) | .end = true','.first = 1 | .data.ads = []','.data.ads = [] | .data = 0 | .data.deep.x = 1','.data = {"deep":null} | .data.deep.flag = false','.["__proto__"]["constructor"].safe = true','.data["quote\\\"key"]["x\\\\y"] = 2','del(.["__proto__"]["constructor"].safe)','.data.ads = null | .data.ads.next = true'];
  const inputs=['{}','null','{"data":null}','{"data":false}','{"data":[]}','{"data":{"ads":[1],"deep":{"flag":true}}}','{"data":{"deep":null}}','{"data":{"deep":false}}','{"data":{"deep":[]}}','{"__proto__":{"constructor":{"safe":false}}}','[]','false','"text"','broken'];
  function execute(script,phase,body) {
    let output,calls=0;vm.runInNewContext(script,{$request:{url:'HTTPS://example.test/API',body,headers:{}},$response:{status:200,statusCode:200,body,headers:{}},$done:r=>{output=r;calls++}},{timeout:1000});assert.equal(calls,1);return JSON.parse(JSON.stringify(output));
  }
  let checked=0;
  for(const phase of ['request','response'])for(const filter of filters)for(const input of inputs) {
    const ast=parseRewriteV2(phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`'+filter+'`) | '+phase+'.header.set("X-After","yes")');assert.ok(fixedJqOperations(ast.actions[0]),filter);
    const reference=runIsolatedCase('jq',['-c',filter],{input,encoding:'utf8'});if(reference.error)throw reference.error;
    const expected=reference.status===0?reference.stdout.trim():input;
    for(const target of ['qx','surge']) {
      const output=execute(renderRewritePhaseDispatcher([ast],{target}).script,phase,input);assert.deepEqual(output.headers,{'X-After':'yes'});
      if(reference.status===0)assert.deepEqual(JSON.parse(output.body),JSON.parse(expected),filter+' '+input);else assert.equal(output.body,expected,filter+' '+input);
      checked++;
    }
  }
  for(const filter of ['.data[0].flag = true','.data[].flag = true','del(.data[0])','.data?.flag = true','.data["x", "y"] = 1','.data[$x] = 1','.data.a += 1','.data.a = .data.b','.data[0:2] = []'])assert.equal(fixedJqOperations(parseRewriteV2('response if ${url} ~= /api/ then response.json.jq(`'+filter+'`)').actions[0]),null,filter);
  const entry={id:'NestedJqPhase',source:'https://example.test/plugin/main.lpx',category:'Test'};const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  for(const phase of ['request','response']) {
    const lines=[phase+' if ${url} ~= /api/i then '+phase+'.json.jq_file("nested.jq") | '+phase+'.header.set("X-Ready","yes")',phase+' if ${url} ~= /api/i then '+phase+'.json.replace("data.deep.flag",false)',phase+' if ${url} ~= /api/i then '+phase+'.json.jq(`del(.data.deep.old)`) | '+phase+'.body.replace(/false/,"true")'];
    const source='[Rewrite]\n'+lines.join('\n');const files=await materializeJqFiles(entry,parseLoonPlugin(source),{fetchText:async()=>'.data.deep.flag = true | .data.deep.old = 1'});const output=convertPlugin(entry,source,{...options,jqFiles:files});validateConvertedPlugin(entry,output);assert.equal(output.generatedScripts.size,2);assert.doesNotMatch(output.qx+output.surge,/REVIEW REQUIRED|COMPATIBILITY LIMITATION/);
    for(const target of ['qx','surge'])assert.deepEqual(execute([...output.generatedScripts].find(([name])=>name.startsWith('phase_'+target))[1],phase,'null'),{headers:{'X-Ready':'yes'},body:'{"data":{"deep":{"flag":true}}}'});
  }
  const fail='request if ${url} ~= /api/i then request.body.mock("json","{}") | request.json.jq(`.saved = true`) | request.json.jq(`.data.ads = [] | .data = 0 | .data.deep.flag = true`) | request.header.set("X-After","yes") | request.json.jq(`.final.ok = true`)';
  const failed=convertPlugin(entry,'[Rewrite]\n'+fail,options);for(const [,script] of failed.generatedScripts)assert.deepEqual(JSON.parse(execute(script,'request','old').body),{saved:true,final:{ok:true}});
  console.log('Nested object JQ passed: '+checked+' target outputs against independent jq, plus inline/file phase order, action rollback and unsupported selector guards');
}

if(selectedCase==='generated-helper-runtime.mjs') {
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {materializeJqFiles,materializeMockFiles,parseLoonPlugin}=await import('../src/input.mjs');
  const entry={id:'NativePriority',source:'https://example.test/plugin/main.lpx',category:'Test'};const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  let checked=0;
  for(const phase of ['request','response'])for(const filter of ['.data.ads = []','del(.data.adList) | .data.launchAd.showType = 0','.data | map(select(.enabled))','.first = true']) {
    const source='[Rewrite]\n'+phase+' if ${url} ~= /^https:\\/\\/example\\.test\\/api$/i then '+phase+'.json.jq(`'+filter+'`)';const output=convertPlugin(entry,source,options);validateConvertedPlugin(entry,output);assert.equal(output.generatedScripts.size,0);assert.match(output.qx,/^\^https:.* url jsonjq-/m);assert.match(output.surge,/^http-.*-jq \^https:/m);assert.doesNotMatch(output.qx+output.surge,/script-.*body|pattern=\^,/);checked+=2;
  }
  const a='response if ${url} ~= /first/i then response.json.jq(`.data.ads = []`)';const b='response if ${url} ~= /second/i then response.json.jq(`.data = []`)';const separate=convertPlugin(entry,'[Rewrite]\n'+a+'\n'+b,options);assert.equal(separate.generatedScripts.size,0);assert.match(separate.qx,/^first url jsonjq-response-body/m);assert.match(separate.qx,/^second url jsonjq-response-body/m);
  // Keep an independently native JQ even when the phase contains a helper.
  const owner=convertPlugin(entry,'[Rewrite]\n'+a+'\nresponse if ${url} ~= /other/i then response.header.set("X","yes")',options);assert.match(owner.qx,/^first url jsonjq-response-body/m);assert.match(owner.surge,/^http-response-jq first /m);assert.doesNotMatch(owner.qx+owner.surge,/phase_.*\.js/);
  for(const phase of ['request','response']) {
    const line=phase+' if ${url} ~= /^https:\\/\\/example\\.test\\/api$/i then '+phase+'.json.jq_file("one.jq")';const files=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+line),{fetchText:async()=>'.data.ads = []'});const output=convertPlugin(entry,'[Rewrite]\n'+line,{...options,jqFiles:files});assert.equal(output.generatedScripts.size,0);assert.match(output.qx,/jsonjq-/);assert.match(output.surge,/http-.*-jq/);
    const mixed=phase+' if ${url} ~= /^https:\\/\\/example\\.test\\/api$/ then '+phase+'.json.jq(`del(.data.ads)`) | '+phase+'.header.set("X-Mixed","yes")';const combination=convertPlugin(entry,'[Rewrite]\n'+mixed,options);validateConvertedPlugin(entry,combination);assert.equal(combination.generatedScripts.size,2);assert.match(combination.qx,/^\^https:.* url script-/m);assert.match(combination.surge,/pattern=\^https:/);assert.doesNotMatch(combination.qx+combination.surge,/^\^ url script-/m);
    const filters=['.first = true','.data.flag = true','.last = 3'];const pipeline=phase+' if ${url} ~= /api/i then '+filters.map(f=>phase+'.json.jq(`'+f+'`)').join(' | ');const native=convertPlugin(entry,'[Rewrite]\n'+pipeline,options);validateConvertedPlugin(entry,native);assert.equal(native.generatedScripts.size,0);
    const program=native.qx.match(/jsonjq-[^ ]+ '(.*)'/)[1];
    for(const input of ['{}','null','{"data":false}','{"data":[]}','{"data":null}','{"data":{"flag":false}}','false']) {
      let body=input;for(const filter of filters){const result=runIsolatedCase('jq',['-c',filter],{input:body,encoding:'utf8'});if(result.error)throw result.error;if(result.status===0)body=result.stdout.trim();}
      const combined=runIsolatedCase('jq',['-c',program],{input,encoding:'utf8'});assert.equal(combined.status,0,combined.stderr);assert.deepEqual(JSON.parse(combined.stdout),JSON.parse(body));checked++;
    }
  }
  // Native Surge mock remains Map Local; QX inline response has no native
  // inline-body representation, so its required script fallback stays active.
  const mock='response if ${url} ~= /api/ then response.body.mock("text","OK",200,false)';const mockOutput=convertPlugin(entry,'[Rewrite]\n'+mock,options);validateConvertedPlugin(entry,mockOutput);assert.match(mockOutput.surge,/\[Map Local\]/);assert.doesNotMatch(mockOutput.surge,/script-path=/);assert.match(mockOutput.qx,/script-echo-response/);
  const file='response if ${url} ~= /api/ then response.body.mock_file("text","body.txt",200,false)';const mockFiles=await materializeMockFiles(entry,parseLoonPlugin('[Rewrite]\n'+file),{fetchText:async()=>'OK'});const fileOutput=convertPlugin(entry,'[Rewrite]\n'+file,{...options,mockFiles});validateConvertedPlugin(entry,fileOutput);assert.match(fileOutput.surge,/\[Map Local\]/);assert.doesNotMatch(fileOutput.surge,/script-path=/);assert.match(fileOutput.qx,/script-echo-response/);
  const add=convertPlugin(entry,'[Rewrite]\nresponse if ${url} ~= /api/ then response.json.jq(`del(.data.ads)`) | response.header.add("X","yes")',options);assert.match(add.surge,/pattern=api,script-path=/);assert.match(add.qx,/REVIEW REQUIRED/);
  console.log('Native priority passed: '+checked+' native mappings/JQ pipeline outputs, plus matcher retention, pure JQ phase ownership and native/mock fallback contracts');
}


// Reproducible composition checks use a small independent imperative model.
// The model neither imports production mutation functions nor evaluates the AST.
if (selectedCase==='generated-helper-runtime.mjs') {
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {evaluateRewriteActions}=await import('../src/core.mjs');
  const {parseJsonKeyPath}=await import('../src/rewrite.mjs');
  const run=(script,context)=>{
    let calls=0,result;
    vm.runInNewContext(script,{$request:structuredClone(context.request),$response:structuredClone(context.response),$done(value={}){calls++;result=value;}},{timeout:1000});
    assert.equal(calls,1,'seeded helper must finish exactly once');
    return JSON.parse(JSON.stringify(result));
  };
  const seed=0x57415958;
  let randomState=seed;
  const next=()=>{randomState^=randomState<<13;randomState^=randomState>>>17;randomState^=randomState<<5;return randomState>>>0;};
  const pick=values=>values[next()%values.length];
  const shuffle=values=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=next()%(i+1);[result[i],result[j]]=[result[j],result[i]];}return result;};
  const firstReplace=(text,regex,replacement)=>{const match=regex.exec(text);return match?text.slice(0,match.index)+replacement+text.slice(match.index+match[0].length):text;};
  const headerKey=(headers,name)=>Object.keys(headers).find(key=>key.toLowerCase()===name.toLowerCase());
  let checked=0,matchedCount=0,missCount=0;
  const operations=['set','replace','del','body','add','delete'];
  const seenOrders=new Set(),seenFlags=new Set();
  for(const phase of ['request','response']) for(let index=0;index<64;index++) {
    const flags=['','i','m','s','im','is','ms','ims'][index%8];
    const token=String(next()%10000),upper=(next()%2)===0;
    const url='https://example.test/'+(index%7===0?'other-':upper?'API-':'api-')+token;
    const marker=pick(['雪｜a,b=1','$&:$0', 'quote"slash\\line\n', '🙂[]{}']);
    const headers={[pick(['X-Flow','x-flow'])]:pick(['READY','ready','prefix READY READY']), 'X-Remove':'old','Keep':'yes'};
    const body=pick([JSON.stringify({text:'TOKEN token',meta:{drop:true}}),JSON.stringify({text:'token TOKEN',meta:null}),'invalid TOKEN TOKEN','null','42']);
    const order=shuffle(operations);seenOrders.add(order.join(','));seenFlags.add(flags);
    const actionText={
      set:phase+'.header.set("X-Flow",'+JSON.stringify('READY:${hit.1}:'+marker)+')',
      replace:phase+'.header.replace("x-flow",/ready/'+flags+','+JSON.stringify('done:$&')+')',
      del:phase+'.header.del("x-remove")',
      body:phase+'.body.replace(/token/'+flags+','+JSON.stringify('DONE-${hit.1}-$&')+')',
      add:phase+'.json.add("meta.mark",'+JSON.stringify(marker)+')',
      delete:phase+'.json.delete("meta.drop")',
    };
    const source=phase+' if ${url} ~= /api-(\\d+)/'+flags+' as hit then '+order.map(name=>actionText[name]).join(' | ');
    const ast=parseRewriteV2(source);
    const context={url,request:{url,method:'POST',headers:phase==='request'?headers:{},body:phase==='request'?body:''},response:{status:200,statusCode:200,headers:phase==='response'?headers:{},body:phase==='response'?body:''}};
    const expected={headers:structuredClone(headers),body};
    // This deliberately uses declarative case data, rather than action ASTs.
    const match=new RegExp('api-(\\d+)',flags).exec(url);
    if(match) {
      matchedCount++;
      for(const name of order) {
        const key=headerKey(expected.headers,'X-Flow');
        if(name==='set')expected.headers[key??'X-Flow']='READY:'+match[1]+':'+marker;
        if(name==='replace'&&key!==undefined)expected.headers[key]=firstReplace(expected.headers[key],new RegExp('ready',flags),'done:$&');
        if(name==='del'){const remove=headerKey(expected.headers,'X-Remove');if(remove!==undefined)delete expected.headers[remove];}
        if(name==='body')expected.body=firstReplace(expected.body,new RegExp('token',flags),'DONE-'+match[1]+'-$&');
        if(name==='add'||name==='delete') {
          let json;try{json=JSON.parse(expected.body);}catch{continue;}
          if(json===null||typeof json!=='object')continue;
          if(name==='add') {
            if(json.meta==null)json.meta={};
            if(typeof json.meta==='object'&&json.meta.mark==null)json.meta.mark=marker;
          } else if(json.meta!==null&&typeof json.meta==='object')delete json.meta.drop;
          expected.body=JSON.stringify(json);
        }
      }
    } else missCount++;
    const label='seed='+seed+' phase='+phase+' case='+index+' source='+source;
    const oracle=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath});
    assert.deepEqual(oracle.errors,[],label+' source evaluator must not silently skip errors');
    assert.deepEqual({headers:oracle.state[phase].headers,body:oracle.state[phase].body},expected,label+' source evaluator');
    const entry={id:'SeededCombinations',source:'https://example.test/source.lpx',category:'Test'};
    const output=convertPlugin(entry,'[Rewrite]\n'+source,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});
    validateConvertedPlugin(entry,output);
    for(const target of ['qx','surge']) {
      const config=output[target];
      assert.doesNotMatch(config,/REVIEW REQUIRED/,label+' '+target);
      const scripts=[...output.generatedScripts].filter(([name])=>name.includes('_'+target+'_'));
      assert.equal(scripts.length,1,label+' '+target+' helper count');
      const [name,script]=scripts[0];
      assert.ok(config.split('\n').some(line=>!line.startsWith('#')&&line.includes('/'+name)),label+' '+target+' active helper reference');
      const actual=run(script,context);
      if(match)assert.deepEqual(actual,expected,label+' '+target);
      else assert.deepEqual(actual,{},label+' '+target+' no-op');
      checked++;
    }
  }
  assert.equal(seenFlags.size,8);
  assert.ok(seenOrders.size>=80,'seed must exercise varied action ordering');
  assert.ok(matchedCount>0&&missCount>0,'seed must cover hits and misses');
  console.log('Seeded composition model passed: '+checked+' target outputs, '+seenOrders.size+' action orders, 8 flags; seed='+seed);
}

// Execute the native filter actually emitted into each target configuration.
// Expected results come from object-only operations, independent of AST lowering.
if(selectedCase==='generated-helper-runtime.mjs') {
  const {convertPlugin,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {evaluateRewriteActions}=await import('../src/core.mjs');
  const {parseJsonKeyPath}=await import('../src/rewrite.mjs');
  const cases=[
    [{op:'add',path:['data','flag'],value:true},{op:'replace',path:['data','count'],value:2},{op:'delete',path:['data','old']}],
    [{op:'delete',path:['data','missing','leaf']},{op:'add',path:['later'],value:'雪|quote"\\'},{op:'replace',path:['data','flag'],value:3}],
    [{op:'add',path:['__proto__','safe'],value:1},{op:'replace',path:['constructor','value'],value:4},{op:'delete',path:['toString','old']}],
    [{op:'add',path:['data','a.b'],value:'$&:$0'},{op:'add',path:['later'],value:false},{op:'delete',path:['data','old']},{op:'delete',path:['later']}],
  ];
  const inputs=[{},null,[],42,false,'scalar',{data:null},{data:4},{data:[]},{data:{flag:false,count:0,old:true}},{data:{flag:null,count:false,old:null}},{data:{flag:'',count:'',old:1},constructor:{value:0},toString:{old:2},__proto__:null}];
  const put=(parent,key,value)=>Object.defineProperty(parent,key,{value,enumerable:true,configurable:true,writable:true});
  const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const model=(input,ops)=>{
    const value=structuredClone(input);
    if(!object(value))return value;
    for(const item of ops) {
      let parent=value;
      for(const key of item.path.slice(0,-1)) {
        if(!object(parent)){parent=null;break;}
        if(!Object.hasOwn(parent,key)||parent[key]===null) {
          if(item.op!=='add'){parent=null;break;}
          put(parent,key,{});
        }
        parent=parent[key];
      }
      if(!object(parent))continue;
      const key=item.path.at(-1),current=Object.hasOwn(parent,key)?parent[key]:undefined;
      if(item.op==='delete')delete parent[key];
      else if(item.op==='add'?current==null:current!==undefined&&current!==null&&current!==false)put(parent,key,item.value);
    }
    return value;
  };
  const keyPath=parts=>parts.map(key=>'['+JSON.stringify(key)+']').join('');
  const entry={id:'NativeObjectJson',source:'https://example.test/source.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  let checked=0;
  for(const phase of ['request','response'])for(const [caseIndex,ops] of cases.entries()) {
    const actions=ops.map(item=>phase+'.json.'+item.op+'('+JSON.stringify(keyPath(item.path))+(item.op==='delete'?'':','+JSON.stringify(item.value))+')');
    // Pair the first two add operations to exercise per-group failure recovery.
    if(caseIndex===3)actions.splice(0,2,phase+'.json.add('+JSON.stringify(ops.slice(0,2).map(item=>keyPath(item.path)))+','+JSON.stringify(ops.slice(0,2).map(item=>item.value))+')');
    const source=phase+' if ${url} ~= /api/ then '+actions.join(' | ');
    const output=convertPlugin(entry,'[Rewrite]\n'+source,options);
    validateConvertedPlugin(entry,output);
    assert.equal(output.generatedScripts.size,0,'pure fixed object JSON must stay native');
    assert.match(output.surge,/#!requirement=CORE_VERSION>=20/,'native Surge JQ must retain its core requirement');
    for(const input of inputs) {
      const expected=model(input,ops);
      const context={url:'https://example.test/api',request:{url:'https://example.test/api',headers:{},body:JSON.stringify(input)},response:{headers:{},body:JSON.stringify(input),status:200}};
      const oracle=evaluateRewriteActions(parseRewriteV2(source),context,{parsePath:parseJsonKeyPath});
      assert.deepEqual(oracle.errors,[]);
      assert.deepEqual(JSON.parse(oracle.state[phase].body),expected,source+' independent model');
      for(const target of ['qx','surge']) {
        const pattern=target==='qx'?new RegExp('^api url jsonjq-'+phase+'-body \'(.+)\'$','m'):new RegExp('^http-'+phase+'-jq api \'(.+)\'$','m');
        const filter=output[target].match(pattern)?.[1];
        assert.ok(filter,source+' '+target+' actual native rule');
        const result=runIsolatedCase('jq',['-c',filter],{input:JSON.stringify(input),encoding:'utf8'});
        assert.equal(result.status,0,source+' '+target+' '+result.stderr);
        const lines=result.stdout.trim().split('\n');assert.equal(lines.length,1,'native mutation must produce one body');
        assert.deepEqual(JSON.parse(lines[0]),expected,source+' '+target+' input='+JSON.stringify(input));
        checked++;
      }
    }
    const mixed=convertPlugin(entry,'[Rewrite]\n'+source+'\n'+phase+' if ${url} ~= /other/ then '+phase+'.header.set("X","yes") | '+phase+'.body.replace(/old/,"new")',options);
    for(const target of ['qx','surge'])assert.match(mixed[target],target==='qx'?new RegExp('api url jsonjq-'+phase+'-body'):new RegExp('http-'+phase+'-jq api'),'native declaration must not be absorbed by helper');
    assert.doesNotMatch([...mixed.generatedScripts.keys()].join('\n'),/phase_/);
  }
  for(const source of [
    'response if ${url} ~= /api/ then response.json.add("data[0].x",1) | response.json.delete("old")',
    'response if ${url} ~= /api/ as hit then response.json.add("data.${hit.0}",1) | response.json.delete("old")',
    'response if ${url} ~= /api/ then response.json.replace("data.length",2) | response.json.delete("old")',
    'response if ${url} ~= /api/ then response.json.add(`data["0"]`,1) | response.json.delete("old")',
  ]) {
    const output=convertPlugin(entry,'[Rewrite]\n'+source,options);
    for(const target of ['qx','surge'])assert.doesNotMatch(output[target],target==='qx'?/api url jsonjq-response-body/:/http-response-jq api /);
    assert.ok(output.generatedScripts.size>0,'array/dynamic paths retain necessary helpers');
  }
  console.log('Native object JSON pipelines passed: '+checked+' actual emitted filters against independent model, plus batch recovery, phase ownership and dynamic/index guards');
}
