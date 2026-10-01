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

export function dependencySpecFromAction(action, { pluginSourceUrl = '' } = {}) {
  const def = FILE_ACTIONS[action?.name];
  if (!def) return null;

  const ref = stringValue(action.args?.[def.pathIndex]);
  if (!ref) throw new Error(`${action.name}: file dependency must be a fixed non-empty string`);

  let url = null;
  let scope = 'plugin-resource';
  try {
    const absolute = new URL(ref);
    if (!/^https?:$/.test(absolute.protocol)) throw new Error('unsupported protocol');
    url = absolute.href;
    scope = 'remote';
  } catch {
    if (!pluginSourceUrl) {
      return { action: action.name, kind: def.kind, ref, scope, url: null, resolvable: false, reason: 'relative plugin resource requires the plugin source URL' };
    }
    const base = new URL(pluginSourceUrl);
    if (!/^https?:$/.test(base.protocol)) throw new Error(`${action.name}: plugin source URL must be HTTP(S)`);
    url = new URL(ref, base).href;
  }

  const spec = { action: action.name, kind: def.kind, ref, scope, url, resolvable: true };
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
  return null;
}

export function isDiscardedLegacyJqPathAction(action) {
  if (!/^(?:request|response)\.json\.jq$/.test(action?.name || '')) return false;
  const value = stringValue(action.args?.[0]);
  return /^jq-path=/i.test(String(value || '').trim());
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
