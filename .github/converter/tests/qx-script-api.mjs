// Modified: 2026-10-29 (chance). Contract tests for QX completion shapes,
// source field aliases, empty-body timing, and unsupported API admission.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planQxScriptApi} from '../src/qx-script-api.mjs';
const run=(source,mode='response-body',body='hello')=>{
 const plan=planQxScriptApi(source,{mode,sourceUrl:'https://author.example/script.js'});assert.equal(plan.ok,true,plan.reason);
 const results=[];vm.runInNewContext(plan.script,{$request:{url:'https://a/',method:'GET',headers:{},body},$response:{status:201,headers:{},body},$done:x=>results.push(JSON.parse(JSON.stringify(x)))});
 assert.equal(results.length,1);return results[0];
};
assert.deepEqual(run('$done($response.body.toUpperCase());'),{body:'HELLO'});
assert.deepEqual(run('$done({body:$response.body,status:"HTTP/1.1 202 Accepted"});'),{body:'hello',status:202});
assert.deepEqual(run('$done({body:String($response.statusCode)});'),{body:'201'});
assert.deepEqual(run('$done({status:"HTTP/1.1 200 OK",body:"mock"});','echo-response'),{response:{status:200,body:'mock'}});
assert.deepEqual(run('$done({headers:{X:"yes"}});','request-header'),{headers:{X:'yes'}});
assert.deepEqual(run('throw Error("must not run on empty body");','response-body',''),{});
assert.deepEqual(run('$done({});'),{});
for(const source of ['$task.fetch({});','$prefs.removeAllValues();','$request.sessionIndex;','$response["statusCode"];','eval("1");','$notify("a","b","c");'])assert.equal(planQxScriptApi(source,{mode:'response-body'}).ok,false,source);
assert.throws(()=>run('$done({headers:{X:"no"}});'),/requires a body/);
console.log('QX Script API contract passed');
