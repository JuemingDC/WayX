// Modified: 2026-11-03 (chance). Verify conjunction behavior and shadowing boundaries with independent HTTP fixtures.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {parseQxHeaderPredicate as parse, headerPredicateRuntime, disjointUrls, headerArgumentPrefix} from '../src/domain/qx-header.ts';
import {prepareQxHeaderRewrites} from '../src/application/qx-header.ts';
import {convertNativeQxToSurge} from '../src/emit/conversion.ts';
import {planUniversalAdblockScript} from '../src/parser/universal-script.ts';
import {validateSurgeModule} from '../src/validation/output.ts';
const match=vm.runInNewContext('('+headerPredicateRuntime+')');
const predicate=parse('leisu*');
assert.ok(predicate);
for(const headers of [{ 'User-Agent':'leisu/1' },[{field:'X-App',value:'other'},{field:'X-App',value:'leisu/2'}]])
 assert.equal(match(predicate,{method:'GET',url:'https://x/a',headers}),true);
assert.equal(match(predicate,{method:'GET',url:'https://x/leisu',headers:{}}),true);
assert.equal(match(predicate,{method:'GET',url:'https://leisu.test/a',headers:{}}),false);
assert.equal(match(predicate,{method:'GET',url:'https://x/a',headers:{ua:'LEISU'}}),false);
assert.equal(match(parse('^POST[ ]'),{method:'POSTER',headers:{}}),false);
assert.equal(parse('(?m)^X:.*$'),null);
assert.equal(disjointUrls('^https?://same/','^http://same/'),false);
assert.equal(disjointUrls('^https://a/|https://b/','^https://c/'),false);
assert.equal(disjointUrls('^https://a/','^https://b/'),true);
assert.equal(disjointUrls('^https://a/(?:x|y)','^https://b/'),true);
const rawBase='https://raw.githubusercontent.com/JuemingDC/WayX/main';
function plan(lines:string[], extra:any={}) {
 const qx='# Managed by: WayX Native QX\n# [rewrite_local]\n'+lines.join('\n')+'\n# [mitm]\nhostname = example.test\n';
 const surge=convertNativeQxToSurge(qx,{id:'fixture'}).surge;
 const artifacts=[{relative:'Adblock/Quantumult X/fixture.snippet',text:qx},{relative:'Adblock/Surge/fixture.sgmodule',text:surge}];
 const changes=new Map<string,any>(extra.changes??[]);
 const report=prepareQxHeaderRewrites({artifacts,changes,index:extra.index??{},rawBase});
 const output=changes.get(artifacts[1].relative)??surge;
 validateSurgeModule(output,{id:'fixture'});
 return {artifacts,changes,report,output};
}
for(const action of ['reject','reject-dict','reject-array','reject-200']) {
 const p=plan(['^https://example\\.test/ad leisu* url-and-header '+action]);
 assert.equal(p.report[0].status,'converted');assert.doesNotMatch(p.output,/REVIEW REQUIRED/);
 const code=[...p.changes].find(([k])=>k.endsWith('.js'))![1];
 for(const [url,ua,hit] of [['https://example.test/ad','leisu',true],['https://example.test/ad','other',false]]) {
  const results:any[]=[];vm.runInNewContext(code,{$request:{url,method:'GET',headers:{'User-Agent':ua}},$done:(x:any)=>results.push(x)});
  assert.equal(results.length,1);
  const expected=!hit?{}:action==='reject'?{response:{status:404,headers:{},body:''}}:{response:{status:200,headers:action==='reject-200'?{}:{'Content-Type':'application/json'},body:action==='reject-dict'?'{}':action==='reject-array'?'[]':''}};
  assert.deepEqual(JSON.parse(JSON.stringify(results[0])),expected);
 }
 const again=prepareQxHeaderRewrites({...p,index:{},rawBase});assert.equal(again.length,0);
}
const overlap=plan(['^https://example\\.test/ad leisu* url-and-header reject','^https://example\\.test/ url reject-dict']);
assert.equal(overlap.report[0].status,'review');assert.match(overlap.output,/REVIEW REQUIRED/);
const body='// author remains intact\n$done({body:"changed"});';
const program=planUniversalAdblockScript(body,'qx',[{phase:'response',responseBody:true}]);
assert.equal(program.status,'universal');assert.ok(program.code!.includes(body));
const file='Script/Adblock/test-123456789abc/script.js';
const p=plan(['^https://example\\.test/ad (?i)\\r\\nUser-Agent:\\s*QQSportsV3\\/ url-and-header script-response-body '+rawBase+'/'+file],{changes:[[file,program.code]],index:{adapters:{[file]:{from:'qx'}}}});
assert.equal(p.report[0].status,'converted');
const argument=p.output.match(/argument=(\S+)/)![1];assert.ok(argument.startsWith(headerArgumentPrefix));
for(const [ua,expected] of [['QQSportsV3/1','changed'],['other',undefined]]) {
 const results:any[]=[];vm.runInNewContext(program.code!,{$environment:{'surge-version':'6'},$argument:argument,$request:{method:'GET',url:'https://example.test/ad',headers:{'user-agent':ua}},$response:{body:'original'},$done:(x:any)=>results.push(x)});
 assert.equal(results.length,1);assert.equal(results[0].body,expected);
}
console.log('QX header conjunctions: rejection status/bodies, native URL declarations, header fields/method/path, duplicate headers, shared author guard, disjointness and idempotence passed');
