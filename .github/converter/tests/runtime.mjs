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
    vm.runInNewContext(script,{$request:structuredClone(context.request),$response:structuredClone(context.response),$done(value){calls++;out=value;}},{timeout:1000});
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
