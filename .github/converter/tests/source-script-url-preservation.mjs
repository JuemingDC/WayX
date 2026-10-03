import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
import { qxTargetPath, surgeTargetPath } from '../src/managed-artifacts.mjs';
import { discoverSourceScriptUrls } from '../src/source-script-materializer.mjs';

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
