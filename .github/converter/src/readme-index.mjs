import fs from 'node:fs/promises';
import path from 'node:path';

export const README_AUTO_UPDATE_INTERVAL = 86400;
export const QX_MIXED_REWRITE_MIN_BUILD = 844;
export const README_CATEGORY_ORDER = Object.freeze(['BoxJs', 'Module', 'Adblock', 'Rule']);

const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';
const BLOB_BASE = 'https://github.com/JuemingDC/WayX/blob/main';
const QX_UNIVERSAL_BASE = 'https://quantumult.app/x/open-app/add-resource?remote-resource=';
const SURGE_WEB_INSTALL_BASE = 'https://surge.app/install-module?url=';
const BOXJS_SUBSCRIBE_BASE = 'https://boxjs.com/#/sub/add/';
const STALE_WAYX_SCRIPT_RAW = 'https://raw.githubusercontent.com/JuemingDC/WayX/main/script/';

function normalizePlatformPart(value) {
  return String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

function encodeRepoPath(rel) {
  return String(rel).split('/').map(encodeURIComponent).join('/');
}

export function rawRepoUrl(rel) {
  return `${RAW_BASE}/${encodeRepoPath(rel)}`;
}

export function blobRepoUrl(rel) {
  return `${BLOB_BASE}/${encodeRepoPath(rel)}`;
}

export function extractResourceName(text, fallback='') {
  const source = String(text ?? '');
  const qx = source.match(/^#\s*name\s*:\s*(.+?)\s*$/im);
  if (qx?.[1]) return qx[1].trim();
  const surge = source.match(/^#!name\s*=\s*(.+?)\s*$/im);
  if (surge?.[1]) return surge[1].trim();
  try {
    const json = JSON.parse(source);
    if (typeof json?.name === 'string' && json.name.trim()) return json.name.trim();
  } catch {}
  return String(fallback ?? '').trim();
}

export function qxAddResourceUrl(payload) {
  return QX_UNIVERSAL_BASE + encodeURIComponent(JSON.stringify(payload));
}

function safeTag(value) {
  return String(value ?? '').replace(/,/g, '，').trim();
}

function qxRemoteDescriptor(url, tag) {
  return `${url}, tag=${safeTag(tag)}, update-interval=${README_AUTO_UPDATE_INTERVAL}, enabled=true`;
}

export function surgeModuleInstallUrl(rel) {
  return SURGE_WEB_INSTALL_BASE + encodeURIComponent(rawRepoUrl(rel));
}

export function boxJsSubscribeUrl(rel) {
  return BOXJS_SUBSCRIBE_BASE + encodeURIComponent(rawRepoUrl(rel));
}

async function walkFiles(root, rel) {
  const abs = path.join(root, rel);
  let entries;
  try { entries = await fs.readdir(abs, {withFileTypes: true}); }
  catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  const out = [];
  for (const ent of entries.sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
    if (ent.name.startsWith('.')) continue;
    const child = path.posix.join(rel.replaceAll(path.sep, '/'), ent.name);
    if (ent.isDirectory()) out.push(...await walkFiles(root, child));
    else if (ent.isFile()) out.push(child);
  }
  return out;
}

function detectPlatform(rel) {
  for (const part of String(rel).split('/')) {
    const key = normalizePlatformPart(part);
    if (key === 'quantumultx' || key === 'quanx') return 'qx';
    if (key === 'surge') return 'surge';
  }
  return null;
}

function stemOf(rel) {
  const base = path.posix.basename(rel);
  return base.replace(/\.[^.]+$/, '');
}

function rowKey(category, rel) {
  const parts = rel.split('/');
  if (category === 'Module') return parts[1] || stemOf(rel);
  return stemOf(rel);
}

async function scanCategory(root, category) {
  const dir = category === 'BoxJs' ? 'Boxjs' : category;
  const files = await walkFiles(root, dir);
  const rows = new Map();
  for (const rel of files) {
    const ext = path.posix.extname(rel).toLowerCase();
    if (category === 'BoxJs' && ext !== '.json') continue;
    if (category === 'Module' && !['.snippet', '.sgmodule'].includes(ext)) continue;
    if (category === 'Adblock' && !['.snippet', '.sgmodule'].includes(ext)) continue;
    if (category === 'Rule' && !['.list', '.snippet', '.sgmodule'].includes(ext)) continue;
    const platform = detectPlatform(rel);
    if (!platform && category !== 'BoxJs') continue;
    const text = await fs.readFile(path.join(root, rel), 'utf8');
    if (text.includes(STALE_WAYX_SCRIPT_RAW)) {
      throw new Error(`stale lowercase WayX Script raw URL in indexed resource: ${rel}`);
    }
    const fallback = stemOf(rel);
    const name = extractResourceName(text, fallback);
    const key = rowKey(category, rel);
    const row = rows.get(key) ?? {key, qx:null, surge:null};
    const item = {rel, name, text, ext};
    if (category === 'BoxJs') {
      if (platform === 'surge') row.surge = item;
      else row.qx = item;
    } else {
      if (platform === 'qx') row.qx = item;
      if (platform === 'surge') row.surge = item;
    }
    rows.set(key, row);
  }
  return [...rows.values()].sort((a,b)=>a.key.localeCompare(b.key,'en'));
}

export function qxSnippetInstallUrl(item) {
  if (!item?.rel || item.ext !== '.snippet') {
    throw new Error('Quantumult X module/adblock install target must be a .snippet resource');
  }
  return qxAddResourceUrl({
    rewrite_remote:[qxRemoteDescriptor(rawRepoUrl(item.rel), item.name)],
  });
}

function qxInstallerForRule(item) {
  const payload = {filter_remote:[qxRemoteDescriptor(rawRepoUrl(item.rel), item.name)]};
  return qxAddResourceUrl(payload);
}

function markdownLink(label, url) {
  return `[${label}](${url})`;
}

function resourceNameCell(row) {
  const item = row.qx ?? row.surge;
  return item ? `**[${item.name}](${blobRepoUrl(item.rel)})**` : `**${row.key}**`;
}

function rowInstallCells(category, row) {
  let qx = '—';
  let surge = '—';
  if (category === 'BoxJs' && row.qx) {
    qx = markdownLink('一键添加', boxJsSubscribeUrl(row.qx.rel));
  } else if (row.qx && (category === 'Module' || category === 'Adblock')) {
    qx = markdownLink('一键导入', qxSnippetInstallUrl(row.qx));
  } else if (row.qx && category === 'Rule') {
    qx = markdownLink('一键导入', qxInstallerForRule(row.qx));
  }

  if (row.surge) {
    if (row.surge.ext === '.sgmodule') surge = markdownLink('一键安装', surgeModuleInstallUrl(row.surge.rel));
    else surge = markdownLink('查看规则', rawRepoUrl(row.surge.rel));
  }
  return {qx, surge};
}

function renderTable(category, rows) {
  const lines = [
    `## ${category}`,
    '',
    '| Name | Quantumult X | Surge |',
    '| :--- | :---: | :---: |',
  ];
  for (const row of rows) {
    const cells = rowInstallCells(category, row);
    lines.push(`| ${resourceNameCell(row)} | ${cells.qx} | ${cells.surge} |`);
  }
  if (!rows.length) lines.push('| — | — | — |');
  return lines.join('\n');
}

export async function buildReadmePlan(root=process.cwd()) {
  const sections = [];
  for (const category of README_CATEGORY_ORDER) {
    const rows = await scanCategory(root, category);
    sections.push(renderTable(category, rows));
  }

  const readme = [
    '<div align="center">',
    '',
    '# WayX',
    '',
    '**Quantumult X · Surge**',
    '',
    '规则、模块及去广告资源转换与维护',
    '',
    '[BoxJs](#boxjs) · [Module](#module) · [Adblock](#adblock) · [Rule](#rule)',
    '',
    '</div>',
    '',
    '---',
    '',
    sections.join('\n\n---\n\n'),
    '',
    '---',
    '',
    '<div align="center">',
    '',
    'WayX · Maintained by **chance**',
    '',
    '</div>',
    '',
  ].join('\n');
  return new Map([['README.md', readme]]);
}

export async function readmePlanDiff(root=process.cwd(), plan=null) {
  const desired = plan ?? await buildReadmePlan(root);
  const changed = [];
  for (const [rel,content] of desired) {
    let current = null;
    try { current = await fs.readFile(path.join(root,rel),'utf8'); } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    if (current !== content) changed.push(rel);
  }
  return changed.sort();
}

export async function writeReadmePlan(root=process.cwd(), plan=null) {
  const desired = plan ?? await buildReadmePlan(root);
  for (const [rel,content] of desired) {
    const abs = path.join(root,rel);
    await fs.mkdir(path.dirname(abs),{recursive:true});
    await fs.writeFile(abs,content);
  }
  return desired;
}
