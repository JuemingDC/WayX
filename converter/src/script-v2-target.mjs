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
import { scriptV2PluginArgumentUsage } from './argument-usage.mjs';
import { surgePluginObjectArgument, surgeBooleanOptionValue, surgeTimeoutOptionValue, surgeEnableRequirement } from './argument.mjs';

function unsupported(reason) {
  return { ok:false, reason };
}

function scriptUrlCondition(ast, target = 'generic') {
  return simpleUrlRewriteCondition({type:'rewrite', condition:ast.condition}, {target});
}

function fixedOption(ast, name) {
  const value = scriptOption(ast, name);
  if (!value) return null;
  if (['string','raw-string','number','boolean'].includes(value.type)) return value.value;
  return null;
}

export function qxScriptV2Plan(ast, {scriptUrl = ast?.script?.path, sourceText = '', argumentIds = null} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');
  if (argumentIds !== null) {
    const usage = scriptV2PluginArgumentUsage(ast, argumentIds);
    const undeclared = [
      ...usage.undeclaredObjectRefs,
      ...usage.undeclaredOptionRefs.map(ref => ref.id),
    ];
    if (undeclared.length) {
      return unsupported('undeclared plugin [Argument] reference(s): ' + [...new Set(undeclared)].sort().join(', '));
    }
    if (usage.conditionRefs.length) {
      return unsupported('plugin [Argument] condition cannot be represented by the Quantumult X rewrite declaration: ' + usage.conditionRefs.join(', '));
    }
  }

  const condition = scriptUrlCondition(ast);
  if (!condition.ok) return condition;

  const enable = scriptOption(ast, 'enable');
  if (enable?.type === 'boolean' && enable.value === false) {
    return {ok:true, disabled:true, reason:'Loon Script v2 enable=false'};
  }
  if (enable?.type === 'variable') {
    return unsupported('dynamic enable cannot be carried by Quantumult X rewrite declaration without changing the script');
  }

  if (ast.script.argument) {
    return unsupported('Loon Script v2 $argument cannot be carried by the official Quantumult X rewrite declaration without changing the script');
  }

  if (ast.phase === 'request' && scriptOptionBoolean(ast, 'binary_body_mode', false)) {
    return unsupported('binary request body mode has no verified Quantumult X request-body declaration/runtime path in the official sample');
  }

  const action = selectQxScriptAction({
    phase:ast.phase,
    requiresBody:scriptOptionBoolean(ast, 'requires_body', false),
    scriptUrl,
    sourceText,
  });

  const notes = [...(condition.notes || [])];
  const timeout = scriptOption(ast, 'timeout');
  if (timeout) notes.push('Loon timeout is not represented in the Quantumult X rewrite declaration');
  const debug = scriptOption(ast, 'debug');
  if (debug?.type === 'boolean' && debug.value) notes.push('Loon debug=true has no Quantumult X rewrite declaration field');

  return {
    ok:true,
    strategy:'native-declaration',
    section:'rewrite',
    pattern:condition.pattern,
    action:action.action,
    line:condition.pattern + ' url ' + action.action + ' ' + scriptUrl,
    tag:fixedOption(ast, 'tag'),
    binaryBodyMode:scriptOptionBoolean(ast, 'binary_body_mode', false),
    notes,
  };
}

export function surgeScriptV2Plan(ast, {scriptUrl = ast?.script?.path, name = 'script', argumentIds = null, argumentTable = null} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');
  if (argumentIds !== null) {
    const usage = scriptV2PluginArgumentUsage(ast, argumentIds);
    const undeclared = [
      ...usage.undeclaredObjectRefs,
      ...usage.undeclaredOptionRefs.map(ref => ref.id),
    ];
    if (undeclared.length) {
      return unsupported('undeclared plugin [Argument] reference(s): ' + [...new Set(undeclared)].sort().join(', '));
    }
    if (usage.conditionRefs.length) {
      return unsupported('plugin [Argument] condition has no verified Surge Script declaration equivalent: ' + usage.conditionRefs.join(', '));
    }
  }

  const condition = scriptUrlCondition(ast, 'surge');
  if (!condition.ok) return condition;

  const enable = scriptOption(ast, 'enable');
  if (enable?.type === 'boolean' && enable.value === false) {
    return {ok:true, disabled:true, reason:'Loon Script v2 enable=false'};
  }
  let requirementPrefix = null;
  if (enable?.type === 'variable') {
    requirementPrefix = surgeEnableRequirement(enable.name, argumentTable);
    if (!requirementPrefix) {
      return unsupported('dynamic enable references an undeclared or unsupported Surge module argument: ' + enable.name);
    }
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
  else if (timeout?.type === 'variable') {
    const placeholder = surgeTimeoutOptionValue(timeout.name, argumentTable);
    if (!placeholder) return unsupported('dynamic timeout must reference a declared Number or strictly numeric positive String Surge module argument: ' + timeout.name);
    params.push('timeout=' + placeholder);
  }

  const argument = ast.script.argument;
  if (argument?.type === 'string' || argument?.type === 'raw-string') {
    params.push('argument=' + JSON.stringify(argument.value));
  } else if (argument?.type === 'plugin-object') {
    const encoded = surgePluginObjectArgument(argument.items.map(item => item.name), argumentTable);
    if (!encoded.ok) return unsupported(encoded.reason);
    params.push('argument=' + encoded.value);
  } else if (argument) {
    return unsupported('unsupported Loon Script v2 argument form');
  }

  const debug = scriptOption(ast, 'debug');
  if (debug?.type === 'boolean' && debug.value) params.push('debug=true');
  else if (debug?.type === 'variable') {
    const placeholder = surgeBooleanOptionValue(debug.name, argumentTable);
    if (!placeholder) return unsupported('dynamic debug must reference a declared Boolean/switch Surge module argument: ' + debug.name);
    params.push('debug=' + placeholder);
  }

  return {
    ok:true,
    strategy:'native-declaration',
    section:'script',
    pattern:condition.pattern,
    line:(requirementPrefix ? requirementPrefix + ' ' : '') + name + ' = ' + params.join(','),
    tag:fixedOption(ast, 'tag'),
    notes:condition.notes,
    usesLineRequirement:Boolean(requirementPrefix),
  };
}

export function scriptV2DeclarationGaps(ast) {
  return {
    argumentRefs:scriptV2ArgumentRefs(ast),
    dynamicOptions:scriptV2DynamicOptionRefs(ast),
    hasArgument:Boolean(ast?.script?.argument),
  };
}

// Backward-compatible export name for callers that only inspect needs.
export const scriptV2BridgeNeeds = scriptV2DeclarationGaps;
