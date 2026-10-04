// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import path from 'node:path';
import { loadLoonSourceCatalog } from "../src/input.mjs";
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from "../src/conversion.mjs";
import { createWorkflowFailureReporter, formatWorkflowErrorAnnotation } from "../src/workflow.mjs";
import {
  firstConversionStamp,
  generatedScriptDiffs,
  managedTargetDiffs,
  nowConversionStamp,
  readCatalogSource,
  readManagedTargetState,
  syncGeneratedScripts,
  writeManagedTargets,
  commitManagedConversion,
} from "../src/workflow.mjs";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

const mode = process.argv.includes('--write') ? 'write' : 'check';


const manifest = await loadLoonSourceCatalog(MANIFEST);
const staleEntries = [];
const failures = createWorkflowFailureReporter({
  summaryLabel:'Canonical regeneration failures',
  detailFallback:'error',
  annotationFallback:'error',
});

for (const entry of manifest) {
  try {
    const source = await readCatalogSource(ROOT, entry);
    const targetState = await readManagedTargetState(ROOT, entry);
    const oldQx = targetState.qx;
    const oldSurge = targetState.surge;
    const stamp = firstConversionStamp([oldQx, oldSurge], {trim:true}) || nowConversionStamp();
    const context = await materializeConversionRunContext(entry,source);

    let out = convertPluginWithContext(entry,source,context,{
      stamp,
      rawBase:RAW_BASE,
    });
    validateConvertedPlugin(entry,out,{surgeValidationOptions:{adblockScope:true}});

    const targetDiffs = managedTargetDiffs(targetState,out);
    const helperDiffs = await generatedScriptDiffs(ROOT, entry, out.generatedScripts);

    const differs = targetDiffs.length > 0 || helperDiffs.length > 0;
    if (!differs) {
      console.log(entry.id + ': canonical outputs current');
      continue;
    }

    staleEntries.push(entry.id);
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
    failures.capture(entry,error);
  }
}

if (failures.report()) {
  process.exitCode = 1;
} else if (mode === 'check' && staleEntries.length) {
  console.error('\nStale canonical entries: ' + staleEntries.join(', '));
  process.exitCode = 1;
} else {
  console.log('\nCanonical ' + mode + ' complete; changed=' + staleEntries.length + (staleEntries.length ? ' [' + staleEntries.join(', ') + ']' : ''));
}
