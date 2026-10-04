// Author: chance
// Category: Converter / Experimental Rewrite and Author Script Composition
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {materializeConversionContext} from '../src/conversion.mjs';
import {groupSourceSectionItems,cleanSourceComments,selectOriginalFetchProfile} from '../src/input.mjs';
import {parseScriptDeclaration,scriptOption,scriptIrTag,rewriteV2PluginArgumentRefs} from '../src/script.mjs';
import {parseRewriteV2,isRewriteV2,supportsRewritePhaseActions} from '../src/rewrite.mjs';
import {renderRewriteAuthorComposition} from '../src/runtime.mjs';

// This entry point produces a reviewable experiment. It is intentionally not
// invoked by canonical sync: engine/global/API assumptions need per-script QA.
export function compileAuthorComposition(context,{target,stamp=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'})}={}) {
  if(!['qx','surge'].includes(target))throw new Error('target must be qx or surge');
  const {parsed,scriptMap}=context,rewrites=[],authors=[];
  const notes=[];
  for(const item of groupSourceSectionItems(parsed.sections.get('Rewrite')||[])) {
    notes.push(...cleanSourceComments(item.comments));
    if(!item.line)continue;
    if(!isRewriteV2(item.line))throw new Error('experimental entry requires v2 Rewrite declarations; legacy paths are unchanged');
    const ast=parseRewriteV2(item.line);
    if(!supportsRewritePhaseActions(ast,target))throw new Error('Rewrite/JQ action outside experimental synchronous subset');
    if(rewriteV2PluginArgumentRefs(ast,[]).all.length)throw new Error('experimental Rewrite plugin argument transport is unsupported');
    rewrites.push(ast);notes.push('# Source Rewrite: '+item.line);
  }
  for(const item of groupSourceSectionItems(parsed.sections.get('Script')||[])) {
    notes.push(...cleanSourceComments(item.comments));
    if(!item.line)continue;
    const ir=parseScriptDeclaration(item.line);
    if(!ir || !['request','response'].includes(ir.phase))throw new Error('experimental entry requires HTTP Scripts only');
    const value=name=>scriptOption(ir,name);
    if(ir.sourceSyntax==='v2' && ['enable','timeout','debug'].some(name=>value(name)?.type==='variable'))throw new Error('dynamic Script options remain on the old conversion path');
    const legacy=ir.sourcePayload;
    if(ir.sourceSyntax==='legacy' && [legacy.enable,legacy.timeout,legacy.debug].some(v=>v&&/\{/.test(v)))throw new Error('dynamic legacy options remain on the old conversion path');
    const disabled=ir.sourceSyntax==='v2'?value('enable')?.value===false:/^(false|0)$/i.test(legacy.enable||'');
    if(disabled && target==='surge')continue;
    const record=scriptMap.get(ir.script.path);
    if(!record?.source || record.sourceError)throw new Error('author source unavailable: '+ir.script.path+'; '+(record?.sourceError||'not materialized'));
    const condition=ir.sourceSyntax==='legacy'?{type:'comparison',operator:'~=',left:{type:'variable',name:'url'},right:{type:'regex',pattern:ir.pattern,flags:''},capture:null}:ir.condition;
    let argument;
    if(target==='surge') {
      const node=ir.script.argument;
      if(ir.sourceSyntax==='v2' && ['string','raw-string'].includes(node?.type))argument=node.value;
      else if(ir.sourceSyntax==='legacy' && legacy.argument && !/^\[?\{[A-Za-z_]/.test(legacy.argument)) {argument=legacy.argument;try{if(/^"/.test(argument))argument=JSON.parse(argument)}catch{}}
    }
    authors.push({argument,phase:ir.phase,condition,source:record.source,url:record[target]||ir.script.path,name:scriptIrTag(ir),
      requiresBody:ir.sourceSyntax==='v2'?value('requires_body')?.value===true:legacy.requiresBody,
      binaryBodyMode:ir.sourceSyntax==='v2'?value('binary_body_mode')?.value===true:legacy.binaryBodyMode,
      timeout:ir.sourceSyntax==='v2'?value('timeout')?.value||20:Number(legacy.timeout||10)});
    notes.push('# Source Script: '+item.line);
  }
  const plans=new Map();
  for(const phase of ['request','response']) {
    const group=rewrites.filter(x=>x.phase===phase),scripts=authors.filter(x=>x.phase===phase);
    if(!group.length && !scripts.length)continue;
    if(!group.length || !scripts.length)throw new Error('each experimental phase must contain Rewrite and author Script');
    const plan=renderRewriteAuthorComposition(group,scripts,{target,stamp,category:'Experimental / Rewrite and Author Script'});
    new Function(plan.script); // Compile-check the original body inside its final lexical wrapper.
    plans.set(phase,plan);
  }
  if(!plans.size)throw new Error('no mixed HTTP phase found');
  return {plans,notes};
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [sourcePath,sourceUrl,outDir,scriptBaseUrl]=process.argv.slice(2);
  if(!sourcePath||!sourceUrl||!outDir||!/^https?:\/\//.test(scriptBaseUrl||''))throw new Error('usage: node try-author-composition.mjs SOURCE.lpx ORIGINAL_URL OUTPUT_DIR OUTPUT_SCRIPT_BASE_URL');
  const source=await fs.readFile(sourcePath,'utf8');
  const fetchBytes=async url=>{
    const profile=selectOriginalFetchProfile(url);
    const {stdout}=await promisify(execFile)('python3',[fileURLToPath(new URL('./fetch-upstream.py',import.meta.url)),'--url',url,'--user-agent',profile.userAgent,'--accept',profile.accept,'--timeout-seconds','20'],{encoding:'buffer',maxBuffer:64*1024*1024});
    return stdout;
  };
  const context=await materializeConversionContext({source:sourceUrl},source,{fetchBytes,fetchText:async url=>(await fetchBytes(url)).toString('utf8')});
  await fs.mkdir(outDir,{recursive:true});
  const stamp=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
  for(const target of ['qx','surge']) {
    const {plans,notes}=compileAuthorComposition(context,{target,stamp});
    const configuration=['# Experimental composition','# Converted: '+stamp,'# Converted by: chance','# Category: Experimental / Rewrite and Author Script',...notes,target==='qx'?'# [rewrite_local]':'[Script]'];
    for(const [phase,plan] of plans) {
      const filename='composition_'+target+'_'+phase+'.js';
      await fs.writeFile(path.join(outDir,filename),plan.script);
      const scriptUrl=scriptBaseUrl.replace(/\/$/,'')+'/'+filename;
      configuration.push(target==='qx'?plan.pattern+' url '+plan.qxAction+' '+scriptUrl:'wayx_'+phase+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+scriptUrl+',timeout='+plan.timeout+(plan.requiresBody?',requires-body=true,max-size=-1':''));
    }
    await fs.writeFile(path.join(outDir,target==='qx'?'composition.snippet':'composition.sgmodule'),configuration.join('\n')+'\n');
  }
  console.log('Experimental scripts and declarations generated; canonical sync was not changed.');
}
