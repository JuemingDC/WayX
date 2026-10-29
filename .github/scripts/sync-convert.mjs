import {keleePaused,isKeleeSource} from "../converter/src/source-pause.mjs";
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import {createResourceSnapshot} from '../converter/src/resources.mjs';
import { loadLoonSourceCatalog, fetchOriginalText } from '../converter/src/input.mjs';
import { materializeConversionRunContext, convertPluginWithContext } from '../converter/src/conversion.mjs';
import { prepareNativeQxSync, commitNativeQxSync, createWorkflowFailureReporter, writeReadmePlan, normalizeManagedSource, nowConversionStamp, inspectManagedSource, readCatalogSource, readManagedTargetState, commitManagedConversion, buildSyncFailure, writeSyncFailureReport } from '../converter/src/workflow.mjs';
import { collectIssueCandidates } from './propose-conversion-issues.mjs';

const ROOT=process.cwd();
const RAW_BASE='https://raw.githubusercontent.com/JuemingDC/WayX/main';

export function isLoonPluginSource(text) {
  const source=String(text ?? '');
  return /^#!name\s*=\s*\S/m.test(source) && /^\[[^\]]+\]\s*$/m.test(source);
}

// Modified: 2026-10-25 (chance). Preparation can be separated from the
// per-plugin conversion/write transaction without repeating acquisition.
// Each plugin has its own conversion and write transaction. The catalog loop
// continues only after a failure has left the previous artifacts intact.
export async function syncCatalogEntry(entry,{
  root=ROOT,fetchText=fetchOriginalText,materialize=materializeConversionRunContext,
  convert=convertPluginWithContext,commit=commitManagedConversion,
  log=console.log,resources=null,prepared=null,prepareOnly=false,
}={}) {
  // Modified: 2026-10-29 (chance). Direct callers also honor source freeze.
  if(await keleePaused(root) && isKeleeSource(entry.source))return {id:entry.id,paused:true};
  let stage='read-current-source',previousSource=null,source=null,targetState=null;
  const onStage=value=>{stage=value;};
  let declarations=null;
  try {
    let context,sourceState,changed;
    if(prepared) {
      if(prepared.id!==entry.id || prepared.sourceUrl!==entry.source)throw new Error('Prepared entry does not match catalog source');
      ({previousSource,source,targetState,context,sourceState,changed}=prepared);
      stage='convert';
    }else {
      try {previousSource=await readCatalogSource(root,entry);}catch(error){if(error.code!=='ENOENT')throw error;}
      stage='read-target-state';targetState=await readManagedTargetState(root,entry);
      stage='fetch-upstream';source=normalizeManagedSource(await fetchText(entry.source));
      stage='validate-source';if(!isLoonPluginSource(source))throw new Error('downloaded content is not a valid Loon plugin');
      stage='inspect-source-change';sourceState=await inspectManagedSource(root,entry,source);
      changed=sourceState.changed;
      log(`${changed?'changed':'unchanged'} upstream source via ${entry.source}; sha256=${sourceState.digest}`);
      // Every Action compiles every entry, including unchanged upstream text:
      // Generator, specification and remote dependency changes affect output too.
      stage='review-source-semantics';
      const semantic=await collectIssueCandidates({root,catalog:[entry],sourceOverrides:new Map([[entry.id,source]]),includeTargets:false,includeSyncFailures:false});
      if(semantic.targetProblems.length) {
        declarations=semantic.targetProblems.flatMap(problem=>problem.declarations);
        throw new Error('Unknown or invalid source grammar: '+semantic.targetProblems.flatMap(problem=>problem.reasons).join('; '));
      }
      context=await materialize(entry,source,{onStage,resources,fetchText});
    }
    if(prepareOnly)return {id:entry.id,sourceUrl:entry.source,previousSource,source,targetState,context,sourceState,changed};
    const out=convert(entry,source,context,{stamp:nowConversionStamp(),rawBase:RAW_BASE,onStage});
    stage='review-target-mapping';
    if(/^# \[WayX\].*(?:REVIEW REQUIRED|ISSUE REQUIRED)/m.test(out.qx+'\n'+out.surge)) {
      declarations=[...(out.qx+'\n'+out.surge).matchAll(/^# Source declaration:\s*(.+)$/gm)].map(match=>({section:'Source',line:match[1]}));
      throw new Error('Target mapping requires review; previous source and outputs retained');
    }
    const {helperChanges,targetChanges}=await commit(root,entry,targetState,out,{sourceState,source,onStage});
    log(targetChanges.length || helperChanges.length || changed
      ?`synced -> ${entry.file}; ${targetState.qxRelativePath}; ${targetState.surgeRelativePath}`
      :'conversion verified: source and outputs unchanged');
    return {id:entry.id,changed,helperChanges,targetChanges};
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
  const structuredFailures=[],validatedPlugins=[],convertedPlugins=[],updatedPlugins=[],unchangedPlugins=[],retainedPlugins=[],deferredPlugins=[];
  let publishable=true;
  // Modified: 2026-10-25 (chance). Finish acquisition for the complete catalog
  // and seal one shared snapshot before any target is generated or committed.
  const resources=createResourceSnapshot({
    directory:path.join(root,'.github/monitor/.runtime/resources',crypto.randomUUID()),
    fetchText:entryOptions.fetchText,fetchBytes:entryOptions.fetchBytes,
  });
  const preparedEntries=[];
  const capture=(entry,error)=>{
    failures.capture(entry,error);structuredFailures.push(error.syncFailure||buildSyncFailure({entry,stage:'sync',error}));
    if(!error.rollbackSucceeded)publishable=false;
    else if(error.baselineAvailable)retainedPlugins.push(entry.id);
    else deferredPlugins.push(entry.id);
  };
  for (const entry of manifest) {
    log(`\n== acquire ${entry.id} ==`);
    try {
      const prepared=await syncCatalogEntry(entry,{...entryOptions,root,log,fetchText:resources.fetchText,resources,prepareOnly:true});
      if(prepared.paused){retainedPlugins.push(entry.id);log(`paused ${entry.id}: existing artifacts retained`);continue;}
      preparedEntries.push({entry,prepared});
    }catch(error){capture(entry,error);}
  }
  // Modified: 2026-10-25 (chance). Acquire native QX app bundles in the same
  // run snapshot; a failed/partial source set prevents publication.
  let nativeQxPlan=null;
  try{nativeQxPlan=await prepareNativeQxSync(root,{fetchText:resources.fetchText});}
  catch(error){publishable=false;writeError('Native QX acquisition failed: '+String(error.stack||error));}
  await resources.seal();
  for (const {entry,prepared} of preparedEntries) {
    log(`\n== convert ${entry.id} ==`);
    try {
      const result=await syncCatalogEntry(entry,{...entryOptions,root,log,resources,prepared});
      validatedPlugins.push(entry.id);
      convertedPlugins.push(entry.id);
      (result.targetChanges.length || result.helperChanges.length ? updatedPlugins : unchangedPlugins).push(entry.id);
    }catch(error){capture(entry,error);}
  }
  try {
    if(publishable) {
      await deferCatalogEntries(root,manifest,deferredPlugins);
    }
    if(publishable)await commitNativeQxSync(root,nativeQxPlan);
    await writeReadmePlan(root);
  }catch(error){publishable=false;writeError('Catalog/README publication preparation failed: '+String(error.stack||error));}
  const summary={publishable,validatedPlugins,convertedPlugins,updatedPlugins,unchangedPlugins,retainedPlugins,deferredPlugins};
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
