// Managed conversion cleanliness gate.
// Author: chance
// Category: Converter / Full Catalog Validation
import fs from 'node:fs/promises';
import path from 'node:path';
import { loadLoonSourceCatalog } from "../src/input.mjs";
import { buildReadmePlan } from "../src/workflow.mjs";

const ROOT=process.cwd();
const manifest=await loadLoonSourceCatalog(path.join(ROOT,'.github/sources/loon.json'));
const findings=[];
const kelee=manifest.filter(entry=>/https:\/\/kelee\.one\/Tool\/Loon\/Lpx\//.test(entry.source));

async function readRequired(rel,label){
  try {
    return await fs.readFile(path.join(ROOT,rel),'utf8');
  } catch (error) {
    findings.push(`${label} missing: ${rel} (${error?.code||error})`);
    return null;
  }
}

for(const entry of manifest){
  const sourceRel='Resource/Loon/'+entry.file;
  const qxRel='Adblock/Quantumult X/'+entry.qx;
  const surgeRel='Adblock/Surge/'+entry.surge;
  const [source,qx,surge]=await Promise.all([
    readRequired(sourceRel,entry.id+' source'),
    readRequired(qxRel,entry.id+' QX'),
    readRequired(surgeRel,entry.id+' Surge'),
  ]);
  if(source && !/^#!name\s*=\s*\S/m.test(source)) findings.push(entry.id+': source lost #!name metadata');
  for(const [target,rel,text] of [['QX',qxRel,qx],['Surge',surgeRel,surge]]){
    if(!text) continue;
    if(/REVIEW REQUIRED|ISSUE REQUIRED/.test(text)) findings.push(entry.id+` ${target}: unresolved Review/Issue marker in ${rel}`);
    if(/\[object Object\]|(?:^|[^A-Za-z])undefined(?:[^A-Za-z]|$)/.test(text)) findings.push(entry.id+` ${target}: accidental serialized runtime token in ${rel}`);
    if(!text.includes('# Source: '+entry.source)) findings.push(entry.id+` ${target}: source attribution mismatch in ${rel}`);
  }
}

// Discovery prunes retired managed artifacts before conversion; enforce that
// historical leftovers cannot silently remain in the published repository.
for(const [base,field,suffix] of [['Resource/Loon','file','.lpx'],['Adblock/Quantumult X','qx','.snippet'],['Adblock/Surge','surge','.sgmodule']]){
  const expected=new Set(manifest.map(entry=>entry[field]));
  for(const rel of await fs.readdir(path.join(ROOT,base),{recursive:true})){
    if(!rel.endsWith(suffix)||expected.has(rel))continue;
    const text=await fs.readFile(path.join(ROOT,base,rel),'utf8');
    if(field==='file'||/^# Converted by:\s*chance\s*$/m.test(text)) findings.push('Retired managed artifact remains: '+base+'/'+rel);
  }
}
const activeIds=new Set(manifest.map(entry=>entry.id));
for(const rel of await fs.readdir(path.join(ROOT,'Script'),{recursive:true})){
  if(activeIds.has(rel.split(path.sep)[0])||!/[a-z_]+_[0-9a-f]{10}\.js$/.test(rel))continue;
  if((await fs.readFile(path.join(ROOT,'Script',rel),'utf8')).includes('// Converted by: chance')) findings.push('Retired generated helper remains: Script/'+rel);
}

let snapshot=null;
try {
  snapshot=JSON.parse(await fs.readFile(path.join(ROOT,'.github/monitor/.runtime/kelee-catalog.json'),'utf8'));
} catch(error) {
  if(error?.code!=='ENOENT') findings.push('Kelee runtime snapshot unreadable: '+(error?.message||error));
}
if(snapshot){
  const expected=(snapshot.plugins||[]).map(item=>item.source);
  const actual=kelee.map(entry=>entry.source);
  if(JSON.stringify(expected)!==JSON.stringify(actual)){
    findings.push('Kelee manifest order differs from plugin-center list order');
  }
  if(Number(snapshot.count)!==actual.length){
    findings.push(`Kelee snapshot count mismatch: snapshot=${snapshot.count} manifest=${actual.length}`);
  }
}

const readme=await readRequired('README.md','README');
if(readme){
  const expected=(await buildReadmePlan(ROOT)).get('README.md');
  if(readme!==expected)findings.push('README source groups, collapsed sections or within-source catalog order differ from generated index');
  for(const entry of kelee){
    const marker='Adblock/Quantumult%20X/'+encodeURIComponent(entry.qx).replace(/%2F/g,'/');
    let index=readme.indexOf(marker);
    if(index<0){
      // GitHub blob links percent-encode the directory space, while filenames can
      // contain Unicode/space encodings. Fall back to the encoded filename.
      index=readme.indexOf(encodeURIComponent(entry.qx));
    }
    if(index<0){
      findings.push(entry.id+': README missing QX Adblock row for '+entry.qx);
      continue;
    }
  }
}

if(findings.length){
  console.error('Managed conversion cleanliness gate failed with '+findings.length+' finding(s):');
  for(const finding of findings) console.error('- '+finding);
  process.exitCode=1;
}else{
  console.log(`Managed conversion cleanliness gate passed: catalog=${manifest.length}, Kelee=${kelee.length}, unresolved Review/Issue=0, README order preserved.`);
}
