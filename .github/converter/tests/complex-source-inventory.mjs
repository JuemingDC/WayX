import { isRewriteV2, parseRewriteV2, validateRewriteV2Ast } from '../src/rewrite.mjs';
import { classifyComplexRewrite } from '../src/complex-rewrite.mjs';

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT=process.cwd();
const manifest=JSON.parse(await fs.readFile(path.join(ROOT,'.github/sources/loon.json'),'utf8'));
const found=[];

function activeRewriteLines(text){
  const out=[];
  let section=null;
  for(const raw of String(text).replace(/\r\n?/g,'\n').split('\n')){
    const trimmed=raw.trim();
    const header=trimmed.match(/^\[([^\]]+)\]$/);
    if(header){ section=header[1]; continue; }
    if(section!=='Rewrite' || !trimmed || /^(?:#|;|\/\/)/.test(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

for(const entry of manifest){
  const source=await fs.readFile(path.join(ROOT,'Resource/Loon',entry.file),'utf8');
  for(const line of activeRewriteLines(source)){
    if(!isRewriteV2(line)) continue;
    const ast=parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    if(ast.actions.length<2) continue;
    const classified=classifyComplexRewrite(ast);
    found.push({
      file:entry.file,
      actions:ast.actions.map(action=>action.name),
      families:classified.ok ? classified.families : [],
      rendererClassified:classified.ok,
      reason:classified.reason || null,
    });
  }
}

assert.ok(found.length>0,'expected at least one source-authored multi-action Rewrite pipeline');
console.log('Generic complex Rewrite source coverage:');
for(const item of found) console.log(
  '- '+item.file+': '+item.actions.join(' | ')+' ['+(item.rendererClassified ? item.families.join(',') : 'planner-review: '+item.reason)+']'
);
