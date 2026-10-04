// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / conversion

import crypto from "node:crypto";
import { renderRewritePhaseDispatcher } from "./runtime.mjs";
import { scriptIrTag, parseScriptDeclaration, isScriptV2, planQxScript, planSurgeScript, scriptOption, analyzePluginArgumentUsage, rewriteV2PluginArgumentRefs, surgeArgumentMetadata, surgeRewriteArgumentPayload } from "./script.mjs";
import { qxRule as canonicalQxRule, surgeModuleRule } from "./rule.mjs";
import { isRewriteV2, parseRewriteV2, validateRewriteV2Ast, classifyLegacyRewriteAction, isEmptyJsonJqIr, legacyRewriteToSemanticIr, rewriteV2AstToSemanticIr, inlineResolvedDependency, inlineResolvedLegacyJqPathIr, jqDependencySpecFromAction, legacyJqPathDependencySpecFromIr, planQxRewrite, planSurgeRewrite, rewriteReview, rewriteIssue, supportsRewritePhaseActions, simpleUrlRewriteCondition, jsonPipelineToSafeNativeJq } from "./rewrite.mjs";
import { groupSourceSectionItems, cleanSourceComments, isSupportedSourceSection, parseLoonPlugin, materializeRewriteDependencies, materializeSourceScripts, fetchOriginalText, fetchOriginalBytes } from "./input.mjs";
import { attachQxInlineNote, createQxOutputState, appendQxOutput, qxOutputDestination, qxRuleOutputDestination, qxRewriteOutputDestination, renderQxOutput, createSurgeOutputState, appendSurgeOutput, surgeOutputDestination, surgeRuleOutputDestination, surgeRewriteOutputDestination, renderSurgeOutput, validateQX, validateSurgeModule } from "./output.mjs";
import { parseConfigurationDeclaration, planConfiguration } from "./configuration.mjs";



// conversion-pipeline.mjs
// Pure Loon → Quantumult X / Surge conversion pipeline
// Author: chance
// Category: Converter / Pipeline

function splitPatternAction(line) {
  const idx=line.search(/\s/);
  if (idx<0) return [line.trim(),''];
  return [line.slice(0,idx).trim(),line.slice(idx).trim().replace(/^\-\s+/,'')];
}

function splitRuleInlineComment(line) {
  const source=String(line ?? '').trim();
  const match=source.match(/^([\s\S]*?\S)\s+\/\/\s*(.+)$/);
  if (!match) return {line:source,comment:null};
  return {
    line:match[1].trim(),
    comment:'# '+match[2].trim(),
  };
}

function rewriteErrorResult(line,error) {
  const reason=String(error?.message || error).split('\n')[0];
  if (error instanceof SyntaxError) return rewriteIssue(line,'unknown-rewrite-v2-syntax',reason);
  if (error?.code==='WAYX_REWRITE_V2_ACTION_INVALID' && /not present in the current official Loon Rewrite v2 registry/i.test(reason)) {
    return rewriteIssue(line,'unknown-rewrite-v2-action',reason);
  }
  if (error?.code==='WAYX_REWRITE_V2_CONDITION_INVALID' && /unsupported|unknown|must be a variable/i.test(reason)) {
    return rewriteIssue(line,'unknown-rewrite-v2-condition',reason);
  }
  return rewriteReview(line,reason);
}

// Normalize file actions before both target planning and phase eligibility.
// A dependency is tied to its absolute source action index, never shared as
// the old single-action object across a multi-action declaration.
function resolveRewriteJqDependencies(ast,line,ctx) {
  const actions=ast.actions.map((action,index)=>{
    const spec=jqDependencySpecFromAction(action,{pluginSourceUrl:ctx.sourceUrl});
    if(!spec)return action;
    const files=ctx.jqFiles?.get(line);
    if(files?.error)throw new Error(files.error);
    const materialized=files?.byAction ? (Object.prototype.hasOwnProperty.call(files.byAction,index)?files.byAction[index]:null) : ast.actions.length===1 ? files : null;
    if(!materialized)throw new Error('JQ dependency action '+index+' was not materialized during conversion');
    if(materialized.error)throw new Error(materialized.error);
    if(typeof materialized.content!=='string' || !materialized.content.trim())throw new Error('JQ dependency resolved to empty content');
    return inlineResolvedDependency(action,materialized.content,{pluginSourceUrl:ctx.sourceUrl}).action;
  });
  const result={...ast,actions};validateRewriteV2Ast(result);return result;
}

function rewriteV2Action(line,target,ctx) {
  if (!isRewriteV2(line)) return null;

  let ast;
  let argumentRefs={conditionRefs:[],actionRefs:[],all:[]};
  try {
    ast=parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    argumentRefs=rewriteV2PluginArgumentRefs(ast,ctx.argumentIds || []);
  } catch (error) {
    return rewriteErrorResult(line,error);
  }

  try {
    ast=resolveRewriteJqDependencies(ast,line,ctx);
  } catch (error) {
    return rewriteReview(line,String(error?.message || error).split('\n')[0]);
  }

  const ir=rewriteV2AstToSemanticIr(ast,{source:line});
  if (isEmptyJsonJqIr(ir)) return {section:'drop',reason:'empty-json-jq'};
  const planner=target==='qx' ? planQxRewrite : target==='surge' ? planSurgeRewrite : null;
  if (!planner) return rewriteIssue(line,'unknown-rewrite-target','unsupported Rewrite target planner: '+target);
  return planner(ir,{...ctx,sourceLine:line,argumentRefs:argumentRefs.all});
}

function planDisabledSurgeRewriteComments(comments,ctx) {
  const passthrough=[];
  const routed=[];

  for (const raw of comments || []) {
    const trimmed=String(raw ?? '').trim();
    const match=trimmed.match(/^#\s*((?:request|response)\s+if\b[\s\S]+)$/);
    if (!match || !isRewriteV2(match[1])) {
      passthrough.push(raw);
      continue;
    }

    const sourceLine=match[1].trim();
    const mapped=rewriteV2Action(sourceLine,'surge',{...ctx,featureCompatibilityPhases:new Set(['request','response'])});
    if (!mapped || mapped.section==='comment') {
      passthrough.push(raw);
      continue;
    }
    if (mapped.section==='drop') continue;

    const lines=mapped.lines || [mapped.line];
    routed.push({
      section:mapped.section,
      lines:[raw,...lines.map(line=>'# '+line)],
    });
  }

  return {passthrough,routed};
}

function prepareRewriteDispatchers(plugin,target,ctx) {
  const result=new Map();
  const items=groupSourceSectionItems(plugin.sections.get('Rewrite') || []).filter(x=>x.line);
  const candidates=[];
  const scripts=groupSourceSectionItems(plugin.sections.get('Script') || []).filter(x=>x.line);
  const legacy=items.some(x=>!isRewriteV2(x.line));
  // Keep native JSON/JQ declarations outside helper dispatchers. Original
  // Script/legacy owners also retain their existing phase contracts.
  const blockedV2=new Set();
  for(const item of items)if(isRewriteV2(item.line))try {
    const ast=resolveRewriteJqDependencies(parseRewriteV2(item.line),item.line,ctx);
    const nativeJson=ast.actions.length>1 && !ast.condition?.right?.flags && simpleUrlRewriteCondition(ast).ok && jsonPipelineToSafeNativeJq(ast).ok;
    if(nativeJson || ast.actions.every(a=>a.name===ast.phase+'.json.jq') || !supportsRewritePhaseActions(ast,target))blockedV2.add(ast.phase);
  }catch { /* Invalid declarations keep the ordinary diagnostic. */ }
  ctx.featureCompatibilityPhases=new Set(['request','response'].filter(phase=>legacy || blockedV2.has(phase) || scripts.some(x=>{try {const ir=parseScriptDeclaration(x.line);return ir?.phase===phase && (target==='qx' || !(scriptOption(ir,'enable')?.value===false));}catch{return false;}})));
  for (const item of items) {
    if (!isRewriteV2(item.line)) continue;
    try {
      const ast=resolveRewriteJqDependencies(parseRewriteV2(item.line),item.line,ctx);
      validateRewriteV2Ast(ast);
      const mapped=rewriteV2Action(item.line,target,ctx);
      if (mapped.section!=='comment' && mapped.section!=='drop') candidates.push({line:item.line,ast,mapped});
    } catch { /* The ordinary planner preserves the parse diagnostic. */ }
  }
  for (const phase of ['request','response']) {
    const group=candidates.filter(x=>x.ast.phase===phase);
    // A broad guarded helper must share one phase owner even when only one
    // source entry matches this phase. Include native mutations in its order.
    const helper=group.some(x=>/script-(?:request|response)-(?:header|body)|type=http-/.test(x.mapped.line || ''));
    if (!helper) continue;
    const external=ctx.featureCompatibilityPhases.has(phase);
    try {
      if (external || legacy) throw new Error('phase dispatcher cannot compose original remote Script or legacy Rewrite contracts; original URLs are preserved');
      if (group.length===1) continue;
      if(group.some(x=>!supportsRewritePhaseActions(x.ast,target)))throw new Error('phase dispatcher cannot compose native JQ/echo/URL/binary actions without a verified runtime adapter');
      const jqGroup=group.some(x=>x.ast.actions.some(a=>a.name.endsWith('.json.jq')));
      const jqMatchers=jqGroup ? group.map(x=>simpleUrlRewriteCondition(x.ast)) : [];
      if(jqGroup && (jqMatchers.some(m=>!m.ok) || new Set(jqMatchers.map(m=>m.pattern)).size!==1))throw new Error('mixed JQ dispatcher requires the same source URL regex for every member');
      const refs=[...new Set(group.flatMap(x=>rewriteV2PluginArgumentRefs(x.ast,ctx.argumentIds || []).all))];
      if (target==='qx' && refs.length) throw new Error('phase dispatcher argument transport is not verified: '+refs.join(', '));
      const payload=refs.length ? surgeRewriteArgumentPayload(refs,ctx.argumentTable) : {ok:true,value:null};
      if(!payload.ok)throw new Error(payload.reason);
      const plan=renderRewritePhaseDispatcher(group.map(x=>x.ast),{target,stamp:ctx.stamp,category:ctx.category,argumentTable:refs.length?ctx.argumentTable:null,mockFiles:ctx.mockFiles,jqFiles:ctx.jqFiles});
      if(jqGroup)plan.pattern=jqMatchers[0].pattern;
      const key=crypto.createHash('sha1').update(target+'\0'+group.map(x=>x.line).join('\n')).digest('hex').slice(0,10);
      const filename='phase_'+target+'_'+phase+'_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      const url=ctx.rawBase+'/Script/'+ctx.id+'/'+filename;
      const mapped=target==='qx' ? {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+url} :
        {section:'script',line:'wayx_phase_'+phase+'_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+url+(plan.requiresBody?',requires-body=true,max-size=-1':'')+(plan.fullHeaderMode?',full-header-mode=true':'')+(payload.value?',argument='+payload.value:'')};
      group.forEach((item,index)=>result.set(item.line,index===0?mapped:{section:'drop',reason:'phase-dispatcher-member'}));
    } catch (error) {
      for (const item of group) {
        // Preserve historical native contracts. A simple source URL prefilter
        // stays on the compatibility path; compound guards need a phase owner.
        if (/script-(?:request|response)-(?:header|body)|type=http-/.test(item.mapped.line || '')) {
          const ast=item.ast;
          const c=ast.condition;
          if (c?.type==='comparison' && c.left?.name==='url' && c.right?.type==='regex') {
            const pattern=String(c.right.pattern);
            const line=target==='qx' ? item.mapped.line.replace(/^(?:\^https\?:\/\/|\^) url /,pattern+' url ') : item.mapped.line.replace(/pattern=(?:\^https\?:\/\/|\^),/,'pattern='+pattern+',');
            result.set(item.line,{...item.mapped,line:'# [WayX] COMPATIBILITY LIMITATION: '+error.message+'; retained source URL prefilter is not a source-flag equivalence proof.\n'+line});
          } else result.set(item.line,rewriteReview(item.line,error.message));
        }
      }
    }
    // Discard replaced candidate helpers, keeping only artifacts referenced by
    // the final plan. The normal output builder handles other declarations.
    for (const item of group) if (result.has(item.line) && !(result.get(item.line).line || '').includes(item.mapped.line?.split('/').pop())) {
      for (const [filename] of ctx.generatedScripts) if ((item.mapped.line || '').includes('/'+filename)) ctx.generatedScripts.delete(filename);
    }
  }
  return result;
}

function sanitizeName(value) {
  return (value || 'script').replace(/[=,\r\n]/g,'_').trim().slice(0,64) || 'script';
}

export function convertPlugin(entry,source,{
  parsed=null,
  scriptMap=new Map(),
  stamp,
  mockFiles=new Map(),
  jqFiles=new Map(),
  rawBase='',
}={}) {
  if (!stamp) throw new Error('convertPlugin requires a conversion stamp');

  const plugin=parsed ?? parseLoonPlugin(source);
  const sourceHeader=plugin.header;
  const qx=createQxOutputState();
  const sg=createSurgeOutputState();

  for (const [sectionName,sectionLines] of plugin.sections) {
    if (isSupportedSourceSection(sectionName)) continue;
    const active=groupSourceSectionItems(sectionLines).filter(item=>item.line).map(item=>item.line);
    if (!active.length) continue;
    const reason='# [WayX] ISSUE REQUIRED [unknown-source-section]: unsupported Loon source section ['+sectionName+'] is outside the current ad-block conversion grammar';
    for (const line of active) {
      appendQxOutput(qx,'notes',reason,'# Source declaration: '+line);
      appendSurgeOutput(sg,'notes',reason,'# Source declaration: '+line);
    }
  }

  const argumentAnalysis=analyzePluginArgumentUsage({
    argumentLines:plugin.sections.get('Argument') || [],
    rewriteLines:plugin.sections.get('Rewrite') || [],
    scriptLines:plugin.sections.get('Script') || [],
    ruleLines:plugin.sections.get('Rule') || [],
  });
  const argumentIds=new Set(argumentAnalysis.declaredIds);
  const surgeArgumentPlan=surgeArgumentMetadata(plugin.sections.get('Argument') || [],{
    proxyPolicyBinding:argumentAnalysis.policyBindings.length>0,
  });
  const surgeArgumentTable=surgeArgumentPlan.table;
  const surgeProxyPolicyPlaceholder=surgeArgumentPlan.policyBinding?.placeholder || null;
  let surgeNeedsLineRequirement=false;

  const qctx={
    id:entry.id,
    generatedScripts:qx.generatedScripts,
    sourceUrl:entry.source,
    stamp,
    category:entry.category,
    mockFiles,
    jqFiles,
    argumentIds,
    argumentTable:surgeArgumentTable,
    rawBase,
  };
  const sctx={
    id:entry.id,
    generatedScripts:sg.generatedScripts,
    sourceUrl:entry.source,
    stamp,
    category:entry.category,
    mockFiles,
    jqFiles,
    argumentIds,
    argumentTable:surgeArgumentTable,
    rawBase,
  };

  if (argumentAnalysis.undeclaredRefs.length) {
    const refs=[...new Set(argumentAnalysis.undeclaredRefs.map(ref=>ref.id))].sort().join(', ');
    appendQxOutput(qx,'notes',`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
    appendSurgeOutput(sg,'notes',`# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`);
  }
  if (argumentAnalysis.policyBindings.length) {
    appendQxOutput(qx,'notes','# [WayX] Policy binding: source PROXY is preserved as literal QX policy name PROXY; a matching target policy must exist.');
  }

  const generalSectionLines=plugin.sections.get('General') || [];
  for (const item of groupSourceSectionItems(generalSectionLines)) {
    const comments=cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx,'notes').push(...comments);
      surgeOutputDestination(sg,'general').push(...comments);
      continue;
    }
    const ir=parseConfigurationDeclaration(item.line,{section:'General'});
    const qr=planConfiguration(ir,'qx');
    const sr=planConfiguration(ir,'surge');
    appendQxOutput(qx,qr.section,...comments,qr.line);
    appendSurgeOutput(sg,sr.section,...comments,sr.line);
  }

  const ruleSectionLines=plugin.sections.get('Rule') || [];
  for (const item of groupSourceSectionItems(ruleSectionLines)) {
    if (!item.line) {
      const comments=cleanSourceComments(item.comments);
      qxOutputDestination(qx,'filter').push(...comments);
      surgeOutputDestination(sg,'rule').push(...comments);
      continue;
    }

    const inline=splitRuleInlineComment(item.line);
    const effectiveItem=inline.comment
      ? {...item,line:inline.line,comments:[...item.comments,inline.comment]}
      : item;
    const comments=cleanSourceComments(effectiveItem.comments);

    const [misplacedPattern,misplacedAction]=splitPatternAction(inline.line);
    const misplacedOperation=misplacedAction ? classifyLegacyRewriteAction(misplacedAction) : null;
    if (misplacedOperation && misplacedOperation.kind!=='unknown') {
      const misplacedIr=legacyRewriteToSemanticIr(misplacedPattern,misplacedAction);
      const qr=planQxRewrite(misplacedIr,{...qctx,sourceLine:inline.line});
      const sr=planSurgeRewrite(misplacedIr,{...sctx,sourceLine:inline.line});
      qxRewriteOutputDestination(qx,qr.section).push(...comments,...(qr.lines || [qr.line]));
      surgeRewriteOutputDestination(sg,sr.section).push(...comments,...(sr.lines || [sr.line]));
      continue;
    }

    if (!inline.line.includes(',') && /^(?:\*\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i.test(inline.line)) {
      const note='# [WayX] Known source limitation: bare hostname is not a documented Loon Rule declaration, so no target policy is inferred.';
      qxOutputDestination(qx,'filter').push(...comments,note,'# Source declaration: '+inline.line);
      surgeOutputDestination(sg,'rule').push(...comments,note,'# Source declaration: '+inline.line);
      continue;
    }

    const qr=canonicalQxRule(inline.line);
    const qxRendered=attachQxInlineNote({
      sectionLines:ruleSectionLines,
      item:effectiveItem,
      sectionKind:'rule',
      lines:[qr.line],
      eligible:qr.kind==='filter' || qr.kind==='rewrite',
    });
    const qxRuleDest=qxRuleOutputDestination(qx,qr.kind);
    if (qr.kind==='filter' || qr.kind==='rewrite') qxRuleDest.push(...qxRendered.comments,...qxRendered.lines);
    else qxRuleDest.push(...comments,qr.line);

    const sr=surgeModuleRule(inline.line,{proxyPolicyPlaceholder:surgeProxyPolicyPlaceholder,matchingEnhancements:true});
    surgeRuleOutputDestination(sg,sr.section).push(...comments,...sr.lines);
  }

  const qxDispatchers=prepareRewriteDispatchers(plugin,'qx',qctx);
  const surgeDispatchers=prepareRewriteDispatchers(plugin,'surge',sctx);
  const rewriteSectionLines=plugin.sections.get('Rewrite') || [];
  for (const item of groupSourceSectionItems(rewriteSectionLines)) {
    const comments=cleanSourceComments(item.comments);
    const surgeCommentPlan=planDisabledSurgeRewriteComments(item.comments,sctx);
    const surgeComments=cleanSourceComments(surgeCommentPlan.passthrough);

    for (const routed of surgeCommentPlan.routed) {
      (surgeOutputDestination(sg,routed.section) || surgeOutputDestination(sg,'notes')).push(...routed.lines);
    }
    if (!item.line) continue;

    let qr=qxDispatchers.get(item.line) || rewriteV2Action(item.line,'qx',qctx);
    let sr=surgeDispatchers.get(item.line) || rewriteV2Action(item.line,'surge',sctx);
    if (!qr || !sr) {
      const [pattern,action]=splitPatternAction(item.line);
      let ir=legacyRewriteToSemanticIr(pattern,action);
      if (isEmptyJsonJqIr(ir)) {
        qr={section:'drop',reason:'empty-json-jq'};
        sr={section:'drop',reason:'empty-json-jq'};
      }
      const jqSpec=legacyJqPathDependencySpecFromIr(ir,{pluginSourceUrl:entry.source});
      if (jqSpec) {
        const materialized=jqFiles.get(item.line);
        if (!materialized || materialized.error) {
          const reason=materialized?.error || 'JQ dependency was not materialized during conversion';
          if (!qr) qr=rewriteReview(item.line,reason);
          if (!sr) sr=rewriteReview(item.line,reason);
        } else {
          ir=inlineResolvedLegacyJqPathIr(ir,materialized.content).ir;
        }
      }
      if (!qr) qr=planQxRewrite(ir,{...qctx,sourceLine:item.line});
      if (!sr) sr=planSurgeRewrite(ir,{...sctx,sourceLine:item.line});
    }

    const qdest=qxRewriteOutputDestination(qx,qr.section);
    if (qr.section==='drop') {
      qdest.push(...comments);
    } else if (qr.section==='rewrite') {
      const qxRendered=attachQxInlineNote({
        sectionLines:rewriteSectionLines,
        item,
        sectionKind:'rewrite',
        lines:qr.lines || [qr.line],
        eligible:qr.qxInlineNoteEligible!==false,
      });
      qdest.push(...qxRendered.comments,...qxRendered.lines);
    } else {
      qdest.push(...comments,...(qr.lines || [qr.line]));
    }

    const sdest=surgeRewriteOutputDestination(sg,sr.section);
    if (sr.section==='drop') sdest.push(...surgeComments);
    else sdest.push(...surgeComments,...(sr.lines || [sr.line]));
  }

  const scriptSectionLines=plugin.sections.get('Script') || [];
  let scriptIndex=0;
  for (const item of groupSourceSectionItems(scriptSectionLines)) {
    const comments=cleanSourceComments(item.comments);
    if (!item.line) continue;

    let ir;
    const sourceSyntax=isScriptV2(item.line) ? 'v2' : 'legacy';
    try {
      ir=parseScriptDeclaration(item.line);
      if (!ir) {
        const note='# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar';
        appendQxOutput(qx,'notes',...comments,note,`# Source declaration: ${item.line}`);
        appendSurgeOutput(sg,'notes',...comments,note,`# Source declaration: ${item.line}`);
        continue;
      }
    } catch (error) {
      const reason=String(error?.message || error).split('\n')[0];
      const note=`# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`;
      appendQxOutput(qx,'notes',...comments,note,`# Source declaration: ${item.line}`);
      appendSurgeOutput(sg,'notes',...comments,note,`# Source declaration: ${item.line}`);
      continue;
    }

    scriptIndex++;
    const mapped=scriptMap.get(ir.script.path);
    const sourceText=mapped?.source || '';
    const qxUrl=mapped?.qx || ir.script.path;
    const surgeUrl=mapped?.surge || ir.script.path;
    const qxPlan=planQxScript(ir,{
      scriptUrl:qxUrl,
      sourceText,
      argumentIds,
      argumentTable:surgeArgumentTable,
    });
    const qxScriptDest=qxOutputDestination(qx,qxPlan.ok && qxPlan.section ? qxPlan.section : 'rewrite');

    if (!qxPlan.ok) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && scriptIrTag(ir)) qxScriptDest.push(`# ${scriptIrTag(ir)}`);
      qxScriptDest.push(`# [WayX] ${sourceSyntax==='v2' ? 'SCRIPT V2' : 'SCRIPT'} REVIEW REQUIRED: ${qxPlan.reason}`);
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.omitted) {
      qxScriptDest.push(...comments);
      for (const note of qxPlan.notes || []) qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(`# [WayX] Known Quantumult X target limitation: ${qxPlan.reason}`);
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.disabled) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && scriptIrTag(ir)) qxScriptDest.push(`# ${scriptIrTag(ir)}`);
      qxScriptDest.push(`# [WayX] Script disabled by source ${sourceSyntax==='v2' ? 'option' : 'declaration'}: ${item.line}`);
    } else if (qxPlan.section==='task') {
      qxScriptDest.push(...comments);
      for (const note of qxPlan.notes || []) qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(qxPlan.line);
    } else {
      const qxRendered=attachQxInlineNote({
        sectionLines:scriptSectionLines,
        item,
        sectionKind:'script',
        lines:[qxPlan.line],
      });
      qxScriptDest.push(...qxRendered.comments);
      if (qxPlan.tag) qxScriptDest.push(`# ${qxPlan.tag}`);
      for (const note of qxPlan.notes || []) qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(...qxRendered.lines);
    }

    const sourceTag=scriptIrTag(ir);
    const name=sanitizeName(sourceTag || `${entry.id}_${String(scriptIndex).padStart(2,'0')}`);
    const surgePlan=planSurgeScript(ir,{
      scriptUrl:surgeUrl,
      name,
      argumentIds,
      argumentTable:surgeArgumentTable,
    });
    const surgeScriptDest=surgeOutputDestination(sg,'script');
    surgeScriptDest.push(...comments);
    if (!surgePlan.ok) {
      surgeScriptDest.push(`# [WayX] ${sourceSyntax==='v2' ? 'SCRIPT V2' : 'SCRIPT'} REVIEW REQUIRED: ${surgePlan.reason}`);
      surgeScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (surgePlan.disabled) {
      surgeScriptDest.push(`# [WayX] Script disabled by source ${sourceSyntax==='v2' ? 'option' : 'declaration'}: ${item.line}`);
    } else {
      if (surgePlan.usesLineRequirement) surgeNeedsLineRequirement=true;
      surgeScriptDest.push(surgePlan.line);
    }
  }

  const mitmLines=[...plugin.sections].filter(([name])=>name==='MitM' || name==='MITM').flatMap(([,lines])=>lines);
  for (const item of groupSourceSectionItems(mitmLines)) {
    const comments=cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx,'mitm').push(...comments);
      surgeOutputDestination(sg,'mitm').push(...comments);
      continue;
    }
    const ir=parseConfigurationDeclaration(item.line);
    const qPlan=planConfiguration(ir,'qx');
    const sPlan=planConfiguration(ir,'surge');
    qxOutputDestination(qx,'mitm').push(...comments,qPlan.line);
    surgeOutputDestination(sg,'mitm').push(...comments,sPlan.line);
  }

  return {
    qx:renderQxOutput({state:qx,headerLines:sourceHeader,entry,stamp}),
    surge:renderSurgeOutput({
      state:sg,
      headerLines:sourceHeader,
      entry,
      stamp,
      argumentMetadata:surgeArgumentPlan.lines,
      needsLineRequirement:surgeNeedsLineRequirement,
    }),
    generatedScripts:new Map([...qx.generatedScripts,...sg.generatedScripts]),
  };
}

// conversion-runner.mjs
// Shared workflow-facing conversion execution primitives.
// Author: chance
// Category: Converter / Execution / Validation









function notify(onStage, stage) {
  if (typeof onStage === 'function') onStage(stage);
}

export async function materializeConversionContext(entry,source,{
  fetchText=fetchOriginalText,
  fetchBytes=fetchOriginalBytes,
}={}) {
  const parsed=parseLoonPlugin(source);
  const [{mockFiles,jqFiles},scriptMap]=await Promise.all([
    materializeRewriteDependencies(entry,parsed,{fetchText,fetchBytes}),
    materializeSourceScripts(source,entry.source,{parsed,fetchText}),
  ]);
  return {parsed,scriptMap,mockFiles,jqFiles};
}

export async function materializeConversionRunContext(entry, source, {onStage=null}={}) {
  notify(onStage,'materialize-context');
  return await materializeConversionContext(entry,source);
}

export function convertPluginWithContext(entry, source, context, {
  stamp='',
  rawBase='',
  onStage=null,
}={}) {
  if (!context || typeof context !== 'object') {
    throw new TypeError('convertPluginWithContext requires a materialized conversion context');
  }

  notify(onStage,'convert');
  return convertPlugin(entry,source,{
    parsed:context.parsed,
    scriptMap:context.scriptMap,
    stamp,
    mockFiles:context.mockFiles,
    jqFiles:context.jqFiles,
    rawBase,
  });
}

export function validateConvertedPlugin(entry, out, {
  surgeValidationOptions=undefined,
  onStage=null,
}={}) {
  if (!out || typeof out !== 'object') {
    throw new TypeError('validateConvertedPlugin requires converted output');
  }

  notify(onStage,'validate-qx');
  validateQX(out.qx,entry);

  notify(onStage,'validate-surge');
  if (surgeValidationOptions === undefined) validateSurgeModule(out.surge,entry);
  else validateSurgeModule(out.surge,entry,surgeValidationOptions);

  return out;
}
