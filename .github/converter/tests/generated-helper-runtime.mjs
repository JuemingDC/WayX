// WayX generated helper runtime fixtures
// Author: chance
// Category: Converter / Runtime Validation

import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { renderMixedRewriteScript } from '../src/complex-rewrite-script.mjs';
import { renderQxInlineMockScript } from '../src/qx-semantic-script.mjs';

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
