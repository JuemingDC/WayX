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
import { surgePluginObjectArgument, surgeDynamicOptionValue, surgeEnableRequirement } from './argument.mjs';

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

function argumentDefault(id, table) {
  const entry = table?.byId?.get(String(id));
  return entry?.hasDefault ? entry.defaultValue : undefined;
}

function parseBooleanDefault(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return null;
}

function qxTaskEnabled(ast, argumentTable, notes) {
  const enable = scriptOption(ast, 'enable');
  if (!enable) return true;
  if (enable.type === 'boolean') return enable.value;
  if (enable.type === 'variable') {
    const raw = argumentDefault(enable.name, argumentTable);
    const value = parseBooleanDefault(raw);
    if (value === null) {
      notes.push('Source dynamic enable=' + enable.name + ' has no usable Quantumult X default; converted task defaults to enabled.');
      return true;
    }
    notes.push('Source dynamic enable=' + enable.name + ' is fixed to its plugin default for Quantumult X.');
    return value;
  }
  return true;
}

function qxCronExpression(ast, argumentTable, notes) {
  const node = ast.trigger?.expression;
  if (!node) return unsupported('Cron Script is missing its expression');
  if (node.type === 'string' || node.type === 'raw-string') return {ok:true,value:String(node.value)};
  if (node.type === 'variable') {
    const value = argumentDefault(node.name, argumentTable);
    if (value === undefined || value === null || String(value).trim() === '') {
      return unsupported('dynamic Cron expression has no plugin default for Quantumult X: ' + node.name);
    }
    notes.push('Source dynamic Cron expression=' + node.name + ' is fixed to its plugin default for Quantumult X.');
    return {ok:true,value:String(value).trim()};
  }
  return unsupported('unsupported Cron expression type for Quantumult X');
}

function qxTaskOptions(ast, argumentTable, notes) {
  const parts = [];
  const tag = fixedOption(ast, 'tag');
  const img = fixedOption(ast, 'img_url');
  if (tag !== null && String(tag)) parts.push('tag=' + String(tag));
  if (img !== null && String(img)) {
    if (/^https?:\/\//i.test(String(img))) parts.push('img-url=' + String(img));
    else notes.push('Source img_url=' + String(img) + ' omitted because Quantumult X task img-url is documented as an image URL, not an SF Symbol name.');
  }
  parts.push('enabled=' + (qxTaskEnabled(ast, argumentTable, notes) ? 'true' : 'false'));
  return parts;
}

function qxNonHttpScriptV2Plan(ast, {scriptUrl, argumentTable = null} = {}) {
  const notes = [];
  if (ast.script.argument) {
    return {
      ok:true,
      omitted:true,
      section:'task',
      reason:'Quantumult X task declarations have no official Loon PluginObject/String $argument equivalent; task omitted to avoid changing script input semantics.',
      notes,
    };
  }

  const timeout = scriptOption(ast, 'timeout');
  if (timeout) notes.push('Source Script timeout ignored for Quantumult X task syntax.');
  const debug = scriptOption(ast, 'debug');
  if (debug?.type === 'variable' || (debug?.type === 'boolean' && debug.value === true)) {
    notes.push('Source Script debug is not a Quantumult X task field and was omitted.');
  }

  let prefix;
  if (ast.phase === 'cron') {
    const cron = qxCronExpression(ast, argumentTable, notes);
    if (!cron.ok) return cron;
    const fields = cron.value.trim().split(/\s+/);
    if (![5,6].includes(fields.length)) {
      return unsupported('Quantumult X task cron requires a 5- or 6-field expression');
    }
    prefix = cron.value.trim();
  } else if (ast.phase === 'network-changed') {
    prefix = 'event-network';
  } else if (ast.phase === 'generic') {
    prefix = 'event-interaction';
  } else {
    return unsupported('unsupported non-HTTP Script v2 phase for Quantumult X: ' + ast.phase);
  }

  const options = qxTaskOptions(ast, argumentTable, notes);
  return {
    ok:true,
    strategy:'native-task',
    section:'task',
    line:prefix + ' ' + scriptUrl + (options.length ? ', ' + options.join(', ') : ''),
    tag:fixedOption(ast, 'tag'),
    notes,
  };
}

export function qxScriptV2Plan(ast, {
  scriptUrl = ast?.script?.path,
  sourceText = '',
  argumentIds = null,
  argumentTable = null,
} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');

  if (!['request','response'].includes(ast.phase)) {
    return qxNonHttpScriptV2Plan(ast,{scriptUrl,argumentTable});
  }

  // QX official Rewrite Script declarations do not expose Loon's enable,
  // timeout, debug or binary_body_mode fields. Target planning therefore
  // omits those fields instead of emitting invented QX syntax. Keep
  // requires_body separate: it alone selects the QX header/body action family.
  const enable = scriptOption(ast, 'enable');
  if (enable?.type === 'boolean' && enable.value === false) {
    return {ok:true, disabled:true, reason:'Loon Script v2 enable=false'};
  }

  const timeout = scriptOption(ast, 'timeout');
  const debug = scriptOption(ast, 'debug');
  const binaryBodyMode = scriptOptionBoolean(ast, 'binary_body_mode', false);

  if (argumentIds !== null) {
    const usage = scriptV2PluginArgumentUsage(ast, argumentIds);
    const undeclared = usage.undeclaredOptionRefs
      .filter(ref => !['enable','timeout','debug'].includes(ref.option))
      .map(ref => ref.id);
    if (undeclared.length) {
      return unsupported('undeclared plugin [Argument] reference(s): ' + [...new Set(undeclared)].sort().join(', '));
    }
    if (usage.conditionRefs.length) {
      return unsupported('plugin [Argument] condition cannot be represented by the Quantumult X rewrite declaration: ' + usage.conditionRefs.join(', '));
    }
  }

  const condition = scriptUrlCondition(ast,'qx');
  if (!condition.ok) return condition;
  const notes = [...(condition.notes || [])];

  if (enable?.type === 'variable') {
    notes.push('Source dynamic enable=' + enable.name + ' ignored for Quantumult X; converted rule defaults to enabled.');
  }
  if (ast.script.argument) {
    notes.push('Source Script argument ignored for Quantumult X, matching KOP-XIAO resource-parser conversion behavior.');
  }
  if (timeout) {
    notes.push('Source Script timeout ignored for Quantumult X.');
  }
  if (debug?.type === 'variable' || (debug?.type === 'boolean' && debug.value === true)) {
    notes.push('Source Script debug is not a Quantumult X Rewrite Script field and was omitted.');
  }
  if (binaryBodyMode) {
    notes.push('Source binary_body_mode=true ignored for Quantumult X; requires_body alone selects script-request/response-body, matching KOP-XIAO resource-parser conversion behavior.');
  }

  const action = selectQxScriptAction({
    phase:ast.phase,
    requiresBody:scriptOptionBoolean(ast, 'requires_body', false),
    scriptUrl,
    sourceText,
  });
  if (!action.action) {
    return unsupported(action.reason);
  }

  return {
    ok:true,
    strategy:'native-declaration',
    section:'rewrite',
    pattern:condition.pattern,
    action:action.action,
    line:condition.pattern + ' url ' + action.action + ' ' + scriptUrl,
    tag:fixedOption(ast, 'tag'),
    binaryBodyMode,
    notes,
  };
}

function surgeTriggerParams(ast, argumentTable) {
  if (ast.phase === 'request' || ast.phase === 'response') return null;
  if (ast.phase === 'generic') return {ok:true,params:['type=generic']};
  if (ast.phase === 'network-changed') return {ok:true,params:['type=event','event-name=network-changed']};
  if (ast.phase === 'cron') {
    const node = ast.trigger?.expression;
    if (!node) return unsupported('Cron Script is missing its expression');
    let expression;
    if (node.type === 'string' || node.type === 'raw-string') {
      expression = String(node.value);
    } else if (node.type === 'variable') {
      const placeholder = surgeDynamicOptionValue(node.name, argumentTable);
      if (!placeholder) return unsupported('dynamic Cron expression references undeclared Surge module argument: ' + node.name);
      expression = placeholder;
    } else {
      return unsupported('unsupported Cron expression type for Surge');
    }
    return {ok:true,params:['type=cron','cronexp=' + JSON.stringify(expression)]};
  }
  return unsupported('unsupported Script v2 phase for Surge: ' + ast.phase);
}

export function surgeScriptV2Plan(ast, {scriptUrl = ast?.script?.path, name = 'script', argumentIds = null, argumentTable = null} = {}) {
  if (!ast || ast.type !== 'script') return unsupported('expected Script v2 AST');
  if (argumentIds !== null) {
    const usage = scriptV2PluginArgumentUsage(ast, argumentIds);
    const undeclared = [
      ...usage.undeclaredObjectRefs,
      ...usage.undeclaredOptionRefs.map(ref => ref.id),
      ...usage.undeclaredTriggerRefs,
    ];
    if (undeclared.length) {
      return unsupported('undeclared plugin [Argument] reference(s): ' + [...new Set(undeclared)].sort().join(', '));
    }
    if (usage.conditionRefs.length) {
      return unsupported('plugin [Argument] condition has no verified Surge Script declaration equivalent: ' + usage.conditionRefs.join(', '));
    }
  }

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

  let params;
  let notes = [];
  if (ast.phase === 'request' || ast.phase === 'response') {
    const condition = scriptUrlCondition(ast, 'surge');
    if (!condition.ok) return condition;
    notes = condition.notes || [];
    params = [
      'type=http-' + ast.phase,
      'pattern=' + condition.pattern,
    ];
  } else {
    const trigger = surgeTriggerParams(ast, argumentTable);
    if (!trigger.ok) return trigger;
    params = [...trigger.params];
  }
  params.push('script-path=' + scriptUrl);

  if (scriptOptionBoolean(ast, 'requires_body', false)) {
    params.push('requires-body=true');
    params.push('max-size=-1');
  }
  if (scriptOptionBoolean(ast, 'binary_body_mode', false)) params.push('binary-body-mode=true');

  const timeout = scriptOption(ast, 'timeout');
  if (timeout?.type === 'number') params.push('timeout=' + timeout.value);
  else if (timeout?.type === 'variable') {
    const placeholder = surgeDynamicOptionValue(timeout.name, argumentTable);
    if (!placeholder) return unsupported('dynamic timeout references undeclared Surge module argument: ' + timeout.name);
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
    const placeholder = surgeDynamicOptionValue(debug.name, argumentTable);
    if (!placeholder) return unsupported('dynamic debug references undeclared Surge module argument: ' + debug.name);
    params.push('debug=' + placeholder);
  }

  return {
    ok:true,
    strategy:'native-declaration',
    section:'script',
    line:(requirementPrefix ? requirementPrefix + ' ' : '') + name + ' = ' + params.join(','),
    tag:fixedOption(ast, 'tag'),
    notes,
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
