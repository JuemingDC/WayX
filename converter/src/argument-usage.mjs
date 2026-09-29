// WayX Loon plugin [Argument] usage analysis
// Author: chance
// Category: Converter / Argument / Semantic Analysis
import { parseLoonArguments } from './argument.mjs';
import { isRewriteV2, parseRewriteV2 } from './rewrite-v2.mjs';
import {
  isScriptV2,
  parseScriptV2,
  scriptV2ArgumentRefs,
  scriptV2DynamicOptionRefs,
} from './script-v2.mjs';

function activeLines(lines = []) {
  return lines
    .map(raw => String(raw ?? '').trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//'));
}

function collectVariableNames(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVariableNames(item, out);
    return out;
  }
  if (node.type === 'variable' && typeof node.name === 'string') out.add(node.name);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'raw') continue;
    collectVariableNames(value, out);
  }
  return out;
}

function isBuiltInRuntimeVariable(name) {
  const value = String(name || '');
  return value === 'url' || value.startsWith('request.') || value.startsWith('response.');
}

function declaredRefs(node, declaredIds) {
  const declared = declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  return [...collectVariableNames(node)]
    .filter(name => declared.has(name) && !isBuiltInRuntimeVariable(name))
    .sort();
}

function pluginObjectRefs(ast) {
  return scriptV2ArgumentRefs(ast);
}

function addUse(usage, id, use) {
  if (!usage.has(id)) usage.set(id, []);
  const list = usage.get(id);
  const key = JSON.stringify([use.section, use.kind, use.option || '', use.line || '']);
  if (!list.some(item => JSON.stringify([item.section, item.kind, item.option || '', item.line || '']) === key)) {
    list.push(use);
  }
}

function boundaryValue(line, key) {
  const re = new RegExp('(?:^|,)\\s*' + key + '\\s*=\\s*([\\s\\S]*?)(?=,\\s*[A-Za-z][A-Za-z0-9_-]*\\s*=|$)', 'i');
  return (String(line).match(re) || [])[1]?.trim() || '';
}

function legacyRefs(value) {
  const refs = new Set();
  const source = String(value || '');
  for (const match of source.matchAll(/\$?\{([A-Za-z_][\w-]*)\}/g)) refs.add(match[1]);
  return [...refs];
}

export function rewriteV2PluginArgumentRefs(ast, declaredIds = []) {
  const declared = declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  const conditionRefs = declaredRefs(ast?.condition, declared);
  const actionRefs = declaredRefs(ast?.actions, declared);
  return {
    conditionRefs,
    actionRefs,
    all: [...new Set([...conditionRefs, ...actionRefs])].sort(),
  };
}

export function scriptV2PluginArgumentUsage(ast, declaredIds = []) {
  const declared = declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  const conditionRefs = declaredRefs(ast?.condition, declared);
  const objectRefs = pluginObjectRefs(ast);
  const dynamicOptions = scriptV2DynamicOptionRefs(ast);
  const undeclaredObjectRefs = objectRefs.filter(id => !declared.has(id));
  const undeclaredOptionRefs = dynamicOptions.filter(ref => !declared.has(ref.id));
  return {
    conditionRefs,
    objectRefs,
    dynamicOptions,
    undeclaredObjectRefs,
    undeclaredOptionRefs,
    all: [...new Set([
      ...conditionRefs,
      ...objectRefs.filter(id => declared.has(id)),
      ...dynamicOptions.filter(ref => declared.has(ref.id)).map(ref => ref.id),
    ])].sort(),
  };
}

export function analyzePluginArgumentUsage({
  argumentLines = [],
  rewriteLines = [],
  scriptLines = [],
  ruleLines = [],
} = {}) {
  const declarations = parseLoonArguments(argumentLines);
  const declaredIds = new Set(declarations.map(arg => arg.id));
  const usage = new Map(declarations.map(arg => [arg.id, []]));
  const undeclaredRefs = [];
  const parseErrors = [];

  for (const line of activeLines(rewriteLines)) {
    if (!isRewriteV2(line)) continue;
    try {
      const ast = parseRewriteV2(line);
      const refs = rewriteV2PluginArgumentRefs(ast, declaredIds);
      for (const id of refs.conditionRefs) addUse(usage, id, {section:'Rewrite', kind:'condition', line});
      for (const id of refs.actionRefs) addUse(usage, id, {section:'Rewrite', kind:'action', line});
    } catch (error) {
      parseErrors.push({section:'Rewrite', line, error:String(error?.message || error).split('\n')[0]});
    }
  }

  for (const line of activeLines(scriptLines)) {
    if (isScriptV2(line)) {
      try {
        const ast = parseScriptV2(line);
        const refs = scriptV2PluginArgumentUsage(ast, declaredIds);
        for (const id of refs.conditionRefs) addUse(usage, id, {section:'Script', kind:'condition', line});
        for (const id of refs.objectRefs) {
          if (declaredIds.has(id)) addUse(usage, id, {section:'Script', kind:'argument-object', line});
          else undeclaredRefs.push({section:'Script', kind:'argument-object', id, line});
        }
        for (const ref of refs.dynamicOptions) {
          if (declaredIds.has(ref.id)) addUse(usage, ref.id, {section:'Script', kind:'dynamic-option', option:ref.option, line});
          else undeclaredRefs.push({section:'Script', kind:'dynamic-option', option:ref.option, id:ref.id, line});
        }
      } catch (error) {
        parseErrors.push({section:'Script', line, error:String(error?.message || error).split('\n')[0]});
      }
      continue;
    }

    const argument = boundaryValue(line, 'argument');
    for (const id of legacyRefs(argument)) {
      if (declaredIds.has(id)) addUse(usage, id, {section:'Script', kind:'argument-object', line});
      else undeclaredRefs.push({section:'Script', kind:'argument-object', id, line});
    }
    for (const option of ['enable','timeout','debug']) {
      const value = boundaryValue(line, option);
      for (const id of legacyRefs(value)) {
        if (declaredIds.has(id)) addUse(usage, id, {section:'Script', kind:'dynamic-option', option, line});
        else undeclaredRefs.push({section:'Script', kind:'dynamic-option', option, id, line});
      }
    }
  }

  const policyBindings = activeLines(ruleLines)
    .filter(line => /(?:^|,)\s*PROXY\s*(?:,|$)/i.test(line))
    .map(line => ({policy:'PROXY', line}));

  return {
    declarations,
    arguments: declarations.map(arg => ({
      ...arg,
      uses: usage.get(arg.id) || [],
      used: (usage.get(arg.id) || []).length > 0,
    })),
    declaredIds:[...declaredIds],
    undeclaredRefs,
    parseErrors,
    policyBindings,
  };
}
