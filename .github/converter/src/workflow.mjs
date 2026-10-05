// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / workflow

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { normalizePluginSource, parseLoonPlugin } from "./input.mjs";



// managed-artifacts.mjs
// Managed source/target/helper artifact I/O for WayX converter workflows.
// Author: chance
// Category: Converter / Managed Artifact I/O






export const AD_BLOCK_ROOT='Adblock';
export const QX_ADBLOCK_DIR='Adblock/Quantumult X';
export const SURGE_ADBLOCK_DIR='Adblock/Surge';
export const BOXJS_SUBSCRIPTION='Boxjs/QuantumultX/Chanceの订阅.json';

export function qxTargetPath(entry) {
  if (!entry?.qx) throw new Error('manifest entry missing qx filename');
  return `${QX_ADBLOCK_DIR}/${entry.qx}`;
}

export function surgeTargetPath(entry) {
  if (!entry?.surge) throw new Error('manifest entry missing surge filename');
  return `${SURGE_ADBLOCK_DIR}/${entry.surge}`;
}

const GENERATED_HELPER_FILENAME_RE=/^(?:features_(?:qx|surge)|phase_(?:qx|surge)_(?:request|response)|mock|header|complex_qx|mock_file|json_add_qx|redirect|reject|complex_surge|request_mock|json_mutation_surge|legacy_header|legacy_json_add_(?:qx|surge)|legacy_mock|legacy_request_mock)_[0-9a-f]{10}\.js$/;

export function isWayxGeneratedHelperFilename(name) {
  return GENERATED_HELPER_FILENAME_RE.test(String(name ?? ''));
}

async function staleGeneratedHelpers(root, entry, generatedScripts, {scriptDir='Script'}={}) {
  const dir=path.join(root,scriptDir,entry.id);
  let names=[];
  try { names=await fs.readdir(dir); } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
  return names
    .filter(name=>isWayxGeneratedHelperFilename(name) && !generatedScripts.has(name))
    .sort();
}

export function normalizeManagedSource(text) {
  return normalizePluginSource(text).replace(/\n*$/, '\n');
}

export function managedSourceDigest(text, length=12) {
  return crypto.createHash('sha256').update(String(text ?? '')).digest('hex').slice(0,length);
}

export function nowConversionStamp() {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone:'Asia/Shanghai',
    year:'numeric',
    month:'2-digit',
    day:'2-digit',
    hour:'2-digit',
    minute:'2-digit',
    second:'2-digit',
    hour12:false,
  }).format(new Date()).replace(' ','T').replace('T',' ') + ' +08:00';
}

export function conversionStampFromText(text, {trim=false}={}) {
  const match=String(text ?? '').match(/^# Converted:\s*(.+)$/m);
  if (!match) return null;
  return trim ? match[1].trim() : match[1];
}

export function firstConversionStamp(texts, {trim=false}={}) {
  for (const text of texts) {
    const stamp=conversionStampFromText(text,{trim});
    if (stamp) return stamp;
  }
  return null;
}

// Conversion timestamps describe a write, not a content change. Compare each
// artifact independently so changing one rule/helper cannot rewrite its peers.
function artifactContent(text) {
  if(text===null || text===undefined)return text;
  return String(text).replace(/^(#|\/\/) Converted:[^\n]*/gm,'$1 Converted:');
}

async function managedFileExists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function readManagedTextIfExists(file) {
  return await managedFileExists(file)
    ? normalizePluginSource(await fs.readFile(file,'utf8'))
    : null;
}

export async function inspectManagedSource(root, entry, source, {resourceDir='Resource/Loon'}={}) {
  const sourcePath=path.join(root,resourceDir,entry.file);
  const previous=await readManagedTextIfExists(sourcePath);
  return {
    sourcePath,
    previous,
    changed:previous !== source,
    digest:managedSourceDigest(source),
  };
}

export async function writeManagedSource(state, source) {
  if (!state.changed) return false;
  await fs.mkdir(path.dirname(state.sourcePath),{recursive:true});
  await fs.writeFile(state.sourcePath,source);
  return true;
}

export async function syncManagedSource(root, entry, source, options={}) {
  const state=await inspectManagedSource(root,entry,source,options);
  await writeManagedSource(state,source);
  return state;
}

export async function readCatalogSource(root, entry, {resourceDir='Resource/Loon'}={}) {
  const sourcePath=path.join(root,resourceDir,entry.file);
  return normalizeManagedSource(await fs.readFile(sourcePath,'utf8'));
}

export async function readManagedTargetState(root, entry) {
  const qxRelativePath=qxTargetPath(entry);
  const surgeRelativePath=surgeTargetPath(entry);
  const qxPath=path.join(root,qxRelativePath);
  const surgePath=path.join(root,surgeRelativePath);
  const [qx,surge]=await Promise.all([
    readManagedTextIfExists(qxPath),
    readManagedTextIfExists(surgePath),
  ]);
  return {
    qxRelativePath,
    surgeRelativePath,
    qxPath,
    surgePath,
    qx,
    surge,
  };
}

export async function generatedScriptDiffs(root, entry, generatedScripts, {scriptDir='Script'}={}) {
  const diffs=[];
  for (const [name,content] of generatedScripts) {
    const file=path.join(root,scriptDir,entry.id,name);
    if (artifactContent(await readManagedTextIfExists(file)) !== artifactContent(content)) diffs.push(name);
  }
  for (const name of await staleGeneratedHelpers(root,entry,generatedScripts,{scriptDir})) {
    diffs.push('delete:'+name);
  }
  return diffs;
}

export async function syncGeneratedScripts(root, entry, generatedScripts, {scriptDir='Script'}={}) {
  const changed=[];
  for (const [name,content] of generatedScripts) {
    const file=path.join(root,scriptDir,entry.id,name);
    if (artifactContent(await readManagedTextIfExists(file)) === artifactContent(content)) continue;
    await fs.mkdir(path.dirname(file),{recursive:true});
    await fs.writeFile(file,content);
    changed.push(name);
  }
  for (const name of await staleGeneratedHelpers(root,entry,generatedScripts,{scriptDir})) {
    await fs.unlink(path.join(root,scriptDir,entry.id,name));
    changed.push('delete:'+name);
  }
  return changed;
}

// Internal workflow transaction; the public converter index remains unchanged.
export async function commitManagedConversion(root,entry,state,out,{
  sourceState=null,source=null,onStage=()=>{},
  writeHelpers=syncGeneratedScripts,writeTargets=writeManagedTargets,writeSource=writeManagedSource,
}={}) {
  const stale=await staleGeneratedHelpers(root,entry,out.generatedScripts);
  const files=[state.qxPath,state.surgePath,...(sourceState?[sourceState.sourcePath]:[])];
  for(const name of new Set([...out.generatedScripts.keys(),...stale])) {
    if(path.basename(name)!==name)throw new Error('Generated helper filename must be local to its plugin');
    files.push(path.join(root,'Script',entry.id,name));
  }
  const snapshot=new Map(await Promise.all(files.map(async file=>{
    try{return [file,await fs.readFile(file)];}catch(error){if(error.code==='ENOENT')return [file,null];throw error;}
  })));
  try {
    onStage('write-generated-helpers');
    const helperChanges=await writeHelpers(root,entry,out.generatedScripts);
    onStage('write-targets');
    const targetChanges=await writeTargets(state,out);
    if(sourceState){onStage('write-source');await writeSource(sourceState,source);}
    return {helperChanges,targetChanges};
  } catch(error) {
    const rollbackErrors=[];
    for(const [file,bytes] of snapshot)try {
      if(bytes===null)await fs.rm(file,{force:true});
      else {
        const current=await fs.readFile(file).catch(failure=>{if(failure.code==='ENOENT')return null;throw failure;});
        if(current?.equals(bytes))continue;
        await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,bytes);
      }
    }catch(failure){rollbackErrors.push(failure);}
    if(rollbackErrors.length) {
      const failure=new AggregateError([error,...rollbackErrors],'Managed conversion write and rollback failed',{cause:error});
      failure.rollbackSucceeded=false;throw failure;
    }
    error.rollbackSucceeded=true;throw error;
  }
}

export function managedTargetDiffs(state, out) {
  const changed=[];
  if (artifactContent(state.qx) !== artifactContent(out.qx)) changed.push('qx');
  if (artifactContent(state.surge) !== artifactContent(out.surge)) changed.push('surge');
  return changed;
}

export async function writeManagedTargets(state, out) {
  const changed=managedTargetDiffs(state,out);
  if (changed.includes('qx')) {
    await fs.mkdir(path.dirname(state.qxPath),{recursive:true});
    await fs.writeFile(state.qxPath,out.qx);
  }
  if (changed.includes('surge')) {
    await fs.mkdir(path.dirname(state.surgePath),{recursive:true});
    await fs.writeFile(state.surgePath,out.surge);
  }
  return changed;
}

// readme-index.mjs
export const README_AUTO_UPDATE_INTERVAL = 86400;
export const QX_MIXED_REWRITE_MIN_BUILD = 844;
export const README_CATEGORY_ORDER = Object.freeze(['BoxJs', 'Module', 'Adblock', 'Rule']);

const RAW_BASE = 'https://raw.githubusercontent.com/JuemingDC/WayX/main';
const BLOB_BASE = 'https://github.com/JuemingDC/WayX/blob/main';
const QX_UNIVERSAL_BASE = 'https://quantumult.app/x/open-app/add-resource?remote-resource=';
const SURGE_WEB_INSTALL_BASE = 'https://surge.app/install-module?url=';
const BOXJS_SUBSCRIBE_BASE = 'https://boxjs.com/#/sub/add/';
const STALE_WAYX_SCRIPT_RAW = `${RAW_BASE}/${['scr','ipt'].join('')}/`;

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

async function catalogRowOrder(root, category) {
  if (category !== 'Adblock') return new Map();
  let manifest;
  try {
    manifest=JSON.parse(await fs.readFile(path.join(root,'.github/sources/loon.json'),'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map();
    throw error;
  }
  if (!Array.isArray(manifest)) throw new Error('README catalog order source must be an array');
  const order=new Map();
  manifest.forEach((entry,index)=>{
    for(const field of ['qx','surge']){
      const value=entry?.[field];
      if(typeof value!=='string' || !value.trim()) continue;
      const key=stemOf(value.trim());
      if(!order.has(key)) order.set(key,index);
    }
  });
  return order;
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
  const sourceOrder=await catalogRowOrder(root,category);
  return [...rows.values()].sort((a,b)=>{
    const ar=sourceOrder.has(a.key) ? sourceOrder.get(a.key) : Number.POSITIVE_INFINITY;
    const br=sourceOrder.has(b.key) ? sourceOrder.get(b.key) : Number.POSITIVE_INFINITY;
    if(ar!==br) return ar-br;
    return a.key.localeCompare(b.key,'en');
  });
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

function adblockAuthor(row) {
  for(const item of [row.qx,row.surge]) {
    const match=item?.text.match(/^#\s*Author:\s*(.+)$/mi);
    if(!match)continue;
    const name=match[1].replace(/\[https?:\/\/[^\]]*\]/g,'').split(/[,，、]/)[0].trim();
    if(name)return name;
  }
  return '佚名';
}

function renderTable(category, rows, heading=category, level=2) {
  const lines = [
    `${'#'.repeat(level)} ${heading}`,
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
    if(category==='Adblock' && rows.length) {
      const groups=new Map();
      for(const row of rows) {
        const author=adblockAuthor(row);
        if(!groups.has(author))groups.set(author,[]);
        groups.get(author).push(row);
      }
      sections.push('## Adblock\n\n'+[...groups].map(([author,items])=>renderTable(category,items,author.replace(/[\r\n]/g,' ').replace(/([\\`*_\[\]<>])/g,'\\$1'),3)).join('\n\n'));
    } else sections.push(renderTable(category, rows));
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

// upstream-run-report.mjs
// Scheduled upstream conversion failure reporting.
// Author: chance
// Category: Converter / Automation / Failure Report





function activeDeclarations(text) {
  if (!text) return [];
  const parsed=parseLoonPlugin(text);
  const out=[];
  for (const [section,lines] of parsed.sections) {
    if (section === 'Argument') continue;
    for (const raw of lines) {
      const line=String(raw ?? '').trim();
      if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
      out.push({section,line});
    }
  }
  return out;
}

function multiset(items) {
  const counts=new Map();
  for (const item of items) {
    const key=item.section+'\0'+item.line;
    counts.set(key,(counts.get(key)||0)+1);
  }
  return counts;
}

export function failureDeclarationContext(previous,current,{limit=40}={}) {
  const before=activeDeclarations(previous);
  const after=activeDeclarations(current);
  const counts=multiset(before);
  const changed=[];
  for (const item of after) {
    const key=item.section+'\0'+item.line;
    const count=counts.get(key)||0;
    if (count) counts.set(key,count-1);
    else changed.push(item);
  }
  if (changed.length) return {kind:'changed-upstream-declarations',items:changed.slice(0,limit)};
  if (after.length) return {kind:'current-upstream-declarations',items:after.slice(0,limit)};
  if (before.length) return {kind:'current-local-declarations',items:before.slice(0,limit)};
  return {kind:'unavailable',items:[]};
}

export function buildSyncFailure({entry,stage,error,previousSource=null,fetchedSource=null}) {
  const reason=String(error?.message || error || 'unknown failure');
  const detail=String(error?.stack || error?.message || error || 'unknown failure');
  const context=failureDeclarationContext(previousSource,fetchedSource);
  return {
    plugin:{
      id:entry.id,
      file:entry.file,
      source:entry.source,
      qx:entry.qx,
      surge:entry.surge,
    },
    stage,
    reason,
    detail,
    declarationContext:context.kind,
    declarations:context.items,
  };
}

export async function writeSyncFailureReport(root,failures,{runtimeDir='.github/monitor/.runtime',summary=null}={}) {
  const dir=path.join(root,runtimeDir);
  await fs.mkdir(dir,{recursive:true});
  const jsonPath=path.join(dir,'sync-failures.json');
  const markdownPath=path.join(dir,'sync-failures.md');
  await fs.writeFile(jsonPath,JSON.stringify(summary?{version:2,failures,...summary}:{version:1,failures},null,2)+'\n');
  const lines=['# WayX Actions sync failures','',`Total: ${failures.length}`,''];
  for (const failure of failures) {
    lines.push(
      '## '+failure.plugin.id,
      '',
      '- Stage: `'+failure.stage+'`',
      '- Reason: '+failure.reason,
      '- Source: `'+failure.plugin.file+'`',
      '- Upstream: '+failure.plugin.source,
      '',
      '### Related source declarations',
      ''
    );
    if (failure.declarations.length) {
      lines.push('```text');
      for (const item of failure.declarations) lines.push('['+item.section+'] '+item.line);
      lines.push('```','');
    } else {
      lines.push('(new upstream rule content unavailable)','');
    }
  }
  await fs.writeFile(markdownPath,lines.join('\n')+'\n');
  return {jsonPath,markdownPath};
}

// workflow-diagnostics.mjs
// Shared workflow diagnostics for catalog conversion runners.
// Author: chance
// Category: Converter / Workflow Diagnostics

function fallbackValue(error, mode) {
  return mode === 'error' ? error : error?.message;
}

function failureDetail(error, mode) {
  return error?.stack || fallbackValue(error, mode);
}

function annotationValue(error, mode) {
  if (mode === 'error') return error?.message || error;
  return error?.message;
}

export function formatWorkflowErrorAnnotation(entry, error, {annotationFallback='message'}={}) {
  const title=entry?.id;
  const message=String(annotationValue(error,annotationFallback)).replaceAll('\n','%0A');
  return `::error title=${title}::${message}`;
}

export function createWorkflowFailureReporter({
  summaryLabel='Failures',
  detailFallback='message',
  annotationFallback='message',
  writeError=console.error,
}={}) {
  const failures=[];

  function capture(entry,error) {
    failures.push(`${entry.id}: ${failureDetail(error,detailFallback)}`);
    writeError(formatWorkflowErrorAnnotation(entry,error,{annotationFallback}));
  }

  function report() {
    if (!failures.length) return false;
    writeError(`\n${summaryLabel}:\n` + failures.join('\n\n'));
    return true;
  }

  return {
    capture,
    report,
    get size() { return failures.length; },
    snapshot() { return [...failures]; },
  };
}
