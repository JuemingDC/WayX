// Modified: 2026-11-16 (chance). Official Surge 6 response trailer contract:
// test both the full kernel and selected runtime with actual host-shaped values.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planScriptApiConversion as plan} from '../src/parser/script-api.ts';
import {scriptApiRuntime} from '../src/emit/script-api-runtime.ts';
import {scriptRuntimePolicyVersion} from '../src/domain/script-api.ts';
const plain = (value: any) => JSON.parse(JSON.stringify(value));
function run(source: string, response: any = {}, options: any = {}, full = false, extra: any = {}) {
  const config = {from:'loon' as const,to:'surge' as const,phase:'response' as const,responseBody:true,...options};
  const result = plan(source,config);
  assert.equal(result.status,'adapted',JSON.stringify(result.problems));
  let output: any, calls = 0;
  const globals: any = {Uint8Array,ArrayBuffer,console,$request:{url:'https://grpc.test/call',headers:{}},...(config.phase==='response'?{$response:response}:{}),$done:(value: any)=>{calls++;output=value;},...extra};
  let code = result.code!;
  if(full)code = `(function(){const host={global:globalThis,request:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,codecs:{}};return (${scriptApiRuntime})(${JSON.stringify({...config,...result.contract})},host,function(scope){with(scope){return(function(){${source}\n}).call(this);}});})();`;
  vm.runInNewContext(code,globals,{timeout:3000});
  assert.equal(calls,1,'one native completion');
  return {output:plain(output),plan:result};
}
for(const full of [false,true]) {
  const native = {'Grpc-Status':'7','Grpc-Message':'permission%20denied','X-Trace':'keep'};
  const result = run('const t=$response.h2_trailers;if(t["GRPC-STATUS"]!=="7")throw Error("read");delete t["grpc-message"];t["Grpc-Status"]="0";$done({body:"modified",h2_trailers:t});$done({h2_trailers:{}});',{status:200,headers:{},trailers:native},{},full);
  assert.deepEqual(result.output,{body:'modified',trailers:{'grpc-status':'0','x-trace':'keep'}});
  assert.deepEqual(native,{'Grpc-Status':'7','Grpc-Message':'permission%20denied','X-Trace':'keep'},'native input is not mutated');
  const operation = result.plan.operationIR.operations.find(op=>op.rule==='response.trailers')!;
  assert.equal(operation.target.api,'$response.trailers');
  assert.equal(operation.target.capability,'runtime');
  assert.equal(result.plan.contract.runtimePolicyVersion,scriptRuntimePolicyVersion);
  // Missing fields stay missing. Changing the body does not write back trailers.
  assert.deepEqual(run('if("h2_trailers" in $response)throw Error("invented");$done({body:"changed"});',{headers:{}},{},full).output,{body:'changed'});
  assert.deepEqual(run('$done({});',{trailers:native},{},full).output,{});
  assert.deepEqual(run('$done({h2_trailers:{}});',{trailers:native},{},full).output,{trailers:{}});
  assert.deepEqual(run('$done({h2_trailers:undefined});',{}, {},full).output,{});
  assert.deepEqual(run('const r=$response;r.h2_trailers["grpc-status"]="0";$done(r);',{status:200,body:'body',trailers:native},{},full).output,{status:200,body:'body',trailers:{'grpc-status':'0','grpc-message':'permission%20denied','x-trace':'keep'}});
  // Declaration boundaries: no response trailers for header-only/request/synthetic hooks.
  assert.deepEqual(run('if("h2_trailers" in $response)throw Error("header-only");$done({h2_trailers:{"grpc-status":"0"}});',{trailers:native},{responseBody:false},full).output,{});
  assert.deepEqual(run('$done({h2_trailers:{"grpc-status":"0"}});',{}, {phase:'request'},full).output,{});
  assert.deepEqual(run('$done({response:{body:"synthetic",h2_trailers:{"grpc-status":"0"}}});',{}, {phase:'request'},full).output,{response:{body:'synthetic'}});
  assert.deepEqual(run('$done({h2_trailers:{"grpc-status":"0"}});',{}, {to:'qx'},full).output,{});
  // Array input is projected to Loon's dictionary; native array output stays an array.
  const array = [{field:'Grpc-Status',value:'0'},{field:'X-Trace',value:'first'},{field:'X-Trace',value:'second'}];
  assert.deepEqual(run('$done({h2_trailers:$response.h2_trailers});',{trailers:array},{},full).output,{trailers:{'grpc-status':'0','x-trace':'second'}});
  assert.deepEqual(run('$done({trailers:input});',{}, {},full,{input:array}).output,{trailers:array});
  assert.deepEqual(run('$done($response);',{headers:[{field:'Set-Cookie',value:'a'},{field:'Set-Cookie',value:'b'}],trailers:array},{},full).output,{headers:{'set-cookie':'b'},trailers:{'grpc-status':'0','x-trace':'second'}});
  let reads=0;
  const getterResponse={get trailers(){reads++;return native;}};
  assert.deepEqual(run('$done({h2_trailers:$response.h2_trailers});',getterResponse,{},full).output,{trailers:{'grpc-status':'7','grpc-message':'permission%20denied','x-trace':'keep'}});
  assert.equal(reads,1,'capture native trailer getters once');
  assert.deepEqual(run('const globalThis={};globalThis.$done=value=>value;$done({h2_trailers:{"grpc-status":"0"}});',{}, {},full).output,{trailers:{'grpc-status':'0'}});
  // Modified: 2026-11-18 (chance). Author validation remains catchable before the outer HTTP fallback.
  assert.deepEqual(run('try{$done({h2_trailers:5});}catch(e){$done({body:e.message});}',{}, {},full).output,{body:'WayX API: trailers require a dictionary or field/value array'});
  assert.deepEqual(run('try{$done({trailers:[{field:"bad",value:5}]});}catch(e){$done({body:e.message});}',{}, {},full).output,{body:'WayX API: trailer array requires field/value strings'});
  // Read-only alias access and computed result keys use the same runtime contract.
  assert.deepEqual(run('const key=["h2","trailers"].join("_");const r={};r[key]=$response[key];globalThis.$done(r);',{trailers:native},{},full).output,{trailers:{'grpc-status':'7','grpc-message':'permission%20denied','x-trace':'keep'}});
  // Request trailers remain outside the newly supported callback response API.
  const request = run('$request.h2_trailers;$done({});',{}, {phase:'request'},full).plan.operationIR.operations.find(op=>op.rule==='request.trailers')!;
  assert.equal(request.target.capability,'unavailable');
}
assert.equal(scriptRuntimePolicyVersion,16);
console.log('Surge trailers: full/selected adapters, read/write/delete, absence/clear/pass-through, whole contexts, native arrays, aliases, invalid types, phases and source capability catalog passed');
