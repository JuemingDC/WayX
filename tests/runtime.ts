import {replaceIcu} from '../src/validation/icu.ts';
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript tests layer; preserve source behavior.
// Updated: 2026-10-13
// Author: chance
// Category: Converter / Native and Helper Runtime / Regression Suite
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {parseRewriteV2,parseLoonPlugin,materializeConversionContext,materializeJqFiles,convertPlugin} from '../src/index.ts';
import {validateConvertedPlugin} from '../src/emit/conversion.ts';
import {renderSingleRewriteMutationScript,renderMixedRewriteScript,renderQxRedirectScript,renderQxInlineMockScript} from '../src/emit/runtime.ts';
import {evaluateRewriteActions} from '../src/domain/core.ts';
import {parseJsonKeyPath} from '../src/parser/rewrite.ts';
const entry={id:'RuntimePolicy',source:'https://example.test/plugins/source.lpx',category:'Test'};
const options={stamp:'2026-10-13',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
const normalize=value=>JSON.parse(JSON.stringify(value));
function run(script,context={}) {
  let calls=0,output;
  vm.runInNewContext(script,{$request:{url:'https://example.test/api',method:'GET',headers:{},...structuredClone(context.request)},$response:{status:200,statusCode:200,headers:{},body:'',...structuredClone(context.response)},$argument:context.argument || '',$done(value){calls++;output=value;}},{timeout:1000});
  assert.equal(calls,1,'every helper completes exactly once');
  return normalize(output);
}
let checked=0;
// Independent source evaluator checks helper condition captures, flags, replacement
// scope, current Header values, action order and target-specific JSON setting policy.
for(const target of ['qx','surge'])for(const flags of ['','i','m','s','im','is','ms','ims'])for(const body of ['a.b','A\nB','a\nb','prefix\na.b\nsuffix']) {
  const source='response if ${url} ~= /api-(\\d+)/i as item && ${response.header["X-Mode"]} ~= /^READY$/i then response.body.replace(/^a.b$/'+flags+', "$0:${item.1}") | response.header.replace("X-Mode", /ready/i, "$0-done") | response.json.add("meta.ok",true)';
  const ast=parseRewriteV2(source);
  const context={url:'https://example.test/API-42',request:{url:'https://example.test/API-42',headers:{},method:'GET'},response:{headers:{'x-mode':'READY'},body,status:200,statusCode:200}};
  const expected=evaluateRewriteActions(ast,context,{parsePath:parseJsonKeyPath,jsonAddSetsPath:true,jsonReplaceSetsPath:true}).state.response;
  const actual=run(renderMixedRewriteScript(ast,{target}).script,context);
  assert.equal(actual.body,expected.body);assert.deepEqual(actual.headers,expected.headers);checked++;
}
for(const target of ['qx','surge'])for(const phase of ['request','response'])for(const input of [{x:9},{x:null},{}, {'__proto__':{keep:1}}]) {
  const ast=parseRewriteV2(phase+' if ${url} ~= /api/ then '+phase+'.json.add("x",1) | '+phase+'.json.replace("nested.value",false) | '+phase+'.json.delete("old")');
  const result=run(renderMixedRewriteScript(ast,{target}).script,{[phase]:{body:JSON.stringify({...input,old:2})}});
  assert.deepEqual(JSON.parse(result.body),{...input,x:1,nested:{value:false}});checked++;
}
// Optional captures must no-op, while empty captures remain valid.
for(const conditionMode of ['simple-url','full']) {
  const capture=parseRewriteV2('request if ${url} ~= /(old)/i as item'+(conditionMode==='full'?' && ${request.method} == "GET"':'')+' then redirect(307,"new-${item.1}")');
  const plan=renderQxRedirectScript(capture,{conditionMode});
  assert.equal(run(plan.script,{request:{url:'https://example.test/OLD?keep=1'}}).headers.Location,'https://example.test/new-OLD?keep=1');
  if(conditionMode==='full')assert.deepEqual(run(plan.script,{request:{url:'https://example.test/old',method:'POST'}}),{});
  const optional=parseRewriteV2('request if ${url} ~= /old(-new)?/ as item then redirect(302,"${item.1}")');
  assert.deepEqual(run(renderQxRedirectScript(optional,{conditionMode}).script,{request:{url:'https://example.test/old'}}),{});checked++;
}
// Dynamic Regex has no inline syntax inside JS; RegExp flags retain semantics.
const dynamic=parseRewriteV2('request if ${url} ~= ${pattern} as item then request.header.set("X-ID","${item.1}")');
const dynamicPlan=renderSingleRewriteMutationScript(dynamic,{target:'surge',argumentTable:{byId:new Map([['pattern',{id:'pattern'}]])}});
for(const [pattern,expected] of [['/^item\\/(\\d+)$/ims',{headers:{'X-ID':'42'}}],['/[abc/i',{}]]) {
  assert.deepEqual(run(dynamicPlan.script,{request:{url:'ITEM/42'},argument:JSON.stringify({pattern})}),expected);checked++;
}
// Test actual jq output, with manually specified overwrite/create/delete results.
for(const target of ['qx','surge'])for(const phase of ['request','response'])for(const flags of ['','i','ims'])for(const [action,input,expected] of [
  ['add("data.x",1)',{data:{x:9,keep:2}},{data:{x:1,keep:2}}],
  ['add("data.x",false)',{data:{}},{data:{x:false}}],
  ['add("items[2]",9)',{items:[0]},{items:[0,null,9]}],
  ['replace("data.x",1)',{},{data:{x:1}}],
  ['delete("data.x")',{data:{x:1,keep:2}},{data:{keep:2}}],
  ['add(`["a.b"]`,"[]")',{}, {'a.b':'[]'}],
]) {
  const output=convertPlugin(entry,'[Rewrite]\n'+phase+' if ${url} ~= /api/'+flags+' then '+phase+'.json.'+action,options);
  validateConvertedPlugin(entry,output);
  assert.equal(output.generatedScripts.size,0);
  const line=output[target].split('\n').find(line=>line.includes(target==='qx'?'jsonjq-'+phase+'-body':'http-'+phase+'-jq'));
  const program=line.match(/'(.+)'$/)[1];const result=spawnSync('jq',['-c',program],{input:JSON.stringify(input),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),expected);checked++;
}
// Modified: 2026-10-30 (chance). Match the existing authorized flag policy:
// QX body keeps m/s; source i and Surge native flags are omitted.
for(const phase of ['request','response'])for(const flags of ['i','m','s','ims']) {
  const line=phase+' if ${url} ~= /api/i then '+phase+'.body.replace([/old/'+flags+',/disabled/],["new","enabled"])';
  const output=convertPlugin(entry,'[Rewrite]\n'+line,options);validateConvertedPlugin(entry,output);
  assert.equal(output.generatedScripts.size,0);
  for(const target of ['qx','surge']) {
    const active=output[target].split('\n').filter(line=>line && !line.startsWith('#'));
    assert.equal(active.filter(line=>line.includes(target==='qx'?phase+'-body':'http-'+phase+' ')).length,2);
    const nativeFlags=target==='qx'?flags.replace(/i/g,''):'';assert.ok(active.some(line=>line.includes((nativeFlags?'(?'+nativeFlags+')':'')+'old')));checked++;
  }
}
// QX whole-header replacements: actual generated regex and capture templates
// execute against CRLF blocks using the runner's native ICU engine.
for(const phase of ['request','response'])for(const [regex,replacement,input,expected] of [
  ['/old/i','new','HTTP/1.1 200 OK\r\nx-test: OLD old\r\nOther: OLD\r\n','HTTP/1.1 200 OK\r\nx-test: OLD new\r\nOther: OLD\r\n'],
  ['/old(\\d+)/i','$1','HTTP/1.1 200 OK\r\nX-Test: old42\r\nOther: old7\r\n','HTTP/1.1 200 OK\r\nX-Test: 42\r\nOther: old7\r\n'],
  ['/old/i','$0-new','HTTP/1.1 200 OK\r\nX-Test: OLD\r\n','HTTP/1.1 200 OK\r\nX-Test: OLD\r\n'],
]) {
  const output=convertPlugin(entry,'[Rewrite]\n'+phase+' if ${url} ~= /api/i then '+phase+'.header.replace("X-Test",'+regex+',"'+replacement+'")',options);
  validateConvertedPlugin(entry,output);assert.doesNotMatch(output.qx,/script-(?:request|response)-header/);
  const line=output.qx.split('\n').find(line=>line.includes(' url '+phase+'-header '));
  const [search,value]=line.split(' url '+phase+'-header ')[1].split(' '+phase+'-header ');
  assert.equal(replaceIcu(search,value,input),expected);checked++;
}
// Unsafe value boundaries and capture-dependent replacements keep helpers.
for(const regex of ['/^old$/i','/.*old/s','/old\\s+/i','/old(?=next)/i','/OLD[\\x00-\\xff]+OTHER/i','/old\\u000aother/i','/old\\cJother/i']) {
  const output=convertPlugin(entry,'[Rewrite]\nresponse if ${url} ~= /api/ then response.header.replace("X-Test",'+regex+',"new")',options);
  assert.match(output.qx,/script-response-header/);validateConvertedPlugin(entry,output);checked++;
}
// All families survive one declaration. Every external URL stays original.
for(const section of ['Rewrite','Script'])for(const phase of ['request','response']) {
  const line=phase+' if ${url} ~= /api/i then '+phase+'.header.set("X-Kept","yes") | '+phase+'.json.add("value",1) | script("https://example.test/original.js") with requires_body=true';
  const output=convertPlugin(entry,'#!name=RuntimePolicy\n# Retained comment\n['+section+']\n'+line,options);
  validateConvertedPlugin(entry,output);
  for(const target of ['qx','surge']) {
    assert.match(output[target],/Retained comment/);assert.match(output[target],/original\.js/);assert.match(output[target],/setpath\(\["value"\]; 1\)/);
    assert.doesNotMatch(output[target],/ISSUE REQUIRED|REVIEW REQUIRED/);
  }
  assert.match(output.surge,/header-add X-Kept yes/);checked++;
}
const filesLine='response if ${url} ~= /api/i then response.header.set("X-Kept","yes") | response.json.jq_file("ok.jq") | response.json.jq_file("missing.jq") | response.json.add("after",true)';
const files=await materializeJqFiles(entry,parseLoonPlugin('[Rewrite]\n'+filesLine),{fetchText:async url=>{if(url.endsWith('missing.jq'))throw Error('missing file');return '.before = true';}});
const filesOutput=convertPlugin(entry,'[Rewrite]\n'+filesLine,{...options,jqFiles:files});
for(const target of ['qx','surge']) {
  assert.match(filesOutput[target],/REVIEW REQUIRED.*missing file/);assert.match(filesOutput[target],/\.before/);assert.match(filesOutput[target],/setpath\(\["after"\]; true\)/);
}
assert.match(filesOutput.surge,/header-add X-Kept yes/);
// Script-containing pipelines discover every original Script and JQ dependency.
const sources=[];const mixed='[Rewrite]\nresponse if ${url} ~= /api/ then script("https://example.test/one.js") | response.json.jq_file("one.jq") | script("https://example.test/two.js")';
const context=await materializeConversionContext(entry,mixed,{fetchText:async url=>{sources.push(url);return url.endsWith('.jq')?'.ok = true':'$done({});';}});
assert.deepEqual(new Set(sources),new Set(['https://example.test/one.js','https://example.test/two.js','https://example.test/plugins/one.jq']));
const mixedOutput=convertPlugin(entry,mixed,{...options,...context});
for(const target of ['qx','surge']) {assert.match(mixedOutput[target],/one\.js/);assert.match(mixedOutput[target],/two\.js/);assert.match(mixedOutput[target],/\.ok/);}
console.log('Native/helper runtime passed: '+checked+' independent flag/capture/JSON/header/batch/chain checks, plus Script/JQ discovery and dependency failure isolation');

// Retain foundational helper checks for conditions, raw strings, duplicates and mocks.
{
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

// JSON add/replace set paths directly; delete removes directly.
{
  const ast = parseRewriteV2('response if ${url} ~= /json/ then response.json.add("meta.count", 1) | response.json.add("keep", 9) | response.json.add("nullable", 3) | response.json.replace("flag", true) | response.json.delete("remove")');
  const plan = renderMixedRewriteScript(ast, { target:'qx' });
  const result = normalize(runGenerated(plan.script, {
    request:{ url:'https://example.test/json' },
    response:{ body:'{"keep":5,"nullable":null,"flag":false,"remove":null}' },
  }));
  assert.deepEqual(JSON.parse(result.body), { keep:9, nullable:3, flag:true, meta:{count:1} });
}

// Replace helper follows the direct setpath policy for missing paths and value types.
{
  const ast=parseRewriteV2('response if ${url} ~= /json/ then response.json.replace("data.flag", true) | response.json.replace("data.text", "[]")');
  for(const target of ['qx','surge']) {
    const plan=renderMixedRewriteScript(ast,{target});
    const result=normalize(runGenerated(plan.script,{request:{url:'https://example.test/json'},response:{body:'{}'}}));
    assert.deepEqual(JSON.parse(result.body),{data:{flag:true,text:"[]"}});
  }
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


for(const phase of ['request','response'])for(const action of ['set("X-Test","new")','del("X-Test")'])for(const present of [false,true]) {
  const output=convertPlugin(entry,'[Rewrite]\n'+phase+' if ${url} ~= /api/i then '+phase+'.header.'+action,options);
  assert.equal(output.generatedScripts.size,0);validateConvertedPlugin(entry,output);
  const header='HTTP/1.1 200 OK\r\n'+(present?'X-Test: old\r\nx-test: duplicate\r\n':'')+'Other: keep\r\n';
  const operations=output.qx.split('\n').filter(line=>line.includes(' url '+phase+'-header ')).map(line=>line.split(' url '+phase+'-header ')[1].split(' '+phase+'-header '));
  let result=header;for(const [search,value]of operations)result=replaceIcu(search,value,result);
  assert.equal(result,'HTTP/1.1 200 OK\r\n'+(action.startsWith('set')?'X-Test: new\r\n':'')+'Other: keep\r\n');
}
console.log('Native Header set/del passed: 8 duplicate/case/missing-field checks');

const runIsolatedCase=spawnSync;
function executeSelectedJq(output,target,phase,body) {
 let result=body;
 const token=target==='qx'?'jsonjq-'+phase+'-body':'http-'+phase+'-jq';
 const lines=output[target].split('\n').filter(line=>!line.startsWith('#') && line.includes(token));
 assert.ok(lines.length);
 for(const line of lines) { const r=spawnSync('jq',['-c',line.match(/'(.+)'$/)[1]],{input:result,encoding:'utf8'});assert.equal(r.status,0,r.stderr);result=r.stdout.trim(); }
 return {body:result};
}

{
  const {fixedJqOperations}=await import('../src/parser/rewrite.ts');
  const {renderRewritePhaseDispatcher}=await import('../src/emit/runtime.ts');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const {materializeJqFiles,parseLoonPlugin}=await import('../src/parser/input.ts');
  const filters=['.data.ads = []','.data.deep.flag = true','del(.data.ads)','del(.data.deep.flag)','.first = 1 | del(.data.deep.flag)','.["a.b"]["odd|key"].value = {"__proto__":{"ok":true}}','.data.ads = [] | del(.data.deep.flag) | .end = true','.first = 1 | .data.ads = []','.data.ads = [] | .data = 0 | .data.deep.x = 1','.data = {"deep":null} | .data.deep.flag = false','.["__proto__"]["constructor"].safe = true','.data["quote\\\"key"]["x\\\\y"] = 2','del(.["__proto__"]["constructor"].safe)','.data.ads = null | .data.ads.next = true'];
  const inputs=['{}','null','{"data":null}','{"data":false}','{"data":[]}','{"data":{"ads":[1],"deep":{"flag":true}}}','{"data":{"deep":null}}','{"data":{"deep":false}}','{"data":{"deep":[]}}','{"__proto__":{"constructor":{"safe":false}}}','[]','false','"text"','broken'];
  function execute(script,phase,body) {
    let output,calls=0;vm.runInNewContext(script,{$request:{url:'HTTPS://example.test/api',body,headers:{}},$response:{status:200,statusCode:200,body,headers:{}},$done:r=>{output=r;calls++}},{timeout:1000});assert.equal(calls,1);return JSON.parse(JSON.stringify(output));
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
    const source='[Rewrite]\n'+lines.join('\n');const files=await materializeJqFiles(entry,parseLoonPlugin(source),{fetchText:async()=>'.data.deep.flag = true | .data.deep.old = 1'});const output=convertPlugin(entry,source,{...options,jqFiles:files});validateConvertedPlugin(entry,output);assert.equal(output.generatedScripts.size,0);assert.doesNotMatch(output.qx+output.surge,/REVIEW REQUIRED/);
    for(const target of ['qx','surge'])assert.deepEqual(executeSelectedJq(output,target,phase,'null'),{body:'{"data":{"deep":{"flag":false}}}'});
  }
  const fail='request if ${url} ~= /api/i then request.body.mock("json","{}") | request.json.jq(`.saved = true`) | request.json.jq(`.data.ads = [] | .data = 0 | .data.deep.flag = true`) | request.header.set("X-After","yes") | request.json.jq(`.final.ok = true`)';
  for(const target of ['qx','surge'])assert.deepEqual(JSON.parse(execute(renderRewritePhaseDispatcher([parseRewriteV2(fail)],{target}).script,'request','old').body),{saved:true,final:{ok:true}});
  console.log('Nested object JQ passed: '+checked+' target outputs against independent jq, plus inline/file phase order, action rollback and unsupported selector guards');
}


{
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const entry={id:'ReplacePresence',source:'https://example.test/source.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  const inputs=[{}, {key:null},{key:false},{key:0},{key:''},{key:[]},{key:{}},{key:true}];
  let checked=0;
  for(const phase of ['request','response'])for(const nested of [false,true])for(const syntax of ['v2','legacy']) {
    const path=nested?'data.key':'key';
    const line=syntax==='v2'?phase+' if ${url} ~= /api/ then '+phase+'.json.replace('+JSON.stringify(path)+',9)':'api '+phase+'-body-json-replace '+path+' 9';
    const output=convertPlugin(entry,'[Rewrite]\n'+line,options);validateConvertedPlugin(entry,output);
    assert.equal(output.generatedScripts.size,0,'direct setpath replace retains native capability');
    for(const input of inputs)for(const target of ['qx','surge']) {
      const body=nested?{data:structuredClone(input)}:structuredClone(input);
      const expected=structuredClone(body);(nested?expected.data:expected).key=9;
      const filter=output[target].split('\n').find(text=>text.includes(target==='qx'?'jsonjq-'+phase+'-body':'http-'+phase+'-jq'))?.match(/'(.+)'$/)?.[1];
      assert.ok(filter);assert.match(filter,/setpath/);assert.doesNotMatch(filter,/getpath|has\(/);
      const result=runIsolatedCase('jq',['-c',filter],{input:JSON.stringify(body),encoding:'utf8'});
      assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),expected,line+' '+target);
      checked++;
    }
  }
  console.log('Replace presence passed: '+checked+' native outputs for legacy/v2, request/response, top/nested and missing/null/false/0/empty/container values');
}


{
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const entry={id:'DynamicReplacePresence',source:'https://example.test/source.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  const inputs=[{data:{}},...[null,false,0,'',[],{},true].map(key=>({data:{key}})),{data:null},{data:4},{data:false},{data:[]}];
  let checked=0;
  for(const phase of ['request','response']) {
    const source=phase+' if ${url} ~= /api/ then '+phase+'.json.replace(${request.header["Path"]},9) | '+phase+'.header.set("X-Done","yes")';
    const output=convertPlugin(entry,'[Rewrite]\n'+source,options);validateConvertedPlugin(entry,output);
    for(const input of inputs)for(const target of ['qx','surge']) {
      const script=[...output.generatedScripts].find(([name])=>name.includes('_'+target+'_'))?.[1];assert.ok(script);
      const expected=structuredClone(input);if(input.data===null)expected.data={key:9};else if(typeof input.data==='object'&&!Array.isArray(input.data))expected.data.key=9;
      const context={$request:{url:'https://example.test/api',method:'POST',headers:{Path:'data.key'},body:JSON.stringify(input)},$response:{status:200,statusCode:200,headers:{},body:JSON.stringify(input)}};
      let calls=0,result;context.$done=value=>{calls++;result=value;};vm.runInNewContext(script,context,{timeout:1000});assert.equal(calls,1);
      assert.deepEqual(JSON.parse(result.body),expected,source+' '+target);assert.equal(result.headers,undefined,'independent native Header action is not embedded in the JSON helper');checked++;
    }
  }
  console.log('Dynamic replace path setting passed: '+checked+' real helper outputs, including invalid parents and independent Header output');
}


{
  const {fixedJqOperations}=await import('../src/parser/rewrite.ts');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const filters=['del(.a,.a.b)','del(.a.b,.a)','del(.a.b,.a.c)','del(.[",|.key"],.["__proto__"].x,.constructor)','.before = true | del(.a,.a.b) | .after = true','del(.a,.a) | .z = 1','del(.a.missing,.ghost.child) | del(.a.c,.b)','del(.[""].x,.[""])'];
  const inputs=['{}','null','false','3','[1,2]','broken','{"a":3,"b":2}','{"a":null,"b":1}','{"a":false}','{"a":[],"b":1}','{"a":{"b":1,"c":2},"ghost":null}','{"__proto__":{"x":1},"constructor":3,",|.key":4,"":{"x":2}}'];
  const entry={id:'MultiPathJq',source:'https://example.test/multi.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  let checked=0;
  for(const phase of ['request','response'])for(const filter of filters) {
    const line=phase+' if ${url} ~= /^https:\\/\\/example\\.test\\/api$/ then '+phase+'.json.jq(`'+filter+'`) | '+phase+'.header.set("X-After","yes")';
    assert.ok(fixedJqOperations(parseRewriteV2(line).actions[0]),filter);
    const out=convertPlugin(entry,'[Rewrite]\n'+line,options);validateConvertedPlugin(entry,out);
    assert.equal(out.generatedScripts.size,0,filter);
    assert.doesNotMatch(out.qx+out.surge,/^\^ url script-/m,'retain URL prefilter');
    for(const input of inputs) {
      const reference=runIsolatedCase('jq',['-c',filter],{input,encoding:'utf8'});if(reference.error)throw reference.error;
      for(const target of ['qx','surge']) {
        const {renderRewritePhaseDispatcher}=await import('../src/emit/runtime.ts');
        const script=renderRewritePhaseDispatcher([parseRewriteV2(line)],{target}).script;
        assert.match(out[target],target==='qx'?/jsonjq-/:/http-.*-jq/,'canonical output selects native JQ');
        let result,calls=0;
        const state={$request:{url:'https://example.test/api',headers:{},body:input},$response:{status:200,statusCode:200,headers:{},body:input},$done:value=>{result=value;calls++}};
        vm.runInNewContext(script,state,{timeout:1000});assert.equal(calls,1);
        result=JSON.parse(JSON.stringify(result));assert.deepEqual(result.headers,{'X-After':'yes'},filter+' continues');
        if(reference.status===0)assert.deepEqual(JSON.parse(result.body),JSON.parse(reference.stdout),filter+' '+input);
        else assert.equal(result.body,input,filter+' must roll back its whole action');
        checked++;
      }
    }
    const pure=line.slice(0,line.indexOf(' | '+phase+'.header.set'));
    const native=convertPlugin(entry,'[Rewrite]\n'+pure,options);validateConvertedPlugin(entry,native);assert.equal(native.generatedScripts.size,0);assert.match(native.qx,/jsonjq-/);assert.match(native.surge,/http-.*-jq/);
    const pipeline=pure+' | '+phase+'.json.jq(`.end = true`)';
    const multi=convertPlugin(entry,'[Rewrite]\n'+pipeline,options);validateConvertedPlugin(entry,multi);assert.equal(multi.generatedScripts.size,0,'pure JQ pipeline stays native');
  }
  for(const filter of ['del()','del(.a,)','del(,.a)','del(.a,,.b)','del(.a,.data[0])','del(.a,.[])','del(.a; .b)','del((.a,.b))','del(.a,.b?)','del(.a,.b + .c)'])assert.equal(fixedJqOperations(parseRewriteV2('response if ${url} ~= /api/ then response.json.jq(`'+filter+'`)').actions[0]),null,filter);
  console.log('Multi-path JQ del: '+checked+' real-jq helper comparisons; overlap, rollback, native priority and parser boundaries passed');
}


{
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const entry={id:'NativeBatch',source:'https://example.test/batch.lpx',category:'Test'};
  let checked=0;
  for(const phase of ['request','response'])for(const flags of ['','i','ims'])for(const operation of ['add','delete','replace']) {
    const args=operation==='delete'?'["data.ad","data.keep"]':'["data.ad","data.keep"],[false,2]';
    const source=phase+' if ${url} ~= /^https:\\/\\/example\\.test\\/api$/'+flags+' then '+phase+'.json.'+operation+'('+args+')';
    const output=convertPlugin(entry,'[Rewrite]\n'+source,{stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'});validateConvertedPlugin(entry,output);
    assert.equal(output.generatedScripts.size,0);
    for(const target of ['qx','surge']) {
      const line=output[target].split('\n').find(line=>line.includes(target==='qx'?'jsonjq-'+phase+'-body':'http-'+phase+'-jq'));
      assert.ok(line?.includes('example'),source);assert.doesNotMatch(output[target],/\^ url script-|pattern=\^,/);
      const filter=line.match(/'(.+)'$/)?.[1];assert.ok(filter);
      const jq=runIsolatedCase('jq',['-c',filter],{input:'{"data":{"ad":true,"keep":1}}',encoding:'utf8'});assert.equal(jq.status,0,jq.stderr);
      const expected=operation==='delete'?{data:{}}:operation==='replace'?{data:{ad:false,keep:2}}:{data:{ad:false,keep:2}};
      assert.deepEqual(JSON.parse(jq.stdout),expected);
      if(flags)assert.match(output[target],/COMPATIBILITY LIMITATION.*matching semantics may differ/);
      checked++;
    }
  }
  console.log('Native JSON batch priority passed: '+checked+' emitted filters');
}


// 上游错误：compile-gated whitespace repair and actual native jq execution.
{
  const fs=await import('node:fs/promises');
  const {repairUpstreamJq}=await import('../src/parser/rewrite.ts');
  const {convertPlugin,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const {materializeJqFiles,parseLoonPlugin}=await import('../src/parser/input.ts');
  const fixtures=JSON.parse(await fs.readFile('.github/converter/fixtures/upstream-jq-errors.json','utf8'));
  const jqVersionResult=runIsolatedCase('jq',['--version'],{encoding:'utf8'});
  assert.equal(jqVersionResult.status,0,jqVersionResult.stderr);
  const jqVersion=jqVersionResult.stdout.trim().match(/^jq-(\d+)\.(\d+)(?:\.(\d+))?/);
  assert.ok(jqVersion,'native jq version must be identifiable');
  const versionNumber=parts=>parts.reduce((n,part)=>n*1000+Number(part||0),0);
  const installedJqVersion=versionNumber(jqVersion.slice(1));
  // jq 1.8 changed binding/operator precedence (jqlang/jq #3053).
  // Keep explicit expectations for both versions; do not rewrite the author's filter.
  const expectedForJq=test=>{
    let expected=test.expected;
    for(const change of test.expectedSince||[]) {
      if(installedJqVersion>=versionNumber(change.version.split('.')))expected=change.value;
    }
    return expected;
  };
  const entry={id:'UpstreamWhitespace',source:'https://example.test/source.lpx',category:'Test'};
  const options={stamp:'2026-10-04',rawBase:'https://raw.githubusercontent.com/JuemingDC/WayX/main'};
  let checked=0;
  for(const fixture of fixtures) {
    assert.equal(runIsolatedCase('jq',[fixture.original],{input:'',encoding:'utf8'}).status,3);
    const repair=repairUpstreamJq(fixture.original);
    assert.equal(repair.changed,true);assert.equal(repair.jq,fixture.corrected);
    assert.equal(repairUpstreamJq(repair.jq).changed,false,'repair is idempotent');
    for(const phase of ['request','response'])for(const syntax of ['v2','legacy','file','v2-path','legacy-path']) {
      const line=syntax==='v2'?phase+' if ${url} ~= /api/ then '+phase+'.json.jq(`'+fixture.original+'`)':
        syntax==='legacy'?'api '+phase+'-body-json-jq '+fixture.original:
        syntax==='file'?phase+' if ${url} ~= /api/ then '+phase+'.json.jq_file("filter.jq")':
        syntax==='v2-path'?phase+' if ${url} ~= /api/ then '+phase+'.json.jq("jq-path=filter.jq")':
        'api '+phase+'-body-json-jq jq-path=filter.jq';
      const source='[Rewrite]\n'+line;
      const jqFiles=await materializeJqFiles(entry,parseLoonPlugin(source),{fetchText:async()=>fixture.original});
      const out=convertPlugin(entry,source,{...options,jqFiles});validateConvertedPlugin(entry,out);
      assert.equal(out.generatedScripts.size,0);
      for(const target of ['qx','surge']) {
        assert.match(out[target],/UPSTREAM ERROR CORRECTED/);
        assert.ok(out[target].includes('# Original upstream jq: '+fixture.original));
        const declaration=out[target].split('\n').find(text=>text.startsWith(target==='qx'?'api url jsonjq-'+phase+'-body':'http-'+phase+'-jq api '));
        assert.ok(declaration,syntax+' '+target);
        const program=declaration.match(/'(.+)'$/)[1];
        assert.equal(runIsolatedCase('jq',[program],{input:'',encoding:'utf8'}).status,0);
        for(const test of fixture.cases) {
          const result=runIsolatedCase('jq',['-c',program],{input:JSON.stringify(test.input),encoding:'utf8'});
          assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),expectedForJq(test));checked++;
        }
      }
    }
  }
  for(const program of ['.end','if . then 1 else .end end','"else .end;"','# else .end;\n.','if . then 1 else .end; broken','"if . then 1 else .end;" | .']) {
    const result=repairUpstreamJq(program);assert.equal(result.changed,false,program);assert.equal(result.jq,program);
  }
  const unicode='"😀\\\"# else .end;" as $text | if . then $text else .end';
  const repaired=repairUpstreamJq(unicode);assert.equal(repaired.changed,true);assert.equal(repaired.jq,unicode.replace(/else \.end$/,'else . end'));
  const raw=await fs.readFile('Resource/Loon/KuGou_remove_ads.lpx','utf8');
  const actual=convertPlugin({...entry,id:'Kelee_KuGou_remove_ads'},raw,options);validateConvertedPlugin(entry,actual);
  for(const target of ['qx','surge']) {
    assert.match(actual[target],/UPSTREAM ERROR CORRECTED/);
    for(const line of actual[target].split('\n').filter(l=>!l.startsWith('#') && /(?:jsonjq-|^http-(?:request|response)-jq )/.test(l))) {
      const program=line.match(/'(.+)'$/)?.[1];assert.ok(program,line);
      const result=runIsolatedCase('jq',[program],{input:'',encoding:'utf8'});assert.equal(result.status,0,result.stderr);
    }
  }
  assert.equal(await fs.readFile('Resource/Loon/KuGou_remove_ads.lpx','utf8'),raw,'original source remains recorded');
  console.log('Upstream jq errors passed: '+checked+' actual native executions across five source forms and both targets, plus non-repair guards and real KuGou');
}

// Script-containing chains retain independent guarded helpers without dispatcher collisions.
for(const section of ['Rewrite','Script']) {
 const source='['+section+']'+'\nresponse if ${url} ~= /api-(\\d+)/i as item then response.header.set("X-ID","${item.1}") | response.body.replace(/old/i,"new-${item.1}") | script("https://example.test/guarded.js")';
 const out=convertPlugin(entry,source,options);validateConvertedPlugin(entry,out);
 assert.doesNotMatch(out.qx+out.surge,/REVIEW REQUIRED|OMITTED/);
 for(const target of ['qx','surge']) {
  assert.match(out[target],/guarded\.js/);
  const helpers=[...out.generatedScripts].filter(([name])=>name.includes('_'+target+'_'));
  assert.equal(helpers.length,2);assert.ok(helpers.every(([name])=>!name.startsWith('phase_')));
  const results=helpers.map(([,script])=>run(script,{request:{url:'https://example.test/API-42'},response:{body:'OLD',status:200}}));
  assert.ok(results.some(result=>result.headers?.['X-ID']==='42'));
  assert.ok(results.some(result=>result.body==='new-42'));
 }
}
const mockChain='response if ${url} ~= /api/i then response.body.mock_file("text","one.txt") | response.body.mock_file("text","two.txt")';
const mockContext=await materializeConversionContext(entry,'[Rewrite]\n'+mockChain,{fetchText:async url=>url.endsWith('one.txt')?'ONE':'TWO'});
assert.deepEqual(Object.keys(mockContext.mockFiles.get(mockChain).byAction),['0','1']);
const mockOutput=convertPlugin(entry,'[Rewrite]\n'+mockChain,{...options,...mockContext});validateConvertedPlugin(entry,mockOutput);
assert.doesNotMatch(mockOutput.qx+mockOutput.surge,/REVIEW REQUIRED/);
for(const body of ['ONE','TWO'])assert.ok([...mockOutput.generatedScripts.values()].some(script=>script.includes(body)));
console.log('Script/Mock pipeline isolation passed: guarded helpers in both sections/targets and indexed response mock dependencies');
