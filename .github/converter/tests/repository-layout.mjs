// Repository root/workflow-domain layout contract
// Author: chance
// Category: Workflow / Repository Layout

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const allowedRoot=new Set(['.git','.github','Adblock','Resource','boxjs','module','rule','script']);
const rootEntries=await fs.readdir(ROOT);
const unexpected=rootEntries.filter(name=>!allowedRoot.has(name)).sort();
assert.deepEqual(
  unexpected,
  [],
  'repository root must contain only .github and conversion-content directories: '+unexpected.join(', '),
);

for(const rel of ['converter','docs','monitor','upstream','CONVERSION_SPEC.md','PROJECT_STATUS.md','README.md','.gitignore']){
  await assert.rejects(
    fs.stat(path.join(ROOT,rel)),
    {code:'ENOENT'},
    'workflow/spec path must not return to repository root: '+rel,
  );
}

for(const rel of [
  '.github/converter',
  '.github/docs/conversion-spec',
  '.github/monitor',
  '.github/CONVERSION_SPEC.md',
  '.github/PROJECT_STATUS.md',
  '.github/README.md',
  '.github/scripts',
  '.github/sources/loon.json',
  '.github/manual-assets.json',
  '.github/workflows',
]){
  const stat=await fs.stat(path.join(ROOT,rel));
  assert.ok(stat, 'required workflow-domain path missing: '+rel);
}

const executableRoots=[
  '.github/workflows',
  '.github/scripts',
  '.github/converter/src',
  '.github/converter/tests',
  '.github/converter/tools',
  '.github/monitor',
];

async function walk(rel){
  const dir=path.join(ROOT,rel);
  const out=[];
  for(const ent of await fs.readdir(dir,{withFileTypes:true})){
    if(ent.name.startsWith('.')) continue;
    const child=path.join(rel,ent.name);
    if(ent.isDirectory()) out.push(...await walk(child));
    else if(/\.(?:mjs|js|py|ya?ml|json)$/.test(ent.name)) out.push(child);
  }
  return out;
}

const stale=[];
for(const root of executableRoots){
  for(const rel of await walk(root)){
    const text=await fs.readFile(path.join(ROOT,rel),'utf8');
    const checks=[
      {re:/(?<!\.github\/)converter\//g,label:'root converter/'},
      {re:/(?<!\.github\/)monitor\//g,label:'root monitor/'},
      {re:/(?<!\.github\/)docs\/conversion-spec\//g,label:'root docs/conversion-spec/'},
    ];
    for(const {re,label} of checks){
      if(re.test(text)) stale.push(rel+': '+label);
      re.lastIndex=0;
    }
  }
}

assert.deepEqual(stale,[], 'stale pre-migration workflow paths detected:\n'+stale.join('\n'));
console.log('Repository workflow-domain layout contract passed');
