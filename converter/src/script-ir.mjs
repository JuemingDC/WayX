// Target-neutral Script Semantic IR
// Author: chance
// Category: Converter / Script / Semantic IR

function freezeOptions(options) {
  return Object.freeze((options || []).map(item=>Object.freeze({...item})));
}

function baseIr({sourceSyntax,source,phase,condition,pattern,scriptPath,argument,options,sourcePayload}) {
  return Object.freeze({
    type:'script-semantic-ir',
    sourceSyntax,
    source:String(source || sourcePayload?.raw || ''),
    phase,
    condition:condition || null,
    pattern:pattern || null,
    script:Object.freeze({path:String(scriptPath || '')}),
    argument:argument ?? null,
    options:freezeOptions(options),
    sourcePayload,
  });
}

export function legacyScriptToSemanticIr(parsed,{source=parsed?.raw || ''}={}) {
  if (!parsed || parsed.syntax!=='loon-script-legacy') throw new TypeError('Expected parsed Legacy Script declaration');
  return baseIr({
    sourceSyntax:'legacy',
    source,
    phase:parsed.phase,
    pattern:parsed.pattern,
    scriptPath:parsed.script?.path,
    argument:parsed.argument,
    options:parsed.options,
    sourcePayload:parsed,
  });
}

export function scriptV2AstToSemanticIr(ast,{source=ast?.raw || ''}={}) {
  if (!ast || ast.type!=='script' || ast.syntax!=='loon-script-v2') throw new TypeError('Expected Script v2 AST');
  return baseIr({
    sourceSyntax:'v2',
    source,
    phase:ast.phase,
    condition:ast.condition,
    scriptPath:ast.script?.path,
    argument:ast.script?.argument || null,
    options:ast.options,
    sourcePayload:ast,
  });
}

export function scriptIrSourcePath(ir) {
  if (!ir || ir.type!=='script-semantic-ir') throw new TypeError('Expected Script Semantic IR');
  return ir.script.path;
}
