// Modified: 2026-11-01 (chance). Independent source/target contract checks for script API translation; do not treat successful syntax as proof of semantic equivalence.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {planScriptApiConversion,inspectScriptApis} from '../src/parser/script-api.ts';
async function execute(source:string,from:any,to:any,phase:any,input:any={}){
 const plan=planScriptApiConversion(source,{from,to,phase,name:'fixture',sourceUrl:'https://author.test/a.js'});assert.equal(plan.status,'adapted',JSON.stringify(plan.problems));
 let result:any;
 const sandbox:any={console,Uint8Array,ArrayBuffer,Date,setTimeout,Promise,$done:(value:any)=>{result=value;},...input};
 if(to==='egern'){
  const ctx=input.ctx;const code=plan.code!.replace('export default async function(ctx)','(async function(ctx)')+' )';
  const fn=vm.runInNewContext(code,sandbox);result=await fn(ctx);
 }else {vm.runInNewContext(plan.code!,sandbox);await new Promise(r=>setTimeout(r,1));}
 return {plan,result};
}
const qx=await execute('const s="$done( in string";/* $task.fetch( is only a comment */$done({body:JSON.stringify({code:$response.statusCode,value:JSON.parse($response.body).x})});','qx','surge','response',{$response:{status:201,headers:{},body:'{"x":3}'}});
assert.deepEqual(JSON.parse(qx.result.body),{code:201,value:3});assert.ok(qx.plan.code!.includes('"$done( in string"'));
const reverse=await execute('$done({body:JSON.stringify({status:$response.status})});','surge','qx','response',{$response:{statusCode:202,body:'{}',headers:{}}});assert.deepEqual(JSON.parse(reverse.result.body),{status:202});
const echo=await execute('$done({status:"HTTP/1.1 307 Temporary Redirect",headers:{Location:"https://example.test"}});','qx','surge','echo',{$request:{url:'https://x.test',headers:{}}});assert.equal(echo.result.response.status,307);assert.equal(echo.result.response.headers.Location,'https://example.test');
const binary=await execute('$done({bodyBytes:$response.bodyBytes});','qx','surge','response',{$response:{body:new Uint8Array(new Uint8Array([9,1,2,8]).buffer,1,2),status:200}});assert.deepEqual([...binary.result.body],[1,2]);assert.equal(binary.result.body.byteLength,2);
let selected:any;await execute('$prefs.setValueForKey("value","key");$prefs.removeValueForKey("key");$done();','qx','surge','task',{$persistentStore:{write:(value:any,key:any)=>{selected={value,key};return true;}}});assert.deepEqual(selected,{value:null,key:'key'});
const toEgern=await execute('$done({body:$response.body+"!"});','surge','egern','response',{ctx:{script:{name:'Egern'},request:undefined,response:{status:200,headers:new Map([['X-Test','1']]),text:async()=>'hello'},respond:(v:any)=>v,abort:()=>({aborted:true})}});assert.equal(toEgern.result.body,'hello!');
const fromEgern=await execute('export default async function(ctx){const data=await ctx.response.json();return {body:JSON.stringify({n:data.n+1})};}','egern','surge','response',{$response:{body:'{"n":2}',status:200,headers:{}}});assert.equal(fromEgern.result.body,'{"n":3}');
for(const [api,source]of Object.entries({http:'$task.fetch({url:"https://x"});',config:'$config.getConfig();',aes:'$crypto.aes.encrypt(new Uint8Array(),{});',dns:'$dns.query({},()=>{});',timer:'setInterval(()=>{},1);',global:'globalThis.$done({});',storage:'$persistentStore.remove();',arg:'$done({body:$argument});'})){
 const plan=planScriptApiConversion(source,{from:'qx',to:'surge',phase:'response'});assert.equal(plan.status,'blocked',api);assert.ok(plan.problems.length,api);assert.equal(plan.code,null);
}
assert.equal(inspectScriptApis('const t="$configuration.sendMessage"; /* $dns.query */').paths.length,0);
assert.equal(planScriptApiConversion('$done({h2_trailers:{a:1}});',{from:'loon',to:'surge',phase:'response'}).status,'blocked');
assert.equal(planScriptApiConversion('export default async function(ctx){return await ctx.compress.gzip(new Uint8Array());}',{from:'egern',to:'surge',phase:'response'}).status,'blocked');
const oneShot=await execute('setInterval(()=>$done({body:"once"}),1);','loon','surge','response',{$response:{body:''}});assert.equal(oneShot.result.body,'once');
console.log('Script API subset passed: QX/Surge/Loon/Egern contexts, echo/status, binary offsets, explicit storage deletion, one-shot Loon timer, AST string/comment safety and unsupported API diagnostics');

// Production path: one raw source snapshot, separate per-target adapters, fixed URLs and in-place script updates.
{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const {refreshSourceBackups}=await import('../src/application/backups.ts');
 const {validateSourceBackups}=await import('../src/validation/backups.ts');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-api-integration-'));
 try{
  const entry={id:'ApiFixture',file:'api.lpx',source:'https://author.test/api.lpx',qx:'api.snippet',surge:'api.sgmodule'};
  const url='https://author.test/response.js';
  let source=Buffer.from('#!name=ApiFixture\n[Script]\nresponse if ${url} ~= /^https:\\/\\/example\\.test\\// then script("'+url+'") with requires_body=true,tag="Original"\n');
  source=Buffer.concat([source,Buffer.from(source.toString().split('\n').find(line=>line.startsWith('response if'))!+'\n')]);
  for(const p of ['Resource/Loon','Adblock/Quantumult X','Adblock/Surge'])await fs.mkdir(path.join(root,p),{recursive:true});
  await fs.writeFile(path.join(root,'Resource/Loon/api.lpx'),source);
  const qxFile='Adblock/Quantumult X/api.snippet',surgeFile='Adblock/Surge/api.sgmodule';
  await fs.writeFile(path.join(root,qxFile),'^https://example\\.test/ url script-response-body '+url+'\n');
  await fs.writeFile(path.join(root,surgeFile),'Original = type=http-response,pattern=^https://example\\.test/,script-path='+url+',requires-body=true\n');
  let script=Buffer.from('$done({body:$response.body.replace("a","b")});\r\n');
  const resources={cachedBytes:async(u:string)=>u===entry.source?source:null,fetchBytes:async(u:string)=>{assert.equal(u,url);return script;}};
  await refreshSourceBackups(root,{catalog:[entry],resources,log:()=>{}});
  const first=await fs.readFile(path.join(root,surgeFile),'utf8');assert.ok(first.includes('/Script/Api/loon-to-surge/'));
  let index=JSON.parse(await fs.readFile(path.join(root,'Resource/Backup/index.json'),'utf8'));const adapter=Object.values<any>(index.adapters).find(a=>a.to==='surge')!;
  const before=await fs.readFile(path.join(root,adapter.path),'utf8');assert.ok(before.includes(script.toString().trim()));
  const raw=index.objects[index.latest[url]];assert.deepEqual(await fs.readFile(path.join(root,raw.path)),script);
  assert.equal((await validateSourceBackups(root)).length,0);
  script=Buffer.from('$done({body:$response.body.replace("a","c")});\r\n');
  await refreshSourceBackups(root,{catalog:[entry],resources,log:()=>{}});
  assert.equal(await fs.readFile(path.join(root,surgeFile),'utf8'),first);
  assert.notEqual(await fs.readFile(path.join(root,adapter.path),'utf8'),before);
  index=JSON.parse(await fs.readFile(path.join(root,'Resource/Backup/index.json'),'utf8'));assert.equal(Object.keys(index.adapters).length,2);
  assert.equal((await validateSourceBackups(root)).length,0);
  script=Buffer.from('$dns.query({},()=>{});$done();');
  await refreshSourceBackups(root,{catalog:[entry],resources,log:()=>{}});
  assert.equal(await fs.readFile(path.join(root,surgeFile),'utf8'),first,'unsupported new source retains the prior verified adapter');
  const status=JSON.parse(await fs.readFile(path.join(root,'Resource/Backup/script-api-status.json'),'utf8'));assert.equal(status.blocked,2);assert.ok(status.diagnostics.every((d:any)=>d.problems.some((p:any)=>p.api==='$dns')));
 }finally{await fs.rm(root,{recursive:true,force:true});}
 console.log('Script API production integration passed: raw byte retention, separate QX/Surge adapters, fixed references, in-place regeneration, integrity and unsupported-update retention');
}

for(const from of ['qx','loon','surge','egern'])for(const to of ['qx','loon','surge','egern']){
 if(from===to)continue;
 const source=from==='egern'?'export default async function(ctx){return {body:(await ctx.response.text())+"!"};}':'$done({body:$response.body+"!"});';
 const input=to==='egern'?{ctx:{script:{name:'fixture'},response:{status:200,headers:new Map(),text:async()=>'body'}}}:{ $response:to==='qx'?{statusCode:200,body:'body',headers:{}}:{status:200,body:'body',headers:{}} };
 const {result}=await execute(source,from,to,'response',input);assert.equal(result.body,'body!',from+' -> '+to);
}
const synthesized=await execute('$done({response:{status:201,body:"made"}});','loon','qx','request',{$request:{url:'https://example.test',headers:{}}});assert.equal(synthesized.result.status,'HTTP/1.1 201 Created');assert.equal(synthesized.plan.echoRequired,true);
console.log('Script API direction matrix: 12 text-body directions plus Loon synthetic-response QX echo mode passed');

assert.equal(planScriptApiConversion('$prefs.setValueForKey(null,"key");$done();',{from:"qx",to:"surge",phase:"task"}).status,"blocked");

// Egern uses ES modules: do not silently change sloppy-mode globals, deletion or duplicate parameter behavior.
for(const source of ['implicit=1;$done({body:"x"});','[implicit]=[1];$done({body:"x"});','function f(a,a){};$done({body:"x"});','delete implicit;$done({body:"x"});'])assert.equal(planScriptApiConversion(source,{from:'qx',to:'egern',phase:'response'}).status,'blocked');
const strictResult=await execute('export default async function(ctx){try{undeclaredWrite=1;return {body:"incorrect"};}catch(e){return {body:e.name};}}','egern','surge','response',{$response:{body:'',status:200}});assert.equal(strictResult.result.body,'ReferenceError');
assert.equal(planScriptApiConversion('const setTimeout=()=>{};$done({body:"x"});',{from:'loon',to:'surge',phase:'response'}).status,'blocked');
console.log('Script API strictness passed: Egern module semantics, implicit/destructured global writes, reserved timer bindings and source strict exception behavior');

// Rebinding a QX binary source must not use the target's injected binary flag as source identity.
{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');const {refreshSourceBackups}=await import('../src/application/backups.ts');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-native-binary-'));
 try{
  for(const dir of ['Adblock/Quantumult X','Adblock/Surge'])await fs.mkdir(path.join(root,dir),{recursive:true});
  const marker='# Managed by: WayX Native QX\n',url='https://author.test/binary.js';
  await fs.writeFile(path.join(root,'Adblock/Quantumult X/binary.snippet'),marker+'^https://example.test/ url script-response-body '+url+'\n');
  const target='Adblock/Surge/binary.sgmodule';await fs.writeFile(path.join(root,target),marker+'s = type=http-response,pattern=^https://example.test/,script-path='+url+',requires-body=true\n');
  const resources={fetchBytes:async()=>Buffer.from('$done({bodyBytes:$response.bodyBytes});'),cachedBytes:async()=>null};
  await refreshSourceBackups(root,{resources,log:()=>{}});const first=await fs.readFile(path.join(root,target),'utf8');
  await refreshSourceBackups(root,{resources,log:()=>{}});assert.equal(await fs.readFile(path.join(root,target),'utf8'),first,'unchanged binary source must keep the adapter URL fixed');
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
