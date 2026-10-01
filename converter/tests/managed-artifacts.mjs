import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  conversionStampFromText,
  firstConversionStamp,
  generatedScriptDiffs,
  inspectManagedSource,
  managedSourceDigest,
  normalizeManagedSource,
  readCatalogSource,
  readManagedTargetState,
  syncGeneratedScripts,
  syncManagedSource,
  writeManagedSource,
  writeManagedTargets,
} from '../src/managed-artifacts.mjs';

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
  assert.deepEqual(await writeManagedTargets(targets,{qx,surge}),['qx','surge']);

  targets=await readManagedTargetState(root,entry);
  assert.equal(targets.qx,qx);
  assert.equal(targets.surge,surge);
  assert.equal(conversionStampFromText(targets.qx),'2026-10-01 08:00:00 +08:00');
  assert.equal(firstConversionStamp([targets.qx,targets.surge],{trim:true}),'2026-10-01 08:00:00 +08:00');
  assert.equal(firstConversionStamp([null,targets.surge],{trim:true}),'2026-10-01 09:00:00 +08:00');
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

  console.log('managed artifact I/O contract passed');
} finally {
  await fs.rm(root,{recursive:true,force:true});
}
