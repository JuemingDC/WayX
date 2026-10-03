// Quantumult X Source Script target planner
// Author: chance
// Category: Converter / Script / Quantumult X

import { normalizeRegexBodyForTarget } from './target-regex.mjs';
import { selectQxScriptAction } from './script.mjs';
import { qxScriptV2Plan } from './script-v2-target.mjs';

function unsupported(reason) {
  return {ok:false,reason};
}

export function planQxScript(ir,ctx={}) {
  if (!ir || ir.type!=='script-semantic-ir') throw new TypeError('Expected Script Semantic IR');

  const scriptUrl=ctx.scriptUrl || ir.script.path;
  if (ir.sourceSyntax==='v2') {
    return qxScriptV2Plan(ir.sourcePayload,{
      scriptUrl,
      sourceText:ctx.sourceText || '',
      argumentIds:ctx.argumentIds ?? null,
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
  const debugFixed=sc.debug ? String(sc.debug).trim().toLowerCase() : '';
  const debugEnabled=Boolean(sc.debug) && !['false','0'].includes(debugFixed);
  const notes=[];

  if (sc.argument) {
    notes.push('Source Script argument ignored for Quantumult X, matching KOP-XIAO resource-parser conversion behavior.');
  }
  if (enableDynamic) {
    notes.push('Source dynamic enable ignored for Quantumult X; converted rule defaults to enabled.');
  }
  if (sc.timeout) {
    notes.push('Source Script timeout ignored for Quantumult X.');
  }
  if (sc.binaryBodyMode) {
    notes.push('Source binary-body-mode=true ignored for Quantumult X; requires-body alone selects script-request/response-body, matching KOP-XIAO resource-parser conversion behavior.');
  }
  if (debugEnabled) {
    notes.push('Source Script debug is not a Quantumult X Rewrite Script field and was omitted.');
  }
  if (enableFixed==='false' || enableFixed==='0') {
    return {ok:true,disabled:true,reason:'Loon Legacy Script enable=false',tag:sc.tag,notes};
  }

  const action=selectQxScriptAction({
    phase:sc.httpType,
    requiresBody:sc.requiresBody,
    sourceText:ctx.sourceText || '',
  });
  if (!action.action) return unsupported(action.reason);

  return {
    ok:true,
    strategy:'native-declaration',
    section:'rewrite',
    pattern:targetPattern,
    action:action.action,
    line:targetPattern+' url '+action.action+' '+scriptUrl,
    tag:sc.tag,
    notes,
  };
}
