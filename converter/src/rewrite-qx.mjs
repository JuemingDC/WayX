// Quantumult X Rewrite target planner
// Author: chance
// Category: Converter / Rewrite / Quantumult X

import crypto from 'node:crypto';
import { planLegacyRewriteIr } from './legacy-rewrite.mjs';
import { qxMockPlanFromAction } from './dependency.mjs';
import { qxDirectRewritePlan, simpleUrlRewriteCondition } from './rewrite-v2-semantic.mjs';
import { renderQxMockFileScript } from './qx-mock.mjs';
import { renderQxRedirectScript, renderQxRejectScript, renderQxHeaderScript, renderQxInlineMockScript } from './qx-semantic-script.mjs';
import { registerComplexRewriteHandler, planComplexRewrite } from './complex-rewrite-registry.mjs';
import { renderMixedRewriteScript, renderSingleJsonMutationScript } from './complex-rewrite-script.mjs';
import { rewriteReview, rewriteIssue } from './rewrite-plan-result.mjs';
import { singleRewriteOperation } from './rewrite-ir.mjs';

function sourceLine(ir, ctx) {
  return String(ctx.sourceLine || ir?.source || '').trim();
}

function rawBase(ctx) {
  const base=String(ctx.rawBase || '').replace(/\/$/,'');
  if (!base) throw new Error('Rewrite planner requires rawBase for generated helper URLs');
  return base;
}

function renderMinimalQxHeaderHelper(ast, options) {
  try {
    return renderQxHeaderScript(ast, options);
  } catch (compactError) {
    if ((ast?.actions?.length || 0) < 2) throw compactError;
    try {
      return renderMixedRewriteScript(ast, {target:'qx', ...options});
    } catch (mixedError) {
      throw mixedError;
    }
  }
}

let qxRewriteHandlersRegistered=false;
function ensureQxRewriteHandlers() {
  if (qxRewriteHandlersRegistered) return;
  qxRewriteHandlersRegistered=true;
  registerComplexRewriteHandler({
    id:'qx-inline-mock-header-pipeline',
    targets:['qx'],
    match:ast=>{
      const mockName=ast.phase+'.body.mock';
      const mocks=ast.actions.filter(action=>action.name===mockName);
      return mocks.length===1 && ast.actions.every(action=>
        action.name===mockName || new RegExp('^'+ast.phase+'\\.header\\.(?:add|set|del|replace)
  
  registerComplexRewriteHandler({
    id:'qx-same-phase-header-script',
    targets:['qx'],
    match:ast=>ast.actions.length>0 && ast.actions.every(action=>action.name.startsWith(ast.phase+'.header.')),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMinimalQxHeaderHelper(ast,{
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
        });
        const key=crypto.createHash('sha1').update('header\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='header_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'rewrite',
          line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename,
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  registerComplexRewriteHandler({
    id:'qx-complex-body-pipeline-script',
    targets:['qx'],
    match:(_ast,info)=>info.families.includes('body-pipeline') || info.families.includes('json-pipeline'),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMixedRewriteScript(ast,{
          target:'qx',
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
        });
        const key=crypto.createHash('sha1').update('complex-mixed\0qx\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='complex_qx_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'rewrite',
          line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename,
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  
}

function qxNativeHeaderPlan(ast) {
  if (ast?.phase!=='request' || ast.actions?.length!==1) return null;
  const condition=simpleUrlRewriteCondition(ast);
  if (!condition.ok) return null;
  const action=ast.actions[0];
  if (action.name!=='request.header.add') return null;

  const names=action.args[0]?.type==='array' ? action.args[0].items : [action.args[0]];
  const values=action.args[1]?.type==='array' ? action.args[1].items : [action.args[1]];
  if (!names.length || names.length!==values.length) return null;

  const pairs=[];
  for (let i=0;i<names.length;i++) {
    const nameNode=names[i], valueNode=values[i];
    if (!nameNode || !['string','raw-string'].includes(nameNode.type) ||
        !valueNode || !['string','raw-string'].includes(valueNode.type)) return null;
    const name=String(nameNode.value), value=String(valueNode.value);
    if (!name || /[\s:\r\n]/.test(name) || /[\r\n$]/.test(value)) return null;
    pairs.push([name,value]);
  }

  const headerPattern='^([^\\r\\n]+)(\\r\\n)';
  const inserted=pairs.map(([name,value])=>name+': '+value+'$2').join('');
  return {
    section:'rewrite',
    line:condition.pattern+' url request-header '+headerPattern+' request-header $1$2'+inserted,
  };
}

export function planQxRewrite(ir, ctx={}) {
  if (!ir || ir.type!=='rewrite-semantic-ir') throw new TypeError('Expected Rewrite Semantic IR');
  if (ir.sourceSyntax==='legacy') return planLegacyRewriteIr(ir,'qx',ctx);
  if (ir.sourceSyntax!=='v2') {
    return rewriteIssue(sourceLine(ir,ctx),'unknown-rewrite-source-syntax','unsupported Rewrite source syntax');
  }

  ensureQxRewriteHandlers();

  const source=sourceLine(ir,ctx);
  const ast=ir.ast;
  const singleOp=singleRewriteOperation(ir);
  const argumentRefs=ctx.argumentRefs || [];

  if (argumentRefs.length) {
    return rewriteReview(source,'Quantumult X cannot carry Loon plugin [Argument] references without changing the source script/runtime contract: '+argumentRefs.join(', '));
  }

  if (singleOp?.kind==='mock' && singleOp.operation==='file') {
    try {
      const condition=simpleUrlRewriteCondition(ast);
      if (!condition.ok) throw new Error(condition.reason);
      const plan=qxMockPlanFromAction(singleOp.sourceAction,{pluginSourceUrl:ctx.sourceUrl});
      const materialized=ctx.mockFiles?.get(source);
      if (!materialized) throw new Error('mock_file was not materialized during conversion');
      if (materialized.error) throw new Error(materialized.error);
      const key=crypto.createHash('sha1').update('mock-file\0'+source).digest('hex').slice(0,10);
      const filename='mock_file_'+key+'.js';
      const script=renderQxMockFileScript(plan,{
        ...materialized,
        stamp:ctx.stamp,
        category:ctx.category,
        sourceLine:source,
      });
      ctx.generatedScripts.set(filename,script);
      return {section:'rewrite',line:condition.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='mock' && singleOp.operation==='inline') {
    try {
      const plan=renderQxInlineMockScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('mock-inline\0'+source).digest('hex').slice(0,10);
      const filename='mock_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  const nativeHeader=qxNativeHeaderPlan(ast);
  if (nativeHeader) return nativeHeader;

  try {
    const direct=qxDirectRewritePlan(ast);
    if (direct.ok) return {section:direct.section,line:direct.line,lines:direct.lines};
  } catch (error) {
    return rewriteReview(source,String(error?.message||error).split('\n')[0]);
  }

  if (singleOp?.kind==='header' && singleOp.phase==='response' && singleOp.operation==='add') {
    return {
      section:'comment',
      line:'# [WayX] Quantumult X unsupported response.header.add commented out; duplicate-header preservation is not verified by the official sample.\n# Source declaration: '+source,
      reason:'unsupported-qx-response-header-add-comment',
    };
  }

  if (singleOp?.kind==='header' && singleOp.phase===ir.phase) {
    try {
      const plan=renderQxHeaderScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('header-single\\0'+source).digest('hex').slice(0,10);
      const filename='header_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='json' && singleOp.operation==='add' && singleOp.phase===ir.phase) {
    try {
      const plan=renderSingleJsonMutationScript(ast,{target:'qx',stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('json-add-qx\\0'+source).digest('hex').slice(0,10);
      const filename='json_add_qx_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='redirect') {
    try {
      const plan=renderQxRedirectScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('redirect\0'+source).digest('hex').slice(0,10);
      const filename='redirect_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='reject' && ['reject','reject_dict','reject_array'].includes(singleOp.actionName)) {
    try {
      const plan=renderQxRejectScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('reject\0'+source).digest('hex').slice(0,10);
      const filename='reject_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  const complex=planComplexRewrite(ast,'qx',{...ctx,sourceLine:source,argumentRefs});
  if (complex.ok) return {section:complex.section,line:complex.line,lines:complex.lines};
  if (complex.terminal) {
    return complex.issue
      ? rewriteIssue(source,complex.issueCode||'unknown-complex-rewrite',complex.reason)
      : rewriteReview(source,complex.reason);
  }

  return rewriteReview(source,complex.reason || 'no verified Quantumult X mapping for normalized Rewrite semantics');
}
).test(action.name)
      );
    },
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderQxInlineMockScript(ast,{
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
        });
        const key=crypto.createHash('sha1').update('mock-inline\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='mock_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'rewrite',
          line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename,
        };
      } catch(error){
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  registerComplexRewriteHandler({
    id:'qx-same-phase-header-script',
    targets:['qx'],
    match:ast=>ast.actions.length>0 && ast.actions.every(action=>action.name.startsWith(ast.phase+'.header.')),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMinimalQxHeaderHelper(ast,{
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
        });
        const key=crypto.createHash('sha1').update('header\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='header_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'rewrite',
          line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename,
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  registerComplexRewriteHandler({
    id:'qx-complex-body-pipeline-script',
    targets:['qx'],
    match:(_ast,info)=>info.families.includes('body-pipeline') || info.families.includes('json-pipeline'),
    plan:(ast,_target,ctx)=>{
      try {
        const plan=renderMixedRewriteScript(ast,{
          target:'qx',
          stamp:ctx.stamp,
          category:ctx.category,
          sourceLine:ctx.sourceLine,
        });
        const key=crypto.createHash('sha1').update('complex-mixed\0qx\0'+ctx.sourceLine).digest('hex').slice(0,10);
        const filename='complex_qx_'+key+'.js';
        ctx.generatedScripts.set(filename,plan.script);
        return {
          ok:true,
          section:'rewrite',
          line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename,
        };
      } catch (error) {
        return {ok:false,terminal:true,reason:String(error?.message||error)};
      }
    },
  });
  
  
}

function qxNativeHeaderPlan(ast) {
  if (ast?.phase!=='request' || ast.actions?.length!==1) return null;
  const condition=simpleUrlRewriteCondition(ast);
  if (!condition.ok) return null;
  const action=ast.actions[0];
  if (action.name!=='request.header.add') return null;

  const names=action.args[0]?.type==='array' ? action.args[0].items : [action.args[0]];
  const values=action.args[1]?.type==='array' ? action.args[1].items : [action.args[1]];
  if (!names.length || names.length!==values.length) return null;

  const pairs=[];
  for (let i=0;i<names.length;i++) {
    const nameNode=names[i], valueNode=values[i];
    if (!nameNode || !['string','raw-string'].includes(nameNode.type) ||
        !valueNode || !['string','raw-string'].includes(valueNode.type)) return null;
    const name=String(nameNode.value), value=String(valueNode.value);
    if (!name || /[\s:\r\n]/.test(name) || /[\r\n$]/.test(value)) return null;
    pairs.push([name,value]);
  }

  const headerPattern='^([^\\r\\n]+)(\\r\\n)';
  const inserted=pairs.map(([name,value])=>name+': '+value+'$2').join('');
  return {
    section:'rewrite',
    line:condition.pattern+' url request-header '+headerPattern+' request-header $1$2'+inserted,
  };
}

export function planQxRewrite(ir, ctx={}) {
  if (!ir || ir.type!=='rewrite-semantic-ir') throw new TypeError('Expected Rewrite Semantic IR');
  if (ir.sourceSyntax==='legacy') return planLegacyRewriteIr(ir,'qx',ctx);
  if (ir.sourceSyntax!=='v2') {
    return rewriteIssue(sourceLine(ir,ctx),'unknown-rewrite-source-syntax','unsupported Rewrite source syntax');
  }

  ensureQxRewriteHandlers();

  const source=sourceLine(ir,ctx);
  const ast=ir.ast;
  const singleOp=singleRewriteOperation(ir);
  const argumentRefs=ctx.argumentRefs || [];

  if (argumentRefs.length) {
    return rewriteReview(source,'Quantumult X cannot carry Loon plugin [Argument] references without changing the source script/runtime contract: '+argumentRefs.join(', '));
  }

  if (singleOp?.kind==='mock' && singleOp.operation==='file') {
    try {
      const condition=simpleUrlRewriteCondition(ast);
      if (!condition.ok) throw new Error(condition.reason);
      const plan=qxMockPlanFromAction(singleOp.sourceAction,{pluginSourceUrl:ctx.sourceUrl});
      const materialized=ctx.mockFiles?.get(source);
      if (!materialized) throw new Error('mock_file was not materialized during conversion');
      if (materialized.error) throw new Error(materialized.error);
      const key=crypto.createHash('sha1').update('mock-file\0'+source).digest('hex').slice(0,10);
      const filename='mock_file_'+key+'.js';
      const script=renderQxMockFileScript(plan,{
        ...materialized,
        stamp:ctx.stamp,
        category:ctx.category,
        sourceLine:source,
      });
      ctx.generatedScripts.set(filename,script);
      return {section:'rewrite',line:condition.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='mock' && singleOp.operation==='inline') {
    try {
      const plan=renderQxInlineMockScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('mock-inline\0'+source).digest('hex').slice(0,10);
      const filename='mock_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  const nativeHeader=qxNativeHeaderPlan(ast);
  if (nativeHeader) return nativeHeader;

  try {
    const direct=qxDirectRewritePlan(ast);
    if (direct.ok) return {section:direct.section,line:direct.line,lines:direct.lines};
  } catch (error) {
    return rewriteReview(source,String(error?.message||error).split('\n')[0]);
  }

  if (singleOp?.kind==='header' && singleOp.phase==='response' && singleOp.operation==='add') {
    return {
      section:'comment',
      line:'# [WayX] Quantumult X unsupported response.header.add commented out; duplicate-header preservation is not verified by the official sample.\n# Source declaration: '+source,
      reason:'unsupported-qx-response-header-add-comment',
    };
  }

  if (singleOp?.kind==='header' && singleOp.phase===ir.phase) {
    try {
      const plan=renderQxHeaderScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('header-single\\0'+source).digest('hex').slice(0,10);
      const filename='header_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='json' && singleOp.operation==='add' && singleOp.phase===ir.phase) {
    try {
      const plan=renderSingleJsonMutationScript(ast,{target:'qx',stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('json-add-qx\\0'+source).digest('hex').slice(0,10);
      const filename='json_add_qx_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='redirect') {
    try {
      const plan=renderQxRedirectScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('redirect\0'+source).digest('hex').slice(0,10);
      const filename='redirect_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  if (singleOp?.kind==='reject' && ['reject','reject_dict','reject_array'].includes(singleOp.actionName)) {
    try {
      const plan=renderQxRejectScript(ast,{stamp:ctx.stamp,category:ctx.category,sourceLine:source});
      const key=crypto.createHash('sha1').update('reject\0'+source).digest('hex').slice(0,10);
      const filename='reject_'+key+'.js';
      ctx.generatedScripts.set(filename,plan.script);
      return {section:'rewrite',line:plan.pattern+' url '+plan.qxAction+' '+rawBase(ctx)+'/script/'+ctx.id+'/'+filename};
    } catch (error) {
      return rewriteReview(source,String(error?.message||error).split('\n')[0]);
    }
  }

  const complex=planComplexRewrite(ast,'qx',{...ctx,sourceLine:source,argumentRefs});
  if (complex.ok) return {section:complex.section,line:complex.line,lines:complex.lines};
  if (complex.terminal) {
    return complex.issue
      ? rewriteIssue(source,complex.issueCode||'unknown-complex-rewrite',complex.reason)
      : rewriteReview(source,complex.reason);
  }

  return rewriteReview(source,complex.reason || 'no verified Quantumult X mapping for normalized Rewrite semantics');
}
