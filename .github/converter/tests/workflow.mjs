// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / workflow / Regression Suite

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { conversionStampFromText, firstConversionStamp, generatedScriptDiffs, inspectManagedSource, isWayxGeneratedHelperFilename, managedSourceDigest, managedTargetDiffs, normalizeManagedSource, readCatalogSource, readManagedTargetState, syncGeneratedScripts, syncManagedSource, writeManagedSource, writeManagedTargets, ORIGINAL_FETCH_PROFILES, WAYX_FETCH_UA, WAYX_LOON_FETCH_UA, resolveOriginalUrl, selectOriginalFetchProfile, loadLoonSourceCatalog, qxTargetPath, surgeTargetPath } from "../src/index.mjs";
import { createWorkflowFailureReporter, formatWorkflowErrorAnnotation, buildSyncFailure, failureDeclarationContext, README_AUTO_UPDATE_INTERVAL, QX_MIXED_REWRITE_MIN_BUILD, buildReadmePlan, qxAddResourceUrl, qxSnippetInstallUrl, surgeModuleInstallUrl } from "../src/workflow.mjs";
import { isLoonPluginSource } from "../../scripts/sync-convert.mjs";
import { syncFailureIssueBody, syncFailureTitle, targetProblemIssueBody, targetProblemTitle } from "../../scripts/propose-conversion-issues.mjs";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["managed-artifacts.mjs","workflow-diagnostics.mjs","workflow-control.mjs","upstream-automation.mjs","source-fetch.mjs","readme-index.mjs","manual-assets.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "managed-artifacts.mjs") {
// Suite case: managed-artifacts.mjs
const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-managed-artifacts-'));
const entry={
  id:'ManagedArtifactFixture',
  file:'managed-artifact.lpx',
  qx:'ManagedArtifactFixture.snippet',
  surge:'ManagedArtifactFixture.sgmodule',
};

try {
  const source=normalizeManagedSource('\uFEFF#!name=Managed Artifact\r\n[Rule]\r\nDOMAIN,example.com,REJECT\r\n\r\n');
  assert.equal(source,'#!name=Managed Artifact\n[Rule]\nDOMAIN,example.com,REJECT\n');
  assert.equal(managedSourceDigest(source).length,12);

  const inspected=await inspectManagedSource(root,entry,source);
  assert.equal(inspected.changed,true);
  await assert.rejects(readCatalogSource(root,entry));
  assert.equal(await writeManagedSource(inspected,source),true);
  assert.equal(await readCatalogSource(root,entry),source);

  const firstSource=await syncManagedSource(root,entry,source);
  assert.equal(firstSource.changed,false);
  assert.equal(await readCatalogSource(root,entry),source);

  const secondSource=await syncManagedSource(root,entry,source);
  assert.equal(secondSource.changed,false);

  const changedSource=source.replace('example.com','ads.example.com');
  const thirdSource=await syncManagedSource(root,entry,changedSource);
  assert.equal(thirdSource.changed,true);
  assert.equal(await readCatalogSource(root,entry),changedSource);

  let targets=await readManagedTargetState(root,entry);
  assert.equal(targets.qx,null);
  assert.equal(targets.surge,null);

  const qx='# Converted: 2026-10-01 08:00:00 +08:00\n# [filter_local]\nhost, example.com, reject\n# [rewrite_local]\n# [mitm]\n';
  const surge='# Converted: 2026-10-01 09:00:00 +08:00\n[Rule]\nDOMAIN,example.com,REJECT\n';
  assert.deepEqual(managedTargetDiffs(targets,{qx,surge}),['qx','surge']);
  assert.deepEqual(await writeManagedTargets(targets,{qx,surge}),['qx','surge']);

  targets=await readManagedTargetState(root,entry);
  assert.equal(targets.qx,qx);
  assert.equal(targets.surge,surge);
  assert.equal(conversionStampFromText(targets.qx),'2026-10-01 08:00:00 +08:00');
  assert.equal(firstConversionStamp([targets.qx,targets.surge],{trim:true}),'2026-10-01 08:00:00 +08:00');
  assert.equal(firstConversionStamp([null,targets.surge],{trim:true}),'2026-10-01 09:00:00 +08:00');
  assert.deepEqual(managedTargetDiffs(targets,{qx,surge}),[]);
  assert.deepEqual(
    managedTargetDiffs({...targets,surge:null},{qx,surge}),
    ['surge'],
    'missing canonical targets are stale and must be reported as target diffs',
  );
  assert.deepEqual(await writeManagedTargets(targets,{qx,surge}),[]);

  const helpers=new Map([
    ['a.js','// a\n'],
    ['b.js','// b\n'],
  ]);
  assert.deepEqual(await generatedScriptDiffs(root,entry,helpers),['a.js','b.js']);
  assert.deepEqual(await syncGeneratedScripts(root,entry,helpers),['a.js','b.js']);
  assert.deepEqual(await generatedScriptDiffs(root,entry,helpers),[]);
  assert.deepEqual(await syncGeneratedScripts(root,entry,helpers),[]);

  const changedHelpers=new Map([
    ['a.js','// a\n'],
    ['b.js','// b changed\n'],
  ]);
  assert.deepEqual(await generatedScriptDiffs(root,entry,changedHelpers),['b.js']);
  assert.deepEqual(await syncGeneratedScripts(root,entry,changedHelpers),['b.js']);
  assert.deepEqual(await generatedScriptDiffs(root,entry,changedHelpers),[]);

  assert.equal(isWayxGeneratedHelperFilename('mock_0123456789.js'),true);
  assert.equal(isWayxGeneratedHelperFilename('legacy_json_add_qx_abcdef1234.js'),true);
  assert.equal(isWayxGeneratedHelperFilename('manual.js'),false);
  assert.equal(isWayxGeneratedHelperFilename('mock_not-a-hash.js'),false);

  const helperDir=path.join(root,'Script',entry.id);
  await fs.writeFile(path.join(helperDir,'mock_0123456789.js'),'// stale generated helper\n');
  await fs.writeFile(path.join(helperDir,'manual.js'),'// manual helper must survive\n');
  assert.deepEqual(
    await generatedScriptDiffs(root,entry,changedHelpers),
    ['delete:mock_0123456789.js'],
  );
  assert.deepEqual(
    await syncGeneratedScripts(root,entry,changedHelpers),
    ['delete:mock_0123456789.js'],
  );
  await assert.rejects(fs.access(path.join(helperDir,'mock_0123456789.js')));
  assert.equal(await fs.readFile(path.join(helperDir,'manual.js'),'utf8'),'// manual helper must survive\n');

  console.log('managed artifact I/O contract passed');
} finally {
  await fs.rm(root,{recursive:true,force:true});
}
}

if (selectedCase === "workflow-diagnostics.mjs") {
// Suite case: workflow-diagnostics.mjs
assert.equal(
  formatWorkflowErrorAnnotation(
    {id:'Demo'},
    {message:'line 1\nline 2'},
  ),
  '::error title=Demo::line 1%0Aline 2'
);

assert.equal(
  formatWorkflowErrorAnnotation(
    {id:'Demo'},
    'plain failure',
    {annotationFallback:'error'},
  ),
  '::error title=Demo::plain failure'
);

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Failures',
    writeError:value=>output.push(value),
  });
  const error={stack:'STACK TRACE',message:'sync line 1\nsync line 2'};
  reporter.capture({id:'SyncEntry'},error);

  assert.equal(reporter.size,1);
  assert.deepEqual(reporter.snapshot(),['SyncEntry: STACK TRACE']);
  assert.deepEqual(output,[
    '::error title=SyncEntry::sync line 1%0Async line 2',
  ]);
  assert.equal(reporter.report(),true);
  assert.deepEqual(output,[
    '::error title=SyncEntry::sync line 1%0Async line 2',
    '\nFailures:\nSyncEntry: STACK TRACE',
  ]);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Failures',
    writeError:value=>output.push(value),
  });
  reporter.capture({id:'SyncPrimitive'},'plain failure');
  assert.deepEqual(reporter.snapshot(),['SyncPrimitive: undefined']);
  assert.deepEqual(output,['::error title=SyncPrimitive::undefined']);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    summaryLabel:'Canonical regeneration failures',
    detailFallback:'error',
    annotationFallback:'error',
    writeError:value=>output.push(value),
  });
  reporter.capture({id:'CanonicalEntry'},'plain failure');
  assert.deepEqual(reporter.snapshot(),['CanonicalEntry: plain failure']);
  assert.deepEqual(output,['::error title=CanonicalEntry::plain failure']);
  assert.equal(reporter.report(),true);
  assert.deepEqual(output,[
    '::error title=CanonicalEntry::plain failure',
    '\nCanonical regeneration failures:\nCanonicalEntry: plain failure',
  ]);
}

{
  const output=[];
  const reporter=createWorkflowFailureReporter({
    writeError:value=>output.push(value),
  });
  assert.equal(reporter.report(),false);
  assert.equal(reporter.size,0);
  assert.deepEqual(reporter.snapshot(),[]);
  assert.deepEqual(output,[]);
}

console.log('workflow diagnostics contract passed');
}

if (selectedCase === "workflow-control.mjs") {
// Suite case: workflow-control.mjs
// Workflow control-boundary regression contract.
// Author: chance
// Category: Converter / Workflow Architecture Test





const ROOT=process.cwd();
const sync=await fs.readFile(path.join(ROOT,'.github/scripts/sync-convert.mjs'),'utf8');
const canonical=await fs.readFile(path.join(ROOT,'.github/converter/tools/regenerate-canonical.mjs'),'utf8');
const managed=await fs.readFile(path.join(ROOT,'.github/converter/src/workflow.mjs'),'utf8');

assert.match(sync,/for \(const entry of manifest\)/,'sync must retain its own Catalog entry lifecycle');
assert.match(canonical,/for \(const entry of manifest\)/,'canonical must retain its own Catalog entry lifecycle');
assert.equal(/runCatalogEntries|processCatalogEntries|sharedCatalogLoop/.test(sync+canonical),false,
  'workflow entry lifecycles must not be forced through a shared loop abstraction');

assert.match(managed,/export function managedTargetDiffs\(state, out\)/,
  'managed artifact layer must own the pure target-diff primitive');
assert.match(sync,/managedTargetDiffs\(targetState,out\)\.some\(target =>/,
  'sync must reuse target diffs only for its existing-target drift check');
assert.match(sync,/target === 'qx' \? Boolean\(oldQx\) : Boolean\(oldSg\)/,
  'sync drift refresh must continue to ignore missing-target recovery');
assert.match(sync,/const helperChanges = await syncGeneratedScripts\(/,
  'sync must retain helper write results for status reporting');
assert.match(sync,/targetChanges\.length \|\| helperChanges\.length \|\| changed/,
  'helper-only repair must not be reported as fully unchanged');

assert.match(canonical,/const staleEntries = \[\]/,
  'canonical result tracking must name pre-write differences as stale entries');
assert.match(canonical,/const targetDiffs = managedTargetDiffs\(targetState,out\)/,
  'canonical stale detection must reuse the shared target-diff primitive');
assert.match(canonical,/const differs = targetDiffs\.length > 0 \|\| helperDiffs\.length > 0/,
  'canonical stale result must include both targets and generated helpers');
assert.match(canonical,/Stale canonical entries: ' \+ staleEntries\.join/,
  'canonical check-mode stale reporting must remain workflow-specific');

console.log('Workflow lifecycle/result boundary contract passed');
}

if (selectedCase === "upstream-automation.mjs") {
  const scopedWorkflow=await fs.readFile('.github/workflows/converter-check.yml','utf8');
  assert.ok(scopedWorkflow.indexOf('Refresh Kelee ad-block and dependency catalog')<scopedWorkflow.indexOf('Converter checkpoint'),'catalog refresh must precede category-sensitive golden checks');
  const issueFixture=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-issues-'));
  try {
    await fs.mkdir(path.join(issueFixture,'.github/sources'),{recursive:true});
    await fs.mkdir(path.join(issueFixture,'.github/converter/fixtures'),{recursive:true});
    await fs.mkdir(path.join(issueFixture,'.github/monitor/.runtime'),{recursive:true});
    await fs.mkdir(path.join(issueFixture,'Resource/Loon'),{recursive:true});
    const plugin={id:'IssueFixture',file:'test.lpx',source:'https://example.test/test.lpx',qx:'test.snippet',surge:'test.sgmodule',category:'去广告'};
    await fs.writeFile(path.join(issueFixture,'.github/sources/loon.json'),JSON.stringify([plugin]));
    await fs.copyFile('.github/converter/fixtures/catalog-syntax-inventory.json',path.join(issueFixture,'.github/converter/fixtures/catalog-syntax-inventory.json'));
    const known='response if ${url} ~= /api/ then response.json.jq(`del(.a,.b)`)';
    const fresh='response if ${url} ~= /api/ then response.header.del("X")';
    const unknown='response if ${url} ~= /api/ then response.future.action()';
    await fs.writeFile(path.join(issueFixture,'Resource/Loon/test.lpx'),'[Rewrite]\n'+[known,fresh,unknown].join('\n'));
    await fs.writeFile(path.join(issueFixture,'.github/monitor/.runtime/sync-failures.json'),JSON.stringify({version:1,failures:[{plugin,stage:'convert',reason:'unknown syntax',declarations:[{section:'Rewrite',line:unknown}]}]}));
    const url=new URL('../../scripts/propose-conversion-issues.mjs',import.meta.url).href;
    const result=runIsolatedCase(process.execPath,['--input-type=module','-e',
      'import {collectIssueCandidates,targetProblemTitle} from '+JSON.stringify(url)+'; const a=await collectIssueCandidates(); const b=await collectIssueCandidates(); console.log(JSON.stringify({a,b,titles:a.targetProblems.map(targetProblemTitle)}));'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const {a,b,titles}=JSON.parse(result.stdout);assert.deepEqual(a,b,'fingerprints and candidates remain stable');
    assert.equal(a.syncFailures.length,1,'read the same .github runtime report written by sync');
    assert.equal(a.targetProblems.length,2,'new identifiers and unsupported syntax are reported');
    assert.ok(a.targetProblems.some(group=>group.source===fresh&&group.reasons.some(reason=>reason.includes('response.header.del'))));
    assert.ok(a.targetProblems.some(group=>group.source===unknown));
    assert.ok(a.targetProblems.every(group=>group.source!==known&&group.declarations[0].line===group.source));
    assert.equal(new Set(titles).size,2);
    const dry=runIsolatedCase(process.execPath,[new URL('../../scripts/propose-conversion-issues.mjs',import.meta.url).pathname,'--dry-run'],{cwd:issueFixture,encoding:'utf8'});assert.equal(dry.status,0,dry.stderr);
    assert.ok((await fs.readFile(path.join(issueFixture,'.github/monitor/.runtime/conversion-issues.md'),'utf8')).includes('Hard sync failures: 1'));
  } finally {await fs.rm(issueFixture,{recursive:true,force:true});}

  const categoryCheck=runIsolatedCase('python',['-c',String.raw`
import importlib.util
s=importlib.util.spec_from_file_location('kelee','.github/converter/tools/refresh-kelee-catalog.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def item(stem,tags):return {'url':'https://kelee.one/Tool/Loon/Lpx/'+stem+'.lpx','tag':tags}
a=item('ads',['去广告']);b=item('dependency',['依赖']);c=item('remove_ads',['功能增强']);d=item('Block_other',[])
old=[{'id':'stable','file':'ads.lpx','source':a['url'],'qx':'ads.snippet','surge':'ads.sgmodule','category':'增强'}]
static=[{'id':'manual','file':'manual.lpx','source':'https://example.test/manual.lpx','qx':'manual.snippet','surge':'manual.sgmodule','category':'增强'}]
entries,metadata=m.build_catalog({'lists':[c,a,b,d,a]},old,static)
assert [e['id'] for e in entries]==['stable','Kelee_dependency','manual']
assert [e['category'] for e in entries]==['去广告','依赖','增强']
assert [e['source'] for e in metadata]==[a['url'],b['url']]
assert m.category_for(item('both',['去广告','依赖']),'both')=='依赖'
assert m.category_for(item('fake',['非去广告']),'fake') is None
assert m.category_for(item('single','依赖'),'single')=='依赖'
`],{encoding:'utf8'});
  assert.equal(categoryCheck.status,0,categoryCheck.stderr||categoryCheck.stdout);

// Suite case: upstream-automation.mjs
const previous=`#!name=Demo
[Rule]
DOMAIN,old.example,REJECT
[Rewrite]
^https://old.example reject
`;
const current=`#!name=Demo
[Rule]
DOMAIN,new.example,REJECT
[Rewrite]
^https://old.example reject
`;

assert.equal(isLoonPluginSource('#!name=Demo\n[Rewrite]\n^https://example.com reject\n'),true);
assert.equal(isLoonPluginSource('#!name = Demo\n[Rewrite]\n^https://example.com reject\n'),true);
assert.equal(isLoonPluginSource('#!desc = Demo\n[Rewrite]\n^https://example.com reject\n'),false);
const context=failureDeclarationContext(previous,current);
assert.equal(context.kind,'changed-upstream-declarations');
assert.deepEqual(context.items,[{section:'Rule',line:'DOMAIN,new.example,REJECT'}]);

const entry={
  id:'Demo',
  file:'Demo.lpx',
  source:'https://example.com/Demo.lpx',
  qx:'Demo.snippet',
  surge:'Demo.sgmodule',
};
const failure=buildSyncFailure({
  entry,
  stage:'convert',
  error:new Error('unsupported source action'),
  previousSource:previous,
  fetchedSource:current,
});
assert.equal(failure.plugin.id,'Demo');
assert.equal(failure.stage,'convert');
assert.match(failure.reason,/unsupported source action/);
assert.deepEqual(failure.declarations,[{section:'Rule',line:'DOMAIN,new.example,REJECT'}]);

const hardBody=syncFailureIssueBody(failure);
for(const required of [
  'Plugin: Demo',
  'Source file: Resource/Loon/Demo.lpx',
  'Upstream: https://example.com/Demo.lpx',
  'Stage: convert',
  'Reason: unsupported source action',
  '[Rule] DOMAIN,new.example,REJECT',
]){
  assert.ok(hardBody.includes(required),required);
}

const targetBody=targetProblemIssueBody({
  kind:'unknown',
  code:'unknown-rewrite-action',
  plugin:entry,
  source:'response if ${url} ~= /api/ then response.future.action()',
  sourceSection:'Rewrite',
  declarations:[{section:'Rewrite',line:'response if ${url} ~= /api/ then response.future.action()'}],
  reasons:['unsupported action response.future.action'],
  locations:[
    {file:'Adblock/Quantumult X/Demo.snippet',line:20},
    {file:'Adblock/Surge/Demo.sgmodule',line:18},
  ],
});
for(const required of [
  'Plugin: Demo',
  'Source file: Resource/Loon/Demo.lpx',
  'unsupported action response.future.action',
  '[Rewrite] response if ${url} ~= /api/ then response.future.action()',
  'Adblock/Quantumult X/Demo.snippet:20',
]){
  assert.ok(targetBody.includes(required),required);
}

const titleGroup={
  kind:'unknown',
  code:'unknown-rewrite-action',
  plugin:entry,
  source:'response if ${url} ~= /api/ then response.future.action()',
  reasons:['unsupported action'],
  locations:[],
};
assert.equal(targetProblemTitle(titleGroup),targetProblemTitle(titleGroup));
assert.notEqual(
  targetProblemTitle(titleGroup),
  targetProblemTitle({...titleGroup,plugin:{...entry,id:'OtherDemo'}}),
  'target issue fingerprint must include plugin identity',
);
assert.equal(syncFailureTitle(failure),syncFailureTitle(failure));

console.log('Automated upstream issue content contract passed');
}

if (selectedCase === "source-fetch.mjs") {
// Suite case: source-fetch.mjs
// Original-source fetch profile contract.
// Author: chance
// Category: Converter / Upstream Fetch Test




assert.equal(WAYX_FETCH_UA,'StashCore/2.7.1 Stash/2.7.1 Clash/1.11.0');
assert.equal(WAYX_LOON_FETCH_UA,'Loon/764 CFNetwork/1498.700.1 Darwin/23.6.0 iPhone/17.6.1');

for (const url of [
  'https://kelee.one/Tool/Loon/Lpx/FleaMarket_remove_ads.lpx',
  'https://hub.kelee.one/list.json',
]) {
  const profile=selectOriginalFetchProfile(url);
  assert.equal(profile.id,'kelee');
  assert.equal(profile.transport,'python-urllib');
  assert.equal(profile.userAgent,WAYX_LOON_FETCH_UA);
}

for (const url of [
  'https://rucu6.pages.dev/Plugins/amap.lpx',
  'https://rucu6.pages.dev/Plugins/webpage.lpx',
]) {
  const profile=selectOriginalFetchProfile(url);
  assert.equal(profile.id,'rucu6');
  assert.equal(profile.transport,'python-urllib');
  assert.equal(profile.userAgent,WAYX_LOON_FETCH_UA);
}

for (const url of [
  'https://evil.example/?next=https://kelee.one/x',
  'https://notkelee.one/x',
  'https://rucu6.pages.dev.evil.example/Plugins/amap.lpx',
  'https://raw.githubusercontent.com/example/repo/main/file.js',
]) {
  assert.equal(selectOriginalFetchProfile(url),ORIGINAL_FETCH_PROFILES.default);
}

assert.equal(
  resolveOriginalUrl('../Resource/JQLang/a.jq','https://kelee.one/Tool/Loon/Lpx/demo.lpx'),
  'https://kelee.one/Tool/Loon/Resource/JQLang/a.jq',
);

console.log('Original-source fetch profile contract passed');
}

if (selectedCase === "readme-index.mjs") {
// Suite case: readme-index.mjs
// README index regression contract.
// Author: chance
// Category: Converter / README Index Test






assert.equal(README_AUTO_UPDATE_INTERVAL,86400);
assert.equal(QX_MIXED_REWRITE_MIN_BUILD,844);

const qx=decodeURIComponent(qxAddResourceUrl({rewrite_remote:[`https://example.com/a.snippet, tag=Demo, update-interval=${README_AUTO_UPDATE_INTERVAL}, enabled=true`]}).split('remote-resource=')[1]);
assert.match(qx,/"rewrite_remote"/);
assert.match(qx,/update-interval=86400/);
assert.match(surgeModuleInstallUrl('Module/Demo/Surge/Demo.sgmodule'),/^https:\/\/surge\.app\/install-module\?url=/);

const direct=decodeURIComponent(qxSnippetInstallUrl({rel:'Adblock/Quantumult X/Ads.snippet',name:'Ads',ext:'.snippet'}).split('remote-resource=')[1]);
assert.match(direct,/"rewrite_remote"/);
assert.match(direct,/Adblock\/Quantumult%20X\/Ads\.snippet/);
assert.doesNotMatch(direct,/Resource\/Install/);
assert.throws(()=>qxSnippetInstallUrl({rel:'Rule/QuantumultX/Apple.list',name:'Apple',ext:'.list'}),/must be a \.snippet resource/);

const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-readme-'));
await Promise.all([
  fs.mkdir(path.join(root,'Boxjs/QuantumultX'),{recursive:true}),
  fs.mkdir(path.join(root,'Module/Demo/QuantumultX'),{recursive:true}),
  fs.mkdir(path.join(root,'Module/Demo/Surge'),{recursive:true}),
  fs.mkdir(path.join(root,'Adblock/Quantumult X'),{recursive:true}),
  fs.mkdir(path.join(root,'Adblock/Surge'),{recursive:true}),
  fs.mkdir(path.join(root,'Rule/QuantumultX'),{recursive:true}),
  fs.mkdir(path.join(root,'.github/sources'),{recursive:true}),
]);
await fs.writeFile(path.join(root,'Boxjs/QuantumultX/Sub.json'),'{"name":"Chance Sub"}\n');
await fs.writeFile(path.join(root,'Module/Demo/QuantumultX/Demo.snippet'),'# Name: Demo Module\n# [filter_local]\nhost,demo.example,reject\n# [rewrite_local]\n^https://demo url reject\n# [mitm]\nhostname = demo\n');
await fs.writeFile(path.join(root,'Module/Demo/Surge/Demo.sgmodule'),'#!name=Demo Module\n[URL Rewrite]\n^https://demo - reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/Ads.snippet'),'# Name: Ads\n# [filter_local]\nhost,ads.example,reject\n# [rewrite_local]\n^https://ads.example url reject\n# [mitm]\nhostname = ads.example\n');
await fs.writeFile(path.join(root,'Adblock/Surge/Ads.sgmodule'),'#!name=Ads\n[URL Rewrite]\n^https://ads.example - reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/First.snippet'),'# Name: First\n# [rewrite_local]\n^https://first.example url reject\n');
await fs.writeFile(path.join(root,'Adblock/Surge/First.sgmodule'),'#!name=First\n[URL Rewrite]\n^https://first.example - reject\n');
await fs.writeFile(path.join(root,'.github/sources/loon.json'),JSON.stringify([
  {id:'First',file:'First.lpx',source:'https://kelee.one/Tool/Loon/Lpx/First.lpx',qx:'First.snippet',surge:'First.sgmodule',category:'去广告'},
  {id:'Ads',file:'Ads.lpx',source:'https://kelee.one/Tool/Loon/Lpx/Ads.lpx',qx:'Ads.snippet',surge:'Ads.sgmodule',category:'去广告'},
],null,2)+'\n');
await fs.writeFile(path.join(root,'Rule/QuantumultX/Apple.list'),'# NAME: Apple APNs\nHOST-SUFFIX,push.apple.com,PROXY\n');

const plan=await buildReadmePlan(root);
const readme=plan.get('README.md');
assert.ok(readme);
assert.equal(plan.size,1,'README generator must not create split QX installer resources');
assert.ok(readme.indexOf('## BoxJs') < readme.indexOf('## Module'));
assert.ok(readme.indexOf('## Module') < readme.indexOf('## Adblock'));
assert.ok(readme.indexOf('## Adblock') < readme.indexOf('## Rule'));
assert.match(readme,/Chance Sub/);
assert.match(readme,/Demo Module/);
assert.match(readme,/Ads/);
assert.ok(readme.indexOf('First') < readme.indexOf('**[Ads]'),'Adblock rows must follow source-catalog order rather than filename order');
assert.match(readme,/Apple APNs/);
assert.match(readme,/update-interval%3D86400/);
assert.match(readme,/Adblock%2FQuantumult%2520X%2FAds\.snippet/);
assert.doesNotMatch(readme,/Resource%252FInstall%252FQuantumultX/);
assert.equal(/Kelee Lpx Loon UA/i.test(readme),false);

await fs.rm(root,{recursive:true,force:true});
console.log('README index contract passed');
}

if (selectedCase === "manual-assets.mjs") {
// Suite case: manual-assets.mjs
const ROOT=process.cwd();
const catalog=await loadLoonSourceCatalog(path.join(ROOT,'.github/sources/loon.json'));
const manual=JSON.parse(await fs.readFile(path.join(ROOT,'.github/manual-assets.json'),'utf8'));

assert.ok(Array.isArray(manual.assets) && manual.assets.length>0,'manual asset manifest must not be empty');

const catalogTargets=new Set();
for(const entry of catalog){
  catalogTargets.add(qxTargetPath(entry));
  catalogTargets.add(surgeTargetPath(entry));
}

for(const asset of manual.assets){
  assert.equal(asset.mode,'manual',asset.id+': mode must be manual');
  for(const key of ['qx','surge']){
    assert.ok(asset[key],asset.id+': missing '+key+' path');
    assert.equal(catalogTargets.has(asset[key]),false,asset.id+': manual asset must not overlap Source Catalog target '+asset[key]);
    const stat=await fs.stat(path.join(ROOT,asset[key]));
    assert.ok(stat.isFile() && stat.size>0,asset.id+': manual asset file missing '+asset[key]);
  }
}

const qzxy=manual.assets.find(asset=>asset.id==='QZXY');
assert.ok(qzxy,'QZXY must be explicitly declared as hand-maintained');
assert.equal(qzxy.qx,'Adblock/Quantumult X/QZXY.snippet');
assert.equal(qzxy.surge,'Adblock/Surge/QZXY.sgmodule');

console.log('Manual asset contract passed: '+manual.assets.map(asset=>asset.id).join(', '));
}
