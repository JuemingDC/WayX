import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { fetchOriginalText } from '../../converter/src/source-fetch.mjs';
import { createWorkflowFailureReporter } from '../../converter/src/workflow-diagnostics.mjs';
import {
  materializeConversionRunContext,
  convertPluginWithContext,
  validateConvertedPlugin,
} from '../../converter/src/conversion-runner.mjs';
import {
  conversionStampFromText,
  normalizeManagedSource,
  nowConversionStamp,
  inspectManagedSource,
  readCatalogSource,
  readManagedTargetState,
  syncGeneratedScripts,
  writeManagedSource,
  writeManagedTargets,
} from '../../converter/src/managed-artifacts.mjs';
import {
  buildSyncFailure,
  writeSyncFailureReport,
} from '../../converter/src/upstream-run-report.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

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
      if (!/^#!name=/m.test(source) || !/^\[[^\]]+\]/m.test(source)) throw new Error('downloaded content is not a valid Loon plugin');

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
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
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
      await syncGeneratedScripts(ROOT, entry, out.generatedScripts);
      stage='write-targets';
      const targetChanges = await writeManagedTargets(targetState, out);
      stage='write-source';
      await writeManagedSource(sourceState, source);

      console.log(targetChanges.length || changed
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
  await writeSyncFailureReport(ROOT,structuredFailures);
  if (failures.report()) process.exitCode = 1;
}

const __wayxIsMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (__wayxIsMain) await main();

export {
  normalizeManagedSource as cleanSource,
};
