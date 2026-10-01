import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { qxTargetPath, surgeTargetPath } from '../../converter/src/paths.mjs';
import { validateSurgeModule } from '../../converter/src/surge-module.mjs';
import { loadLoonSourceCatalog } from '../../converter/src/source-catalog.mjs';
import { normalizePluginSource } from '../../converter/src/plugin-parser.mjs';
import { convertPlugin } from '../../converter/src/conversion-pipeline.mjs';
import { materializeConversionContext } from '../../converter/src/conversion-context.mjs';
import { fetchOriginalText } from '../../converter/src/source-fetch.mjs';
import { validateQX } from '../../converter/src/qx-snippet-validator.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const TARGET_ROOT = path.join(ROOT, 'Adblock');
const SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

const nowCN = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
}).format(new Date()).replace(' ', 'T').replace('T', ' ') + ' +08:00';

const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

async function exists(file) {
  try { await fs.access(file); return true; } catch { return false; }
}

function cleanSource(text) {
  return normalizePluginSource(text).replace(/\n*$/, '\n');
}




async function main() {
  const manifest = await loadLoonSourceCatalog(MANIFEST);
  await Promise.all([RESOURCE_DIR, TARGET_ROOT, SCRIPT_DIR].map(d => fs.mkdir(d, { recursive: true })));
  const failures = [];
  for (const entry of manifest) {
    try {
      console.log(`\n== ${entry.id} ==`);
      const text = await fetchOriginalText(entry.source);
      const fetchedFrom = entry.source;
      const source = cleanSource(text);
      if (!/^#!name=/m.test(source) || !/^\[[^\]]+\]/m.test(source)) throw new Error('downloaded content is not a valid Loon plugin');
      const sourcePath = path.join(RESOURCE_DIR, entry.file);
      const old = await exists(sourcePath) ? normalizePluginSource(await fs.readFile(sourcePath, 'utf8')) : null;
      const changed = old !== source;
      if (changed) await fs.writeFile(sourcePath, source);
      console.log(`${changed ? 'updated' : 'unchanged'} source via ${fetchedFrom}; sha256=${sha256(source).slice(0, 12)}`);

      const {
        parsed,
        scriptMap,
        mockFiles: qxMockFiles,
        jqFiles,
      } = await materializeConversionContext(entry, source);

      const qxPath = path.join(ROOT, qxTargetPath(entry));
      const sgPath = path.join(ROOT, surgeTargetPath(entry));
      await Promise.all([
        path.dirname(qxPath),
        path.dirname(sgPath),
      ].map(d => fs.mkdir(d, { recursive: true })));
      const qxExists = await exists(qxPath);
      const sgExists = await exists(sgPath);
      const oldQx = qxExists ? normalizePluginSource(await fs.readFile(qxPath, 'utf8')) : null;
      const oldSg = sgExists ? normalizePluginSource(await fs.readFile(sgPath, 'utf8')) : null;
      const oldStamp = (oldQx?.match(/^# Converted:\s*(.+)$/m) || [])[1] || null;
      let stamp = changed || !oldStamp ? nowCN() : oldStamp;
      let out = convertPlugin(entry, source, {parsed, scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});

      // Converter changes must also refresh outputs even when upstream LPX is unchanged.
      // Preserve the old conversion timestamp only if the generated content is actually identical.
      if (!changed && oldStamp && ((oldQx && oldQx !== out.qx) || (oldSg && oldSg !== out.surge))) {
        stamp = nowCN();
        out = convertPlugin(entry, source, {parsed, scriptMap, stamp, mockFiles:qxMockFiles, jqFiles, rawBase:RAW_BASE});
      }

      for (const [file, content] of out.generatedScripts) {
        const dir = path.join(SCRIPT_DIR, entry.id);
        await fs.mkdir(dir, { recursive: true });
        const dest = path.join(dir, file);
        if (!await exists(dest) || normalizePluginSource(await fs.readFile(dest, 'utf8')) !== content) await fs.writeFile(dest, content);
      }
      validateQX(out.qx, entry);
      validateSurgeModule(out.surge, entry);
      let outputChanged = false;
      if (oldQx !== out.qx) { await fs.writeFile(qxPath, out.qx); outputChanged = true; }
      if (oldSg !== out.surge) { await fs.writeFile(sgPath, out.surge); outputChanged = true; }
      console.log(outputChanged ? `converted -> ${path.relative(ROOT, qxPath)}, ${path.relative(ROOT, sgPath)}` : 'conversion verified: outputs unchanged');
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
  cleanSource,
};
