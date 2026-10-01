// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import path from 'node:path';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from '../src/conversion-runner.mjs';
import { createWorkflowFailureReporter, formatWorkflowErrorAnnotation } from '../src/workflow-diagnostics.mjs';
import {
  firstConversionStamp,
  generatedScriptDiffs,
  nowConversionStamp,
  readCatalogSource,
  readManagedTargetState,
  syncGeneratedScripts,
  writeManagedTargets,
} from '../src/managed-artifacts.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

const mode = process.argv.includes('--write') ? 'write' : 'check';


const manifest = await loadLoonSourceCatalog(MANIFEST);
const changed = [];
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

    const helperDiffs = await generatedScriptDiffs(ROOT, entry, out.generatedScripts);

    const differs = oldQx !== out.qx || oldSurge !== out.surge || helperDiffs.length > 0;
    if (!differs) {
      console.log(entry.id + ': canonical outputs current');
      continue;
    }

    changed.push(entry.id);
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

    await writeManagedTargets(targetState, out);
    await syncGeneratedScripts(ROOT, entry, out.generatedScripts);

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
} else if (mode === 'check' && changed.length) {
  console.error('\nStale canonical entries: ' + changed.join(', '));
  process.exitCode = 1;
} else {
  console.log('\nCanonical ' + mode + ' complete; changed=' + changed.length + (changed.length ? ' [' + changed.join(', ') + ']' : ''));
}
