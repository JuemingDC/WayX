import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { convertPlugin } from '../../converter/src/conversion-pipeline.mjs';
import { materializeConversionContext } from '../../converter/src/conversion-context.mjs';
import { fetchOriginalText } from '../../converter/src/source-fetch.mjs';
import { validateQX } from '../../converter/src/qx-snippet-validator.mjs';
import {
  conversionStampFromText,
  normalizeManagedSource,
  nowConversionStamp,
  readManagedTargetState,
  syncGeneratedScripts,
  syncManagedSource,
  writeManagedTargets,
} from '../../converter/src/managed-artifacts.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

async function main() {
  const manifest = await loadLoonSourceCatalog(MANIFEST);
  const failures = [];
  for (const entry of manifest) {
    try {
      console.log(`\n== ${entry.id} ==`);
      const text = await fetchOriginalText(entry.source);
      const fetchedFrom = entry.source;
      const source = normalizeManagedSource(text);
      if (!/^#!name=/m.test(source) || !/^\[[^\]]+\]/m.test(source)) throw new Error('downloaded content is not a valid Loon plugin');
      const sourceState = await syncManagedSource(ROOT, entry, source);
      const changed = sourceState.changed;
      console.log(`${changed ? 'updated' : 'unchanged'} source via ${fetchedFrom}; sha256=${sourceState.digest}`);

      const {
        parsed,
        scriptMap,
        mockFiles: qxMockFiles,
        jqFiles,
      } = await materializeConversionContext(entry, source);

      const targetState = await readManagedTargetState(ROOT, entry);
      const oldQx = targetState.qx;
      const oldSg = targetState.surge;
      const oldStamp = conversionStampFromText(oldQx);
      let stamp = changed || !oldStamp ? nowConversionStamp() : oldStamp;
      let out = convertPlugin(entry, source, {parsed, scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Preserve the old conversion timestamp only if the generated content is actually identical.
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
        stamp = nowConversionStamp();
        out = convertPlugin(entry, source, {parsed, scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});
      }

      await syncGeneratedScripts(ROOT, entry, out.generatedScripts);
      validateQX(out.qx, entry);
      validateSurgeModule(out.surge, entry);
      const targetChanges = await writeManagedTargets(targetState, out);
      console.log(targetChanges.length
        ? `converted -> ${targetState.qxRelativePath}, ${targetState.surgeRelativePath}`
        : 'conversion verified: outputs unchanged');
    } catch (e) {
      failures.push(`${entry.id}: ${e.stack || e.message}`);
      console.error(`::error title=${entry.id}::${String(e.message).replaceAll('\n', '%0A')}`);
    }
  }
  if (failures.length) {
    console.error('\nFailures:\n' + failures.join('\n\n'));
    process.exitCode = 1;
  }
}

const __wayxIsMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (__wayxIsMain) await main();

export {
  normalizeManagedSource as cleanSource,
};
