// Managed source/target/helper artifact I/O for WayX converter workflows.
// Author: chance
// Category: Converter / Managed Artifact I/O

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { normalizePluginSource } from './plugin-parser.mjs';
import { qxTargetPath, surgeTargetPath } from './paths.mjs';

const GENERATED_HELPER_FILENAME_RE=/^(?:mock|header|complex_qx|mock_file|json_add_qx|redirect|reject|complex_surge|request_mock|json_mutation_surge|legacy_header|legacy_json_add_(?:qx|surge)|legacy_mock|legacy_request_mock)_[0-9a-f]{10}\.js$/;

export function isWayxGeneratedHelperFilename(name) {
  return GENERATED_HELPER_FILENAME_RE.test(String(name ?? ''));
}

async function staleGeneratedHelpers(root, entry, generatedScripts, {scriptDir='script'}={}) {
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

export async function generatedScriptDiffs(root, entry, generatedScripts, {scriptDir='script'}={}) {
  const diffs=[];
  for (const [name,content] of generatedScripts) {
    const file=path.join(root,scriptDir,entry.id,name);
    if (await readManagedTextIfExists(file) !== content) diffs.push(name);
  }
  for (const name of await staleGeneratedHelpers(root,entry,generatedScripts,{scriptDir})) {
    diffs.push('delete:'+name);
  }
  return diffs;
}

export async function syncGeneratedScripts(root, entry, generatedScripts, {scriptDir='script'}={}) {
  const changed=[];
  for (const [name,content] of generatedScripts) {
    const file=path.join(root,scriptDir,entry.id,name);
    if (await readManagedTextIfExists(file) === content) continue;
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

export async function writeManagedTargets(state, out) {
  const changed=[];
  if (state.qx !== out.qx) {
    await fs.mkdir(path.dirname(state.qxPath),{recursive:true});
    await fs.writeFile(state.qxPath,out.qx);
    changed.push('qx');
  }
  if (state.surge !== out.surge) {
    await fs.mkdir(path.dirname(state.surgePath),{recursive:true});
    await fs.writeFile(state.surgePath,out.surge);
    changed.push('surge');
  }
  return changed;
}
