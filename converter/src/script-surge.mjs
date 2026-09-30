// Surge Source Script target planner
// Author: chance
// Category: Converter / Script / Surge

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { surgeScriptV2Plan } from './script-v2-target.mjs';
import {
  parseLegacyLoonPluginObjectRefs,
  surgeDynamicOptionValue,
  surgeEnableRequirement,
  surgePluginObjectArgument,
} from './argument.mjs';

function unsupported(reason) {
  return {ok:false,reason};
}

export function planSurgeScript(ir,ctx={}) {
  if (!ir || ir.type!=='script-semantic-ir') throw new TypeError('Expected Script Semantic IR');

  const scriptUrl=ctx.scriptUrl || ir.script.path;
  if (ir.sourceSyntax==='v2') {
    return surgeScriptV2Plan(ir.sourcePayload,{
      scriptUrl,
      name:ctx.name || 'script',
      argumentIds:ctx.argumentIds ?? null,
      argumentTable:ctx.argumentTable || null,
    });
  }

  if (ir.sourceSyntax!=='legacy') {
    return unsupported('unsupported Script source syntax: '+ir.sourceSyntax);
  }

  const sc=ir.sourcePayload;
  if (!sc?.script?.path) return unsupported('Legacy Script declaration is missing script-path');

  const targetPattern=normalizeRegexBodyForTarget(sc.pattern);
  const enableFixed=sc.enable ? String(sc.enable).trim().toLowerCase() : '';
  const enableDynamic=Boolean(sc.enable) && !['true','false','1','0'].includes(enableFixed);

  if (enableFixed==='false' || enableFixed==='0') {
    return {ok:true,disabled:true,reason:'Loon Legacy Script enable=false'};
  }

  let requirementPrefix='';
  if (enableDynamic) {
    const ref=String(sc.enable).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
    const requirement=ref ? surgeEnableRequirement(ref[1],ctx.argumentTable) : null;
    if (!requirement) {
      return unsupported('dynamic source enable cannot be mapped to a declared Surge module boolean argument.');
    }
    requirementPrefix=requirement+' ';
  }

  const params=['type='+sc.httpType,'pattern='+targetPattern,'script-path='+scriptUrl];
  if (sc.requiresBody) {
    params.push('requires-body=true');
    params.push('max-size='+(sc.maxSize || '-1'));
  }
  if (sc.binaryBodyMode) params.push('binary-body-mode=true');

  if (sc.timeout) {
    const timeoutRef=String(sc.timeout).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
    if (timeoutRef) {
      const placeholder=surgeDynamicOptionValue(timeoutRef[1],ctx.argumentTable);
      if (!placeholder) return unsupported('dynamic timeout references an undeclared Surge module argument.');
      params.push('timeout='+placeholder);
    } else {
      params.push('timeout='+sc.timeout);
    }
  }

  if (sc.argument) {
    const refs=parseLegacyLoonPluginObjectRefs(sc.argument);
    if (refs) {
      const encoded=surgePluginObjectArgument(refs,ctx.argumentTable);
      if (!encoded.ok) return unsupported(encoded.reason);
      params.push('argument='+encoded.value);
    } else {
      params.push('argument='+sc.argument);
    }
  }

  return {
    ok:true,
    strategy:'native-declaration',
    section:'script',
    line:requirementPrefix+(ctx.name || 'script')+' = '+params.join(','),
    usesLineRequirement:Boolean(requirementPrefix),
  };
}
