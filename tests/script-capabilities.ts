// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). Capability growth must remove only proven
// false positives, while preserving lexical identity and blocking alias escapes.
import {scriptTargetsForSource} from '../src/parser/universal-script.ts';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {inspectScriptApis,planScriptApiConversion} from '../src/parser/script-api.ts';
import {planUniversalAdblockScript} from '../src/parser/universal-script.ts';
import {normalizeRemoteScriptEcho} from '../src/parser/backup-references.ts';
import {mergeNativeQxSources} from '../src/publish/workflow.ts';
import {convertNativeQxToSurge} from '../src/emit/conversion.ts';
for(const line of [
 '^https://a url echo-response https://author.test/a.js',
 '^https://a url echo-response application/json echo-response https://author.test/a.js#x=1',
 '^https://a url analyze-echo-response https://author.test/a.JS?version=2',
 '^https://a url echo-response https://raw.githubusercontent.com/JuemingDC/WayX/main/Script/Adblock/author.test-123456789abc/source.json',
]) {
 const repaired=normalizeRemoteScriptEcho(line);assert.ok(repaired.includes('url script-'));assert.equal(normalizeRemoteScriptEcho(repaired),repaired);
 const diagnostics:any[]=[];const qx=mergeNativeQxSources([{url:'https://author.test/a.snippet',text:line}],{name:'Echo',diagnostics});assert.equal(diagnostics.length,0);assert.ok(qx.includes(repaired));
 const surge=convertNativeQxToSurge(qx).surge;assert.ok(surge.includes('type=http-request'));assert.ok(surge.includes('script-path='+repaired.split(' ').at(-1)));
 assert.ok(surge.includes('requires-body='+line.includes('analyze-echo-response')));
}
for(const line of ['^https://a url echo-response application/json echo-response https://author.test/data.json','# ^https://a url echo-response https://author.test/a.js','^https://a url echo-response application/json echo-response local.js'])assert.equal(normalizeRemoteScriptEcho(line),line);
assert.deepEqual(inspectScriptApis('const $e=1;function f($t){return $t+$e;}f(2);').paths,[]);
assert.deepEqual(inspectScriptApis('if(typeof $response!=="undefined"){$done({body:$response.body});}').paths,['$done','$response.body']);
assert.ok(!inspectScriptApis('const unused=typeof $task!=="undefined";$done({body:$response.body});').paths.includes('$task'));
assert.ok(inspectScriptApis('const used=typeof $task!=="undefined";$done({body:String(used)});').paths.includes('$task'));
const source='const $e="!";var result={};function filter(){result={body:$response.body+$e};}filter();$done(result);';
const universal=planUniversalAdblockScript(source,'loon',[{phase:'response'}]);assert.equal(universal.status,'universal',JSON.stringify(universal.problems));
for(const host of ['qx','surge','loon']){
 let result:any;vm.runInNewContext(universal.code!,{setTimeout,$response:{body:'hello'},$done:(v:any)=>result=v,...(host==='qx'?{$task:{fetch(){}}}:host==='loon'?{$loon:'test'}:{$environment:{'surge-version':'test'}})});assert.equal(result.body,'hello!');
}
for(const bad of [
 'let result={};result=parseUnknown();$done(result);',
 'let result={};leak(result);$done(result);',
 'let result={};leak({result});$done(result);',
 'var result={};var result=parseUnknown();$done(result);',
 'let result={};result[unknown]=1;$done(result);',
 'var result={};for(var result of unknown){}$done(result);',
 'let result={};function f($done){$done(result)}f(leak);$done(result);',
 'class C{f(){return this.constructor.constructor("return this")();}}new C().f();$done();',
 'class C{f(){return this["constructor"]["constructor"]("return this")();}}new C().f();$done();',
 'function f(){};const C=f.constructor;C("return this")();$done();',
 'class C{f(){function g(){return this.fetch("x")}g()}}new C().f();$done();',
])assert.equal(planUniversalAdblockScript(bad,'loon',[{phase:'response'}]).status,'blocked',bad);
assert.equal(planUniversalAdblockScript('class C{constructor(){this.value="ok"}f(){return this.value}}$done({body:new C().f()});','loon',[{phase:'response'}]).status,'universal');
assert.equal(planScriptApiConversion('$done(dynamic);',{from:'loon',to:'qx',phase:'response'}).status,'blocked');
console.log('Script capability boundaries passed: remote-JS echo correction, local bindings, presence guards, finite closed completion objects, class receivers and adversarial escapes');

for(const source of [
 'const value=$persistentStore.read("key")||"fallback";$done({body:value});',
 'const value=$persistentStore.read("key");$done({body:value??"fallback"});',
]) {
 const plan=planUniversalAdblockScript(source,'loon',[{phase:'response'}]);assert.equal(plan.status,'universal',JSON.stringify(plan.problems));
 for(const missing of [null,undefined,''])for(const target of scriptTargetsForSource('loon')) {
  let result:any;vm.runInNewContext(plan.code!,{setTimeout,$response:{body:''},$done:(v:any)=>result=v,$persistentStore:{read:()=>missing},$prefs:{valueForKey:()=>missing},...(target==='qx'?{$task:{fetch(){}}}:target==='loon'?{$loon:'test'}:{$environment:{'surge-version':'test'}})});
  assert.equal(result.body,source.includes('||')||missing==null?'fallback':'');
 }
}
for(const source of [
 'const x=$persistentStore.read("key");$done({body:String(x)});',
 'const x=$persistentStore.read("key");$done({body:String(x===undefined)});',
 '$persistentStore.write("","key");$done();',
])assert.equal(planUniversalAdblockScript(source,'loon',[{phase:'response'}]).status,'blocked',source);
console.log('Guarded storage reads passed: null/undefined/empty distinctions, fallback-only aliases and unsafe strict observations');

// Retained artifacts must receive the same correction, and the linked script
// must enter the ordinary byte-backup/shared-script transaction.
{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const {refreshSourceBackups}=await import('../src/application/backups.ts');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-echo-retained-'));
 try {
  await fs.mkdir(path.join(root,'Adblock/Quantumult X'),{recursive:true});
  const file='Adblock/Quantumult X/retained.snippet',url='https://author.test/echo.js';
  const declaration='^https://ad.test/ url echo-response application/json echo-response '+url+'#value=1';
  await fs.writeFile(path.join(root,file),'# Managed by: WayX Native QX\n'+declaration+'\n');
  const body=Buffer.from('$done({status:"HTTP/1.1 200 OK",body:"made"});\r\n');
  const resources={cachedBytes:async()=>null,fetchBytes:async(value:string)=>{assert.equal(value,url);return body;}};
  await refreshSourceBackups(root,{resources,log:()=>{}});
  const result=await fs.readFile(path.join(root,file),'utf8');
  assert.ok(result.includes('# Source declaration: '+declaration));assert.match(result,/url script-echo-response https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/Script\/Adblock\//);
  const index=JSON.parse(await fs.readFile(path.join(root,'Resource/Backup/index.json'),'utf8'));
  assert.deepEqual(await fs.readFile(path.join(root,index.latest[url])),body);
  await refreshSourceBackups(root,{resources,log:()=>{}});assert.equal(await fs.readFile(path.join(root,file),'utf8'),result);
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
console.log('Retained script-echo integration passed: original evidence, linked script backup, shared URL, fragment and repeated synchronization');

// Author identifiers must not resolve to generated wrapper variables, including
// free variables and names already using the private helper prefix.
const captureSource='$done({body:[typeof target,typeof host,typeof contexts,typeof role,typeof config,typeof run,typeof __wayxTarget,typeof __wayxHost,typeof __wayxContext,typeof __wayxRun].join(",")});';
for(const from of ['qx','loon'] as const) {
 const plan=planUniversalAdblockScript(captureSource,from,[{phase:'response'}]);assert.equal(plan.status,'universal',JSON.stringify(plan.problems));
 for(const target of scriptTargetsForSource(from)) {
  let result:any;vm.runInNewContext(plan.code!,{setTimeout,$response:{body:''},$done:(v:any)=>result=v,...(target==='qx'?{$task:{fetch(){}}}:target==='loon'?{$loon:'test'}:{$environment:{'surge-version':'test'}})});
  assert.equal(result.body,Array(10).fill('undefined').join(','));
 }
}
const legacyCapture=planScriptApiConversion('$done({body:typeof __wayxHost});',{from:'loon',to:'surge',phase:'response'});assert.equal(legacyCapture.status,'adapted');let captured:any;vm.runInNewContext(legacyCapture.code!,{setTimeout,$response:{body:''},$done:(v:any)=>captured=v});assert.equal(captured.body,'undefined');
console.log('Capture-free wrapper regression passed: original/free/private-prefix identifiers across all three hosts and the CLI bridge');
