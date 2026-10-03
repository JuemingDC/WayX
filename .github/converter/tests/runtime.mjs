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
  const {parseJsonKeyPath}=await import('../src/rule.mjs');
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
  let checked=0;
  for(const item of fixture.cases) {
    const mockFiles=Object.hasOwn(item,'mockText')?new Map([[item.source,{bodyText:item.mockText,sourceFile:'https://example.test/body.txt'}]]):new Map();
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
    const oracle=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath,mockFiles:Object.hasOwn(item,'mockText')?new Map([[item.source,{bodyText:item.mockText}]]):new Map()});
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
  console.log('Loon feature collection passed: '+checked+' independent expected-output cases, plus phase/body/duplicate/argument contracts');
}
