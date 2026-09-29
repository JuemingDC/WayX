// Offline canonical target regeneration for checked-in Loon sources.
// Author: chance
// Category: Converter / Canonical Output
import fs from 'node:fs/promises';
import path from 'node:path';
import { cleanSource, convert, parseLoon, scriptUrls, validateQX } from '../../.github/scripts/sync-convert.mjs';
import { qxTargetPath, surgeTargetPath } from '../src/paths.mjs';
import { validateSurgeModule } from '../src/surge-module.mjs';
import { isRewriteV2, parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../src/rewrite-v2-actions.mjs';
import { jqDependencySpecFromAction } from '../src/dependency.mjs';
import { minifyJqFile } from '../src/jq.mjs';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, '.github/sources/loon.json');
const RESOURCE_DIR = path.join(ROOT, 'Resource/Loon');
const SCRIPT_DIR = path.join(ROOT, 'script');
const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';
const DEPENDENCY_MANIFEST = path.join(ROOT, 'converter/dependencies/manifest.json');

const mode = process.argv.includes('--write') ? 'write' : 'check';

const EXTRA_LOCAL_ENTRIES = [
  {
    id: 'MyBlockAds',
    file: 'RuCu6/myblockads.lpx',
    source: 'https://raw.githubusercontent.com/JuemingDC/WayX/main/Resource/Loon/RuCu6/myblockads.lpx',
    qx: 'MyBlockAds.snippet',
    surge: 'MyBlockAds.sgmodule',
    category: '去广告 / Loon Plugin Conversion',
  },
];


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

function rawRepoUrl(file) {
  const rel = path.relative(ROOT, file).split(path.sep).map(encodeURIComponent).join('/');
  return RAW_BASE + '/' + rel;
}

async function mirroredScriptMap(entry, source) {
  const map = new Map();
  for (const url of scriptUrls(source)) {
    let filename;
    try {
      filename = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    } catch {
      filename = '';
    }

    const local = filename ? path.join(SCRIPT_DIR, entry.id, filename) : '';
    if (local && await exists(local)) {
      map.set(url, {
        qx: rawRepoUrl(local),
        surge: rawRepoUrl(local),
        source: normalize(await fs.readFile(local, 'utf8')),
        qxAdapted: false,
      });
    } else {
      map.set(url, {
        qx: url,
        surge: url,
        source: '',
        qxAdapted: false,
      });
    }
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

async function loadDependencyCache() {
  if (!await exists(DEPENDENCY_MANIFEST)) return { resources: {} };
  return JSON.parse(await fs.readFile(DEPENDENCY_MANIFEST, 'utf8'));
}

async function localJqFiles(entry, source, dependencyCache) {
  const out = new Map();
  const parsed = parseLoon(source);
  for (const raw of parsed.sections.get('Rewrite') || []) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';') || line.startsWith('//') || !isRewriteV2(line)) continue;
    const ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    if (ast.actions.length !== 1) continue;
    const spec = jqDependencySpecFromAction(ast.actions[0], { pluginSourceUrl: entry.source });
    if (!spec) continue;
    const rel = dependencyCache.resources?.[spec.url];
    if (!rel) {
      throw new Error(entry.id + ': missing cached JQ dependency for ' + spec.url);
    }
    const local = path.join(ROOT, rel);
    if (!await exists(local)) {
      throw new Error(entry.id + ': cached JQ dependency file missing: ' + rel);
    }
    out.set(line, {
      content: minifyJqFile(await fs.readFile(local, 'utf8')),
      sourceFile: spec.url,
      localFile: rel,
      legacyAlias: Boolean(spec.legacyAlias),
    });
  }
  return out;
}

function assertOfflineDependencies(entry, source) {
  if (/\.body\.mock_file\s*\(/.test(source)) {
    throw new Error(
      entry.id + ': offline canonical regeneration found mock_file dependency; ' +
      'materialize that dependency before enabling canonical write/check.'
    );
  }
}

const manifest = [...JSON.parse(await fs.readFile(MANIFEST, 'utf8')), ...EXTRA_LOCAL_ENTRIES];
const dependencyCache = await loadDependencyCache();
const changed = [];
const failures = [];

for (const entry of manifest) {
  try {
    const sourcePath = path.join(RESOURCE_DIR, entry.file);
    const source = cleanSource(await fs.readFile(sourcePath, 'utf8'));
    assertOfflineDependencies(entry, source);

    const qxPath = path.join(ROOT, qxTargetPath(entry));
    const surgePath = path.join(ROOT, surgeTargetPath(entry));
    const oldQx = await readIfExists(qxPath);
    const oldSurge = await readIfExists(surgePath);
    const stamp = existingStamp(oldQx, oldSurge) || nowCN();
    const scripts = await mirroredScriptMap(entry, source);
    const jqFiles = await localJqFiles(entry, source, dependencyCache);

    let out = convert(entry, source, scripts, stamp, new Map(), jqFiles);
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
    out = convert(entry, source, scripts, nowCN(), new Map(), jqFiles);
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
