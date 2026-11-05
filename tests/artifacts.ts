// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript tests layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / artifacts / Regression Suite

import assert from "node:assert/strict";
import {scriptReferences} from "../src/parser/backup-references.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { loadLoonSourceCatalog, qxTargetPath, surgeTargetPath, discoverSourceScriptUrls } from "../src/index.ts";

import { spawnSync as runIsolatedCase } from 'node:child_process';
import { fileURLToPath as isolatedSuitePath } from 'node:url';
const suiteCases=["generated-helper-refs.mjs","source-script-url-preservation.mjs"];
const selectedCase=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if (selectedCase && !suiteCases.includes(selectedCase)) throw new Error('Unknown suite case: '+selectedCase);
if (!selectedCase) {
  for (const name of suiteCases) {
    const child=runIsolatedCase(process.execPath,[isolatedSuitePath(import.meta.url),'--case='+name],{stdio:'inherit'});
    if (child.error) throw child.error;
    if (child.status!==0) process.exit(child.status ?? 1);
  }
}

if (selectedCase === "generated-helper-refs.mjs") {
// Suite case: generated-helper-refs.mjs
const ROOT=process.cwd();
const TARGETS=[
  path.join(ROOT,'Adblock','Quantumult X'),
  path.join(ROOT,'Adblock','Surge'),
];
const RAW_PREFIX='https://raw.githubusercontent.com/JuemingDC/WayX/main/';

async function walk(dir){
  const out=[];
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory()) out.push(...await walk(p));
    else out.push(p);
  }
  return out;
}

const missing=[];
const refs=[];
for(const root of TARGETS){
  for(const file of await walk(root)){
    if(!/\.(?:snippet|sgmodule)$/i.test(file)) continue;
    const text=await fs.readFile(file,'utf8');
    // Modified: 2026-11-02 (chance). Source names may end in .json or have no
    // extension; inspect actual script operands instead of truncating at .js.
    for(const operand of scriptReferences(text)){
      if(!operand.value.startsWith(RAW_PREFIX+'Script/'))continue;
      const rel=decodeURIComponent(new URL(operand.value).pathname.slice(new URL(RAW_PREFIX).pathname.length));
      assert.ok(rel.startsWith('Script/') && !rel.split('/').includes('..'), 'unsafe generated helper path: '+rel);
      refs.push({file:path.relative(ROOT,file),rel});
      try { await fs.access(path.join(ROOT,rel)); }
      catch { missing.push({file:path.relative(ROOT,file),rel}); }
    }
  }
}

assert.deepEqual(missing,[], 'target output references missing WayX script files:\n'+JSON.stringify(missing,null,2));
console.log(`Generated/local script reference check passed: refs=${refs.length}`);
}


if (selectedCase === "source-script-url-preservation.mjs") {
// Suite case: source-script-url-preservation.mjs
const ROOT=process.cwd();
const catalog=await loadLoonSourceCatalog(path.join(ROOT,'.github','sources','loon.json'));
const failures=[];
// Modified: 2026-11-01 (chance). Source identity survives verified backup/API
// rebinding; require the exact bound operand, source provenance and byte audit.
const backupIndex=JSON.parse(await fs.readFile(path.join(ROOT,'Resource/Backup/index.json'),'utf8'));
const {validateSourceBackups}=await import('../src/validation/backups.ts');
assert.deepEqual(await validateSourceBackups(ROOT),[]);
const rawBase='https://raw.githubusercontent.com/JuemingDC/WayX/main/';
function preservesReference(text, ref, artifact) {
  if(text.includes(ref)) return true;
  const source=new URL(ref), fragment=source.hash; source.hash='';
  const url=source.href;
  const bound=(backupIndex.bindings?.[artifact]?.[ref] ?? backupIndex.bindings?.[artifact]?.[url])?.path;
  const validBound=bound && backupIndex.adapters?.[bound]?.sourceUrl===url;
  const archived=backupIndex.latest[url];
  const validArchive=archived && backupIndex.objects[archived]?.kind==='script' && backupIndex.objects[archived]?.url===url;
  return Boolean((validBound && text.includes(rawBase+bound.split("/").map(encodeURIComponent).join("/")+fragment)) ||
    (validArchive && text.includes(rawBase+archived.split("/").map(encodeURIComponent).join("/")+fragment)));
}

for(const entry of catalog){
  const source=await fs.readFile(path.join(ROOT,'Resource','Loon',entry.file),'utf8');
  const qx=await fs.readFile(path.join(ROOT,qxTargetPath(entry)),'utf8');
  const surge=await fs.readFile(path.join(ROOT,surgeTargetPath(entry)),'utf8');

  for(const ref of discoverSourceScriptUrls(source)){
    let url;
    try { url=new URL(ref); }
    catch { continue; } // relative refs are covered by resolveOriginalUrl unit tests.
    if (!['http:','https:'].includes(url.protocol)) continue;

    if(!preservesReference(qx,ref,qxTargetPath(entry))) failures.push({plugin:entry.id,target:'qx',sourceScript:ref});
    if(!preservesReference(surge,ref,surgeTargetPath(entry))) failures.push({plugin:entry.id,target:'surge',sourceScript:ref});

    const basename=decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1)||'');
    if(basename){
      const localMirror=`https://raw.githubusercontent.com/JuemingDC/WayX/main/Script/${entry.id}/${basename}`;
      if(qx.includes(localMirror)) failures.push({plugin:entry.id,target:'qx',mirror:localMirror});
      if(surge.includes(localMirror)) failures.push({plugin:entry.id,target:'surge',mirror:localMirror});
    }
  }
}

assert.deepEqual(failures,[], 'Source Script URL preservation failed:\n'+JSON.stringify(failures,null,2));
console.log('Source Script URL preservation passed');
}
