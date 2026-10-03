// Manifest-scoped conversion policy CLI; delegates all syntax to target validators.
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Validation / CLI
import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {validateQX} from "../src/output.mjs";
import {validateSurgeModule} from "../src/output.mjs";
import {validateConversionMetadata} from "../src/output.mjs";
import {loadLoonSourceCatalog} from "../src/input.mjs";

const manifest=await loadLoonSourceCatalog('.github/sources/loon.json');
const targets=manifest.flatMap(entry=>[
 {entry,target:'qx',file:'Adblock/Quantumult X/'+entry.qx},
 {entry,target:'surge',file:'Adblock/Surge/'+entry.surge},
]);
const changed=new Set([
 ...execFileSync('git',['diff','--name-only','HEAD'],{encoding:'utf8'}).trim().split('\n'),
 ...execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n'),
]);
const selected=process.argv.includes('--all') ? targets : targets.filter(({file})=>changed.has(file));
const errors=[];
for(const {entry,target,file} of selected){
 try{
  const text=await fs.readFile(file,'utf8');
  validateConversionMetadata(text,entry,target);
  if(target==='qx')validateQX(text,entry);
  else validateSurgeModule(text,entry);
 }catch(error){errors.push(file+': '+String(error.message||error));}
}
if(errors.length){
 for(const error of errors)console.error('ERROR: '+error);
 process.exitCode=1;
}else console.log('Conversion policy validation passed for '+selected.length+' generated target(s).');
