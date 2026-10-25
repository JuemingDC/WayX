// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / workflow

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {quoteJq} from "./rewrite.mjs";
import {validateQX} from "./output.mjs";
import {spawnSync} from "node:child_process";
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

// Modified: 2026-10-25 (chance). Import native QX resources without passing
// through the Loon compiler. Keep upstream active text/order and original JS URLs.
const NATIVE_QX_MARKER='# Managed by: WayX Native QX';
export function mergeNativeQxSources(sources,{name,author,stamp=nowConversionStamp()}={}) {
  const sections={filter_local:[],rewrite_local:[],mitm:[]},hosts=[];
  for(const source of sources) {
    let pending=['# Source: '+source.url];
    for(const original of source.text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').split('\n')) {
      const line=original.trim();
      if(!line || /^(?:#|;|\/\/)/.test(line)) {pending.push(original.startsWith('#!')?'# Upstream '+original.slice(2):/^(?:;|\/\/)/.test(line)?'# '+original:original);continue;}
      if(/^\[(?:filter_local|rewrite_local|mitm)\]$/i.test(line)){pending.push('# '+line);continue;}
      const mitm=line.match(/^hostname\s*=\s*(.*)$/i);
      if(mitm){sections.mitm.push(...pending,'# Upstream '+original);pending=[];for(const host of mitm[1].split(',').map(x=>x.trim()).filter(Boolean))if(!hosts.includes(host))hosts.push(host);continue;}
      const key=/\surl(?:-and-header)?\s/.test(line)?'rewrite_local':/^(?:host(?:-suffix|-keyword|-wildcard)?|ip-cidr|ip6-cidr|geoip|user-agent)\s*,/i.test(line)?'filter_local':null;
      if(!key)throw Error('Unknown native QX declaration in '+source.url+': '+line);
      // Modified: 2026-10-25 (chance). Serialize upstream bare jq into the
      // existing quoted config format without changing its program or actions.
      const jq=key==='rewrite_local'?original.match(/^(.*?\surl(?:-and-header)?\s+jsonjq-(?:request|response)-body)\s+(.+)$/):null;
      const quoted=jq && !/^'.*'$/.test(jq[2])?jq[1]+' '+quoteJq(jq[2]):original;
      const serialized=quoted.replace(/^(\S+(?:\s+\S+)?\s+url(?:-and-header)?\s+)REJECT$/, '$1reject');
      sections[key].push(...pending,...(serialized!==original?['# Source declaration: '+original]:[]),serialized);pending=[];
    }
    // Trailing comments are still source content, even after a MITM declaration.
    sections.mitm.push(...pending);
  }
  const authors=[...new Set([author,...sources.flatMap(source=>(source.text.match(/^#!author\s*=\s*(.+)$/mi)?.[1] || '').split(/[,，、&]/).map(x=>x.trim()).filter(Boolean))])];
  const out=['# Name: '+name,'# Updated: '+stamp,'# Merged by: chance','# Source Authors: '+authors.join(', '),'# Category: app',NATIVE_QX_MARKER,''];
  for(const key of ['filter_local','rewrite_local','mitm']) {
    if(!sections[key].some(x=>x.trim()) && !(key==='mitm'&&hosts.length))continue;
    out.push('# ['+key+']',...sections[key]);if(key==='mitm'&&hosts.length)out.push('hostname = '+hosts.join(', '));out.push('');
  }
  return out.join('\n').replace(/\n*$/,'\n');
}
export async function prepareNativeQxSync(root,{fetchText}={}) {
  let config;try{config=JSON.parse(await fs.readFile(path.join(root,'.github/sources/native-qx.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return null;throw error;}
  if(config.version!==1 || !/^[\w.-]+\/[\w.-]+$/.test(config.repository)|| !/^[a-z0-9_]+$/.test(config.prefix))throw Error('Invalid native QX registry');
  const api='https://api.github.com/repos/'+config.repository;
  const commit=JSON.parse(await fetchText(api+'/commits/'+encodeURIComponent(config.ref))).sha;
  if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Invalid native QX snapshot commit');
  const tree=JSON.parse(await fetchText(api+'/git/trees/'+commit+'?recursive=1'));
  if(tree.truncated || !Array.isArray(tree.tree))throw Error('Incomplete native QX source tree');
  const files=tree.tree.filter(x=>x.type==='blob'&&/^(?:filter|rewrite)\/[^/]+\.snippet$/.test(x.path)&&!config.exclude.includes(x.path)).sort((a,b)=>a.path.localeCompare(b.path,'en'));
  if(!files.length)throw Error('Empty native QX source catalog');
  const groups=new Map(),inputs=[],skipped=[];
  for(const file of files) {
    const url='https://raw.githubusercontent.com/'+config.repository+'/'+commit+'/'+file.path;
    const text=await fetchText(url);if(/^\s*</.test(text))throw Error('HTML response for '+url);
    const stem=path.posix.basename(file.path,'.snippet'),key=config.aliases[stem] || stem;
    if(!/^[a-z0-9-]+$/.test(key))throw Error('Invalid native QX application key');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push({text,path:file.path,url:'https://raw.githubusercontent.com/'+config.repository+'/'+config.ref+'/'+file.path});
    inputs.push({path:file.path,sha256:crypto.createHash('sha256').update(text).digest('hex')});
  }
  const outputs=new Map();
  for(const [key,allSources] of groups) {
    let sources=allSources;
    // Modified: 2026-10-25 (chance). For alternative app versions, retain
    // only a uniquely single-author version, never infer an attribution.
    const rewrites=allSources.filter(x=>x.path.startsWith('rewrite/'));
    if(rewrites.length>1) {
      const eligible=rewrites.filter(x=>{
        const authors=x.text.match(/^#!author\s*=\s*(.+)$/mi)?.[1]?.split(/[,，、&]/).map(a=>a.trim()).filter(Boolean);
        return authors?.length===1;
      });
      if(eligible.length!==1){skipped.push({application:key,reason:'No unique single-author version',sources:rewrites.map(x=>x.path)});continue;}
      sources=allSources.filter(x=>!x.path.startsWith('rewrite/')||x===eligible[0]);
    }
    const name=sources.map(x=>x.text.match(/^#!name\s*=\s*(.+)$/mi)?.[1]).filter(Boolean).at(-1) || config.names[key] || key;
    const text=mergeNativeQxSources(sources,{name,author:config.author});validateQX(text,{id:config.prefix+key});
    outputs.set(QX_ADBLOCK_DIR+'/'+config.prefix+key+'.snippet',text);
  }
  return {outputs,commit,inputs,skipped};
}
export async function commitNativeQxSync(root,plan) {
  if(!plan)return;
  const statePath='.github/sources/native-qx-state.json';
  let prior={outputs:[]};try{prior=JSON.parse(await fs.readFile(path.join(root,statePath),'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  const old=new Map(),writes=new Map();
  for(const relative of new Set([...prior.outputs,...plan.outputs.keys()])) {
    if(!/^Adblock\/Quantumult X\/ishowshu_[a-z0-9-]+\.snippet$/.test(relative))throw Error('Native QX ownership boundary violation');
    let previous=null;try{previous=await fs.readFile(path.join(root,relative),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
    if(previous!==null && !previous.includes(NATIVE_QX_MARKER))throw Error('Refusing to overwrite unmanaged native QX resource: '+relative);
    old.set(relative,previous);let next=plan.outputs.get(relative)??null;
    if(previous && next && previous.replace(/^# Updated:.*$/m,'')===next.replace(/^# Updated:.*$/m,''))next=previous;
    if(next!==previous)writes.set(relative,next);
  }
  let state=null;try{state=await fs.readFile(path.join(root,statePath),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
  old.set(statePath,state);writes.set(statePath,JSON.stringify({version:1,commit:plan.commit,inputs:plan.inputs,skipped:plan.skipped,outputs:[...plan.outputs.keys()]},null,2)+'\n');
  try{for(const [relative,text] of writes){const file=path.join(root,relative);await fs.mkdir(path.dirname(file),{recursive:true});if(text===null)await fs.rm(file,{force:true});else await fs.writeFile(file,text);}}
  catch(error){for(const [relative,text] of old){const file=path.join(root,relative);if(text===null)await fs.rm(file,{force:true});else await fs.writeFile(file,text);}throw error;}
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
  if (category === 'Module') return parts.length === 2 ? stemOf(rel) : (parts[1] || stemOf(rel));
  return stemOf(rel);
}

async function catalogRowMetadata(root, category) {
  const empty=()=>({order:new Map(),sources:new Map()});
  if (category !== 'Adblock') return empty();
  let manifest;
  try {
    manifest=JSON.parse(await fs.readFile(path.join(root,'.github/sources/loon.json'),'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return empty();
    throw error;
  }
  if (!Array.isArray(manifest)) throw new Error('README catalog order source must be an array');
  const order=new Map();
  const sources=new Map();
  manifest.forEach((entry,index)=>{
    for(const field of ['qx','surge']){
      const value=entry?.[field];
      if(typeof value!=='string' || !value.trim()) continue;
      const key=stemOf(value.trim());
      if(!order.has(key)) order.set(key,index);
      if(!sources.has(key) && typeof entry.source==='string')sources.set(key,entry.source);
    }
  });
  return {order,sources};
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
    if (category === 'Rule' && !['.list', '.snippet', '.sgmodule', '.dconf'].includes(ext)) continue;
    // Root-level Module files do not include a platform directory.
    // Infer the platform only there, from the unambiguous module extension.
    const platform = detectPlatform(rel) ?? (category === 'Module' && rel.split('/').length === 2
      ? (ext === '.sgmodule' ? 'surge' : ext === '.snippet' ? 'qx' : null)
      : null);
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
  const {order:sourceOrder,sources}=await catalogRowMetadata(root,category);
  for(const row of rows.values())row.catalogSource=sources.get(row.key);
  // Modified: 2026-10-25 (chance). Keep fetch-source group order separate
  // from alphabetical resource order within each existing author group.
  return [...rows.values()].sort((a,b)=>{
    const ar=sourceOrder.has(a.key)?sourceOrder.get(a.key):Infinity;
    const br=sourceOrder.has(b.key)?sourceOrder.get(b.key):Infinity;
    return ar-br || a.key.localeCompare(b.key,'en');
  });
}

export function qxSnippetInstallUrl(item) {
  if (!item?.rel || item.ext !== '.snippet') {
    throw new Error('Quantumult X module/adblock install target must be a .snippet resource');
  }
  // Modified: 2026-10-25 (chance). One native file may supply both routing
  // and rewrite subscriptions; register each existing section with the same URL.
  if(item.text?.includes(NATIVE_QX_MARKER)) {
    const descriptor=qxRemoteDescriptor(rawRepoUrl(item.rel),item.name),payload={};
    if(/^# \[filter_local\]$/m.test(item.text))payload.filter_remote=[descriptor];
    if(/^# \[rewrite_local\]$/m.test(item.text)||/^hostname\s*=/m.test(item.text))payload.rewrite_remote=[descriptor];
    return qxAddResourceUrl(payload);
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

function adblockSource(row) {
  const source=row.catalogSource || [row.qx,row.surge].map(item=>item?.text.match(/^#\s*Source:\s*(https?:\/\/\S+)\s*$/mi)?.[1]).find(Boolean);
  if(!source)return '本地资源';
  try {
    const url=new URL(source),host=url.hostname.toLowerCase();
    if(host==='kelee.one' || host.endsWith('.kelee.one'))return '可莉';
    if(host==='rucu6.pages.dev')return 'RuCu6';
    if(['github.com','raw.githubusercontent.com'].includes(host)&&url.pathname.split('/')[1]==='ishowshu')return '树先生';
    if(host==='raw.githubusercontent.com' || host==='github.com')return url.pathname.split('/').filter(Boolean)[0] || host;
    return host;
  }catch{return '本地资源';}
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function renderTable(category, rows, heading=category, level=2) {
  const lines = [
    ...(heading===null?[]:[`${'#'.repeat(level)} ${heading}`,'']),
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

// Modified: 2026-10-25 (chance). Group visible names by Latin/pinyin initial;
// numeric and other names retain dedicated groups after A-Z.
const nameCollator=new Intl.Collator('zh-Hans-CN-u-co-pinyin',{numeric:true,sensitivity:'base'});
const initialBoundaries=[['A','阿'],['B','八'],['C','擦'],['D','搭'],['E','蛾'],['F','发'],['G','噶'],['H','哈'],['J','击'],['K','喀'],['L','垃'],['M','妈'],['N','拿'],['O','哦'],['P','啪'],['Q','期'],['R','然'],['S','撒'],['T','塌'],['W','挖'],['X','昔'],['Y','压'],['Z','匝']];
function rowName(row){return (row.qx ?? row.surge)?.name || row.key;}
function rowInitial(row){
  const first=rowName(row).trim().replace(/^[^\p{L}\p{N}]+/u,'').charAt(0);
  if(/[a-z]/i.test(first))return first.toUpperCase();
  if(/[0-9]/.test(first))return '0–9';
  if(/\p{Script=Han}/u.test(first)) {
    for(const [letter,boundary] of [...initialBoundaries].reverse())if(nameCollator.compare(first,boundary)>=0)return letter;
  }
  return '其他';
}
function alphabetTables(category,rows,level=4){
  const groups=new Map();
  for(const row of rows){const letter=rowInitial(row);if(!groups.has(letter))groups.set(letter,[]);groups.get(letter).push(row);}
  return [...groups].sort(([a],[b])=>{
    const rank=x=>/^[A-Z]$/.test(x)?x.charCodeAt(0):x==='0–9'?100:101;
    return rank(a)-rank(b);
  }).map(([letter,items])=>renderTable(category,items.sort((a,b)=>nameCollator.compare(rowName(a),rowName(b))||a.key.localeCompare(b.key)),letter,level)).join('\n\n');
}
// README grouping only: preserve the actual policies and install descriptors.
function ruleGroup(row){
  const actions=new Set();
  for(const line of (row.qx?.text || row.surge?.text || '').split('\n')){
    if(!line.trim() || /^[#;]/.test(line.trim()) || line.startsWith('//'))continue;
    const action=line.match(/,\s*(direct|proxy|reject(?:-[a-z0-9]+)?)\s*$/i)?.[1]?.toLowerCase();
    if(action)actions.add(action.startsWith('reject')?'reject':action);
  }
  if(actions.size===1 && actions.has('reject'))return 'Reject';
  if(actions.has('proxy'))return 'Proxy';
  if(actions.size===1 && actions.has('direct'))return 'Direct';
  if(/(?:^|_)(?:direct|cn)(?:_|$)/i.test(row.key))return 'Direct';
  if(/(?:adblock|reject)/i.test(row.key))return 'Reject';
  return 'Proxy';
}

export async function buildReadmePlan(root=process.cwd()) {
  const sections = [];
  for (const category of README_CATEGORY_ORDER) {
    const rows = await scanCategory(root, category);
    if(category==='Adblock' && rows.length) {
      const groups=new Map();
      for(const row of rows) {
        const author=adblockSource(row);
        if(!groups.has(author))groups.set(author,[]);
        groups.get(author).push(row);
      }
      sections.push('## Adblock\n\n按拉取来源分组，点击展开；各来源内部按名称 A–Z 分栏，中文按拼音首字母，数字单列。\n\n'+[...groups].map(([author,items])=>'<details>\n<summary><strong>'+escapeHtml(author)+'</strong> · '+items.length+' 项</summary>\n\n'+alphabetTables(category,items)+'\n\n</details>').join('\n\n'));
    } else if(category==='Module')sections.push('## Module\n\n'+alphabetTables(category,rows,3));
    else if(category==='Rule')sections.push('## Rule\n\n按 Reject → Proxy → Direct 排列；混合策略资源列在 Proxy，导入时保留文件中的逐条策略。\n\n'+['Reject','Proxy','Direct'].map(group=>renderTable(category,rows.filter(row=>ruleGroup(row)===group).sort((a,b)=>nameCollator.compare(rowName(a),rowName(b))),group,3)).join('\n\n'));
    else sections.push(renderTable(category, rows));
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

// Shared machine evidence for existing validation commands. Successful outputs
// remain counts; mismatches retain bounded actual/expected excerpts and hashes.
export async function writeValidationEvidence(checked,findings,coverage={}) {
  const file=process.env.WAYX_CHECK_REPORT;
  if(!file)return;
  await fs.mkdir(path.dirname(file),{recursive:true});
  await fs.writeFile(file,JSON.stringify({version:1,checked,findings,coverage},null,2)+'\n');
}

export async function recordOutputMismatch(file,expected,actual,plugin=null) {
  const finding=outputMismatch(file,expected,actual,plugin);
  const report=process.env.WAYX_CHECK_REPORT;
  if(!finding||!report)return finding;
  const dir=path.join(path.dirname(report),'output-differences');
  await fs.mkdir(dir,{recursive:true});
  const key=crypto.createHash('sha256').update(file).digest('hex').slice(0,16);
  const want=path.join(dir,key+'.expected'),got=path.join(dir,key+'.actual'),patch=path.join(dir,key+'.patch');
  await fs.writeFile(want,artifactContent(expected)??'');
  await fs.writeFile(got,artifactContent(actual)??'');
  const diff=spawnSync('git',['diff','--no-index','--no-color','--',want,got],{encoding:'utf8',maxBuffer:16*1024*1024});
  if(diff.error||![0,1].includes(diff.status))throw new Error('Cannot record output difference: '+(diff.error?.message||diff.stderr));
  await fs.writeFile(patch,diff.stdout);
  finding.evidence={expected:path.relative(process.cwd(),want),actual:path.relative(process.cwd(),got),patch:path.relative(process.cwd(),patch)};
  return finding;
}

export function validationArtifactDigest(value) {
  const text=artifactContent(value);
  return text==null?null:crypto.createHash('sha256').update(text).digest('hex');
}

export function outputMismatch(file,expected,actual,plugin=null) {
  const want=artifactContent(expected),got=artifactContent(actual);
  if(want===got)return null;
  const a=String(want??'').split('\n'),b=String(got??'').split('\n');
  let first=0;while(first<Math.min(a.length,b.length)&&a[first]===b[first])first++;
  const digest=validationArtifactDigest;
  return {code:'output-mismatch',file,plugin,line:first+1,expectedHash:digest(want),actualHash:digest(got),
    expected:want==null?'(absent)':a.slice(Math.max(0,first-1),first+3).join('\n').slice(0,2000),
    actual:got==null?'(absent)':b.slice(Math.max(0,first-1),first+3).join('\n').slice(0,2000)};
}

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
