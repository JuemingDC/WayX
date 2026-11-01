// Modified: 2026-11-01 (chance). Execute the same bytes under all three hosts;
// preserve native result shapes, source names, fragments and isolated HTTP modes.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {planUniversalAdblockScript,universalScriptPath} from '../src/parser/universal-script.ts';
import {prepareScriptApiAdapters} from '../src/application/script-api.ts';
import {scriptReferences} from '../src/parser/backup-references.ts';
const hosts:any={qx:{$task:{fetch(){}}},surge:{$environment:{'surge-version':'fixture'}},loon:{$loon:'fixture'}};
for(const from of ['qx','surge','loon'] as const) {
 const source=from==='qx'?'$done({body:$response.statusCode+":"+$response.body});':'$done({body:$response.status+":"+$response.body});';
 const plan=planUniversalAdblockScript(source,from,[{phase:'response',name:'A'},{phase:'response',name:'B'}]);
 assert.equal(plan.status,'universal',JSON.stringify(plan.problems));assert.equal(plan.code!.split(source).length,2,'source body occurs once');
 assert.ok(!plan.code!.startsWith('//'));assert.doesNotMatch(plan.code!,/Category: Script API|Source: https/);
 for(const target of ['qx','surge','loon']) {
  let result:any,calls=0;vm.runInNewContext(plan.code!,{...hosts[target],Uint8Array,ArrayBuffer,Date,setTimeout,$response:{body:'ad',...(target==='qx'?{statusCode:201}:{status:201})},$done:(v:any)=>{result=v;calls++;}});
  assert.equal(calls,1);assert.equal(result.body,'201:ad',from+' -> '+target);
 }
}
const names=planUniversalAdblockScript('$done({body:$script.name});','loon',[{phase:'response',name:'A'},{phase:'response',name:'B'}]);assert.equal(names.status,'blocked');
assert.equal(planUniversalAdblockScript('$config.setConfig({});$done();','loon',[{phase:'request'}]).status,'excluded');
assert.equal(planUniversalAdblockScript('$task.fetch({url:"https://example.test"});$done();','qx',[{phase:'request'}]).status,'blocked');
assert.equal(planUniversalAdblockScript('$done({body:"x"});','qx',[{phase:'request'},{phase:'echo'}]).status,'blocked');
assert.ok(universalScriptPath('https://a.test/x/file.js').endsWith('/file.js'));
assert.ok(universalScriptPath('https://a.test/file.JS').endsWith('/file.JS'));
assert.ok(universalScriptPath('https://a.test/file.txt').endsWith('/file.txt'));
assert.ok(universalScriptPath('https://a.test/script').endsWith('/script'));
assert.equal(planUniversalAdblockScript('await Promise.resolve();','loon',[{phase:'response'}]).status,'blocked');
const crlf=planUniversalAdblockScript('const x=1;\r\n$done({body:String(x)});','loon',[{phase:'response'}]);
assert.equal(crlf.status,'universal');assert.ok(crlf.code!.includes('const x=1;\r\n')); 
assert.ok(universalScriptPath('https://a.test/去广告.js').endsWith('/去广告.js'));
assert.doesNotThrow(()=>universalScriptPath('https://a.test/percent%.js'));
assert.notEqual(universalScriptPath('https://a.test/x/file.js'),universalScriptPath('https://b.test/x/file.js'));
assert.notEqual(universalScriptPath('https://a.test/x/file.js?one'),universalScriptPath('https://a.test/x/file.js?two'));
assert.equal(universalScriptPath('https://a.test/x/file.js#x'),universalScriptPath('https://a.test/x/file.js#y'));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-universal-'));
try {
 await fs.mkdir(path.join(root,'Resource/Loon'),{recursive:true});
 const url='https://author.test/same.js',source='$done({body:$response.body});',rawPath='Resource/Backup/script/raw/same.js';
 const entry={file:'source.lpx',source:'https://author.test/plugin.lpx',qx:'one.snippet',surge:'one.sgmodule'};
 await fs.writeFile(path.join(root,'Resource/Loon/source.lpx'),'[Script]\nresponse if ${url} ~= /api/ then script("'+url+'") with tag="A"\nresponse if ${url} ~= /other/ then script("'+url+'") with tag="B"\n');
 const artifacts=[{relative:'Adblock/Quantumult X/one.snippet',text:'^https://a url script-response-body '+url+'#value=1\n'},{relative:'Adblock/Surge/one.sgmodule',text:'A = type=http-response,pattern=a,script-path='+url+'#value=1,requires-body=true\n'}];
 const index:any={objects:{[rawPath]:{path:rawPath,kind:'script',url,sha256:crypto.createHash('sha256').update(source).digest('hex')}},latest:{[url]:rawPath}};
 const changes=new Map<string,any>([[rawPath,Buffer.from(source)]]);
 const report=await prepareScriptApiAdapters(root,{artifacts,catalog:[entry],index,changes,rawBase:'https://raw.test/main'});
 assert.equal(report.universal,1);assert.equal(report.adapted,2);assert.equal(Object.keys(index.adapters).length,1);
 const first=scriptReferences(changes.get(artifacts[0].relative))[0].value;
 assert.equal(first,scriptReferences(changes.get(artifacts[1].relative))[0].value);assert.ok(first.endsWith('/same.js#value=1'));
 const adapter=Object.values<any>(index.adapters)[0];assert.deepEqual(adapter.targets,['qx','surge','loon']);
 const nextArtifacts=artifacts.map(a=>({...a,text:changes.get(a.relative)}));
 const second=new Map<string,any>([[rawPath,Buffer.from(source)]]);
 await prepareScriptApiAdapters(root,{artifacts:nextArtifacts,catalog:[entry],index,changes:second,rawBase:'https://raw.test/main'});
 assert.equal(second.get(adapter.path),changes.get(adapter.path));
 assert.equal(second.get(artifacts[0].relative),changes.get(artifacts[0].relative));
}finally{await fs.rm(root,{recursive:true,force:true});}
console.log('Universal adblock scripts: identical bytes in QX/Surge/Loon, native/foreign contexts, one author body, original filenames, URL collision isolation, scope exclusions, shared bindings and repeat stability passed');

// Identical source-named binary/echo programs must keep the three real result shapes.
for(const scenario of ['binary','echo'] as const) {
 const source=scenario==='binary'?'$done({bodyBytes:$response.bodyBytes});':'$done({status:"HTTP/1.1 201 Created",body:"made"});';
 const plan=planUniversalAdblockScript(source,'qx',[{phase:scenario==='binary'?'response':'echo'}]);
 assert.equal(plan.status,'universal',JSON.stringify(plan.problems));
 for(const target of ['qx','surge','loon']) {
  let result:any;
  const slice=new Uint8Array(new Uint8Array([9,1,2,8]).buffer,1,2);
  const context=scenario==='binary'?{$response:target==='qx'?{bodyBytes:slice.buffer.slice(1,3),statusCode:200}:{body:slice,status:200}}:{$request:{url:'https://example.test'}};
  vm.runInNewContext(plan.code!,{...hosts[target],Uint8Array,ArrayBuffer,Date,setTimeout,...context,$done:(v:any)=>result=v});
  if(scenario==='binary')assert.deepEqual([...new Uint8Array(target==='qx'?result.bodyBytes:result.body)],[1,2]);
  else if(target==='qx'){assert.equal(result.status,'HTTP/1.1 201 Created');assert.equal(result.body,'made');}
  else {assert.equal(result.response.status,201);assert.equal(result.response.body,'made');}
 }
}
console.log('Universal binary/echo programs passed on the same bytes in all three hosts');
