// Scan mirrored RuCu6 scripts for Quantumult X compatibility signals.
// Author: chance
// Category: Converter / Script Compatibility / Report
import fs from 'node:fs/promises';
import path from 'node:path';
import { inspectQxScriptCompatibility } from '../src/script-compat.mjs';

const ROOT = process.cwd();
const SCRIPT_ROOT = path.join(ROOT, 'script', 'RuCu6');
const REPORT = path.join(ROOT, 'monitor', '.runtime', 'reports', 'script-compat.json');

async function walk(dir) {
  const out = [];
  let entries = [];
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (error) {
    if (error?.code === 'ENOENT') return out;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = await walk(SCRIPT_ROOT);
const items = [];
for (const file of files.sort()) {
  const sourceText = await fs.readFile(file, 'utf8');
  const rel = path.relative(SCRIPT_ROOT, file).split(path.sep).join('/');
  const scriptUrl = 'https://rucu6.pages.dev/Scripts/' + rel;
  const result = inspectQxScriptCompatibility({ scriptUrl, sourceText });
  items.push({
    file: path.relative(ROOT, file).split(path.sep).join('/'),
    scriptUrl,
    status: result.status,
    executable: result.executable,
    registryId: result.registryId,
    reason: result.reason,
    signals: result.signals,
  });
}

const summary = {};
for (const item of items) summary[item.status] = (summary[item.status] || 0) + 1;
await fs.mkdir(path.dirname(REPORT), { recursive: true });
await fs.writeFile(REPORT, JSON.stringify({ version: 1, summary, items }, null, 2) + '\n');

console.log('WayX script compatibility scan:', JSON.stringify(summary));
for (const item of items.filter(x => !x.executable)) {
  console.log(`REVIEW ${item.file}: ${item.reason}`);
}
