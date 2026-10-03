// Pure Loon → Quantumult X / Surge conversion pipeline
// Author: chance
// Category: Converter / Pipeline

import { qxRule as canonicalQxRule, surgeModuleRule } from './rule.mjs';
import { isRewriteV2, parseRewriteV2 } from './rewrite-v2.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import {
  inlineResolvedDependency,
  inlineResolvedLegacyJqPathIr,
  jqDependencySpecFromAction,
  legacyJqPathDependencySpecFromIr,
} from './dependency.mjs';
import { isScriptV2, parseScriptV2 } from './script-v2.mjs';
import { analyzePluginArgumentUsage, rewriteV2PluginArgumentRefs } from './argument-usage.mjs';
import { surgeArgumentMetadata } from './argument.mjs';
import { groupSourceSectionItems, cleanSourceComments, isSupportedSourceSection } from './source-section.mjs';
import { attachQxInlineNote } from './qx-comment.mjs';
import { planMitmLine } from './mitm.mjs';
import { legacyRewriteToSemanticIr, rewriteV2AstToSemanticIr } from './rewrite-ir.mjs';
import { planQxRewrite } from './rewrite-qx.mjs';
import { planSurgeRewrite } from './rewrite-surge.mjs';
import { rewriteReview, rewriteIssue } from './rewrite-plan-result.mjs';
import { parseLegacyScriptLine } from './script-legacy.mjs';
import { legacyScriptToSemanticIr, scriptV2AstToSemanticIr } from './script-ir.mjs';
import { planQxScript } from './script-qx.mjs';
import { planSurgeScript } from './script-surge.mjs';
import {
  createQxOutputState,
  appendQxOutput,
  qxOutputDestination,
  qxRuleOutputDestination,
  qxRewriteOutputDestination,
  renderQxOutput,
} from './qx-output.mjs';
import {
  createSurgeOutputState,
  appendSurgeOutput,
  surgeOutputDestination,
  surgeRuleOutputDestination,
  surgeRewriteOutputDestination,
  renderSurgeOutput,
} from './surge-output.mjs';
import { parseLoonPlugin } from './plugin-parser.mjs';

function splitPatternAction(line) {
  const idx=line.search(/\s/);
  if (idx<0) return [line.trim(),''];
  return [line.slice(0,idx).trim(),line.slice(idx).trim().replace(/^\-\s+/,'')];
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
    if (ast.actions.length===1) {
      const jqSpec=jqDependencySpecFromAction(ast.actions[0],{pluginSourceUrl:ctx.sourceUrl});
      if (jqSpec) {
        const materialized=ctx.jqFiles?.get(line);
        if (!materialized) throw new Error('JQ dependency was not materialized during conversion');
        if (materialized.error) throw new Error(materialized.error);
        const inlined=inlineResolvedDependency(ast.actions[0],materialized.content,{pluginSourceUrl:ctx.sourceUrl});
        ast={...ast,actions:[inlined.action]};
        validateRewriteV2Ast(ast);
      }
    }
  } catch (error) {
    return rewriteReview(line,String(error?.message || error).split('\n')[0]);
  }

  const ir=rewriteV2AstToSemanticIr(ast,{source:line});
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
    const mapped=rewriteV2Action(sourceLine,'surge',ctx);
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

  const ruleSectionLines=plugin.sections.get('Rule') || [];
  for (const item of groupSourceSectionItems(ruleSectionLines)) {
    const comments=cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx,'filter').push(...comments);
      surgeOutputDestination(sg,'rule').push(...comments);
      continue;
    }

    const qr=canonicalQxRule(item.line);
    const qxRendered=attachQxInlineNote({
      sectionLines:ruleSectionLines,
      item,
      sectionKind:'rule',
      lines:[qr.line],
      eligible:qr.kind==='filter' || qr.kind==='rewrite',
    });
    const qxRuleDest=qxRuleOutputDestination(qx,qr.kind);
    if (qr.kind==='filter' || qr.kind==='rewrite') qxRuleDest.push(...qxRendered.comments,...qxRendered.lines);
    else qxRuleDest.push(...comments,qr.line);

    const sr=surgeModuleRule(item.line,{proxyPolicyPlaceholder:surgeProxyPolicyPlaceholder});
    surgeRuleOutputDestination(sg,sr.section).push(...comments,...sr.lines);
  }

  const rewriteSectionLines=plugin.sections.get('Rewrite') || [];
  for (const item of groupSourceSectionItems(rewriteSectionLines)) {
    const comments=cleanSourceComments(item.comments);
    const surgeCommentPlan=planDisabledSurgeRewriteComments(item.comments,sctx);
    const surgeComments=cleanSourceComments(surgeCommentPlan.passthrough);

    for (const routed of surgeCommentPlan.routed) {
      (surgeOutputDestination(sg,routed.section) || surgeOutputDestination(sg,'notes')).push(...routed.lines);
    }
    if (!item.line) continue;

    let qr=rewriteV2Action(item.line,'qx',qctx);
    let sr=rewriteV2Action(item.line,'surge',sctx);
    if (!qr || !sr) {
      const [pattern,action]=splitPatternAction(item.line);
      let ir=legacyRewriteToSemanticIr(pattern,action);
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
    let sourceSyntax;
    if (isScriptV2(item.line)) {
      sourceSyntax='v2';
      try {
        ir=scriptV2AstToSemanticIr(parseScriptV2(item.line),{source:item.line});
      } catch (error) {
        const reason=String(error?.message || error).split('\n')[0];
        appendQxOutput(qx,'notes',...comments,`# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`,`# Source declaration: ${item.line}`);
        appendSurgeOutput(sg,'notes',...comments,`# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`,`# Source declaration: ${item.line}`);
        continue;
      }
    } else {
      sourceSyntax='legacy';
      const parsedLegacy=parseLegacyScriptLine(item.line);
      if (!parsedLegacy?.script?.path) {
        appendQxOutput(qx,'notes',...comments,'# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar',`# Source declaration: ${item.line}`);
        appendSurgeOutput(sg,'notes',...comments,'# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar',`# Source declaration: ${item.line}`);
        continue;
      }
      ir=legacyScriptToSemanticIr(parsedLegacy,{source:item.line});
    }

    scriptIndex++;
    const mapped=scriptMap.get(ir.script.path);
    const sourceText=mapped?.source || '';
    const qxUrl=mapped?.qx || ir.script.path;
    const surgeUrl=mapped?.surge || ir.script.path;
    const qxPlan=planQxScript(ir,{scriptUrl:qxUrl,sourceText,argumentIds});
    const qxScriptDest=qxOutputDestination(qx,'rewrite');

    if (!qxPlan.ok) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && ir.sourcePayload.tag) qxScriptDest.push(`# ${ir.sourcePayload.tag}`);
      qxScriptDest.push(`# [WayX] ${sourceSyntax==='v2' ? 'SCRIPT V2' : 'SCRIPT'} REVIEW REQUIRED: ${qxPlan.reason}`);
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.disabled) {
      qxScriptDest.push(...comments);
      if (sourceSyntax==='legacy' && ir.sourcePayload.tag) qxScriptDest.push(`# ${ir.sourcePayload.tag}`);
      qxScriptDest.push(`# [WayX] Script disabled by source ${sourceSyntax==='v2' ? 'option' : 'declaration'}: ${item.line}`);
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

    const sourceTag=sourceSyntax==='v2'
      ? ir.sourcePayload.options.find(item=>item.name==='tag')?.value?.value
      : ir.sourcePayload.tag;
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

  const mitmLines=plugin.sections.get('MitM') || plugin.sections.get('MITM') || [];
  for (const item of groupSourceSectionItems(mitmLines)) {
    const comments=cleanSourceComments(item.comments);
    if (!item.line) continue;
    const qPlan=planMitmLine(item.line,'qx');
    const sPlan=planMitmLine(item.line,'surge');
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
