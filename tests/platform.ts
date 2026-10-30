// Modified: 2026-10-30 (chance). Native TypeScript contracts for ports of rule
// aggregation, source discovery, monitor integrity and publication evidence.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import crypto from 'node:crypto';
import {build,normalized,Rule,regexNative,nativeRules,serialize,geosites} from '../src/domain/aggregate.ts';
import {archiveOpaque,identifyResource,opaqueEntries,clearOpaque} from '../src/ingest/formats.ts';
import {buildCatalog,extractLpxUrl,buildRucu6Catalog} from '../src/ingest/catalog.ts';
import {monitorSource,normalizeDocument,selected} from '../src/application/monitor.ts';
import {commitFiles,safePath} from '../src/publish/transaction.ts';
import {executeChecks,publicationGate} from '../src/application/automation.ts';
import {validateQX,validateSurgeModule,convertPlugin} from '../src/index.ts';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-platform-')),cwd=process.cwd();
try{
 const cases=JSON.parse(await fs.readFile('.github/converter/fixtures/rule-migration.json','utf8'));
 for(const c of cases)assert.deepEqual(build(c.config,Object.fromEntries(Object.entries(c.inputs).map(([id,v])=>[id,Buffer.from(v as string,'base64')]))),c.expected);
 assert.equal(normalized('host','EXAMPLE.COM.'),new Rule('DOMAIN','example.com'));
 assert.equal(new Set([normalized('DOMAIN','EXAMPLE.COM'),normalized('DOMAIN','example.com.')]).size,1);
 assert.equal(normalized('IP-CIDR6','2001:db8::1/32').value,'2001:db8::/32');
 for(const policy of ['PROXY','proxy','ai','Media',''])assert.equal(serialize(new Rule('DOMAIN','example.com'),policy,'QuantumultX'),'host,example.com,ssid');
 for(const pattern of ['foo\\.example\\.com$','^a[0-9]+\\.example\\.com$','^a[0-9]{4}\\.example\\.com$','^(?=a)a\\.example\\.com$'])assert.equal(regexNative(pattern),null);
 assert.equal(regexNative('^app[0-9]{2}\\.example\\.com$')?.size,100);
 const filtered:any[]=[];assert.equal(nativeRules('PROCESS-PATH,/App,PROXY\nUID,1000,PROXY\nAND,((DOMAIN,example.com),(PROCESS-NAME,app)),PROXY',{id:'desktop',format:'ruleset'},filtered).length,0);assert.equal(filtered.length,3);
 for(const bytes of [Buffer.from([10,5,97]),Buffer.from([8,1]),Buffer.alloc(11,128)])assert.throws(()=>geosites(bytes));
 const entry={id:'Example',source:'https://kelee.one/Tool/Loon/Lpx/example.lpx',file:'example.lpx',qx:'example.snippet',surge:'example.sgmodule',category:'去广告'};
 const encrypted=entry.source+'e';assert.equal(extractLpxUrl({url:encrypted}),encrypted);
 const [catalog]=buildCatalog([{url:encrypted,tag:['去广告']}],[entry],[]);assert.deepEqual(catalog,[{...entry,source:encrypted}]);
 const rucu=await buildRucu6Catalog(['https://rucu6.pages.dev/Plugins/demo.lpxe'],[],[]);assert.equal(rucu[0].file,'RuCu6/demo.lpxe');
 assert.equal(identifyResource(Buffer.from('readable'),encrypted),'encrypted-loon');assert.equal(identifyResource(Buffer.from([0xff]),entry.source),'opaque');assert.equal(identifyResource(Buffer.from('<html>blocked</html>'),entry.source),'html');
 const bytes=Buffer.from([0,255,10,20]);const record=await archiveOpaque(root,entry.id,encrypted,bytes,'encrypted-loon');assert.deepEqual(await fs.readFile(path.join(root,record.storage)),bytes);assert.equal((await opaqueEntries(root))[entry.id].sha256,record.sha256);
 await fs.writeFile(path.join(root,record.storage),'corrupt');await assert.rejects(opaqueEntries(root),/checksum/);await fs.writeFile(path.join(root,record.storage),bytes);await clearOpaque(root,entry.id);assert.deepEqual(await opaqueEntries(root),{});assert.deepEqual(await fs.readFile(path.join(root,record.storage)),bytes);
 const source='#!name=Example\n#!source=abcDEF0123\n[Rule]\nDOMAIN,ads.example,REJECT\n';const output=convertPlugin(entry,source,{stamp:'2026-10-30',rawBase:'https://example.test'});validateQX(output.qx,entry);validateSurgeModule(output.surge,entry);for(const text of [output.qx,output.surge])assert.ok(text.includes('#!source=abcDEF0123'));
 assert.throws(()=>safePath(root,'../escape'));await commitFiles(root,new Map([['transaction/one','old']]));await fs.writeFile(path.join(root,'block'),'file');await assert.rejects(commitFiles(root,new Map([['transaction/one','new'],['block/child','bad']])));assert.equal(await fs.readFile(path.join(root,'transaction/one'),'utf8'),'old');
 // First-install encrypted inputs create no invented target; existing outputs stay byte-identical.
 const {syncCatalogEntry}=await import('../src/application/sync-convert.ts');
 const opaqueEntry={...entry,id:'Opaque',file:'Opaque.lpxe',source:'https://example.test/Opaque.lpxe',qx:'Opaque.snippet',surge:'Opaque.sgmodule'};
 const result=await syncCatalogEntry(opaqueEntry,{root,fetchBytes:async()=>bytes,log:()=>{}});assert.equal(result.opaque,true);assert.equal(result.baselineAvailable,false);
 await assert.rejects(fs.stat(path.join(root,'Adblock/Quantumult X/Opaque.snippet')),e=>e.code==='ENOENT');
 await commitFiles(root,new Map([['Resource/Loon/Opaque.lpxe',source],['Adblock/Quantumult X/Opaque.snippet','old-qx'],['Adblock/Surge/Opaque.sgmodule','old-surge']]));
 assert.equal((await syncCatalogEntry(opaqueEntry,{root,fetchBytes:async()=>bytes,log:()=>{}})).baselineAvailable,true);assert.equal(await fs.readFile(path.join(root,'Adblock/Surge/Opaque.sgmodule'),'utf8'),'old-surge');
 await assert.rejects(syncCatalogEntry({...opaqueEntry,source:'https://example.test/plain.lpx'},{root,fetchBytes:async()=>Buffer.from('invalid plain text'),log:()=>{}}),/valid Loon plugin/);
 await fs.mkdir(path.join(root,'.github/converter/fixtures'),{recursive:true});await fs.writeFile(path.join(root,'.github/sources/loon.json'),JSON.stringify([opaqueEntry]));await fs.copyFile(path.join(cwd,'.github/converter/fixtures/review-inventory-baseline.json'),path.join(root,'.github/converter/fixtures/review-inventory-baseline.json'));
 const {spawnSync}=await import('node:child_process');const report=spawnSync(process.execPath,[path.join(cwd,'src/publish/conversion-reports.ts')],{cwd:root,encoding:'utf8'});assert.equal(report.status,0,report.stderr);assert.match(await fs.readFile(path.join(root,'.github/monitor/.runtime/conversion-reconciliation.md'),'utf8'),/opaque source archived/);
 // Paused sources retain verified stored artifacts without claiming a fresh conversion.
 await commitFiles(root,new Map([['.github/sources/loon.json',JSON.stringify([opaqueEntry,entry])],['.github/sources/kelee-pause.json',JSON.stringify({paused:true})],['.github/monitor/.runtime/sync-failures.json',JSON.stringify({version:2,publishable:true,failures:[],retainedPlugins:[entry.id],convertedPlugins:[]})],['Resource/Loon/'+entry.file,source],['Adblock/Quantumult X/'+entry.qx,output.qx],['Adblock/Surge/'+entry.surge,output.surge]]));
 const pausedReport=spawnSync(process.execPath,[path.join(cwd,'src/publish/conversion-reports.ts')],{cwd:root,encoding:'utf8'});assert.equal(pausedReport.status,0,pausedReport.stderr);const reconciliation=JSON.parse(await fs.readFile(path.join(root,'.github/monitor/.runtime/conversion-reconciliation.json'),'utf8'));assert.equal(reconciliation.entries.find(e=>e.id===entry.id).paused,true);assert.equal(reconciliation.entries.find(e=>e.id===entry.id).retained,true);
 // Explicit empty feeds are legitimate, while default byte downloads still reject empty responses.
 const {loadInputs}=await import('../src/application/rules.ts');const acquisitionRoot=path.join(root,'rule-acquisition');await fs.mkdir(path.join(acquisitionRoot,'.github/sources'),{recursive:true});
 const cfg={geosite:{release_api:'https://api.example.test/release'},sources:[{id:'empty',url:'https://example.test/empty',format:'ruleset',allow_empty:true}]};const cfgPath=path.join(acquisitionRoot,'.github/sources/rules.json');await fs.writeFile(cfgPath,JSON.stringify(cfg));
 const fetchSaved=globalThis.fetch,geo=Buffer.from('geosite-bytes'),checksum=crypto.createHash('sha256').update(geo).digest('hex');
 globalThis.fetch=async(url)=>new Response(url===cfg.geosite.release_api?JSON.stringify({published_at:new Date().toISOString(),assets:[{name:'dlc.dat',browser_download_url:'https://example.test/geosite'},{name:'dlc.dat.sha256sum',browser_download_url:'https://example.test/checksum'}]}):String(url).endsWith('/empty')?'':String(url).endsWith('/checksum')?checksum:geo);
 try{const [downloaded]=await loadInputs(acquisitionRoot,cfg,true);assert.equal(downloaded.empty.length,0);assert.equal((await loadInputs(acquisitionRoot,cfg,false))[0].empty.length,0);cfg.sources[0].allow_empty=false;await fs.writeFile(cfgPath,JSON.stringify(cfg));await assert.rejects(loadInputs(acquisitionRoot,cfg,true),/empty response/);}finally{globalThis.fetch=fetchSaved;}
 await fs.symlink(path.join(cwd,'src'),path.join(root,'src'),'dir');
 const failedRules=spawnSync(process.execPath,[path.join(cwd,'src/cli.ts'),'rules'],{cwd:root,encoding:'utf8'});assert.equal(failedRules.status,1);const {ruleIssueCandidates}=await import('../src/application/propose-conversion-issues.ts');const failedRuleReport=await ruleIssueCandidates(root);assert.equal(failedRuleReport.ruleReport.complete,false);assert.deepEqual(failedRuleReport.ruleReport.quarantined,[]);assert.match(failedRuleReport.ruleReport.error,/Missing JSON/);

 // Force a failure after the first write, then verify every owned byte is restored.
 const rename=fs.rename;fs.rename=async(from,to)=>{if(String(to).endsWith('/transaction/two'))throw Error('injected rename failure');return rename(from,to);};
 try{await assert.rejects(commitFiles(root,new Map([['transaction/one','new'],['transaction/two','next']])),e=>e.rollbackSucceeded===true);}finally{fs.rename=rename;}
 assert.equal(await fs.readFile(path.join(root,'transaction/one'),'utf8'),'old');await assert.rejects(fs.stat(path.join(root,'transaction/two')));

 const src={id:'http',kind:'http',url:'https://example.test/spec',save_as:'spec.txt'},settings={mirror_root:'mirror'};let sent:any;
 const response=async(_url:string,options:any)=>{sent=options;return {status:200,bytes:Buffer.from('original\r\n'),headers:new Headers({etag:'v1'}),finalUrl:src.url};};
 const first=await monitorSource(root,src,{},settings,response);await commitFiles(root,first.changes);assert.equal(first.changed,false);
 const unchanged=await monitorSource(root,src,first.state,settings,async(_url,opts)=>{sent=opts;return {...await response(_url,opts),status:304};});assert.equal(unchanged.stateChanged,false);assert.equal(sent.headers['If-None-Match'],'v1');
 await fs.writeFile(path.join(root,'mirror/spec.txt'),'corrupt');await monitorSource(root,src,first.state,settings,response);assert.equal(sent.headers['If-None-Match'],undefined);await assert.rejects(monitorSource(root,src,first.state,settings,async()=>({...await response('',{}),status:304})),/304/);
 assert.equal(normalizeDocument(Buffer.from('<p>A &amp; B</p><script>ignored</script><p>C</p>'),'html_text').toString(),'A & B\nC\n');assert.equal(selected('a/b.js',['*.js']),true);assert.equal(selected('b.js',['[a-c].js']),true);assert.equal(selected('d.js',['[!a-c].js']),true);assert.equal(selected('b.js',['[!a-c].js']),false);
 process.chdir(root);const errorLog=console.error;console.error=()=>{};await assert.rejects(executeChecks('fixture',[['fail',[process.execPath,'-e','process.exit(2)']],['next',[process.execPath,'-e','console.log("done")']]]));
 const evidence=JSON.parse(await fs.readFile('.github/monitor/.runtime/validation-results.json','utf8'));assert.deepEqual(evidence.stages.fixture.checks.map((c:any)=>c.status),['failed','passed']);
 const required=['catalog','rules','loon_sync','verify','reports','issues'];const stages=Object.fromEntries(required.map(name=>[name,{outcome:'success'}]));const validation={version:1,stages:Object.fromEntries(required.filter(x=>x!=='issues').map(name=>[name,{complete:true,checks:[{status:'passed'}]}]))};
 await fs.writeFile('.github/monitor/.runtime/validation-results.json',JSON.stringify(validation));const env={STAGES:JSON.stringify(stages),SYNC_PUBLISHABLE:'true'};assert.equal((await publicationGate(env)).publishable,true);assert.equal((await publicationGate({...env,SYNC_PUBLISHABLE:'false'})).publishable,false);assert.equal((await publicationGate({...env,STAGES:JSON.stringify({...stages,verify:{outcome:'skipped'}})})).publishable,false);
 console.error=errorLog;console.log(`Platform contracts passed: ${cases.length} pre-migration rule baselines, archive bytes, stable catalog identities, metadata, rollback, monitor and gates`);
}finally{process.chdir(cwd);await fs.rm(root,{recursive:true,force:true});}
