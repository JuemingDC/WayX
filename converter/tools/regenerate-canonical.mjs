// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import fs from 'node:fs/promises';
import path from 'node:path';
import { validateQX } from '../../.github/scripts/sync-convert.mjs';
import { normalizePluginSource } from '../src/plugin-parser.mjs';
import { convertPlugin } from '../src/conversion-pipeline.mjs';
import { materializeConversionContext } from '../src/conversion-context.mjs';
import { qxTargetPath, surgeTargetPath } from '../src/paths.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const GENERATED_SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';

const mode = process.argv.includes('--write') ? 'write' : 'check';


const normalize = text => String(text ?? '').replace(/\r\n?/g, '\n').replace(/^\uFEFF/, '');
const nowCN = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
}).format(new Date()).replace(' ', 'T').replace('T', ' ') + ' +08:00';

async function exists(file) {
  try { await fs.access(file); return true; }
  catch { return false; }
}


function existingStamp(...texts) {
  for (const text of texts) {
    const match = String(text || '').match(/^# Converted:\s*(.+)$/m);
    if (match) return match[1].trim();
  }
  return null;
}

async function readIfExists(file) {
  return await exists(file) ? normalize(await fs.readFile(file, 'utf8')) : null;
}

const manifest = await loadLoonSourceCatalog(MANIFEST);
const changed = [];
const failures = [];

for (const entry of manifest) {
  try {
    const sourcePath = path.join(RESOURCE_DIR, entry.file);
    const source = normalizePluginSource(await fs.readFile(sourcePath, 'utf8')).replace(/\n*$/, '\n');
    const qxPath = path.join(ROOT, qxTargetPath(entry));
    const surgePath = path.join(ROOT, surgeTargetPath(entry));
    const oldQx = await readIfExists(qxPath);
    const oldSurge = await readIfExists(surgePath);
    const stamp = existingStamp(oldQx, oldSurge) || nowCN();
    const {
      scriptMap,
      mockFiles,
      jqFiles,
    } = await materializeConversionContext(entry, source);

    let out = convertPlugin(entry, source, {scriptMap, stamp, mockFiles, jqFiles, rawBase:RAW_BASE});
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry, {adblockScope:true});

    const helperDir = path.join(GENERATED_SCRIPT_DIR, entry.id);
    const helperDiffs = [];
    for (const [name, content] of out.generatedScripts) {
      const oldHelper = await readIfExists(path.join(helperDir, name));
      if (oldHelper !== content) helperDiffs.push(name);
    }

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
    out = convertPlugin(entry, source, {scriptMap, stamp:nowCN(), mockFiles, jqFiles, rawBase:RAW_BASE});
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry, {adblockScope:true});

    await fs.mkdir(path.dirname(qxPath), {recursive:true});
    await fs.mkdir(path.dirname(surgePath), {recursive:true});
    await fs.writeFile(qxPath, out.qx);
    await fs.writeFile(surgePath, out.surge);

    if (out.generatedScripts.size) {
      await fs.mkdir(helperDir, {recursive:true});
      for (const [name, content] of out.generatedScripts) {
        await fs.writeFile(path.join(helperDir, name), content);
      }
    }

    console.log(
      entry.id + ': regenerated ' +
      path.relative(ROOT, qxPath) + ' + ' +
      path.relative(ROOT, surgePath) +
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
