import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

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
    const re=/https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/(script\/[A-Za-z0-9%._~!$&'()*+,;=:@\/-]+\.js)/g;
    for(const m of text.matchAll(re)){
      const rel=decodeURIComponent(m[1]);
      assert.ok(rel.startsWith('script/') && !rel.split('/').includes('..'), 'unsafe generated helper path: '+rel);
      refs.push({file:path.relative(ROOT,file),rel});
      try { await fs.access(path.join(ROOT,rel)); }
      catch { missing.push({file:path.relative(ROOT,file),rel}); }
    }
  }
}

assert.deepEqual(missing,[], 'target output references missing WayX script files:\n'+JSON.stringify(missing,null,2));
console.log(`Generated/local script reference check passed: refs=${refs.length}`);
