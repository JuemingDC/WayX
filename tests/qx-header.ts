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
// Modified: 2026-11-03 (chance). Optional schemes retain host/path separation and cannot hide real same-host overlap.
assert.equal(disjointUrls('^https?://a/','^http://b/'),true);
assert.equal(disjointUrls('^https?://a/','^https://a/'),false);
assert.equal(disjointUrls('^http?://a/','^htt://a/'),false);
assert.equal(disjointUrls('^https?://a/|^http://b/','^http://b/'),false);
assert.equal(disjointUrls('^http://.+/amdc','^http://a/amdc'),false);
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
 assert.equal(p.report[0].status,'converted');assert.doesNotMatch(p.output,/REVIEW REQUIRED/);assert.match(p.output,/^# Native QX review count: 0$/m);
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
assert.equal(overlap.report[0].status,'converted');
assert.doesNotMatch(overlap.output,/REVIEW REQUIRED/);
assert.match(overlap.output,/^# Native QX review count: 0$/m);
assert.doesNotMatch(overlap.output,/^\^https:\/\/example\\.test\/ _ reject$/m);
const overlapCode=[...overlap.changes].find(([key])=>key.endsWith('.js'))![1];
for(const [url,ua,status] of [
 ['https://example.test/ad','leisu',404],
 ['https://example.test/ad','other',200],
 ['https://example.test/other','leisu',200],
] as const) {
 const done:any[]=[];
 vm.runInNewContext(overlapCode,{$request:{method:'GET',url,headers:{'User-Agent':ua}},$done:(x:any)=>done.push(x)});
 assert.equal(done.length,1);
 assert.equal(done[0].response.status,status);
}
assert.equal(prepareQxHeaderRewrites({...overlap,index:{},rawBase}).length,0);
const priority=plan(['^https://example\\.test/ url reject-dict','^https://example\\.test/ad leisu* url-and-header reject']);
assert.equal(priority.report[0].status,'converted');
const priorityCode=[...priority.changes].find(([key])=>key.endsWith('.js'))![1];
const first:any[]=[];
vm.runInNewContext(priorityCode,{$request:{method:'GET',url:'https://example.test/ad',headers:{'User-Agent':'leisu'}},$done:(x:any)=>first.push(x)});
assert.equal(first[0].response.status,200);
assert.equal(first[0].response.body,'{}');
const incompatible=plan(['^https://example\\.test/ad leisu* url-and-header reject','^https://example\\.test/ url script-response-body https://author.test/remote.js']);
assert.equal(incompatible.report[0].status,'review');
assert.match(incompatible.output,/REVIEW REQUIRED/);
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

// Modified: 2026-11-03 (chance). Real broad-pattern intersections must not be reclassified as safe merely because hostnames look different.
for (const [left,right,url] of [
 ['^http://.+/amdc/mobileDispatch','^http://59\\.82\\.113\\.10/amdc/mobileDispatch\\?appkey=213807&','http://59.82.113.10/amdc/mobileDispatch?appkey=213807&'],
 ['^https://gw\\.xiaocantech\\.com/rpc','^https?://.+?\\.58cdn\\.com\\.cn/brandads/','https://gw.xiaocantech.com/rpc/.58cdn.com.cn/brandads/'],
]) { assert.ok(new RegExp(left).test(url)); assert.ok(new RegExp(right).test(url)); assert.equal(disjointUrls(left,right),false); }
const optionalScheme=plan(['^http://amdc\\.m\\.taobao\\.com/amdc/mobileDispatch App* url-and-header reject','^https?://gw\\.alicdn\\.com/imgextra/ url reject-dict']);
assert.equal(optionalScheme.report[0].status,'converted');assert.doesNotMatch(optionalScheme.output,/REVIEW REQUIRED/);

// Modified: 2026-11-03 (chance). Authorized URL-only consolidation preserves the
// original QX source and all Header provenance comments; Surge emits one reject.
const sameUrl = '^http:\\/\\/.+\\/amdc\\/mobileDispatch';
const nativeMerge = plan([
  sameUrl + ' %E8%8F%9C%E9%B8%9F%E8%A3%B9%E8%A3%B9* url-and-header reject',
  sameUrl + ' %E9%97%B2%E9%B1%BC* url-and-header reject',
]);
assert.deepEqual(nativeMerge.report.map((r:any)=>r.status),['converted','converted']);
assert.ok(nativeMerge.report.every((r:any)=>r.mode==='authorized-url-only-merge'));
const nativeRejectLines = nativeMerge.output.split('\n').filter(x=>x.endsWith(' _ reject') && x.includes('mobileDispatch'));
assert.equal(nativeRejectLines.length,1);
assert.ok(new RegExp(nativeRejectLines[0].slice(0,-' _ reject'.length)).test('http://example.test/amdc/mobileDispatch'));
assert.match(nativeMerge.output,/COMPATIBILITY EXCEPTION/);
assert.doesNotMatch(nativeMerge.output,/REVIEW REQUIRED/);
assert.match(nativeMerge.output,/^# Native QX review count: 0$/m);
assert.doesNotMatch(nativeMerge.output,/^#!desc=Native QX conversion · [1-9]\d* declarations require review$/m);
assert.ok(nativeMerge.output.includes('# Source declaration: '+sameUrl+' %E9%97%B2%E9%B1%BC* url-and-header reject'));
assert.equal([...nativeMerge.changes.keys()].filter(x=>x.endsWith('.js')).length,0);
assert.equal(prepareQxHeaderRewrites({...nativeMerge,index:{},rawBase}).length,0);

// Differing actions must not be coalesced into a URL-only rule.
const differentActions = plan([
  sameUrl + ' appA url-and-header reject',
  sameUrl + ' appB url-and-header reject-dict',
]);
assert.doesNotMatch(differentActions.output,/COMPATIBILITY EXCEPTION/);
assert.doesNotMatch(differentActions.output,/^http:\\\/\\\/.+\\\/amdc\\\/mobileDispatch _ reject$/m);

// A distinct fixed-host URL keeps its Header guard, even if the generic
// intersection checker sees broad regexes with no concrete shared authority.
const isolatedHeader = plan([
  '^https:\\/\\/gw\\.xiaocantech\\.com\\/rpc BatchMatchPlacement|WaitClaimedPoints|GetBannerList url-and-header reject-dict',
  '^https?:\\/\\/.+?\\.58cdn\\.com\\.cn\\/brandads\\/ url reject-200',
]);
assert.equal(isolatedHeader.report[0].status,'converted');
assert.match(isolatedHeader.output,/wayx_qx_header_.*type=http-request/);
assert.doesNotMatch(isolatedHeader.output,/REVIEW REQUIRED/);
assert.match(isolatedHeader.output,/^# Native QX review count: 0$/m);
const isolatedCode = [...isolatedHeader.changes].find(([key])=>key.endsWith('.js'))![1];
for (const [value,hit] of [['BatchMatchPlacement',true],['Unrelated',false]]) {
  const done:any[]=[];
  vm.runInNewContext(isolatedCode,{
    $request:{url:'https://gw.xiaocantech.com/rpc',method:'POST',headers:{'X-RPC-Method':value}},
    $done:(result:any)=>done.push(result),
  });
  assert.equal(done.length,1);
  if(hit) {
    assert.equal(done[0].response.status,200);
    assert.equal(done[0].response.body,'{}');
  } else assert.deepEqual(JSON.parse(JSON.stringify(done[0])),{});
}
assert.equal(prepareQxHeaderRewrites({...isolatedHeader,index:{},rawBase}).length,0);

