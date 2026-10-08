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
import { syncFailureIssueBody, syncFailureTitle, targetProblemIssueBody, targetProblemTitle, monitorFailureTitle, monitorFailureIssueBody } from "../../scripts/propose-conversion-issues.mjs";

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
assert.doesNotMatch(sync,/forceConvert|skipped: upstream content unchanged/,'every catalog entry must reach conversion');
assert.match(sync,/await commit\(root,entry,targetState,out/,'sync must commit all plugin artifacts through the transaction');
assert.match(managed,/const helperChanges=await writeHelpers/,'transaction retains helper write results');
assert.match(canonical,/await commitManagedConversion\(ROOT,entry,targetState,out\)/,'canonical writer must use the same artifact transaction');
assert.match(sync,/targetChanges\.length \|\| helperChanges\.length \|\| changed/,
  'helper-only repair must not be reported as fully unchanged');

assert.match(sync,/result\.publishable/,'CLI publication result must reflect rollback/quarantine integrity');
const checkWorkflow=await fs.readFile('.github/workflows/converter-check.yml','utf8');
assert.match(checkWorkflow,/steps\.loon_sync\.outputs\.publishable == 'true'/,'canonical generation must require verified sync integrity');
assert.match(checkWorkflow,/steps\.gate\.outputs\.publishable/,'publication must require all pipeline gates');
assert.deepEqual((await fs.readdir('.github/workflows')).filter(name=>/\.ya?ml$/.test(name)),['converter-check.yml'],'only one automation workflow may remain');
assert.match(checkWorkflow,/pull_request:/);assert.match(checkWorkflow,/workflow_dispatch:/);
assert.match(checkWorkflow,/schedule:/);
assert.match(checkWorkflow,/cron: '30 17 \* \* \*'/,'daily monitoring runs at 01:30 Asia/Shanghai');
assert.doesNotMatch(checkWorkflow,/regenerate-canonical\.mjs --write|update-readme\.mjs --write/,'sync is the only workflow writer; canonical and README remain verification gates');
assert.match(checkWorkflow,/github\.event_name != 'pull_request'/,'scheduled runs must select the main destination rather than become read-only');
assert.match(checkWorkflow,/cancel-in-progress: false/,'generation must not be cancelled halfway through publication');
assert.match(checkWorkflow,/include-hidden-files: true/,'runtime and catalog reports must actually be uploaded');
const automationSource=await fs.readFile('.github/scripts/automation.py','utf8');
assert.match(automationSource,/remote_sha != expected/,'stale publication must be rejected');
assert.match(automationSource,/args.append\('--dry-run'\)/,'read-only PR runs must not attempt Issue writes');

assert.match(canonical,/const staleEntries = \[\]/,
  'canonical result tracking must name pre-write differences as stale entries');
assert.match(canonical,/const targetDiffs = managedTargetDiffs\(targetState,out\)/,
  'canonical stale detection must reuse the shared target-diff primitive');
assert.match(canonical,/const differs = targetDiffs\.length > 0 \|\| helperDiffs\.length > 0/,
  'canonical stale result must include both targets and generated helpers');
assert.match(canonical,/Stale canonical entries: ' \+ staleEntries\.join/,
  'canonical check-mode stale reporting must remain workflow-specific');

// Execute the workflow's actual gate/publisher without fetching production upstreams.
const stepProgram=name=>{
  const block=checkWorkflow.split('      - name: '+name+'\n')[1]?.split('\n      - ')[0];
  assert.ok(block,'missing workflow step '+name);
  const code=block.split('        run: |\n')[1];assert.ok(code,'missing step program '+name);
  return code.split('\n').map(line=>line.startsWith('          ')?line.slice(10):line).join('\n')
    .replace('.github/scripts/automation.py',JSON.stringify(path.join(ROOT,'.github/scripts/automation.py')));
};
const gateProgram=stepProgram('Evaluate publication gates');
const publishProgram=stepProgram('Publish validated outputs to the existing branch');
const automationRoot=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-pipeline-'));
try {
  await fs.mkdir(path.join(automationRoot,'.github/monitor/.runtime'),{recursive:true});
  const output=path.join(automationRoot,'output');
  const required=['syntax','catalog','checkpoint','loon_sync','verify','reports','issues'];
  const outcomes=Object.fromEntries(required.map(name=>[name,{outcome:'success'}]));
  const gate=async(stages,integrity='true',monitor='false',complete='true')=>{
    await fs.writeFile(output,'');
    const result=runIsolatedCase('bash',['-e','-c',gateProgram],{cwd:automationRoot,encoding:'utf8',env:{...process.env,STAGES:JSON.stringify(stages),SYNC_PUBLISHABLE:integrity,MONITOR_ENABLED:monitor,MONITOR_COMPLETE:complete,GITHUB_OUTPUT:output}});
    assert.equal(result.status,0,result.stderr);
    return JSON.parse(await fs.readFile(path.join(automationRoot,'.github/monitor/.runtime/pipeline-result.json'),'utf8'));
  };
  assert.equal((await gate(outcomes)).publishable,true);
  for(const name of required)for(const outcome of ['failure','skipped']) {
    const result=await gate({...outcomes,[name]:{outcome}});
    assert.equal(result.publishable,false);assert.ok(result.failedGates.includes(name));
  }
  assert.equal((await gate(outcomes,'false')).publishable,false);
  assert.equal((await gate(outcomes,'','false')).publishable,false);
  assert.equal((await gate(outcomes,'true','true')).publishable,false);
  assert.equal((await gate({...outcomes,monitor:{outcome:'success'}},'true','true')).publishable,true);
  for(const complete of ['false',''])assert.equal((await gate({...outcomes,monitor:{outcome:'success'}},'true','true',complete)).publishable,false,'a zero exit code alone cannot prove monitor integrity');

  const summaryFile=path.join(automationRoot,'summary');
  const summarize=publication=>runIsolatedCase('bash',['-e','-c',stepProgram('Record run summary')],{cwd:automationRoot,encoding:'utf8',env:{...process.env,PUBLICATION:publication,GITHUB_STEP_SUMMARY:summaryFile}});
  assert.equal(summarize('').status,0,'missing publication is recorded as blocked');
  assert.match(await fs.readFile(summaryFile,'utf8'),/Publication: blocked/);
  const syncReport={validatedPlugins:['one','two'],convertedPlugins:['one'],retainedPlugins:['two']};
  await fs.writeFile(path.join(automationRoot,'.github/monitor/.runtime/sync-failures.json'),JSON.stringify(syncReport));
  assert.equal(summarize('unchanged').status,0);
  const summary=await fs.readFile(summaryFile,'utf8');
  assert.match(summary,/validatedPlugins: 2/);assert.match(summary,/retainedPlugins: 1/);
  const finalize=(publishable,outcome)=>runIsolatedCase('bash',['-e','-c',stepProgram('Surface blocked or failed publication')],{cwd:automationRoot,encoding:'utf8',env:{...process.env,PUBLISHABLE:publishable,PUBLICATION_OUTCOME:outcome}});
  assert.equal(finalize('true','success').status,0);
  assert.notEqual(finalize('false','success').status,0);
  assert.notEqual(finalize('true','failure').status,0);
  const repo=path.join(automationRoot,'repo'),remote=path.join(automationRoot,'remote.git');
  await fs.mkdir(repo);const git=(...args)=>{
    const result=runIsolatedCase('git',args,{cwd:repo,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim();
  };
  git('init','-q','-b','main');git('config','user.name','fixture');git('config','user.email','fixture@example.test');
  const files=['.github/sources/loon.json','Resource/Loon/test.lpx','Adblock/Quantumult X/test.snippet','Adblock/Surge/test.sgmodule','Script/Test/manual.js','README.md','.github/monitor/state.json','.github/monitor/upstream/spec.txt','Boxjs/manual.json'];
  for(const file of files){await fs.mkdir(path.dirname(path.join(repo,file)),{recursive:true});await fs.writeFile(path.join(repo,file),'baseline\n');}
  git('add','.');git('commit','-qm','fixture baseline');const baseline=git('rev-parse','HEAD');
  git('init','-q','--bare',remote);git('remote','add','origin',remote);git('push','-q','origin','HEAD:main','HEAD:test');
  const prepare=()=>runIsolatedCase('bash',['-e','-c',stepProgram('Prepare runtime logs and enforce branch budget')],{cwd:repo,encoding:'utf8'});
  assert.equal(prepare().status,0,'existing main/test branch budget passes');
  git('push','-q','origin','HEAD:other');
  assert.notEqual(prepare().status,0,'unexpected third branch blocks automation');
  git('push','-q','origin',':other');
  assert.equal(prepare().status,0);
  const publish=async({branch='test',publishable='true',expected=baseline,monitor='false'}={})=>{
    await fs.writeFile(output,'');
    const result=runIsolatedCase('bash',['-e','-c',publishProgram],{cwd:repo,encoding:'utf8',env:{...process.env,PUBLISHABLE:publishable,PUBLISH_BRANCH:branch,EXPECTED_HEAD:expected,MONITOR_ENABLED:monitor,GITHUB_OUTPUT:output}});
    return {...result,output:await fs.readFile(output,'utf8')};
  };
  await fs.writeFile(path.join(repo,'Adblock/Quantumult X/test.snippet'),'new output\n');
  assert.notEqual((await publish({publishable:'false'})).status,0);
  assert.equal(git('diff','--cached','--name-only'),'');
  assert.equal((await publish({branch:''})).status,0);assert.equal(git('rev-parse','HEAD'),baseline);
  assert.notEqual((await publish({branch:'other'})).status,0);
  assert.notEqual((await publish({expected:'incorrect'})).status,0);
  await fs.writeFile(path.join(repo,'Boxjs/manual.json'),'manual edit\n');
  const pushed=await publish();assert.equal(pushed.status,0,pushed.stderr);assert.match(pushed.output,/publication=pushed/);
  assert.equal(git('diff-tree','--no-commit-id','--name-only','-r','HEAD'),'Adblock/Quantumult X/test.snippet','publisher must exclude unrelated manual changes');
  const testHead=git('rev-parse','HEAD');assert.equal(git('ls-remote','origin','refs/heads/main').split(/\s/)[0],baseline);
  assert.match((await publish({expected:testHead})).output,/publication=unchanged/);
  git('reset','--hard',baseline);
  await fs.writeFile(path.join(repo,'Adblock/Quantumult X/test.snippet'),'race output\n');
  const stale=await publish();assert.notEqual(stale.status,0);assert.match(stale.stdout,/Destination advanced/);
  assert.equal(git('rev-parse','HEAD'),baseline,'stale publication must not create a commit');
  git('reset','--hard',baseline);
  await fs.writeFile(path.join(repo,'.github/monitor/state.json'),'updated monitor\n');
  const main=await publish({branch:'main',monitor:'true'});assert.equal(main.status,0,main.stderr);
  assert.equal(git('diff-tree','--no-commit-id','--name-only','-r','HEAD'),'.github/monitor/state.json');
  assert.equal(git('ls-remote','--heads','origin').split('\n').length,2);
} finally {await fs.rm(automationRoot,{recursive:true,force:true});}
console.log('Actions gate and publication execution contracts passed');

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
    await fs.copyFile('.github/converter/fixtures/catalog-legacy-syntax-inventory.json',path.join(issueFixture,'.github/converter/fixtures/catalog-legacy-syntax-inventory.json'));
    const known='response if ${url} ~= /api/ then response.json.jq(`del(.a,.b)`)';
    const fresh='response if ${url} ~= /api/ then response.header.del("X")';
    const unknown='response if ${url} ~= /api/ then response.future.action()';
    const selectedScript='response if ${url} ~= /api/ then response.future.action() | script("https://example.test/main.js") with requires_body=true';
    const selectedJq='response if ${url} ~= /api/ then response.future.action() | response.json.jq(`.a = "x|y" | .b = true`)';
    const legacyKnown='^https://example.test - reject';
    const legacyNew='^https://example.test header https://new.example.test';
    const legacyUnknown='^https://example.test future-action';
    const scriptKnown='http-response ^https://example.test script-path=https://example.test/main.js, enable=false';
    const scriptNew='http-response ^https://example.test script-path=https://example.test/main.js, debug=true';
    const scriptUnknown='http-response ^https://example.test script-path=https://example.test/main.js, future-option=true';
    const declarationOnly='^https://malformed.test';
    await fs.writeFile(path.join(issueFixture,'Resource/Loon/test.lpx'),'[Rewrite]\n'+[known,fresh,unknown,selectedScript,selectedJq,legacyKnown,'response reject','generic reject',legacyNew,legacyUnknown,declarationOnly,'# '+legacyUnknown,'; '+legacyUnknown,'// '+legacyUnknown].join('\n')+'\n[Script]\n'+[scriptKnown,scriptNew,scriptUnknown,'# '+scriptNew].join('\n'));
    await fs.writeFile(path.join(issueFixture,'.github/monitor/.runtime/sync-failures.json'),JSON.stringify({version:1,failures:[{plugin,stage:'convert',reason:'unknown syntax',declarations:[{section:'Rewrite',line:unknown}]}]}));
    const url=new URL('../../scripts/propose-conversion-issues.mjs',import.meta.url).href;
    const result=runIsolatedCase(process.execPath,['--input-type=module','-e',
      'import {collectIssueCandidates,targetProblemTitle} from '+JSON.stringify(url)+'; const a=await collectIssueCandidates(); const b=await collectIssueCandidates(); console.log(JSON.stringify({a,b,titles:a.targetProblems.map(targetProblemTitle)}));'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);
    const {a,b,titles}=JSON.parse(result.stdout);assert.deepEqual(a,b,'fingerprints and candidates remain stable');
    assert.equal(a.syncFailures.length,1,'read the same .github runtime report written by sync');
    assert.equal(a.targetProblems.length,7,'new identifiers and unsupported V2/legacy syntax are reported');
    assert.ok(a.targetProblems.some(group=>group.source===fresh&&group.reasons.some(reason=>reason.includes('response.header.del'))));
    assert.ok(a.targetProblems.some(group=>group.source===unknown));
    for(const source of [legacyNew,legacyUnknown,scriptNew,scriptUnknown,declarationOnly])assert.ok(a.targetProblems.some(group=>group.source===source),source);
    assert.ok(a.targetProblems.some(group=>group.source===legacyNew&&group.reasons.some(reason=>reason.includes('legacyRewrite.actionKinds'))));
    assert.ok(a.targetProblems.some(group=>group.source===scriptNew&&group.reasons.some(reason=>reason.includes('legacyScript.optionNames'))));
    assert.ok(a.targetProblems.every(group=>![known,selectedScript,selectedJq,legacyKnown,scriptKnown,'response reject','generic reject'].includes(group.source)&&group.declarations[0].line===group.source));
    assert.equal(new Set(titles).size,7);
    assert.ok(!a.targetProblems.some(group=>[selectedScript,selectedJq].includes(group.source)),'source preflight must apply Script/JQ priority before semantic token review');
    const sourcePath=path.join(issueFixture,'Resource/Loon/test.lpx');
    const originalSource=await fs.readFile(sourcePath,'utf8');
    await fs.writeFile(sourcePath,'[Rewrite]\n'+selectedScript+'\n'+selectedJq+'\n');
    const catalogGate=runIsolatedCase(process.execPath,[new URL('catalog.mjs',import.meta.url).pathname,'--case=catalog-syntax-inventory.mjs'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(catalogGate.status,0,'selected layers must also pass the complete catalog gate: '+catalogGate.stderr);
    await fs.writeFile(sourcePath,originalSource);
    await fs.mkdir(path.join(issueFixture,'Adblock/Quantumult X'),{recursive:true});
    await fs.writeFile(path.join(issueFixture,'Adblock/Quantumult X/test.snippet'),'# [WayX] ISSUE REQUIRED [fixture-unknown]: unsupported\n# Source declaration: '+legacyUnknown+'\n');
    const merged=runIsolatedCase(process.execPath,['--input-type=module','-e','import {collectIssueCandidates} from '+JSON.stringify(url)+'; console.log(JSON.stringify(await collectIssueCandidates()));'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(merged.status,0,merged.stderr);
    const mergedProblems=JSON.parse(merged.stdout).targetProblems;
    assert.equal(mergedProblems.length,7,'source and target representations of the same declaration must deduplicate');
    assert.equal(mergedProblems.filter(group=>group.source===legacyUnknown).length,1);
    assert.ok(mergedProblems.find(group=>group.source===legacyUnknown).locations.length>0);
    const monitorFailure={source:{id:'official-fixture',repo:'example/docs',ref:'main'},stage:'fetch-and-mirror',errorType:'RuntimeError',reason:'HTTP 503 downloading docs.js',rollbackSucceeded:true};
    await fs.writeFile(path.join(issueFixture,'.github/monitor/.runtime/monitor-result.json'),JSON.stringify({version:1,complete:false,failures:[monitorFailure]}));
    const monitorCandidates=runIsolatedCase(process.execPath,['--input-type=module','-e','import {collectIssueCandidates} from '+JSON.stringify(url)+'; console.log(JSON.stringify(await collectIssueCandidates()));'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(monitorCandidates.status,0,monitorCandidates.stderr);
    assert.deepEqual(JSON.parse(monitorCandidates.stdout).monitorFailures,[monitorFailure]);
    assert.equal(monitorFailureTitle(monitorFailure),monitorFailureTitle({...monitorFailure,reason:'HTTP 502 at a later timestamp'}),'monitor retries must reuse the same fingerprint');
    assert.notEqual(monitorFailureTitle(monitorFailure),monitorFailureTitle({...monitorFailure,stage:'write-state'}));
    for(const content of ['official-fixture','https://github.com/example/docs','fetch-and-mirror','HTTP 503','Rollback succeeded: true'])assert.ok(monitorFailureIssueBody(monitorFailure).includes(content));
    const dry=runIsolatedCase(process.execPath,[new URL('../../scripts/propose-conversion-issues.mjs',import.meta.url).pathname,'--dry-run'],{cwd:issueFixture,encoding:'utf8'});assert.equal(dry.status,0,dry.stderr);
    assert.ok((await fs.readFile(path.join(issueFixture,'.github/monitor/.runtime/conversion-issues.md'),'utf8')).includes('Hard sync failures: 1'));
    assert.ok((await fs.readFile(path.join(issueFixture,'.github/monitor/.runtime/conversion-issues.md'),'utf8')).includes('Upstream monitor failures: 1'));

    const runtime=path.join(issueFixture,'.github/monitor/.runtime');
    const summary=await fs.readFile(path.join(runtime,'conversion-issues.md'),'utf8');
    const runIssues=()=>runIsolatedCase(process.execPath,[new URL('../../scripts/propose-conversion-issues.mjs',import.meta.url).pathname,'--dry-run'],{cwd:issueFixture,encoding:'utf8'});
    for(const filename of ['sync-failures.json','monitor-result.json']) {
      const file=path.join(runtime,filename), original=await fs.readFile(file,'utf8');
      for(const bad of ['{invalid JSON','null','[]','{}',JSON.stringify({version:99,failures:[]}),JSON.stringify({version:1,failures:null}),JSON.stringify({version:1,failures:[{}]}),JSON.stringify({version:1,failures:[],complete:'true',publishable:'true'})]) {
        await fs.writeFile(file,bad);
        const failed=runIssues();
        assert.notEqual(failed.status,0,'corrupt report must fail: '+filename+' '+bad);
        assert.ok(failed.stderr.includes(filename),failed.stderr);
        assert.equal(await fs.readFile(path.join(runtime,'conversion-issues.md'),'utf8'),summary,'failed collection must preserve the last valid summary');
      }
      await fs.rm(file);await fs.mkdir(file);
      assert.notEqual(runIssues().status,0,'IO errors cannot become empty reports');
      await fs.rm(file,{recursive:true});await fs.writeFile(file,original);
    }
    await fs.writeFile(path.join(runtime,'monitor-result.json'),JSON.stringify({version:1,complete:true,failures:[monitorFailure]}));
    assert.notEqual(runIssues().status,0,'complete monitor cannot contain failures');
    const preflight=runIsolatedCase(process.execPath,['--input-type=module','-e','import {collectIssueCandidates} from '+JSON.stringify(url)+'; await collectIssueCandidates({includeSyncFailures:false});'],{cwd:issueFixture,encoding:'utf8'});
    assert.equal(preflight.status,0,preflight.stderr);
    for(const version of [1,2]) {
      await fs.writeFile(path.join(runtime,'sync-failures.json'),JSON.stringify({version,failures:[],publishable:true}));
      await fs.writeFile(path.join(runtime,'monitor-result.json'),JSON.stringify({version:1,complete:true,failures:[]}));
      assert.equal(runIssues().status,0,'valid report versions remain supported');
    }
    for(const file of ['sync-failures.json','monitor-result.json'])await fs.rm(path.join(runtime,file));
    assert.equal(runIssues().status,0,'optional reports may be absent');

    // Run the real report CLI in an isolated repository, with a decoy old path.
    const baseline=path.join(issueFixture,'.github/converter/fixtures/review-inventory-baseline.json');
    const validBaseline={version:1,review:{byPlatform:{qx:0,surge:0}}};
    await fs.mkdir(path.join(issueFixture,'converter','fixtures'),{recursive:true});
    await fs.writeFile(path.join(issueFixture,'converter','fixtures','review-inventory-baseline.json'),JSON.stringify({version:1,review:{byPlatform:{qx:99,surge:99}}}));
    await fs.writeFile(path.join(issueFixture,'Resource/Loon/test.lpx'),'[Rule]\nDOMAIN,example.test,REJECT\n');
    await fs.writeFile(path.join(issueFixture,'Adblock/Quantumult X/test.snippet'),'# [WayX] REVIEW REQUIRED: fixture\n');
    await fs.mkdir(path.join(issueFixture,'Adblock/Surge'),{recursive:true});
    await fs.writeFile(path.join(issueFixture,'Adblock/Surge/test.sgmodule'),'[Rule]\nDOMAIN,example.test,REJECT\n');
    await fs.writeFile(baseline,JSON.stringify(validBaseline));
    const runReports=()=>runIsolatedCase(process.execPath,[new URL('../tools/conversion-reports.mjs',import.meta.url).pathname],{cwd:issueFixture,encoding:'utf8'});
    const reported=runReports();assert.equal(reported.status,0,reported.stderr);
    assert.ok(reported.stdout.includes('qx Review count increased from 0 to 1'),'use migrated baseline, not decoy old path');
    const reportFile=path.join(runtime,'review-inventory.json'), savedReport=await fs.readFile(reportFile,'utf8');
    for(const bad of [null,'{invalid JSON','null','{}',JSON.stringify({version:1,review:{byPlatform:{qx:-1,surge:0}}}),JSON.stringify({version:1,review:{byPlatform:{qx:0}}})]) {
      if(bad===null)await fs.rm(baseline);else await fs.writeFile(baseline,bad);
      const failed=runReports();assert.notEqual(failed.status,0,'missing/invalid baseline must fail');
      assert.ok(failed.stderr.includes('review-inventory-baseline.json'));
      assert.equal(await fs.readFile(reportFile,'utf8'),savedReport,'invalid baseline must not replace reports');
    }
    console.log('Report reliability regressions passed');
  } finally {await fs.rm(issueFixture,{recursive:true,force:true});}

  const categoryCheck=runIsolatedCase('python',['-c',String.raw`
import importlib.util, tempfile, json, sys, io, contextlib
from pathlib import Path
from unittest.mock import patch
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
retired_kelee=item('Bilibili_remove_ads',['去广告'])
retired_ru='https://rucu6.pages.dev/Plugins/bilibili.lpx'
retired_entry={'id':'retired','file':'retired.lpx','source':retired_ru,'qx':'retired.snippet','surge':'retired.sgmodule','category':'去广告'}
entries,metadata=m.build_catalog({'lists':[a,retired_kelee]},old,static+[retired_entry])
assert [e['source'] for e in entries]==[a['url'],static[0]['source']]
assert [e['source'] for e in metadata]==[a['url']]
assert m.is_retired_source(retired_kelee['url']+'?cache=1#test')
assert m.is_retired_source(retired_ru+'?cache=1#test')
assert not m.is_retired_source('https://other.example/Plugins/bilibili.lpx')
ru={'id':'stable_ru','file':'RuCu6/one.lpx','source':'https://rucu6.pages.dev/Plugins/one.lpx','qx':'RuOne.snippet','surge':'RuOne.sgmodule','category':'去广告'}
index={'plugins':[{'url':ru['source'],'tag':['增强']},{'url':'https://rucu6.pages.dev/Plugins/new.lpx','tag':['签到']}]}
new=m.build_rucu6_catalog(index,[ru],static)
assert m.build_rucu6_catalog({'plugins':[retired_ru,ru['source']]},[ru],static)==[ru]
assert m.build_rucu6_catalog({'plugins':[retired_ru]},[],static)==[]
assert new[0]==ru and len(new)==2 and new[1]['file']=='RuCu6/new.lpx'
assert all(e['source'].startswith('https://rucu6.pages.dev/Plugins/') for e in new)
widget='<a href="https://rucu6.pages.dev/Plugins/outside.lpx">unrelated</a><div class="tgme_widget_message_text js-message_text"><a href="https://pse.is/example">plugin</a><a href="https://www.nsloon.com/openloon/import?plugin=https%3A%2F%2Frucu6.pages.dev%2FPlugins%2Fone.lpx&amp;tag=test">duplicate</a></div>'
with patch.object(m.urllib.request,'build_opener') as make:
 make.return_value.open.side_effect=m.ResolvedRuCu6Link(ru['source'])
 assert m.build_rucu6_catalog(widget,[ru],static)==[ru]
 assert make.return_value.open.call_args.args[0].get_header('User-agent')==m.LOON_UA
 assert make.return_value.open.call_count==1
assert m.rucu6_plugin_url('https://www.nsloon.com/openloon/import?plugin=https%253A%252F%252Frucu6.pages.dev%252FPlugins%252Fone.lpx')==ru['source']
assert m.rucu6_plugin_url(ru['source']+'?cache=1#test')==ru['source']
for invalid in ['https://www.nsloon.com/openloon/import?other='+ru['source'], 'https://www.nsloon.com/openloon/import?plugin='+ru['source']+'&plugin='+ru['source'], 'https://rucu6.pages.dev.evil.test/Plugins/one.lpx', 'http://rucu6.pages.dev/Plugins/one.lpx']:
 assert m.rucu6_plugin_url(invalid) is None
handler=m.RuCu6RedirectHandler()
try:handler.redirect_request(None,None,302,'',{},'https://www.nsloon.com/openloon/import?plugin='+ru['source'])
except m.ResolvedRuCu6Link as resolved:assert resolved.url==ru['source']
else:raise AssertionError('import landing page must never be fetched')
try:handler.redirect_request(None,None,302,'',{},'https://evil.test/?plugin='+ru['source'])
except ValueError:pass
else:raise AssertionError('unexpected redirect host must fail')
with patch.object(m.urllib.request,'build_opener') as make,patch.object(m.time,'sleep'):
 make.return_value.open.side_effect=[m.urllib.error.URLError('timeout'),m.ResolvedRuCu6Link(ru['source'])]
 assert m.resolve_rucu6_short_link('https://pse.is/example')==ru['source'] and make.return_value.open.call_count==2
with patch.object(m.urllib.request,'build_opener') as make,patch.object(m.time,'sleep'):
 make.return_value.open.side_effect=m.urllib.error.URLError('timeout')
 try:m.resolve_rucu6_short_link('https://pse.is/example')
 except RuntimeError as error:assert 'after 3 attempts' in str(error)
 else:raise AssertionError('failed redirect must not silently omit a plugin')
 assert make.return_value.open.call_count==3
try:m.build_rucu6_catalog('<html>Site Unavailable</html>',[ru],static)
except ValueError:pass
else:raise AssertionError('empty/unavailable index must fail before deletion')
with tempfile.TemporaryDirectory() as tmp:
 saved_root=m.ROOT;m.ROOT=Path(tmp)
 try:
  for base,field in [('Resource/Loon','file'),('Adblock/Quantumult X','qx'),('Adblock/Surge','surge')]:
   path=m.ROOT/base/ru[field];path.parent.mkdir(parents=True,exist_ok=True);path.write_text('# Converted by: chance\n')
  directory=m.ROOT/'Script'/ru['id'];directory.mkdir(parents=True)
  generated=directory/'features_qx_0123456789.js';generated.write_text('// Converted by: chance\n')
  manual=directory/'manual.js';manual.write_text('// handwritten\n')
  assert len(m.prune_removed([ru],[]))==4
  assert manual.exists() and not generated.exists()
  orphan=m.ROOT/'Resource/Loon/orphan.lpx';orphan.write_text('#!name=old')
  standalone=m.ROOT/'Adblock/Quantumult X/manual.snippet';standalone.write_text('# Author: chance\n')
  assert m.prune_orphans([])==['Resource/Loon/orphan.lpx'] and standalone.exists()
  # A replacement source reusing current target paths must not lose those files.
  current=dict(ru,source='https://rucu6.pages.dev/Plugins/replacement.lpx')
  for base,field in [('Resource/Loon','file'),('Adblock/Quantumult X','qx'),('Adblock/Surge','surge')]:
   path=m.ROOT/base/current[field];path.parent.mkdir(parents=True,exist_ok=True);path.write_text('current')
  assert m.prune_removed([ru],[current])==[]
 finally:m.ROOT=saved_root

with tempfile.TemporaryDirectory() as temp:
 m.ROOT=Path(temp);m.CATALOG=m.ROOT/'.github/sources/loon.json';m.STATIC_CATALOG=m.ROOT/'.github/sources/loon-static.json'
 m.RUNTIME_DIR=m.ROOT/'.github/monitor/.runtime';m.RUNTIME_SNAPSHOT=m.RUNTIME_DIR/'kelee-catalog.json'
 m.CATALOG.parent.mkdir(parents=True);m.CATALOG.write_text(json.dumps(old));m.STATIC_CATALOG.write_text(json.dumps(static))
 payload={'lists':[a,b,c]};response=json.dumps(payload).encode()
 with patch.object(sys,'argv',['refresh','--rucu6-list-url','']),patch.object(m,'fetch_bytes',return_value=response) as fetch,contextlib.redirect_stdout(io.StringIO()):assert m.main()==0
 assert fetch.call_count==1
 catalog=json.loads(m.CATALOG.read_text());assert [entry['source'] for entry in catalog]==[a['url'],b['url'],static[0]['source']]
 discovery=json.loads((m.RUNTIME_DIR/'catalog-discovery.json').read_text())
 assert [entry['source'] for entry in discovery['added']]==[b['url'],static[0]['source']]
 feed=json.loads((m.RUNTIME_DIR/'kelee-feed.json').read_text());assert feed['source']==m.DEFAULT_LIST_URL and json.loads(feed['text'])==payload
 with patch.object(sys,'argv',['refresh','--rucu6-list-url','']),patch.object(m,'fetch_bytes',return_value=response),contextlib.redirect_stdout(io.StringIO()):assert m.main()==0
 discovery=json.loads((m.RUNTIME_DIR/'catalog-discovery.json').read_text());assert discovery['added']==[] and discovery['updated']==[] and discovery['removed']==[]
 before=m.CATALOG.read_bytes()
 marker=m.ROOT/'Resource/Loon/orphan.lpx';marker.parent.mkdir(parents=True,exist_ok=True);marker.write_text('keep on incomplete discovery')
 with patch.object(sys,'argv',['refresh']),patch.object(m,'fetch_bytes',side_effect=[response,widget.encode()]),patch.object(m,'resolve_rucu6_short_link',side_effect=RuntimeError('failed redirect')):
  try:m.main()
  except RuntimeError:pass
  else:raise AssertionError('incomplete short-link discovery must block writes and cleanup')
 assert m.CATALOG.read_bytes()==before and marker.exists()

`],{encoding:'utf8'});
  assert.equal(categoryCheck.status,0,categoryCheck.stderr||categoryCheck.stdout);

  const monitorCheck=runIsolatedCase('python',['-c',String.raw`
import importlib.util, tempfile, json, sys, io, copy, contextlib, os
from pathlib import Path
from unittest.mock import patch
s=importlib.util.spec_from_file_location('monitor','.github/monitor/monitor_upstreams.py')
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
with tempfile.TemporaryDirectory() as temp:
 m.ROOT=Path(temp);config=m.ROOT/'config.json';state_path=m.ROOT/'state.json';runtime=m.ROOT/'runtime';mirror=m.ROOT/'mirror'
 settings={'state_file':'state.json','mirror_root':'mirror','runtime_root':'runtime'}
 http={'id':'http','kind':'http','url':'https://example.test/spec','save_as':'spec.txt'}
 repo={'id':'repo','kind':'github_repo','repo':'example/docs','ref':'main','save_as':'repo','include_globs':['*.js']}
 def run(sources):
  config.write_text(json.dumps({'settings':settings,'sources':sources}))
  with patch.object(sys,'argv',['monitor','--config',str(config)]),patch.dict(os.environ,{'GITHUB_OUTPUT':str(m.ROOT/'outputs')}),contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()): return m.main()
 def report():return json.loads((runtime/'monitor-result.json').read_text())
 calls=[]
 def http_response(url,headers,timeout):
  calls.append(headers);return 200,b'spec\r\n',{'etag':'v1'}
 with patch.object(m,'request',side_effect=http_response): assert run([http])==0
 old=state_path.read_bytes();assert (mirror/'spec.txt').read_bytes()==b'spec\r\n'
 (runtime/'upstream_changes.md').write_text('stale historical result')
 with patch.object(m,'request',return_value=(304,b'',{})):assert run([http])==0
 assert state_path.read_bytes()==old
 assert 'stale historical' not in (runtime/'upstream_changes.md').read_text()
 assert report()['complete'] and not report()['results'][0]['changed']
 for missing in [False,True]:
  if missing:(mirror/'spec.txt').unlink()
  else:(mirror/'spec.txt').write_bytes(b'corrupt')
  calls.clear()
  with patch.object(m,'request',side_effect=http_response):assert run([http])==0
  assert not any(key.startswith('If-') for key in calls[-1])
  assert (mirror/'spec.txt').read_bytes()==b'spec\r\n'
 (mirror/'spec.txt').unlink();old=state_path.read_bytes()
 with patch.object(m,'request',return_value=(304,b'',{})):assert run([http])==1
 assert state_path.read_bytes()==old and not (mirror/'spec.txt').exists()
 assert not report()['complete'] and report()['failures'][0]['rollbackSucceeded']

 def seed_repo():
  import shutil
  shutil.rmtree(mirror/'repo',ignore_errors=True);(mirror/'repo').mkdir(parents=True)
  for name in ['old.js','removed.js','outside.js']:(mirror/'repo'/name).write_bytes(b'original\r\n')
  m.save_json(state_path,{'version':1,'sources':{'repo':{'kind':'github_repo','repo':'example/docs','ref':'main','remote_sha':'old'}}})
  return {str(p.relative_to(m.ROOT)):p.read_bytes() for p in [state_path,*sorted((mirror/'repo').glob('*'))]}
 def files():return {str(p.relative_to(m.ROOT)):p.read_bytes() for p in [state_path,*sorted((mirror/'repo').glob('*'))] if p.is_file()}
 changes=[{'filename':'added.js','status':'added','raw_url':'https://example.test/added'},
 {'filename':'new.js','previous_filename':'old.js','status':'renamed','raw_url':'https://example.test/new'},
 {'filename':'removed.js','status':'removed'},
 {'filename':'outside.txt','previous_filename':'outside.js','status':'renamed'}]
 comparison={'status':'ahead','files':changes}
 def api(url,ua,timeout):return {'sha':'new'} if '/commits/' in url else comparison
 def fail_second(url,headers,timeout):return (503,b'',{}) if url.endswith('/new') else (200,b'new bytes',{})
 before=seed_repo()
 with patch.object(m,'github_json',side_effect=api),patch.object(m,'request',side_effect=fail_second):assert run([repo])==1
 assert files()==before,'a partial download must restore every mirror and retain the old SHA'
 assert report()['failures'][0]['stage']=='fetch-and-mirror'
 before=seed_repo();original_save=m.save_json
 def fail_state(path,data):
  original_save(path,data)
  if path==state_path:raise OSError('fault after state write')
 with patch.object(m,'github_json',side_effect=api),patch.object(m,'request',return_value=(200,b'new bytes',{})),patch.object(m,'save_json',side_effect=fail_state):assert run([repo])==1
 assert files()==before,'state-write failure must restore both the state bytes and mirrors'
 assert report()['failures'][0]['stage']=='write-state'
 before=seed_repo()
 with patch.object(m,'github_json',side_effect=api),patch.object(m,'request',side_effect=fail_second),patch.object(m,'restore_source',side_effect=OSError('rollback blocked')):assert run([repo])==1
 assert report()['failures'][0]['rollbackSucceeded'] is False
 seed_repo()
 with patch.object(m,'github_json',side_effect=api),patch.object(m,'request',return_value=(200,b'new bytes',{})):assert run([repo])==0
 assert json.loads(state_path.read_text())['sources']['repo']['remote_sha']=='new'
 assert (mirror/'repo/new.js').read_bytes()==b'new bytes'
 for name in ['old.js','removed.js','outside.js']:assert not (mirror/'repo'/name).exists()
 for value in [{'status':'ahead','files':[{'filename':str(i)+'.js'} for i in range(300)]},{'status':'diverged','files':[]},{'status':'ahead'}]:
  before=seed_repo();comparison=value
  with patch.object(m,'github_json',side_effect=api):assert run([repo])==1
  assert files()==before
 before=seed_repo();comparison={'status':'ahead','files':[{'filename':'new.js','status':'modified'}]}
 with patch.object(m,'github_json',side_effect=api):assert run([repo])==1
 assert files()==before,'missing raw URL must not advance the baseline'
 comparison={'status':'ahead','files':changes};before=seed_repo()
 with patch.object(m,'github_json',side_effect=api),patch.object(m,'request',side_effect=lambda url,headers,timeout:(200,b'http success',{}) if url==http['url'] else fail_second(url,headers,timeout)):
  assert run([repo,http])==1
 assert json.loads(state_path.read_text())['sources']['repo']['remote_sha']=='old'
 assert (mirror/'spec.txt').read_bytes()==b'http success','healthy sources continue after isolated monitor failure'
 assert len(report()['failures'])==1 and len(report()['results'])==2
 feed_source={'id':'feed','kind':'http','url':'https://example.test/list.json','save_as':'feed.json','cached_feed':'feed.json'}
 (m.ROOT/'feed.json').write_text(json.dumps({'source':feed_source['url'],'text':'{"lists":[]}'}))
 with patch.object(m,'request',side_effect=AssertionError('discovery feed must not be fetched twice')):assert run([feed_source])==0
 before=state_path.read_bytes();old_mirror=(mirror/'feed.json').read_bytes()
 (m.ROOT/'feed.json').write_text(json.dumps({'source':'https://wrong.test','text':'{}'}))
 with patch.object(m,'request',side_effect=AssertionError('mismatched feed must not fall back to a second fetch')):assert run([feed_source])==1
 assert state_path.read_bytes()==before and (mirror/'feed.json').read_bytes()==old_mirror
 for invalid in [[],[http,http],[{'id':''}]]:
  before=state_path.read_bytes();assert run(invalid)==1
  assert state_path.read_bytes()==before and report()['failures'][0]['stage']=='configuration'
  assert not report()['complete']
print('Monitor transaction/report contracts passed')
`],{encoding:'utf8'});
  assert.equal(monitorCheck.status,0,monitorCheck.stderr||monitorCheck.stdout);
  console.log(monitorCheck.stdout.trim());

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
assert.match(readme,/Ads/);
assert.ok(readme.indexOf('First') < readme.indexOf('**[Ads]'),'Adblock rows must follow source-catalog order rather than filename order');
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
assert.match(readme,/<\/summary>\n\n\| Name \|/,'blank line keeps the collapsed Markdown table renderable');

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
assert.equal((refreshed.match(/\| Name \| Quantumult X \| Surge \|/g)||[]).length,7);
await fs.unlink(path.join(root,'Adblock/Quantumult X/Bob.snippet'));
assert.doesNotMatch((await buildReadmePlan(root)).get('README.md'),/<strong>Bob<\/strong>/,'empty source groups are removed');
await fs.rm(root,{recursive:true,force:true});
console.log('README index contract passed: fetch-source attribution, collapsed groups/counts, within-source order and target additions/removals');
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
  const {commitManagedConversion}=await import('../src/workflow.mjs');
  const {materializeConversionRunContext,materializeConversionContext,convertPluginWithContext,validateConvertedPlugin}=await import('../src/conversion.mjs');
  const {syncCatalogEntry,runCatalogSync}=await import('../../scripts/sync-convert.mjs');
  const {collectIssueCandidates}=await import('../../scripts/propose-conversion-issues.mjs');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'wayx-transaction-'));
  const entry=id=>({id,file:id+'.lpx',source:'https://example.test/'+id+'.lpx',qx:id+'.snippet',surge:id+'.sgmodule',category:'去广告'});
  const source=value=>'#!name=Fixture\n[Rewrite]\nresponse if ${url} ~= /api/i then response.header.set("X",'+JSON.stringify(value)+')\n';
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
      validate:(...args)=>{calls.push('validation');return validateConvertedPlugin(...args);}});
    assert.deepEqual(calls,['dependencies','conversion','validation'],'unchanged upstream is fully converted');
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
    const run=await runCatalogSync({root,log:()=>{},writeError:()=>{},warn:()=>{},entryOptions:{fetchText:async url=>url===good.source?source('updated'):unknown}});
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
    const canonicalTool=path.join(process.cwd(),'.github/converter/tools/regenerate-canonical.mjs');
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
