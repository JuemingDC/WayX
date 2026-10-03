import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLoonSourceCatalog } from "../converter/src/input.mjs";
import { fetchOriginalText } from "../converter/src/input.mjs";
import { createWorkflowFailureReporter } from "../converter/src/workflow.mjs";
import { writeReadmePlan } from "../converter/src/workflow.mjs";
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from "../converter/src/conversion.mjs";
import {
  conversionStampFromText,
  normalizeManagedSource,
  nowConversionStamp,
  inspectManagedSource,
  managedTargetDiffs,
  readCatalogSource,
  readManagedTargetState,
  syncGeneratedScripts,
  writeManagedSource,
  writeManagedTargets,
} from "../converter/src/workflow.mjs";
import {
  buildSyncFailure,
  writeSyncFailureReport,
} from "../converter/src/workflow.mjs";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

export function isLoonPluginSource(text) {
  const source=String(text ?? '');
  return /^#!name\s*=\s*\S/m.test(source) && /^\[[^\]]+\]\s*$/m.test(source);
}

async function main() {
  const manifest = await loadLoonSourceCatalog(MANIFEST);
  const failures = createWorkflowFailureReporter({summaryLabel:'Failures'});
  const structuredFailures = [];
  for (const entry of manifest) {
    let stage='read-current-source';
    let previousSource=null;
    let source=null;
    try {
      console.log(`\n== ${entry.id} ==`);
      try { previousSource=await readCatalogSource(ROOT,entry); } catch {}

      stage='fetch-upstream';
      const text = await fetchOriginalText(entry.source);
      const fetchedFrom = entry.source;
      source = normalizeManagedSource(text);

      stage='validate-source';
      if (!isLoonPluginSource(source)) throw new Error('downloaded content is not a valid Loon plugin');

      stage='inspect-source-change';
      const sourceState = await inspectManagedSource(ROOT, entry, source);
      const changed = sourceState.changed;
      console.log(`${changed ? 'changed' : 'unchanged'} upstream source via ${fetchedFrom}; sha256=${sourceState.digest}`);

      const context = await materializeConversionRunContext(entry,source,{
        onStage:value=>{ stage=value; },
      });

      stage='read-target-state';
      const targetState = await readManagedTargetState(ROOT, entry);
      const oldQx = targetState.qx;
      const oldSg = targetState.surge;
      const oldStamp = conversionStampFromText(oldQx);
      let stamp = changed || !oldStamp ? nowConversionStamp() : oldStamp;

      let out = convertPluginWithContext(entry,source,context,{
        stamp,
        rawBase:RAW_BASE,
        onStage:value=>{ stage=value; },
      });

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Deliberately only count drift against targets that already exist. Missing-target
      // recovery is not the same lifecycle as canonical stale detection.
      const existingTargetDrift = managedTargetDiffs(targetState,out).some(target =>
        target === 'qx' ? Boolean(oldQx) : Boolean(oldSg)
      );
      if (!changed && oldStamp && existingTargetDrift) {
        stamp = nowConversionStamp();
        out = convertPluginWithContext(entry,source,context,{
          stamp,
          rawBase:RAW_BASE,
          onStage:value=>{ stage=value; },
        });
      }

      validateConvertedPlugin(entry,out,{
        onStage:value=>{ stage=value; },
      });

      // No managed files for this plugin are written before conversion + both target validators succeed.
      stage='write-generated-helpers';
      const helperChanges = await syncGeneratedScripts(ROOT, entry, out.generatedScripts);
      stage='write-targets';
      const targetChanges = await writeManagedTargets(targetState, out);
      stage='write-source';
      await writeManagedSource(sourceState, source);

      console.log(targetChanges.length || helperChanges.length || changed
        ? `synced -> ${entry.file}; ${targetState.qxRelativePath}; ${targetState.surgeRelativePath}`
        : 'conversion verified: source and outputs unchanged');
    } catch (e) {
      failures.capture(entry,e);
      structuredFailures.push(buildSyncFailure({
        entry,
        stage,
        error:e,
        previousSource,
        fetchedSource:source,
      }));
    }
  }
  let readmeFailed = false;
  try {
    await writeReadmePlan(ROOT);
  } catch (error) {
    readmeFailed = true;
    console.error('README/install index generation failed:', error?.stack || error);
  }
  await writeSyncFailureReport(ROOT,structuredFailures);
  if (failures.report() || readmeFailed) process.exitCode = 1;
}

const __wayxIsMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (__wayxIsMain) await main();

export {
  normalizeManagedSource as cleanSource,
};
