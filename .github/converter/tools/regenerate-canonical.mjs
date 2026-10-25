// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {createResourceSnapshot} from '../src/resources.mjs';
import { loadLoonSourceCatalog } from "../src/input.mjs";
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from "../src/conversion.mjs";
import { writeValidationEvidence, validationArtifactDigest, recordOutputMismatch, createWorkflowFailureReporter, formatWorkflowErrorAnnotation } from "../src/workflow.mjs";
import {
  firstConversionStamp,
  generatedScriptDiffs,
  managedTargetDiffs,
  nowConversionStamp,
  readCatalogSource,
  readManagedTargetState,
  commitManagedConversion,
} from "../src/workflow.mjs";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

const mode = process.argv.includes('--write') ? 'write' : 'check';


const manifest = await loadLoonSourceCatalog(MANIFEST);
// Every Action converts the complete catalog. Recheck all successful entries;
// isolated failures retain their prior baselines and Issue diagnostics.
let selectedIds=null;
if(process.argv.includes('--successful-only')) {
  const report=JSON.parse(await fs.readFile(path.join(ROOT,'.github/monitor/.runtime/sync-failures.json'),'utf8'));
  if(report.publishable!==true || !Array.isArray(report.convertedPlugins))throw new Error('Missing successful full conversion report');
  selectedIds=new Set(report.convertedPlugins);
  if([...selectedIds].some(id=>!manifest.some(entry=>entry.id===id)))throw new Error('Unknown plugin in full conversion report');
}
const staleEntries = [];
const findings=[],verifiedPlugins=[],artifacts={};
let checked=0;
const failures = createWorkflowFailureReporter({
  summaryLabel:'Canonical regeneration failures',
  detailFallback:'error',
  annotationFallback:'error',
});

// Modified: 2026-10-25 (chance). Canonical regeneration reuses dependencies across entries.
const resources=createResourceSnapshot({directory:path.join(ROOT,'.github/monitor/.runtime/resources',crypto.randomUUID())});
for (const entry of manifest) {
  if(selectedIds && !selectedIds.has(entry.id))continue;
  checked++;
  try {
    const source = await readCatalogSource(ROOT, entry);
    const targetState = await readManagedTargetState(ROOT, entry);
    const oldQx = targetState.qx;
    const oldSurge = targetState.surge;
    const stamp = firstConversionStamp([oldQx, oldSurge], {trim:true}) || nowConversionStamp();
    const context = await materializeConversionRunContext(entry,source,{resources});

    let out = convertPluginWithContext(entry,source,context,{
      stamp,
      rawBase:RAW_BASE,
    });
    validateConvertedPlugin(entry,out,{surgeValidationOptions:{adblockScope:true}});

    const targetDiffs = managedTargetDiffs(targetState,out);
    const helperDiffs = await generatedScriptDiffs(ROOT, entry, out.generatedScripts);

    const differs = targetDiffs.length > 0 || helperDiffs.length > 0;
    if (!differs) {
      verifiedPlugins.push(entry.id);
      for(const [file,text] of [['Resource/Loon/'+entry.file,source],[targetState.qxRelativePath,oldQx],[targetState.surgeRelativePath,oldSurge]])artifacts[file]=validationArtifactDigest(text);
      continue;
    }

    staleEntries.push(entry.id);
    for(const target of targetDiffs)findings.push(await recordOutputMismatch(targetState[target+'RelativePath'],out[target],targetState[target],entry.id));
    for(const name of helperDiffs) {
      const stale=name.startsWith('delete:'),filename=stale?name.slice(7):name;
      const relative='Script/'+entry.id+'/'+filename;
      let actual=null;
      try {actual=await fs.readFile(path.join(ROOT,relative),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
      findings.push(await recordOutputMismatch(relative,stale?null:out.generatedScripts.get(filename),actual,entry.id));
    }
    if (mode === 'check') {
      console.error(formatWorkflowErrorAnnotation(entry,new Error('canonical outputs/helpers are stale'),{annotationFallback:'error'}));
      continue;
    }

    // Refresh one shared conversion timestamp for targets and WayX-generated
    // helper scripts. Source Script URLs remain untouched and are never mirrored.
    out = convertPluginWithContext(entry,source,context,{
      stamp:nowConversionStamp(),
      rawBase:RAW_BASE,
    });
    validateConvertedPlugin(entry,out,{surgeValidationOptions:{adblockScope:true}});

    await commitManagedConversion(ROOT,entry,targetState,out);

    console.log(
      entry.id + ': regenerated ' +
      targetState.qxRelativePath + ' + ' +
      targetState.surgeRelativePath +
      (out.generatedScripts.size ? ' + helpers=' + out.generatedScripts.size : '')
    );
  } catch (error) {
    findings.push({code:'canonical-validation',plugin:entry.id,file:'Resource/Loon/'+entry.file,text:error.message});
    failures.capture(entry,error);
  }
}

await resources.seal();

await writeValidationEvidence(checked,mode==='check'?findings.filter(Boolean):[],{plugins:verifiedPlugins,artifacts,complete:true});

if (failures.report()) {
  process.exitCode = 1;
} else if (mode === 'check' && staleEntries.length) {
  console.error('\nStale canonical entries: ' + staleEntries.join(', '));
  process.exitCode = 1;
} else {
  console.log('\nCanonical ' + mode + ' complete; changed=' + staleEntries.length + (staleEntries.length ? ' [' + staleEntries.join(', ') + ']' : ''));
}
