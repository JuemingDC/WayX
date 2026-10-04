import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLoonSourceCatalog, fetchOriginalText } from '../converter/src/input.mjs';
import { materializeConversionRunContext, convertPluginWithContext, validateConvertedPlugin } from '../converter/src/conversion.mjs';
import { createWorkflowFailureReporter, writeReadmePlan, conversionStampFromText, normalizeManagedSource, nowConversionStamp, inspectManagedSource, managedTargetDiffs, readCatalogSource, readManagedTargetState, commitManagedConversion, buildSyncFailure, writeSyncFailureReport } from '../converter/src/workflow.mjs';
import { collectIssueCandidates } from './propose-conversion-issues.mjs';

const ROOT=process.cwd();
const RAW_BASE='https://raw.githubusercontent.com/JuemingDC/WayX/main';

export function isLoonPluginSource(text) {
  const source=String(text ?? '');
  return /^#!name\s*=\s*\S/m.test(source) && /^\[[^\]]+\]\s*$/m.test(source);
}

// Each plugin has its own conversion and write transaction. The catalog loop
// continues only after a failure has left the previous artifacts intact.
export async function syncCatalogEntry(entry,{
  root=ROOT,fetchText=fetchOriginalText,materialize=materializeConversionRunContext,
  convert=convertPluginWithContext,validate=validateConvertedPlugin,commit=commitManagedConversion,
  log=console.log,
}={}) {
  let stage='read-current-source',previousSource=null,source=null,targetState=null;
  const onStage=value=>{stage=value;};
  let declarations=null;
  try {
    try {previousSource=await readCatalogSource(root,entry);}catch(error){if(error.code!=='ENOENT')throw error;}
    stage='read-target-state';targetState=await readManagedTargetState(root,entry);
    stage='fetch-upstream';source=normalizeManagedSource(await fetchText(entry.source));
    stage='validate-source';if(!isLoonPluginSource(source))throw new Error('downloaded content is not a valid Loon plugin');
    stage='inspect-source-change';const sourceState=await inspectManagedSource(root,entry,source);
    const changed=sourceState.changed;
    log(`${changed?'changed':'unchanged'} upstream source via ${entry.source}; sha256=${sourceState.digest}`);
    // Compare before semantic analysis or dependency materialization. An unchanged
    // plugin with published targets needs no conversion or timestamp update.
    if(!changed && targetState.qx && targetState.surge) {
      log('skipped: upstream content unchanged');
      return {id:entry.id,changed:false,skipped:true,helperChanges:[],targetChanges:[]};
    }
    stage='review-source-semantics';
    const semantic=await collectIssueCandidates({root,catalog:[entry],sourceOverrides:new Map([[entry.id,source]]),includeTargets:false,includeSyncFailures:false});
    if(semantic.targetProblems.length) {
      declarations=semantic.targetProblems.flatMap(problem=>problem.declarations);
      throw new Error('Unreviewed source semantics: '+semantic.targetProblems.flatMap(problem=>problem.reasons).join('; '));
    }
    const context=await materialize(entry,source,{onStage});
    const oldQx=targetState.qx,oldSg=targetState.surge;
    const oldStamp=conversionStampFromText(oldQx);
    let stamp=changed||!oldStamp?nowConversionStamp():oldStamp;
    let out=convert(entry,source,context,{stamp,rawBase:RAW_BASE,onStage});
    const existingTargetDrift=managedTargetDiffs(targetState,out).some(target =>
      target === 'qx' ? Boolean(oldQx) : Boolean(oldSg)
    );
    if(!changed&&oldStamp&&existingTargetDrift) {
      stamp=nowConversionStamp();out=convert(entry,source,context,{stamp,rawBase:RAW_BASE,onStage});
    }
    validate(entry,out,{onStage});
    stage='review-target-mapping';
    if(/^# \[WayX\].*(?:REVIEW REQUIRED|ISSUE REQUIRED)/m.test(out.qx+'\n'+out.surge)) {
      declarations=[...(out.qx+'\n'+out.surge).matchAll(/^# Source declaration:\s*(.+)$/gm)].map(match=>({section:'Source',line:match[1]}));
      throw new Error('Target mapping requires review; previous source and outputs retained');
    }
    const {helperChanges,targetChanges}=await commit(root,entry,targetState,out,{sourceState,source,onStage});
    log(targetChanges.length || helperChanges.length || changed
      ?`synced -> ${entry.file}; ${targetState.qxRelativePath}; ${targetState.surgeRelativePath}`
      :'conversion verified: source and outputs unchanged');
    return {id:entry.id,changed,skipped:false,helperChanges,targetChanges};
  }catch(error) {
    error.syncFailure=buildSyncFailure({entry,stage,error,previousSource,fetchedSource:source});
    if(declarations?.length)error.syncFailure.declarations=declarations;
    error.baselineAvailable=Boolean(previousSource&&targetState?.qx&&targetState?.surge);
    error.rollbackSucceeded=error.rollbackSucceeded!==false;
    throw error;
  }
}

async function deferCatalogEntries(root,manifest,deferredPlugins) {
  if(!deferredPlugins.length)return;
  const deferred=new Set(deferredPlugins);
  const catalog=path.join(root,'.github/sources/loon.json');
  const snapshot=path.join(root,'.github/monitor/.runtime/kelee-catalog.json');
  const originals=new Map();
  for(const file of [catalog,snapshot])try{originals.set(file,await fs.readFile(file));}catch(error){if(error.code!=='ENOENT')throw error;originals.set(file,null);}
  try {
    await fs.writeFile(catalog,JSON.stringify(manifest.filter(entry=>!deferred.has(entry.id)),null,2)+'\n');
    if(originals.get(snapshot)) {
      const data=JSON.parse(originals.get(snapshot));
      data.plugins=data.plugins.filter(plugin=>!deferred.has(plugin.id)).map((plugin,order)=>({...plugin,order}));data.count=data.plugins.length;
      await fs.writeFile(snapshot,JSON.stringify(data,null,2)+'\n');
    }
  }catch(error) {
    for(const [file,bytes] of originals)if(bytes)await fs.writeFile(file,bytes);else await fs.rm(file,{force:true});
    throw error;
  }
}

export async function runCatalogSync({root=ROOT,entryOptions={},log=console.log,writeError=console.error,warn=console.warn}={}) {
  const manifest=await loadLoonSourceCatalog(path.join(root,'.github/sources/loon.json'));
  const failures=createWorkflowFailureReporter({summaryLabel:'Isolated sync failures',writeError});
  const structuredFailures=[],validatedPlugins=[],convertedPlugins=[],skippedPlugins=[],retainedPlugins=[],deferredPlugins=[];
  let publishable=true;
  for (const entry of manifest) {
    log(`\n== ${entry.id} ==`);
    try {
      const result=await syncCatalogEntry(entry,{...entryOptions,root,log});
      validatedPlugins.push(entry.id);
      (result.skipped?skippedPlugins:convertedPlugins).push(entry.id);
    }
    catch(error) {
      failures.capture(entry,error);structuredFailures.push(error.syncFailure||buildSyncFailure({entry,stage:'sync',error}));
      if(!error.rollbackSucceeded)publishable=false;
      else if(error.baselineAvailable)retainedPlugins.push(entry.id);
      else deferredPlugins.push(entry.id);
    }
  }
  try {
    if(publishable)await deferCatalogEntries(root,manifest,deferredPlugins);
    await writeReadmePlan(root);
  }catch(error){publishable=false;writeError('Catalog/README publication preparation failed: '+String(error.stack||error));}
  const summary={publishable,validatedPlugins,convertedPlugins,skippedPlugins,retainedPlugins,deferredPlugins};
  await writeSyncFailureReport(root,structuredFailures,{summary});
  failures.report();
  if(structuredFailures.length)warn(`::warning::${structuredFailures.length} plugin(s) failed; structured failures are available for automatic Issues.`);
  return {...summary,failures:structuredFailures};
}

async function main() {
  const result=await runCatalogSync();
  if(process.env.GITHUB_OUTPUT)await fs.appendFile(process.env.GITHUB_OUTPUT,
    'publishable='+result.publishable+'\nhas_failures='+(result.failures.length>0)+'\n');
  if(!result.publishable)process.exitCode=1;
}

const __wayxIsMain=process.argv[1]&&path.resolve(process.argv[1])===path.resolve(fileURLToPath(import.meta.url));
if(__wayxIsMain)await main();
export {normalizeManagedSource as cleanSource};
