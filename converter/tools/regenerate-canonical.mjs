// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import path from 'node:path';
import { validateQX } from '../src/qx-snippet-validator.mjs';
import { convertPlugin } from '../src/conversion-pipeline.mjs';
import { materializeConversionContext } from '../src/conversion-context.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
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
const failures = [];

for (const entry of manifest) {
  try {
    const source = await readCatalogSource(ROOT, entry);
    const targetState = await readManagedTargetState(ROOT, entry);
    const oldQx = targetState.qx;
    const oldSurge = targetState.surge;
    const stamp = firstConversionStamp([oldQx, oldSurge], {trim:true}) || nowConversionStamp();
    const {
      parsed,
      scriptMap,
      mockFiles,
      jqFiles,
    } = await materializeConversionContext(entry, source);

    let out = convertPlugin(entry, source, {parsed, scriptMap, stamp, mockFiles, jqFiles, rawBase:RAW_BASE});
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry, {adblockScope:true});

    const helperDiffs = await generatedScriptDiffs(ROOT, entry, out.generatedScripts);

    const differs = oldQx !== out.qx || oldSurge !== out.surge || helperDiffs.length > 0;
    if (!differs) {
      console.log(entry.id + ': canonical outputs current');
      continue;
    }

    changed.push(entry.id);
    if (mode === 'check') {
      console.error('::error title=' + entry.id + '::canonical outputs/helpers are stale');
      continue;
    }

    // Refresh one shared conversion timestamp for targets and WayX-generated
    // helper scripts. Source Script URLs remain untouched and are never mirrored.
    out = convertPlugin(entry, source, {parsed, scriptMap, stamp:nowConversionStamp(), mockFiles, jqFiles, rawBase:RAW_BASE});
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry, {adblockScope:true});

    await writeManagedTargets(targetState, out);
    await syncGeneratedScripts(ROOT, entry, out.generatedScripts);

    console.log(
      entry.id + ': regenerated ' +
      targetState.qxRelativePath + ' + ' +
      targetState.surgeRelativePath +
      (out.generatedScripts.size ? ' + helpers=' + out.generatedScripts.size : '')
    );
  } catch (error) {
    failures.push(entry.id + ': ' + (error?.stack || error));
    console.error('::error title=' + entry.id + '::' + String(error?.message || error).replaceAll('\n', '%0A'));
  }
}

if (failures.length) {
  console.error('\nCanonical regeneration failures:\n' + failures.join('\n\n'));
  process.exitCode = 1;
} else if (mode === 'check' && changed.length) {
  console.error('\nStale canonical entries: ' + changed.join(', '));
  process.exitCode = 1;
} else {
  console.log('\nCanonical ' + mode + ' complete; changed=' + changed.length + (changed.length ? ' [' + changed.join(', ') + ']' : ''));
}
