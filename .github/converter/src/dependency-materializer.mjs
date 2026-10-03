// Loon Rewrite dependency discovery and materialization
// Author: chance
// Category: Converter / Dependency / Materialization

import { minifyJqFile } from './jq.mjs';
import { isRewriteV2, parseRewriteV2 } from './rewrite-v2.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import {
  dependencySpecFromAction,
  jqDependencySpecFromAction,
  legacyJqPathDependencySpecFromIr,
} from './dependency.mjs';
import { legacyRewriteToSemanticIr } from './rewrite-ir.mjs';
import { simpleUrlRewriteCondition } from './rewrite-v2-semantic.mjs';
import { groupSourceSectionItems } from './source-section.mjs';
import { fetchOriginalText, fetchOriginalBytes } from './source-fetch.mjs';

export async function materializeMockFiles(entry,parsed,{
  fetchText=fetchOriginalText,
  fetchBytes=fetchOriginalBytes,
}={}) {
  const out=new Map();
  for (const item of groupSourceSectionItems(parsed?.sections?.get('Rewrite'))) {
    if (!item.line || !isRewriteV2(item.line)) continue;
    try {
      const ast=parseRewriteV2(item.line);
      validateRewriteV2Ast(ast);
      const mockFileActions=ast.actions.filter(action=>/^(?:request|response)\.body\.mock_file$/.test(action.name));
      if (mockFileActions.length!==1) continue;

      const condition=simpleUrlRewriteCondition(ast);
      if (!condition.ok) continue;

      const plan=dependencySpecFromAction(mockFileActions[0],{pluginSourceUrl:entry.source});
      if (plan.base64) {
        const text=await fetchText(plan.url);
        const compact=String(text).replace(/\s+/g,'');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact) || compact.length%4===1) {
          throw new Error('invalid Base64 mock_file content');
        }
        out.set(item.line,{
          bodyBase64:Buffer.from(compact,'base64').toString('base64'),
          sourceFile:plan.url,
        });
      } else if (plan.binary) {
        const bytes=await fetchBytes(plan.url);
        out.set(item.line,{
          bodyBase64:Buffer.from(bytes).toString('base64'),
          sourceFile:plan.url,
        });
      } else {
        const text=await fetchText(plan.url);
        out.set(item.line,{
          bodyText:text,
          sourceFile:plan.url,
        });
      }
    } catch (error) {
      out.set(item.line,{error:String(error?.message || error).split('\n')[0]});
    }
  }
  return out;
}

function splitLegacyRewriteLine(line) {
  const source=String(line ?? '').trim();
  const idx=source.search(/\s/);
  if (idx<0) return null;
  const pattern=source.slice(0,idx).trim();
  const action=source.slice(idx).trim().replace(/^\-\s+/,'');
  if (!pattern || !action) return null;
  return {pattern,action};
}

export async function materializeJqFiles(entry,parsed,{
  fetchText=fetchOriginalText,
}={}) {
  const out=new Map();
  for (const item of groupSourceSectionItems(parsed?.sections?.get('Rewrite'))) {
    if (!item.line) continue;
    try {
      let spec=null;
      if (isRewriteV2(item.line)) {
        const ast=parseRewriteV2(item.line);
        validateRewriteV2Ast(ast);
        if (ast.actions.length!==1) continue;
        spec=jqDependencySpecFromAction(ast.actions[0],{pluginSourceUrl:entry.source});
      } else {
        const legacy=splitLegacyRewriteLine(item.line);
        if (!legacy) continue;
        const ir=legacyRewriteToSemanticIr(legacy.pattern,legacy.action);
        spec=legacyJqPathDependencySpecFromIr(ir,{pluginSourceUrl:entry.source});
      }

      if (!spec) continue;
      if (!spec.resolvable || !spec.url) {
        throw new Error(spec.reason || 'JQ dependency is not resolvable');
      }

      const text=await fetchText(spec.url);
      const content=minifyJqFile(text);
      if (!content) throw new Error('JQ dependency resolved to empty content');
      out.set(item.line,{
        content,
        sourceFile:spec.url,
        legacyAlias:Boolean(spec.legacyAlias),
      });
    } catch (error) {
      out.set(item.line,{error:String(error?.message || error).split('\n')[0]});
    }
  }
  return out;
}

export async function materializeRewriteDependencies(entry,parsed,options={}) {
  const [mockFiles,jqFiles]=await Promise.all([
    materializeMockFiles(entry,parsed,options),
    materializeJqFiles(entry,parsed,options),
  ]);
  return {mockFiles,jqFiles};
}
