// Canonical target regeneration for checked-in Loon sources using original source-script URLs.
// Author: chance
// Category: Converter / Canonical Output
import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanSource, convert, materializeJqFiles, materializeQxMockFiles, parseLoon, scriptUrls, validateQX } from '../../.github/scripts/sync-convert.mjs';
import { qxTargetPath, surgeTargetPath } from '../src/paths.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
import { fetchOriginalText } from '../src/source-fetch.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');

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

async function originalScriptMap(source) {
  const map = new Map();
  for (const url of scriptUrls(source)) {
    const sourceText = normalize(await fetchOriginalText(url)).replace(/\n*$/, '\n');
    map.set(url, {
      qx: url,
      surge: url,
      source: sourceText,
      qxAdapted: false,
    });
  }
  return map;
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
    const source = cleanSource(await fs.readFile(sourcePath, 'utf8'));
    const qxPath = path.join(ROOT, qxTargetPath(entry));
    const surgePath = path.join(ROOT, surgeTargetPath(entry));
    const oldQx = await readIfExists(qxPath);
    const oldSurge = await readIfExists(surgePath);
    const stamp = existingStamp(oldQx, oldSurge) || nowCN();
    const scripts = await originalScriptMap(source);
    const parsed = parseLoon(source);
    const qxMockFiles = await materializeQxMockFiles(entry, parsed);
    const jqFiles = await materializeJqFiles(entry, parsed);

    let out = convert(entry, source, scripts, stamp, qxMockFiles, jqFiles);
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry);

    const differs = oldQx !== out.qx || oldSurge !== out.surge;
    if (!differs) {
      console.log(entry.id + ': canonical outputs current');
      continue;
    }

    changed.push(entry.id);
    if (mode === 'check') {
      console.error('::error title=' + entry.id + '::canonical outputs are stale');
      continue;
    }

    // A real regeneration is a conversion event. Refresh the timestamp only
    // when content actually changes, then write both targets atomically enough
    // for a normal Git working tree update.
    out = convert(entry, source, scripts, nowCN(), qxMockFiles, jqFiles);
    validateQX(out.qx, entry);
    validateSurgeModule(out.surge, entry);

    await fs.mkdir(path.dirname(qxPath), {recursive:true});
    await fs.mkdir(path.dirname(surgePath), {recursive:true});
    await fs.writeFile(qxPath, out.qx);
    await fs.writeFile(surgePath, out.surge);
    console.log(entry.id + ': regenerated ' + path.relative(ROOT, qxPath) + ' + ' + path.relative(ROOT, surgePath));
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
