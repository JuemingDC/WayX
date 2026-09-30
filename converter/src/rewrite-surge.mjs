// Surge Rewrite target planner
// Author: chance
// Category: Converter / Rewrite / Surge

import crypto from 'node:crypto';
import { planLegacyRewriteIr } from './legacy-rewrite.mjs';
import {
  surgeDirectRewritePlan,
  surgeRedirectRewritePlan,
  surgeRejectRewritePlan,
  surgeHeaderRewritePlan,
  surgeInlineMockPlan,
  surgeMockFilePlan,
} from './rewrite-v2-semantic.mjs';
import { renderSurgeRequestMockScript } from './surge-mock.mjs';
import { registerComplexRewriteHandler, planComplexRewrite } from './complex-rewrite-registry.mjs';
import { renderMixedRewriteScript, renderSingleJsonMutationScript } from './complex-rewrite-script.mjs';
import { surgeRewriteArgumentPayload } from './argument.mjs';
import { rewriteReview, rewriteIssue } from './rewrite-plan-result.mjs';
import { singleRewriteOperation } from './rewrite-ir.mjs';

function sourceLine(ir,ctx) {
  return String(ctx.sourceLine || ir?.source || '').trim();
}

function rawBase(ctx) {
  const base=String(ctx.rawBase || '').replace(/\/$/,'');
  if (!base) throw new Error('Rewrite planner requires rawBase for generated helper URLs');
  return base;
}

let surgeRewriteHandlersRegistered=false;
function ensureSurgeRewriteHandlers() {
  if (surgeRewriteHandlersRegistered) return;
  surgeRewriteHandlersRegistered=true;
  registerComplexRewriteHandler({
    id:'surge-same-phase-header-script',
    targets:['surge'],
    match:ast=>ast.actions.length>0 && ast.actions.every(action=>action.name.startsWith(ast.phase+'.header.')),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMixedRewriteScript(ast,{
          target:'surge',
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
          argumentTable:ctx.argumentTable,
        });
        const payload=ctx.argumentRefs?.length
          ? surgeRewriteArgumentPayload(ctx.argumentRefs,ctx.argumentTable)
          : {ok:true,value:null};
        if (!payload.ok) throw new Error(payload.reason);
        const key=crypto.createHash('sha1').update('header-surge\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='header_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'script',
          line:'wayx_header_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+rawBase(ctx)+'/script/'+ctx.id+'/'+filename+(plan.fullHeaderMode?',full-header-mode=true':'')+(payload.value?',argument='+payload.value:''),
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  registerComplexRewriteHandler({
    id:'surge-complex-body-pipeline-script',
    targets:['surge'],
    match:(_ast,info)=>info.families.includes('body-pipeline') || info.families.includes('json-pipeline'),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMixedRewriteScript(ast,{
          target:'surge',
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
          argumentTable:ctx.argumentTable,
        });
        const payload=ctx.argumentRefs?.length
          ? surgeRewriteArgumentPayload(ctx.argumentRefs,ctx.argumentTable)
          : {ok:true,value:null};
        if (!payload.ok) throw new Error(payload.reason);
        const key=crypto.createHash('sha1').update('complex-mixed\0surge\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='complex_surge_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'script',
          line:'wayx_complex_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+rawBase(ctx)+'/script/'+ctx.id+'/'+filename+(plan.requiresBody?',requires-body=true':'')+(plan.fullHeaderMode?',full-header-mode=true':'')+(payload.value?',argument='+payload.value:''),
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  
}

export function planSurgeRewrite(ir,ctx={}) {
  if (!ir || ir.type!=='rewrite-semantic-ir') throw new TypeError('Expected Rewrite Semantic IR');
  if (ir.sourceSyntax==='legacy') return planLegacyRewriteIr(ir,'surge',ctx);
  if (ir.sourceSyntax!=='v2') {
    return rewriteIssue(sourceLine(ir,ctx),'unknown-rewrite-source-syntax','unsupported Rewrite source syntax');
  }

  ensureSurgeRewriteHandlers();

  const source=sourceLine(ir,ctx);
  const ast=ir.ast;
  const singleOp=singleRewriteOperation(ir);
  const argumentRefs=ctx.argumentRefs || [];

  if (ir.operations.some(op=>op.kind==='mock' && op.phase==='response' && op.operation==='file')) {
    try {
      const mapped=surgeMockFilePlan(ast,{
        pluginSourceUrl:ctx.sourceUrl,
        materialized:ctx.mockFiles?.get(source) || null,
      });
      if (mapped.ok) return {section:mapped.section,line:mapped.line,lines:mapped.lines};
    } catch {
      // Continue to request/native/helper/complex fallbacks.
    }
  }

  if (singleOp?.kind==='mock' && singleOp.phase==='request') {
    try {
      const plan=renderSurgeRequestMockScript(ast,{
        materialized:singleOp.operation==='file' ? (ctx.mockFiles?.get(source)||null) : null,
        stamp:ctx.stamp,
        category:ctx.category,
        sourceLine:source,
      });
      const key=crypto.createHash('sha1').update('surge-request-mock\0'+source).digest('hex').slice(0,10);
      const filename='request_mock_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {
        section:'script',
        line:'wayx_request_mock_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+rawBase(ctx)+'/script/'+ctx.id+'/'+filename+',requires-body=true'+(plan.binaryBodyMode?',binary-body-mode=true':''),
      };
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (!argumentRefs.length) {
    try {
      for (const mapper of [
        surgeInlineMockPlan,
        surgeHeaderRewritePlan,
        surgeDirectRewritePlan,
        surgeRedirectRewritePlan,
        surgeRejectRewritePlan,
      ]) {
        const mapped=mapper(ast);
        if (mapped.ok) return {section:mapped.section,line:mapped.line,lines:mapped.lines};
      }
    } catch {
      // Continue to dedicated helper/complex fallback.
    }
  }

  if (singleOp?.kind==='json' && ['add','delete','replace'].includes(singleOp.operation) && singleOp.phase===ir.phase) {
    try {
      const plan=renderSingleJsonMutationScript(ast,{
        target:'surge',
        stamp:ctx.stamp,
        category:ctx.category,
        sourceLine:source,
        argumentTable:ctx.argumentTable,
      });
      const payload=argumentRefs.length
        ? surgeRewriteArgumentPayload(argumentRefs,ctx.argumentTable)
        : {ok:true,value:null};
      if (!payload.ok) throw new Error(payload.reason);
      const key=crypto.createHash('sha1').update('json-mutation-surge\0'+source).digest('hex').slice(0,10);
      const filename='json_mutation_surge_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {
        section:'script',
        line:'wayx_json_mutation_'+key+' = type='+plan.surgeType+',pattern='+plan.pattern+',script-path='+rawBase(ctx)+'/script/'+ctx.id+'/'+filename+',requires-body=true'+(payload.value?',argument='+payload.value:''),
      };
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  const complex=planComplexRewrite(ast,'surge',{...ctx,sourceLine:source,argumentRefs});
  if (complex.ok) return {section:complex.section,line:complex.line,lines:complex.lines};
  if (complex.terminal) {
    return complex.issue
      ? rewriteIssue(source,complex.issueCode||'unknown-complex-rewrite',complex.reason)
      : rewriteReview(source,complex.reason);
  }

  return rewriteReview(source,complex.reason || 'no verified Surge mapping for normalized Rewrite semantics');
}
