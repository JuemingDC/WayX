// Modified: 2026-11-16 (chance). Native Surge HTTP client response trailers
// map to Loon callbacks regardless of intercept phase/body-buffer settings.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planScriptApiConversion} from '../src/parser/script-api.ts';
import {scriptApiRuntime} from '../src/emit/script-api-runtime.ts';
const plain = (value: any) => JSON.parse(JSON.stringify(value));
function execute(source: string, full: boolean, phase: any, native: any, data: any = 'body', error: any = null, extra: any = {}) {
  const config = {from:'loon' as const,to:'surge' as const,phase,responseBody:false};
  const plan = planScriptApiConversion(source,config);
  assert.equal(plan.status,'adapted',JSON.stringify(plan.problems));
  const seen: any[] = [],requests: any[] = [];
  let calls=0;
  const http = Object.fromEntries(['get','post','put','delete','head','options','patch'].map(method=>[method,(options: any,callback: any)=>{requests.push({method,options});callback(error,native,data);} ]));
  const globals: any = {Uint8Array,ArrayBuffer,console,seen,input:'https://grpc.test/call',expectedData:data,$httpClient:http,$done:()=>calls++,$request:{url:'https://intercept.test/',headers:{}},...(phase==='response'?{$response:{headers:{}}}:{}),...extra};
  const code = full ? `(function(){const host={global:globalThis,request:$request,response:typeof $response==='undefined'?undefined:$response,http:$httpClient,done:$done,codecs:{}};return (${scriptApiRuntime})(${JSON.stringify({...config,...plan.contract})},host,function(scope){with(scope){return(function(){${source}\n}).call(this);}});})();` : plan.code!;
  vm.runInNewContext(code,globals,{timeout:3000});
  assert.equal(calls,1);
  return {seen:plain(seen),requests,plan};
}
for(const full of [false,true]) {
  for(const phase of ['request','response','task']) for(const method of ['get','post','put','delete','head','options','patch']) {
    const native = {status:200,headers:{'Content-Type':'application/grpc'},trailers:{'Grpc-Status':'7','Grpc-Message':'denied'}};
    const source = `$httpClient.${method}(input,(e,r,b)=>{if(e)throw Error(e);if(b!==expectedData)throw Error('body changed');seen.push({status:r.status,grpc:r.h2_trailers['GRPC-STATUS'],message:r.h2_trailers['grpc-message'],nativeField:'trailers' in r});r.h2_trailers['grpc-status']='0';$done({});});`;
    const result = execute(source,full,phase,native,new Uint8Array([0,1,255]));
    assert.deepEqual(result.seen,[{status:200,grpc:'7',message:'denied',nativeField:false}]);
    assert.equal(native.trailers['Grpc-Status'],'7','callback view must not mutate the host response');
    assert.equal(result.requests[0].method,method);
    assert.equal(result.plan.contract.apiPlan.target.http.responseTrailers,'trailers');
    // Modified: 2026-11-18 (chance). HTTP callbacks retain the policy 16 program boundary.
    assert.equal(result.plan.contract.runtimePolicyVersion,16);
  }
  const inspect = '$httpClient.get(input,(e,r,b)=>{seen.push({present:Object.prototype.hasOwnProperty.call(r,"h2_trailers"),value:r.h2_trailers});$done({});});';
  assert.deepEqual(execute(inspect,full,'request',{status:200,headers:{}}).seen,[{present:false}]);
  assert.deepEqual(execute(inspect,full,'request',{status:200,headers:{},trailers:{}}).seen,[{present:true,value:{}}]);
  const array = [{field:'Grpc-Status',value:'0'},{field:'X-Trace',value:'one'},{field:'X-Trace',value:'two'}];
  assert.deepEqual(execute(inspect,full,'response',{status:200,headers:[{field:'Content-Type',value:'application/grpc'}],trailers:array}).seen,[{present:true,value:{'grpc-status':'0','x-trace':'two'}}]);
  let reads=0;
  const native={status:200,headers:{},get trailers(){reads++;return {'grpc-status':'0'};}};
  execute(inspect,full,'request',native);
  assert.equal(reads,1,'native trailer getter is captured once');
  assert.deepEqual(execute('$httpClient.get(input,(e,r)=>{seen.push({error:e});$done({});});',full,'request',undefined,'','network failure').seen,[{error:'network failure'}]);
  assert.deepEqual(execute('$httpClient.get(input,(e,r)=>{seen.push({error:e});$done({});});',full,'request',undefined).seen,[{error:'HTTP transport returned no response'}]);
  const alias='const g=globalThis;const client=g.$httpClient;client.get(input,(e,r)=>{const k=["h2","trailers"].join("_");seen.push(r[k]);g.$done({});});';
  assert.deepEqual(execute(alias,full,'request',{status:200,headers:{},trailers:{'grpc-status':'0'}}).seen,[{'grpc-status':'0'}]);
}
console.log('Surge HTTP callback trailers: full/selected adapters, seven methods, request/response/task phases, body-buffer independence, bytes, absence/empty/arrays, host isolation, errors, getters and aliases passed');
