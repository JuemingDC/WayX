// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript tests layer; preserve source behavior.
import {convertNativeQxToSurge} from "../src/emit/conversion.ts";
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / workflow / Regression Suite

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { conversionStampFromText, firstConversionStamp, generatedScriptDiffs, inspectManagedSource, isWayxGeneratedHelperFilename, managedSourceDigest, managedTargetDiffs, normalizeManagedSource, readCatalogSource, readManagedTargetState, syncGeneratedScripts, syncManagedSource, writeManagedSource, writeManagedTargets, ORIGINAL_FETCH_PROFILES, WAYX_FETCH_UA, resolveOriginalUrl, selectOriginalFetchProfile, loadLoonSourceCatalog, qxTargetPath, surgeTargetPath } from "../src/index.ts";
import { mergeNativeQxSources, prepareNativeQxSync, commitNativeQxSync, recordOutputMismatch, outputMismatch, validationArtifactDigest, writeValidationEvidence, createWorkflowFailureReporter, formatWorkflowErrorAnnotation, buildSyncFailure, failureDeclarationContext, README_AUTO_UPDATE_INTERVAL, QX_MIXED_REWRITE_MIN_BUILD, buildReadmePlan, qxAddResourceUrl, qxSnippetInstallUrl, surgeModuleInstallUrl } from "../src/publish/workflow.ts";
import { isLoonPluginSource } from "../src/application/sync-convert.ts";
import {validateQxFilterList,validateSurgeRuleSet,validateSurgeRuleSection} from '../src/validation/output.ts';
import { syncFailureIssueBody, syncFailureTitle, targetProblemIssueBody, targetProblemTitle, monitorFailureTitle, monitorFailureIssueBody, recoveredMonitorIssues, validationIssueCandidates, validationFailureTitle, validationFailureIssueBody, recoveredValidationIssues, recoveredConversionIssues } from "../src/application/propose-conversion-issues.ts";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["managed-artifacts.mjs","workflow-diagnostics.mjs","source-fetch.mjs","readme-index.mjs","manual-assets.mjs"];
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

  const phaseName='phase_qx_response_aaaaaaaaaa.js';
  const phaseHelpers=new Map([...helpers,[phaseName,'// Converted: old-owner\n// owner\n// Converted: old-first\nconst first=1;\n// Converted: old-second\nconst literal="// Converted: user data";\n']]);
  await syncGeneratedScripts(root,entry,phaseHelpers);
  const phasePath=path.join(root,'Script',entry.id,phaseName);
  const phaseBefore=await fs.readFile(phasePath,'utf8'),phaseTime=(await fs.stat(phasePath)).mtimeMs;
  const refreshedPhase=new Map(phaseHelpers);refreshedPhase.set(phaseName,phaseBefore.replace(/^(\/\/ Converted:).*/gm,'$1 fresh-run'));
  assert.deepEqual(await generatedScriptDiffs(root,entry,refreshedPhase),[],'all embedded conversion timestamps are metadata');
  assert.deepEqual(await syncGeneratedScripts(root,entry,refreshedPhase),[]);
  assert.equal(await fs.readFile(phasePath,'utf8'),phaseBefore);assert.equal((await fs.stat(phasePath)).mtimeMs,phaseTime);
  const changedLiteral=new Map(refreshedPhase);changedLiteral.set(phaseName,refreshedPhase.get(phaseName).replace('user data','real content change'));
  assert.deepEqual(await generatedScriptDiffs(root,entry,changedLiteral),[phaseName],'timestamp-looking data inside code is meaningful content');
  await fs.rm(phasePath);

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



if(selectedCase==='source-fetch.mjs'){for(const profile of Object.values(ORIGINAL_FETCH_PROFILES)){assert.equal(profile.userAgent,WAYX_FETCH_UA);assert.equal(profile.transport,'node-fetch');}assert.match(WAYX_FETCH_UA,/^Surge /);}
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
await fs.writeFile(path.join(root,'Module/Localloopback.sgmodule'),'#!name=SideStore Local Loopback\n[IP Rewrite]\n10.7.0.1 = reflect\n');
await fs.writeFile(path.join(root,'Module/Standalone.snippet'),'# Name: Standalone QX Module\n# [filter_local]\nhost,standalone.example,reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/Ads.snippet'),'# Name: Ads\n# [filter_local]\nhost,ads.example,reject\n# [rewrite_local]\n^https://ads.example url reject\n# [mitm]\nhostname = ads.example\n');
await fs.writeFile(path.join(root,'Adblock/Surge/Ads.sgmodule'),'#!name=Ads\n[URL Rewrite]\n^https://ads.example - reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/First.snippet'),'# Name: First\n# [rewrite_local]\n^https://first.example url reject\n');
await fs.writeFile(path.join(root,'Adblock/Surge/First.sgmodule'),'#!name=First\n[URL Rewrite]\n^https://first.example - reject\n');
for(const rel of ['Adblock/Quantumult X/Ads.snippet','Adblock/Surge/Ads.sgmodule']) {
  const file=path.join(root,rel);
  await fs.writeFile(file,'# Author: Alice[https://example.test/alice], CoAuthor[https://example.test/co]\n'+await fs.readFile(file,'utf8'));
}
await fs.writeFile(path.join(root,'Adblock/Quantumult X/First.snippet'),'# Author: Alice[https://example.test/other-profile]\n'+await fs.readFile(path.join(root,'Adblock/Quantumult X/First.snippet'),'utf8'));
await fs.writeFile(path.join(root,'Adblock/Quantumult X/Bob.snippet'),'# Name: Bob Resource\n# Author: Someone Else\n# Source: https://raw.githubusercontent.com/Bob/repo/main/test.lpx\n# [rewrite_local]\n^https://bob.example url reject\n');
await fs.writeFile(path.join(root,'Adblock/Quantumult X/Rucu.snippet'),'# Name: Rucu Resource\n# Author: CoAuthor\n# Source: https://rucu6.pages.dev/Plugins/test.lpx\n# [rewrite_local]\n^https://rucu.example url reject\n');
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
assert.match(readme,/\| \*\*\[SideStore Local Loopback\]\([^\n]+\/Module\/Localloopback\.sgmodule\)\*\* \| — \| \[一键安装\]\(https:\/\/surge\.app\/install-module\?url=/,'flat Surge-only module must be indexed and installable');
assert.match(readme,/Module%2FLocalloopback\.sgmodule/);
assert.match(readme,/\| \*\*\[Standalone QX Module\]\([^\n]+\/Module\/Standalone\.snippet\)\*\* \| \[一键导入\]/,'flat QX-only module must be indexed');
assert.match(readme,/Ads/);
// Modified: 2026-10-25 (chance). Keep source groups while sorting their resources by visible name.
assert.ok(readme.indexOf('**[Ads]') < readme.indexOf('**[First]'));
assert.match(readme,/#### A[\s\S]*\*\*\[Ads\][\s\S]*#### F[\s\S]*\*\*\[First\]/);
assert.ok(readme.indexOf('### Reject')<readme.indexOf('### Proxy'));
assert.ok(readme.indexOf('### Proxy')<readme.indexOf('### Direct'));
assert.match(readme,/Apple APNs/);
assert.match(readme,/update-interval%3D86400/);
assert.match(readme,/Adblock%2FQuantumult%2520X%2FAds\.snippet/);
assert.doesNotMatch(readme,/Resource%252FInstall%252FQuantumultX/);
assert.equal(/Kelee Lpx Loon UA/i.test(readme),false);
assert.equal((readme.match(/<strong>可莉<\/strong> · 2 项/g)||[]).length,1,'catalog fetch source overrides unrelated authors');
assert.doesNotMatch(readme,/Alice|CoAuthor|Someone Else/);
assert.match(readme,/<strong>Bob<\/strong> · 1 项/);
assert.match(readme,/<strong>RuCu6<\/strong> · 1 项/);
assert.ok(readme.indexOf('<strong>可莉')<readme.indexOf('<strong>Bob'),'groups follow first catalog occurrence');
assert.ok(readme.indexOf('**[Ads]')<readme.indexOf('<strong>Bob'),'each resource stays within its source group');
assert.equal((readme.match(/^<details>$/gm)||[]).length,3);
assert.equal((readme.match(/^<\/details>$/gm)||[]).length,3);
assert.doesNotMatch(readme,/<details open|<input|<script/);
assert.match(readme,/<\/summary>\n\n#### [A-Z][\s\S]*?\n\n\| Name \|/,'blank line keeps the collapsed Markdown table renderable');

await fs.unlink(path.join(root,'Adblock/Quantumult X/Ads.snippet'));
let refreshed=(await buildReadmePlan(root)).get('README.md');
assert.match(refreshed,/\| \*\*\[Ads\].*\| — \| \[一键安装\]/);
assert.match(refreshed,/<strong>可莉<\/strong> · 2 项[\s\S]*\*\*\[Ads\]/,'catalog fetch attribution survives a missing QX target');
await fs.unlink(path.join(root,'Adblock/Surge/Ads.sgmodule'));
await fs.writeFile(path.join(root,'Adblock/Quantumult X/New.snippet'),'# Name: New\n# [rewrite_local]\n^https://new.example url reject\n');
refreshed=(await buildReadmePlan(root)).get('README.md');
assert.doesNotMatch(refreshed,/\*\*\[Ads\]/);
assert.match(refreshed,/\*\*\[New\]/);
assert.deepEqual(refreshed.match(/^## .+$/gm),readme.match(/^## .+$/gm));
assert.match(refreshed,/<strong>本地资源<\/strong> · 1 项/);
assert.ok((refreshed.match(/\| Name \| Quantumult X \| Surge \|/g)||[]).length>=7);
await fs.unlink(path.join(root,'Adblock/Quantumult X/Bob.snippet'));
assert.doesNotMatch((await buildReadmePlan(root)).get('README.md'),/<strong>Bob<\/strong>/,'empty source groups are removed');
// Modified: 2026-10-25 (chance). Native QX sync merges a source app's routing,
// jq and Script declarations while retaining source policies and owned-file scope.
const nativeConfig={version:1,repository:'ishowshu/qx',ref:'main',prefix:'ishowshu_',author:'树先生',exclude:[],aliases:{},names:{}};
await fs.writeFile(path.join(root,'.github/sources/native-qx.json'),JSON.stringify(nativeConfig));
const nativeFiles={
 'filter/pdd.snippet':'# filter comment\nhost,example.com,DIRECT\n',
 'rewrite/pdd.snippet':'#!name = 拼多多\n#!author = 树先生\n// preserve comment\n^https://example.com url jsonjq-response-body del(.ad) | .flag = false\n^https://example.com/api url script-response-body https://github.com/ishowshu/qx/raw/main/script/pdd.js\nhostname = example.com\n',
};
const nativeFetch=async url=>url.includes('/commits/')?JSON.stringify({sha:'a'.repeat(40)}):url.includes('/git/trees/')?JSON.stringify({tree:Object.keys(nativeFiles).map(path=>({path,type:'blob'}))}):nativeFiles[new URL(url).pathname.split('/').slice(4).join('/')];
const native=await prepareNativeQxSync(root,{fetchText:nativeFetch});
assert.equal(native.outputs.size,1);
const merged=native.outputs.values().next().value;
assert.match(merged,/# \[filter_local\][\s\S]*host,example.com,DIRECT/);
assert.match(merged,/# \[rewrite_local\]/);
assert.ok(merged.includes("jsonjq-response-body 'del(.ad) | .flag = false'"));
assert.ok(merged.includes('script-response-body https://github.com/ishowshu/qx/raw/main/script/pdd.js'));
assert.match(merged,/hostname = example.com/);
const nativeInstall=JSON.parse(decodeURIComponent(qxSnippetInstallUrl({rel:'Adblock/Quantumult X/ishowshu_pdd.snippet',name:'拼多多',ext:'.snippet',text:merged}).split('remote-resource=')[1]));
assert.deepEqual(Object.keys(nativeInstall),['rewrite_remote']);
assert.equal(nativeInstall.rewrite_remote.length,1);
assert.ok(!nativeInstall.rewrite_remote[0].includes('force-policy'));
// Modified: 2026-10-25 (chance). Author/ownership markers never change the
// single mixed-snippet import contract, even when filter headers are empty.
for(const fixture of [
  {name:'Loon author',text:merged.replace('# Managed by: WayX Native QX','')},
  {name:'Another author',text:merged.replaceAll('树先生','Another author')},
  {name:'Filter only',text:'# [filter_local]\nhost,only.example,DIRECT\n'},
  {name:'Rewrite only',text:'# [filter_local]\n# [rewrite_local]\n^https://only.example url reject\n'},
]) {
  const payload=JSON.parse(decodeURIComponent(qxSnippetInstallUrl({rel:'Adblock/Quantumult X/app.snippet',ext:'.snippet',...fixture}).split('remote-resource=')[1]));
  assert.deepEqual(Object.keys(payload),['rewrite_remote'],fixture.name);
  assert.equal(payload.rewrite_remote.length,1,fixture.name);
  assert.ok(payload.rewrite_remote[0].startsWith('https://raw.githubusercontent.com/JuemingDC/WayX/main/Adblock/Quantumult%20X/app.snippet'),fixture.name);
  assert.ok(!payload.rewrite_remote[0].includes('force-policy'),fixture.name);
}

await commitNativeQxSync(root,native);
const owned=path.join(root,'Adblock/Quantumult X/ishowshu_pdd.snippet');
const before=await fs.readFile(owned,'utf8');
await commitNativeQxSync(root,{...native,outputs:new Map([...native.outputs].map(([file,text])=>[file,text.replace(/^# Updated:.*$/m,'# Updated: different')]))});
assert.equal(await fs.readFile(owned,'utf8'),before,'unchanged content keeps timestamp');
assert.match((await buildReadmePlan(root)).get('README.md'),/<strong>树先生<\/strong>/);
await assert.rejects(prepareNativeQxSync(root,{fetchText:async()=>{throw Error('injected source failure');}}),/injected source failure/);
assert.equal(await fs.readFile(owned,'utf8'),before);
await commitNativeQxSync(root,{...native,outputs:new Map()});
await assert.rejects(fs.stat(owned),{code:'ENOENT'});
// Multiple versions require one unambiguous single-author source.
nativeConfig.aliases={'amap-new':'amap','bilibili-qx':'bilibili'};
await fs.writeFile(path.join(root,'.github/sources/native-qx.json'),JSON.stringify(nativeConfig));
nativeFiles['rewrite/amap.snippet']='#!author = A, B\n^https://old.example url reject\n';
nativeFiles['rewrite/amap-new.snippet']='#!author = 树先生\n^https://new.example url reject\n';
nativeFiles['rewrite/bilibili.snippet']='#!author = A, B\n^https://bili.example url reject\n';
nativeFiles['rewrite/bilibili-qx.snippet']='#!author = A, C\n^https://bili.example url reject\n';
const variants=await prepareNativeQxSync(root,{fetchText:nativeFetch});
assert.match(variants.outputs.get('Adblock/Quantumult X/ishowshu_amap.snippet'),/new\.example/);
assert.doesNotMatch(variants.outputs.get('Adblock/Quantumult X/ishowshu_amap.snippet'),/old\.example/);
assert.equal(variants.outputs.has('Adblock/Quantumult X/ishowshu_bilibili.snippet'),false);
assert.equal(variants.skipped[0].application,'bilibili');
// Modified: 2026-10-25 (chance). Verify native QX policies, HTTP actions,
// unchanged author Script URLs and explicit unsupported header boundaries.
const qxConversionInput='# Name: Native fixture\n# [filter_local]\nhost,keep.example,direct\nhost-suffix,proxy.example,proxy\nip6-cidr,2001:db8::/32,reject\n# [rewrite_local]\n^https://a.example url reject\n^https://b.example url reject-dict\n^https://c.example url jsonjq-response-body \'delpaths([["ad"],["banner"]])\'\n^https://d.example url script-response-body https://example.test/original.js\n# [mitm]\nhostname = a.example, b.example\n';
const convertedNative=convertNativeQxToSurge(qxConversionInput,{id:'native_fixture'});
assert.equal(convertedNative.diagnostics.length,0);
assert.match(convertedNative.surge,/DOMAIN,keep\.example,DIRECT/);
assert.ok(convertedNative.surge.includes('DOMAIN-SUFFIX,proxy.example,{{{PROXY}}}'));
assert.match(convertedNative.surge,/IP-CIDR6,2001:db8::\/32,REJECT,no-resolve/);
assert.match(convertedNative.surge,/a\\\.example _ reject/);
assert.match(convertedNative.surge,/data="\{\}" status-code=200/);
assert.ok(convertedNative.surge.includes("http-response-jq ^https://c\\.example 'delpaths([[\"ad\"],[\"banner\"]])'"));
assert.ok(convertedNative.surge.includes('script-path=https://example.test/original.js'));
assert.match(convertedNative.surge,/requires-body=true/);
const unsupportedNative=convertNativeQxToSurge(qxConversionInput.replace('# [mitm]','^https://guard.example UA* url-and-header reject\n# [mitm]'));
assert.equal(unsupportedNative.diagnostics.length,1);
assert.match(unsupportedNative.surge,/^native_qx_\d+ = /m);
assert.ok(unsupportedNative.surge.includes('script-path=https://example.test/original.js'));
// Modified: 2026-10-25 (chance). Header lowering retains field/URL and
// missing-field behavior; complex whole-block patterns remain diagnosed.
const headerInput=String.raw`# [rewrite_local]
^https://github.com url request-header (\r\n)Accept-Language:.+(\r\n) request-header $1Accept-Language: en-us$2`;
const headerConverted=convertNativeQxToSurge(headerInput);
assert.equal(headerConverted.diagnostics.length,0);
assert.match(headerConverted.surge,/\[Header Rewrite\]\nhttp-request \^https:\/\/github\\\.com header-replace Accept-Language en-us/);
assert.equal(convertNativeQxToSurge(headerInput.replace('Accept-Language: en-us','Other: en-us')).diagnostics.length,1);
assert.equal(convertNativeQxToSurge(headerInput.replaceAll('Accept-Language','Content-Length')).diagnostics.length,1);
const unscanned=convertNativeQxToSurge(qxConversionInput);
assert.match(unscanned.surge,/script-path=https:\/\/example.test\/original.js/);
// Modified: 2026-10-25 (chance). All six native HTTP Script declarations
// retain their original URL and phase/body timing, including both echo forms.
for(const [action,phase,requiresBody] of [
  ['request-header','request',false],['request-body','request',true],
  ['response-header','response',false],['response-body','response',true],
  ['echo-response','request',false],['analyze-echo-response','request',true],
]) {
  const out=convertNativeQxToSurge('# [rewrite_local]\n^https://echo.example url script-'+action+' https://example.test/original.js\n',{id:'echo_fixture'});
  assert.equal(out.diagnostics.length,0,action);
  assert.ok(out.surge.includes('type=http-'+phase+',pattern=^https://echo\\.example,script-path=https://example.test/original.js,requires-body='+requiresBody),action);
}
nativeConfig.preferred_versions={bilibili:'rewrite/bilibili-qx.snippet'};
await fs.writeFile(path.join(root,'.github/sources/native-qx.json'),JSON.stringify(nativeConfig));
assert.ok((await prepareNativeQxSync(root,{fetchText:nativeFetch})).outputs.has('Adblock/Quantumult X/ishowshu_bilibili.snippet'));
const zenmoConfig={version:1,repository:'ZenmoFeiShi/Qx',ref:'main',prefix:'zenmofeishi_',author:'怎么肥事',layout:'root',surge:true};
nativeFiles['MT.snippet']='#!name = 美团\nhost,mt.example,REJECT\n^https://mt.example url script-response-body https://example.test/not-fetched.js\n';
await fs.writeFile(path.join(root,'.github/sources/native-qx.json'),JSON.stringify({version:2,sources:[nativeConfig,zenmoConfig]}));
const allAuthors=await prepareNativeQxSync(root,{fetchText:async url=>{assert.ok(!url.endsWith('.js'),'do not fetch original scripts');return nativeFetch(url);}});
assert.equal(allAuthors.sources.length,2);
assert.ok(allAuthors.outputs.has('Adblock/Quantumult X/zenmofeishi_mt.snippet'));
assert.match(allAuthors.outputs.get('Adblock/Surge/zenmofeishi_mt.sgmodule'),/script-path=https:\/\/example.test\/not-fetched.js/);
await commitNativeQxSync(root,allAuthors);
assert.match((await buildReadmePlan(root)).get('README.md'),/<strong>怎么肥事<\/strong>/);
await fs.rm(root,{recursive:true,force:true});
console.log('README index contract passed: stable source groups, alphabetical subgroups, policy order and target additions/removals');
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

if(selectedCase==='managed-artifacts.mjs') {
  const {commitManagedConversion}=await import('../src/publish/workflow.ts');
  const {materializeConversionRunContext,materializeConversionContext,convertPluginWithContext,validateConvertedPlugin}=await import('../src/emit/conversion.ts');
  const {syncCatalogEntry,runCatalogSync}=await import('../src/application/sync-convert.ts');
  const {collectIssueCandidates}=await import('../src/application/propose-conversion-issues.ts');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-transaction-'));
  const entry=id=>({id,file:id+'.lpx',source:'https://example.test/'+id+'.lpx',qx:id+'.snippet',surge:id+'.sgmodule',category:'去广告'});
  const source=value=>'#!name=Fixture\n[Rewrite]\nresponse if ${url} ~= /(api)/i as item then response.header.set("X",'+JSON.stringify(value+'-${item.1}')+')\n';
  const rawBase='https://raw.githubusercontent.com/JuemingDC/WayX/main';
  const encode=async(e,text)=>convertPluginWithContext(e,text,await materializeConversionRunContext(e,text),{stamp:'2026-10-04',rawBase});
  const inventory=async()=>{
    const rows=[];
    const walk=async dir=>{for(const item of await fs.readdir(dir,{withFileTypes:true}).catch(error=>error.code==='ENOENT'?[]:Promise.reject(error))){const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else rows.push([path.relative(root,file),await fs.readFile(file)]);}};
    for(const dir of ['Resource','Adblock','Script'])await walk(path.join(root,dir));
    return rows.sort((a,b)=>a[0].localeCompare(b[0]));
  };
  const seed=async e=>{
    const text=source('old'),out=await encode(e,text);
    await fs.mkdir(path.join(root,'Resource/Loon'),{recursive:true});await fs.writeFile(path.join(root,'Resource/Loon',e.file),text.replace(/\n/g,'\r\n'));
    await writeManagedTargets(await readManagedTargetState(root,e),out);await syncGeneratedScripts(root,e,out.generatedScripts);
    await fs.writeFile(path.join(root,'Adblock/Quantumult X',e.qx),out.qx.replace(/\n/g,'\r\n'));
    await fs.mkdir(path.join(root,'Script',e.id),{recursive:true});
    await fs.writeFile(path.join(root,'Script',e.id,'manual.js'),'// handwritten\n');
    await fs.writeFile(path.join(root,'Script',e.id,'features_qx_0123456789.js'),'// stale feature\n');
  };
  try {
    await fs.mkdir(path.join(root,'.github/converter/fixtures'),{recursive:true});
    for(const name of ['catalog-syntax-inventory.json','catalog-legacy-syntax-inventory.json'])await fs.copyFile('.github/converter/fixtures/'+name,path.join(root,'.github/converter/fixtures',name));
    const e=entry('Atomic');await seed(e);const original=await inventory();
    const text=source('new'),out=await encode(e,text);validateConvertedPlugin(e,out);
    for(const failureStage of ['helpers','first-target','source']) {
      const state=await readManagedTargetState(root,e),sourceState=await inspectManagedSource(root,e,text);
      const options={sourceState,source:text};
      if(failureStage==='helpers')options.writeHelpers=async(...args)=>{await syncGeneratedScripts(...args);throw new Error('injected helper failure');};
      if(failureStage==='first-target')options.writeTargets=async(state,out)=>{await fs.writeFile(state.qxPath,out.qx);throw new Error('injected first-target failure');};
      if(failureStage==='source')options.writeSource=async state=>{await fs.writeFile(state.sourcePath,'partial');throw new Error('injected source failure');};
      await assert.rejects(commitManagedConversion(root,e,state,out,options),error=>error.rollbackSucceeded===true);
      assert.deepEqual(await inventory(),original,failureStage+' must restore every old byte and remove new helpers');
    }
    const absent=entry('Absent'),absentOut=await encode(absent,text);
    await assert.rejects(commitManagedConversion(root,absent,await readManagedTargetState(root,absent),absentOut,{sourceState:await inspectManagedSource(root,absent,text),source:text,writeSource:async()=>{throw new Error('first install failure');}}),error=>error.rollbackSucceeded===true);
    assert.deepEqual(await inventory(),original,'first-install rollback removes all introduced files');
    const result=await commitManagedConversion(root,e,await readManagedTargetState(root,e),out,{sourceState:await inspectManagedSource(root,e,text),source:text});
    assert.ok(result.helperChanges.some(name=>name.startsWith('delete:features_')));
    assert.equal(await fs.readFile(path.join(root,'Script',e.id,'manual.js'),'utf8'),'// handwritten\n');
    assert.deepEqual(await generatedScriptDiffs(root,e,out.generatedScripts),[]);
    for(const name of ['features_qx_0123456789.js','phase_surge_response_0123456789.js'])assert.equal(isWayxGeneratedHelperFilename(name),true);

    const baselineUnchanged=await inventory();
    const beforeTimes=new Map(await Promise.all(baselineUnchanged.map(async([file])=>[file,(await fs.stat(path.join(root,file))).mtimeMs])));
    const calls=[];
    const same=await syncCatalogEntry(e,{root,log:()=>{},fetchText:async()=>text.replace(/\n/g,'\r\n'),
      materialize:async(...args)=>{calls.push('dependencies');return materializeConversionRunContext(...args);},
      convert:(...args)=>{calls.push('conversion');return convertPluginWithContext(...args);},
      });
    assert.deepEqual(calls,['dependencies','conversion'],'upstream is converted once; target validation belongs to the final audit');
    assert.equal(same.changed,false);assert.deepEqual(same.targetChanges,[]);assert.deepEqual(same.helperChanges,[]);
    assert.deepEqual(await inventory(),baselineUnchanged,'identical output preserves every artifact byte despite fresh candidate timestamps');
    for(const [file,time] of beforeTimes)assert.equal((await fs.stat(path.join(root,file))).mtimeMs,time,'unchanged artifact must not be rewritten: '+file);
    const formatBaseline=new Map(await inventory());
    const revised=await syncCatalogEntry(e,{root,log:()=>{},fetchText:async()=>text,convert:(...args)=>{
      const out=convertPluginWithContext(...args);out.qx+='# Formatting policy revision\n';return out;
    }});
    assert.equal(revised.changed,false);assert.deepEqual(revised.targetChanges,['qx']);assert.deepEqual(revised.helperChanges,[]);
    for(const [file,bytes] of await inventory())if(!file.endsWith('/'+e.qx))assert.deepEqual(bytes,formatBaseline.get(file),'format policy change writes only affected target');
    await syncCatalogEntry(e,{root,log:()=>{},fetchText:async()=>text});
    const helperBaseline=new Map(await inventory());
    const helperRevised=await syncCatalogEntry(e,{root,log:()=>{},fetchText:async()=>text,convert:(...args)=>{
      const out=convertPluginWithContext(...args);const [name,body]=[...out.generatedScripts][0];out.generatedScripts.set(name,body+'// Helper format revision\n');return out;
    }});
    assert.deepEqual(helperRevised.targetChanges,[]);assert.equal(helperRevised.helperChanges.length,1);
    for(const [file,bytes] of await inventory())if(!file.endsWith('/'+helperRevised.helperChanges[0]))assert.deepEqual(bytes,helperBaseline.get(file),'helper-only change leaves all peer bytes intact');
    await fs.rm(path.join(root,'Adblock/Surge',e.surge));
    const repaired=await syncCatalogEntry(e,{root,log:()=>{},fetchText:async()=>text});
    assert.deepEqual(repaired.targetChanges,['surge']);assert.equal(repaired.changed,false);
    assert.ok((await readManagedTargetState(root,e)).surge,'missing target is rebuilt');

    const dependency=entry('Dependency');
    const dependencySource='#!name=Dependency\n[Rewrite]\nresponse if ${url} ~= /api/ then response.json.jq_file("https://example.test/filter.jq")\n';
    let dependencyText='.value = 1',dependencyFetches=0;
    const dependencyOptions={root,log:()=>{},fetchText:async()=>dependencySource,materialize:(e,text)=>materializeConversionContext(e,text,{fetchText:async()=>{dependencyFetches++;return dependencyText;}})};
    await syncCatalogEntry(dependency,dependencyOptions);
    dependencyText='.value = 2';
    const dependencyUpdate=await syncCatalogEntry(dependency,dependencyOptions);
    assert.equal(dependencyUpdate.changed,false,'upstream declaration is unchanged');
    assert.deepEqual(dependencyUpdate.targetChanges,['qx','surge'],'changed dependency content updates output during full conversion');
    assert.equal(dependencyFetches,2,'dependencies are read on every conversion');
    assert.match((await readManagedTargetState(root,dependency)).qx,/\.value\s*=\s*2/);
    const dependencySame=await syncCatalogEntry(dependency,dependencyOptions);
    assert.deepEqual(dependencySame.targetChanges,[],'same dependency content does not rewrite output');

    const good=entry('Good'),bad=entry('Bad'),fresh=entry('Fresh');await seed(good);await seed(bad);
    const catalog=[good,bad,fresh];await fs.mkdir(path.join(root,'.github/sources'),{recursive:true});await fs.mkdir(path.join(root,'.github/monitor/.runtime'),{recursive:true});
    await fs.writeFile(path.join(root,'.github/sources/loon.json'),JSON.stringify(catalog));await fs.writeFile(path.join(root,'.github/sources/loon-static.json'),JSON.stringify(catalog));
    await fs.writeFile(path.join(root,'.github/monitor/.runtime/kelee-catalog.json'),JSON.stringify({count:3,plugins:catalog.map((e,order)=>({...e,order}))}));
    const before=new Map(await inventory());
    const unknown='#!name=Future\n[Rewrite]\nresponse if ${url} ~= /api/ then response.future.action()\n';
    // Modified: 2026-10-25 (chance). Every source is acquired before the first conversion.
    const events=[];
    const run=await runCatalogSync({root,log:()=>{},writeError:()=>{},warn:()=>{},entryOptions:{
      fetchText:async url=>{events.push('fetch');return url===good.source?source('updated'):unknown;},
      convert:(...args)=>{events.push('convert');return convertPluginWithContext(...args);},
    }});
    assert.ok(events.lastIndexOf('fetch')<events.indexOf('convert'),'acquisition must finish before target conversion');
    assert.equal(run.publishable,true);assert.deepEqual(run.convertedPlugins,['Good']);assert.deepEqual(run.unchangedPlugins,[]);assert.deepEqual(run.validatedPlugins,['Good']);assert.deepEqual(run.retainedPlugins,['Bad']);assert.deepEqual(run.deferredPlugins,['Fresh']);
    assert.equal(run.failures.length,2);assert.ok(run.failures.every(failure=>failure.declarations.some(d=>d.line.includes('future.action'))));
    for(const [file,bytes] of await inventory())if(file.includes('/Bad/')||file.endsWith('/Bad.lpx')||file.endsWith('/Bad.snippet')||file.endsWith('/Bad.sgmodule'))assert.deepEqual(bytes,before.get(file),'failed plugin baseline preserved');
    assert.match(await fs.readFile(path.join(root,'Resource/Loon/Good.lpx'),'utf8'),/updated/);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root,'.github/sources/loon.json'),'utf8')).map(e=>e.id),['Good','Bad']);
    assert.equal(JSON.parse(await fs.readFile(path.join(root,'.github/sources/loon-static.json'),'utf8')).length,3,'discovery source remains intact for retries');
    const snapshot=JSON.parse(await fs.readFile(path.join(root,'.github/monitor/.runtime/kelee-catalog.json'),'utf8'));assert.equal(snapshot.count,2);assert.deepEqual(snapshot.plugins.map(p=>p.order),[0,1]);
    const issues=await collectIssueCandidates({root,includeTargets:false});assert.equal(issues.syncFailures.length,2,'deferred sources survive in the Issue report');
    const repeated=await runCatalogSync({root,log:()=>{},writeError:()=>{},warn:()=>{},entryOptions:{fetchText:async url=>url===good.source?source('updated'):unknown}});
    assert.deepEqual(repeated.convertedPlugins,['Good']);assert.deepEqual(repeated.unchangedPlugins,['Good']);assert.deepEqual(repeated.updatedPlugins,[]);
    const canonicalTool=path.join(process.cwd(),'src/publish/regenerate-canonical.ts');
    const selective=runIsolatedCase(process.execPath,[canonicalTool,'--successful-only'],{cwd:root,encoding:'utf8'});
    assert.equal(selective.status,0,selective.stderr);assert.match(selective.stdout,/changed=0/);
    await fs.rm(path.join(root,'.github/monitor/.runtime/sync-failures.json'));
    const missingReport=runIsolatedCase(process.execPath,[canonicalTool,'--successful-only'],{cwd:root,encoding:'utf8'});
    assert.notEqual(missingReport.status,0,'missing sync report must fail instead of ignoring isolated conversion failures');
    const daily=await runCatalogSync({root,log:()=>{},writeError:()=>{},warn:()=>{},entryOptions:{fetchText:async url=>url===good.source?source('updated'):unknown}});
    assert.deepEqual(daily.convertedPlugins,['Good']);assert.deepEqual(daily.unchangedPlugins,['Good'],'every daily run converts unchanged sources without overwriting identical artifacts');
    const baseline=await inventory();
    await assert.rejects(syncCatalogEntry(bad,{root,log:()=>{},fetchText:async()=>source('changed'),convert:(...args)=>{const out=convertPluginWithContext(...args);out.qx+='\n# [WayX] TEST REVIEW REQUIRED: unsupported target\n# Source declaration: fixture\n';return out;}}),error=>error.syncFailure.stage==='review-target-mapping');
    assert.deepEqual(await inventory(),baseline,'known but unsupported mapping is quarantined before any write');
    await assert.rejects(syncCatalogEntry(bad,{root,log:()=>{},fetchText:async()=>{throw new Error('upstream 503');}}),error=>error.syncFailure.stage==='fetch-upstream'&&error.baselineAvailable);
    assert.deepEqual(await inventory(),baseline,'fetch failures preserve the complete baseline');

    const fatal=entry('Fatal');await seed(fatal);await fs.writeFile(path.join(root,'.github/sources/loon.json'),JSON.stringify([fatal]));
    const failure=await runCatalogSync({root,log:()=>{},writeError:()=>{},warn:()=>{},entryOptions:{fetchText:async()=>source('fatal'),commit:(root,e,state,out,options)=>commitManagedConversion(root,e,state,out,{...options,writeTargets:async state=>{await fs.rm(state.qxPath);await fs.mkdir(state.qxPath);throw new Error('restore blocked');}})}});
    assert.equal(failure.publishable,false,'a failed rollback blocks the entire publication');
    assert.equal(failure.failures.length,1);
    assert.equal(JSON.parse(await fs.readFile(path.join(root,'.github/monitor/.runtime/sync-failures.json'),'utf8')).publishable,false);
    console.log('Plugin isolation/transactions passed: helper/target/source/first-install rollback, stale cleanup, mixed catalog publication, deferred retry, Issue context and fatal rollback gate');
  }finally{await fs.rm(root,{recursive:true,force:true});}
}

if (selectedCase === "source-fetch.mjs") {
// Modified: 2026-10-25 (chance). Exercise acquisition boundaries, run snapshots,
// shared source preparation and routing-only deduplication without live services.
// Author: chance
// Category: Converter / Resource Architecture Verification
const {spawnSync}=await import('node:child_process');
const {createResourceSnapshot,fetchOriginalBytes,FETCH_LIMITS}=await import('../src/ingest/resources.ts');
const {materializeConversionContext,convertPluginWithContext,convertPlugin}=await import('../src/emit/conversion.ts');
const {uniqueRoutingLines}=await import('../src/validation/output.ts');
const {targetRegexCapability,compileRegexForTarget}=await import('../src/domain/core.ts');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-resource-'));
const originalFetch=globalThis.fetch;
try {
  assert.equal(FETCH_LIMITS.text,128*1024*1024);
  assert.equal(FETCH_LIMITS.binary,512*1024*1024);
  let calls=0,cancelled=false;
  globalThis.fetch=async()=>{calls++;return new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(8));},cancel(){cancelled=true;}}));};
  await assert.rejects(fetchOriginalBytes('https://example.test/large',{maxBytes:10}),e=>e.code==='ERR_FETCH_SIZE');
  assert.equal(calls,1);assert.equal(cancelled,true);
  calls=0;
  globalThis.fetch=async(_url,{signal})=>{calls++;if(calls===1)return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));return new Response('ok');};
  assert.equal(String(await fetchOriginalBytes('https://example.test/timeout',{timeoutMs:10})),'ok');assert.equal(calls,2);
  calls=0;
  globalThis.fetch=async()=>{calls++;throw new TypeError('fetch failed',{cause:{code:'ECONNRESET'}});};
  await assert.rejects(fetchOriginalBytes('https://example.test/reset'),/fetch failed/);assert.equal(calls,3);
  calls=0;globalThis.fetch=async()=>{calls++;return new Response('',{status:404});};
  await assert.rejects(fetchOriginalBytes('https://example.test/Timeout-ECONNRESET'),/HTTP 404/);assert.equal(calls,1);
  globalThis.fetch=originalFetch;

  let reads=0;
  const store=createResourceSnapshot({directory:path.join(root,'snapshot'),fetchBytes:async()=>{reads++;return Buffer.from('first\r\n');}});
  const url='https://example.test/shared';
  const [text,bytes]=await Promise.all([store.fetchText(url),store.fetchBytes(url)]);
  assert.equal(reads,1);assert.equal(text,'first\n');assert.equal(String(bytes),'first\r\n');
  bytes.fill(0);assert.equal(await store.fetchText(url),'first\n');
  await store.seal();
  assert.equal(await store.fetchText(url),'first\n');
  await assert.rejects(store.fetchText('https://example.test/new'),/sealed/);assert.equal(reads,1);
  const manifest=JSON.parse(await fs.readFile(path.join(root,'snapshot/manifest.json'),'utf8'));
  assert.equal(manifest.resources[0].size,7);assert.match(manifest.resources[0].sha256,/^[a-f0-9]{64}$/);
  await fs.writeFile(path.join(root,'snapshot',manifest.resources[0].storage),'corrupted');
  await assert.rejects(store.fetchText(url),/checksum mismatch/);
  let failures=0;
  const failed=createResourceSnapshot({directory:path.join(root,'failed'),fetchBytes:async()=>{failures++;throw new Error('unavailable');}});
  await assert.rejects(failed.fetchText(url),/unavailable/);await assert.rejects(failed.fetchBytes(url),/unavailable/);
  await failed.seal();assert.equal(failures,1);

  const entry={id:'Resources',file:'Resources.lpx',source:'https://example.test/plugins/plugin.lpx',qx:'Resources.snippet',surge:'Resources.sgmodule',category:'去广告'};
  let jqReads=0;
  const shared=createResourceSnapshot({directory:path.join(root,'plugins'),fetchText:async()=>{jqReads++;return 'del(.ad)';}});
  const source='#!name=Resources\n[Rewrite]\nresponse if ${url} ~= /api/i then response.json.jq_file("shared.jq")\nresponse if ${url} ~= /other/i then response.json.jq_file("shared.jq")\n';
  const first=await materializeConversionContext(entry,source,{resources:shared});
  const second=await materializeConversionContext({...entry,id:'Other'},source,{resources:shared});
  await shared.seal();assert.equal(jqReads,1);
  globalThis.fetch=()=>{throw new Error('Conversion must not access network');};
  const options={stamp:'2026-10-25 12:00:00 +08:00',rawBase:'https://example.test'};
  const out=convertPluginWithContext(entry,source,first,options);
  assert.match(out.qx,/del\(\.ad\)/);assert.match(out.surge,/del\(\.ad\)/);
  assert.throws(()=>convertPluginWithContext(entry,source+'# changed',first,options),/does not match/);
  const ast=first.declarations.values().next().value.ast;const before=JSON.stringify(ast);
  convertPluginWithContext(entry,source,first,options);assert.equal(JSON.stringify(ast),before);
  assert.ok(second.declarations.size);
  assert.deepEqual(uniqueRoutingLines(['# one','host, a, direct','# two','host, a, direct','host, a, proxy']),['# one','host, a, direct','# two','host, a, proxy']);
  const repeated='#!name=Resources\n[Rule]\nDOMAIN,a.example,REJECT\n# keep comment\nDOMAIN,a.example,REJECT\n[Rewrite]\nresponse if ${url} ~= /api/ then response.json.jq(`.x += 1`)\nresponse if ${url} ~= /api/ then response.json.jq(`.x += 1`)\n';
  const repeatOut=convertPlugin(entry,repeated,options);
  assert.equal((repeatOut.qx.match(/^host, a.example, reject$/gm)||[]).length,1);
  assert.equal((repeatOut.qx.match(/\.x \+= 1/g)||[]).length,2);assert.match(repeatOut.qx,/# keep comment/);
  // Modified: 2026-10-26 (chance). Verified QX support does not override the URL omission policy.
  assert.equal(targetRegexCapability('qx','url').inlineFlags,'verified');
  assert.equal(compileRegexForTarget({type:'regex',pattern:'api',flags:'i'},{target:'qx',requireEquivalent:true}).ok,false);

  console.log('Resource architecture: streaming limits, retry classification, snapshot consistency, shared dependencies, pure conversion and safe deduplication passed');
} finally {globalThis.fetch=originalFetch;await fs.rm(root,{recursive:true,force:true});}
}
