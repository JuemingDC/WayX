// WayX behavior-first Loon Script v2 target planning
// Author: chance
// Category: Converter / Script v2 / Target Mapping
import { simpleUrlRewriteCondition } from './rewrite-v2-semantic.mjs';
import { selectQxScriptAction } from './script.mjs';
import {
  scriptOption,
  scriptOptionBoolean,
  scriptV2ArgumentRefs,
  scriptV2DynamicOptionRefs,
} from './script-v2.mjs';

function unsupported(reason) {
  return { ok:false, reason };
}

function scriptUrlCondition(ast) {
  return simpleUrlRewriteCondition({type:'rewrite', condition:ast.condition});
}

function fixedOption(ast, name) {
  const value = scriptOption(ast, name);
  if (!value) return null;
  if (['string','raw-string','number','boolean'].includes(value.type)) return value.value;
  return null;
}

export function qxScriptV2Plan(ast, {scriptUrl = ast?.script?.path, sourceText = ''} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');
  const condition = scriptUrlCondition(ast);
  if (!condition.ok) return condition;

  const enable = scriptOption(ast, 'enable');
  if (enable?.type === 'boolean' && enable.value === false) {
    return {ok:true, disabled:true, reason:'Loon Script v2 enable=false'};
  }
  if (enable?.type === 'variable') return unsupported('dynamic enable requires a QX preference bridge');

  const arg = ast.script.argument;
  if (arg) return unsupported('Script v2 argument requires a QX $argument bridge');

  const action = selectQxScriptAction({
    phase:ast.phase,
    requiresBody:scriptOptionBoolean(ast, 'requires_body', false),
    scriptUrl,
    sourceText,
  });

  return {
    ok:true,
    strategy:'native-declaration',
    section:'rewrite',
    pattern:condition.pattern,
    action:action.action,
    line:condition.pattern + ' url ' + action.action + ' ' + scriptUrl,
    tag:fixedOption(ast, 'tag'),
    binaryBodyMode:scriptOptionBoolean(ast, 'binary_body_mode', false),
    notes:condition.notes,
  };
}

export function surgeScriptV2Plan(ast, {scriptUrl = ast?.script?.path, name = 'script'} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');
  const condition = scriptUrlCondition(ast);
  if (!condition.ok) return condition;

  const enable = scriptOption(ast, 'enable');
  if (enable?.type === 'boolean' && enable.value === false) {
    return {ok:true, disabled:true, reason:'Loon Script v2 enable=false'};
  }
  if (enable?.type === 'variable') return unsupported('dynamic enable requires a Surge module-argument bridge');
  if (scriptV2ArgumentRefs(ast).length || ast.script.argument) {
    return unsupported('Script v2 argument requires a Surge $argument bridge');
  }

  const params = [
    'type=http-' + ast.phase,
    'pattern=' + condition.pattern,
    'script-path=' + scriptUrl,
  ];

  if (scriptOptionBoolean(ast, 'requires_body', false)) {
    params.push('requires-body=true');
    params.push('max-size=-1');
  }
  if (scriptOptionBoolean(ast, 'binary_body_mode', false)) params.push('binary-body-mode=true');

  const timeout = scriptOption(ast, 'timeout');
  if (timeout?.type === 'number') params.push('timeout=' + timeout.value);
  else if (timeout?.type === 'variable') return unsupported('dynamic timeout requires a Surge module-argument bridge');

  const debug = scriptOption(ast, 'debug');
  if (debug?.type === 'boolean' && debug.value) params.push('debug=true');
  else if (debug?.type === 'variable') return unsupported('dynamic debug requires a Surge module-argument bridge');

  return {
    ok:true,
    strategy:'native-declaration',
    section:'script',
    pattern:condition.pattern,
    line:name + ' = ' + params.join(','),
    tag:fixedOption(ast, 'tag'),
    notes:condition.notes,
  };
}

export function scriptV2BridgeNeeds(ast) {
  return {
    argumentRefs:scriptV2ArgumentRefs(ast),
    dynamicOptions:scriptV2DynamicOptionRefs(ast),
    hasArgument:Boolean(ast?.script?.argument),
  };
}
