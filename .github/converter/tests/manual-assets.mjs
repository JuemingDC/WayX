import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLoonSourceCatalog } from '../src/source-catalog.mjs';
import { qxTargetPath, surgeTargetPath } from '../src/managed-artifacts.mjs';

const ROOT=process.cwd();
const catalog=await loadLoonSourceCatalog(path.join(ROOT,'.github/sources/loon.json'));
const manual=JSON.parse(await fs.readFile(path.join(ROOT,'.github/manual-assets.json'),'utf8'));

assert.ok(Array.isArray(manual.assets) && manual.assets.length>0,'manual asset manifest must not be empty');

const catalogTargets=new Set();
for(const entry of catalog){
  catalogTargets.add(qxTargetPath(entry));
  catalogTargets.add(surgeTargetPath(entry));
}

for(const asset of manual.assets){
  assert.equal(asset.mode,'manual',asset.id+': mode must be manual');
  for(const key of ['qx','surge']){
    assert.ok(asset[key],asset.id+': missing '+key+' path');
    assert.equal(catalogTargets.has(asset[key]),false,asset.id+': manual asset must not overlap Source Catalog target '+asset[key]);
    const stat=await fs.stat(path.join(ROOT,asset[key]));
    assert.ok(stat.isFile() && stat.size>0,asset.id+': manual asset file missing '+asset[key]);
  }
}

const qzxy=manual.assets.find(asset=>asset.id==='QZXY');
assert.ok(qzxy,'QZXY must be explicitly declared as hand-maintained');
assert.equal(qzxy.qx,'Adblock/Quantumult X/QZXY.snippet');
assert.equal(qzxy.surge,'Adblock/Surge/QZXY.sgmodule');

console.log('Manual asset contract passed: '+manual.assets.map(asset=>asset.id).join(', '));
