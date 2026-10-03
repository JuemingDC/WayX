// WayX Loon Rewrite v2 file-dependency resolver
// Author: chance
// Category: Converter / Dependency / Rewrite v2

const FILE_ACTIONS = Object.freeze({
  'request.json.jq_file': { inlineName: 'request.json.jq', pathIndex: 0, kind: 'jq' },
  'response.json.jq_file': { inlineName: 'response.json.jq', pathIndex: 0, kind: 'jq' },
  'request.body.mock_file': { pathIndex: 1, kind: 'mock' },
  'response.body.mock_file': { pathIndex: 1, kind: 'mock' },
});

const TEXT_MOCK_TYPES = new Set(['json','text','css','html','javascript','plain']);

function stringValue(node) {
  if (!node || !['string','raw-string'].includes(node.type)) return null;
  return String(node.value);
}

function boolValue(node, fallback = false) {
  if (!node) return fallback;
  return node.type === 'boolean' ? node.value : fallback;
}

function numberValue(node, fallback) {
  if (!node) return fallback;
  return node.type === 'number' && Number.isFinite(node.value) ? node.value : fallback;
}

function dependencyLocation(ref, actionName, pluginSourceUrl = '') {
  const value=String(ref ?? '').trim();
  if (!value) throw new Error(`${actionName}: file dependency must be a fixed non-empty string`);

  let url=null;
  let scope='plugin-resource';
  try {
    const absolute=new URL(value);
    if (!/^https?:$/.test(absolute.protocol)) throw new Error('unsupported protocol');
    url=absolute.href;
    scope='remote';
  } catch {
    if (!pluginSourceUrl) {
      return {ref:value,scope,url:null,resolvable:false,reason:'relative plugin resource requires the plugin source URL'};
    }
    const base=new URL(pluginSourceUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error(`${actionName}: plugin source URL must be HTTP(S)`);
    url=new URL(value,base).href;
  }
  return {ref:value,scope,url,resolvable:true};
}

function legacyJqPathRef(value) {
  const text=String(value ?? '').trim();
  const match=text.match(/^jq-path\s*=\s*(.+)$/i);
  if (!match) return null;
  let ref=match[1].trim();
  if ((ref.startsWith('"') && ref.endsWith('"')) || (ref.startsWith("'") && ref.endsWith("'"))) {
    ref=ref.slice(1,-1);
  }
  return ref.trim() || null;
}

export function dependencySpecFromAction(action, { pluginSourceUrl = '' } = {}) {
  const def = FILE_ACTIONS[action?.name];
  if (!def) return null;

  const ref = stringValue(action.args?.[def.pathIndex]);
  if (!ref) throw new Error(`${action.name}: file dependency must be a fixed non-empty string`);

  const location=dependencyLocation(ref,action.name,pluginSourceUrl);
  if (!location.resolvable) {
    return {action:action.name,kind:def.kind,...location};
  }

  const spec = { action: action.name, kind: def.kind, ...location };
  if (def.kind === 'jq') spec.inlineName = def.inlineName;
  if (def.kind === 'mock') {
    const contentType = stringValue(action.args?.[0])?.toLowerCase() || '';
    const base64Index = action.name === 'request.body.mock_file' ? 2 : 3;
    const isBase64 = boolValue(action.args?.[base64Index], false);
    spec.contentType = contentType;
    spec.base64 = isBase64;
    spec.phase = action.name.startsWith('request.') ? 'request' : 'response';
    spec.status = spec.phase === 'response' ? numberValue(action.args?.[2], 200) : null;
    spec.binary = !TEXT_MOCK_TYPES.has(contentType);
  }
  return spec;
}

export function jqDependencySpecFromAction(action, { pluginSourceUrl = '' } = {}) {
  const official = dependencySpecFromAction(action, { pluginSourceUrl });
  if (official?.kind === 'jq') return { ...official, pathIndex: FILE_ACTIONS[action.name].pathIndex };

  if (!/^(?:request|response)\.json\.jq$/.test(action?.name || '')) return null;
  const ref=legacyJqPathRef(stringValue(action.args?.[0]));
  if (!ref) return null;
  const location=dependencyLocation(ref,action.name,pluginSourceUrl);
  return {
    action:action.name,
    kind:'jq',
    inlineName:action.name,
    pathIndex:0,
    legacyAlias:true,
    ...location,
  };
}

export function legacyJqPathDependencySpecFromIr(ir,{pluginSourceUrl=''}={}) {
  if (!ir || ir.type!=='rewrite-semantic-ir' || ir.sourceSyntax!=='legacy') return null;
  if (!Array.isArray(ir.operations) || ir.operations.length!==1) return null;
  const op=ir.operations[0];
  if (op?.kind!=='json' || op?.operation!=='jq') return null;
  const ref=legacyJqPathRef(op.rest);
  if (!ref) return null;
  const actionName=(op.phase || ir.phase || 'response')+'.body.json.jq';
  const location=dependencyLocation(ref,actionName,pluginSourceUrl);
  return {
    action:actionName,
    kind:'jq',
    inlineName:null,
    pathIndex:null,
    legacyAlias:true,
    ...location,
  };
}

export function inlineResolvedLegacyJqPathIr(ir,content) {
  const spec=legacyJqPathDependencySpecFromIr(ir);
  if (!spec) return {ir,changed:false,dependency:null};
  const jq=String(content ?? '').trim();
  if (!jq) throw new Error('legacy jq-path dependency resolved to empty JQ');
  const operation={...ir.operations[0],rest:jq};
  const phase=operation.phase || ir.phase || 'response';
  const sourcePayload={
    ...ir.sourcePayload,
    action:phase+'-body-json-jq '+jq,
  };
  return {
    ir:{...ir,operations:[operation],sourcePayload},
    changed:true,
    dependency:spec,
  };
}

export function inlineResolvedDependency(action, content, { pluginSourceUrl = '' } = {}) {
  const spec = jqDependencySpecFromAction(action, { pluginSourceUrl }) || dependencySpecFromAction(action, { pluginSourceUrl });
  if (!spec) return { action, changed: false, dependency: null };
  if (!spec.resolvable) throw new Error(`${action.name}: ${spec.reason}`);
  if (spec.kind === 'mock') {
    throw new Error(`${action.name}: mock_file must be converted through a generated target script, not inlined into Rewrite v2`);
  }

  const next = {
    ...action,
    name: spec.inlineName,
    args: action.args.map(arg => ({ ...arg })),
  };
  const pathIndex = spec.pathIndex ?? FILE_ACTIONS[action.name].pathIndex;
  next.args[pathIndex] = { type: 'string', value: String(content), raw: JSON.stringify(String(content)) };
  return { action: next, changed: true, dependency: spec };
}

export function qxMockPlanFromAction(action, { pluginSourceUrl = '' } = {}) {
  const spec = dependencySpecFromAction(action, { pluginSourceUrl });
  if (!spec || spec.kind !== 'mock') return null;
  if (!spec.resolvable) throw new Error(`${action.name}: ${spec.reason}`);
  return {
    phase: spec.phase,
    qxAction: spec.phase === 'response' ? 'script-echo-response' : 'script-request-body',
    url: spec.url,
    contentType: spec.contentType,
    status: spec.status,
    base64: spec.base64,
    binary: spec.binary,
    sourceAction: action.name,
  };
}

export function listRewriteV2Dependencies(ast, options = {}) {
  if (!ast || ast.type !== 'rewrite') throw new TypeError('Expected Rewrite v2 AST');
  return ast.actions.map(action => jqDependencySpecFromAction(action, options) || dependencySpecFromAction(action, options)).filter(Boolean);
}

export { FILE_ACTIONS, TEXT_MOCK_TYPES };
