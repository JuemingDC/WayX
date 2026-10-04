// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / artifacts / Regression Suite

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { loadLoonSourceCatalog, qxTargetPath, surgeTargetPath, discoverSourceScriptUrls } from "../src/index.mjs";

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
    const re=/https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/(Script\/[A-Za-z0-9%._~!$&'()*+,;=:@\/-]+\.js)/g;
    for(const m of text.matchAll(re)){
      const rel=decodeURIComponent(m[1]);
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

for(const entry of catalog){
  const source=await fs.readFile(path.join(ROOT,'Resource','Loon',entry.file),'utf8');
  const qx=await fs.readFile(path.join(ROOT,qxTargetPath(entry)),'utf8');
  const surge=await fs.readFile(path.join(ROOT,surgeTargetPath(entry)),'utf8');

  for(const ref of discoverSourceScriptUrls(source)){
    let url;
    try { url=new URL(ref); }
    catch { continue; } // relative refs are covered by resolveOriginalUrl unit tests.
    if (!['http:','https:'].includes(url.protocol)) continue;

    if(!qx.includes(ref)) failures.push({plugin:entry.id,target:'qx',sourceScript:ref});
    if(!surge.includes(ref)) failures.push({plugin:entry.id,target:'surge',sourceScript:ref});

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
