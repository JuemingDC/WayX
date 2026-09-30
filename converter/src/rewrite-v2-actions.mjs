// WayX Loon Rewrite v2 official action registry
// Author: chance
// Category: Converter / Rewrite v2 / Action Registry

const defs = [
  ['url.replace', 1, 1, false],
  ['redirect', 2, 2, false],
  ['reject', 1, 2, false],
  ['reject_img', 1, 1, false],
  ['reject_dict', 1, 1, false],
  ['reject_array', 1, 1, false],
  ['reject_video', 1, 1, false],
  ['request.header.add', 2, 2, true],
  ['request.header.set', 2, 2, true],
  ['request.header.del', 1, 1, true],
  ['request.header.replace', 3, 3, true],
  ['response.header.add', 2, 2, true],
  ['response.header.set', 2, 2, true],
  ['response.header.del', 1, 1, true],
  ['response.header.replace', 3, 3, true],
  ['request.body.replace', 2, 2, true],
  ['response.body.replace', 2, 2, true],
  ['request.json.add', 2, 2, true],
  ['request.json.delete', 1, 1, true],
  ['request.json.replace', 2, 2, true],
  ['request.json.jq', 1, 1, false],
  ['request.json.jq_file', 1, 1, false],
  ['response.json.add', 2, 2, true],
  ['response.json.delete', 1, 1, true],
  ['response.json.replace', 2, 2, true],
  ['response.json.jq', 1, 1, false],
  ['response.json.jq_file', 1, 1, false],
  ['request.body.mock', 2, 3, false],
  ['request.body.mock_file', 2, 3, false],
  ['response.body.mock', 2, 4, false],
  ['response.body.mock_file', 2, 4, false],
];

export const LOON_REWRITE_V2_ACTIONS = new Map(defs.map(([name, minArgs, maxArgs, bulk]) => [
  name,
  Object.freeze({ name, minArgs, maxArgs, bulk }),
]));

export function getRewriteV2ActionDefinition(name) {
  return LOON_REWRITE_V2_ACTIONS.get(String(name ?? '')) || null;
}

function actionError(action, message) {
  const error = new Error(action.name+': '+message);
  error.code = 'WAYX_REWRITE_V2_ACTION_INVALID';
  error.action = action.name;
  return error;
}

export function validateRewriteV2Action(action) {
  if (!action || action.type !== 'action') throw new TypeError('Expected Rewrite v2 action AST node');
  const def = getRewriteV2ActionDefinition(action.name);
  if (!def) throw actionError(action, 'action is not present in the current official Loon Rewrite v2 registry');

  const count = action.args.length;
  if (count < def.minArgs || count > def.maxArgs) {
    const expected = def.minArgs === def.maxArgs ? String(def.minArgs) : def.minArgs+'..'+def.maxArgs;
    throw actionError(action, 'expected '+expected+' argument(s), got '+count);
  }

  const arrays = action.args.filter(arg => arg.type === 'array');
  if (arrays.length) {
    if (!def.bulk) throw actionError(action, 'array parameters are not documented for this action');
    if (arrays.length !== action.args.length) throw actionError(action, 'bulk form must use arrays for every argument');
    const lengths = new Set(arrays.map(arg => arg.items.length));
    if (arrays.some(arg => arg.items.length === 0)) throw actionError(action, 'bulk arrays must not be empty');
    if (lengths.size !== 1) throw actionError(action, 'bulk arrays must have equal lengths');
  }

  return def;
}

function conditionError(message) {
  const error=new Error(message);
  error.code='WAYX_REWRITE_V2_CONDITION_INVALID';
  return error;
}
function validateCondition(node, phase) {
  if (!node) throw conditionError('missing Rewrite v2 condition');
  if (node.type==='group') return validateCondition(node.expression, phase);
  if (node.type==='logical') {
    validateCondition(node.left, phase);
    validateCondition(node.right, phase);
    return;
  }
  if (node.type!=='comparison'||node.left?.type!=='variable') throw conditionError('condition left side must be a variable');
  const name=node.left.name;
  const header=/^(request|response)\.header\[['"].+['"]\]$/.test(name);
  if(phase==='request' && (name==='response.status'||name.startsWith('response.header['))) throw conditionError('request phase cannot reference response data: '+name);
  if(node.operator==='~=') {
    if(node.right?.type!=='regex') throw conditionError('~= requires a Regex right-hand value');
    return;
  }
  if(node.operator!=='==') throw conditionError('unsupported condition operator: '+node.operator);
  if(name==='response.status' && node.right?.type!=='number' && node.right?.type!=='variable') throw conditionError('response.status equality requires Number or typed variable');
  if(header && !['string','raw-string','null','variable'].includes(node.right?.type)) throw conditionError('header equality requires String, null, or String variable');
}
export function validateRewriteV2Ast(ast) {
  if (!ast || ast.type !== 'rewrite') throw new TypeError('Expected Rewrite v2 AST root');
  validateCondition(ast.condition, ast.phase);
  return ast.actions.map(validateRewriteV2Action);
}

// QX primitives are selected by behavior. The official Quantumult X sample
// defines `reject` as an empty HTTP 404 response and `reject-200` as empty 200.
export const QX_REWRITE_PRIMITIVES = Object.freeze({
  reject_404: 'reject',
  reject_200: 'reject-200',
  reject_img_200: 'reject-img',
  reject_dict_200: 'reject-dict',
  reject_array_200: 'reject-array',
  redirect_302: '302',
  redirect_307: '307',
  request_json_jq: 'jsonjq-request-body',
  response_json_jq: 'jsonjq-response-body',
  request_body_replace: 'request-body',
  response_body_replace: 'response-body',
});

function statusIs200(action) {
  const status = action.args?.[0];
  return status?.type === 'number' && status.value === 200;
}

export function qxPrimitiveForRewriteV2Action(action) {
  validateRewriteV2Action(action);
  if (action.name === 'reject' && action.args.length === 1) {
    const status = action.args?.[0];
    if (status?.type !== 'number') return null;
    if (status.value === 404) return QX_REWRITE_PRIMITIVES.reject_404;
    if (status.value === 200) return QX_REWRITE_PRIMITIVES.reject_200;
    return null;
  }
  if (action.name === 'reject_img') return statusIs200(action) ? QX_REWRITE_PRIMITIVES.reject_img_200 : null;
  if (action.name === 'reject_dict') return statusIs200(action) ? QX_REWRITE_PRIMITIVES.reject_dict_200 : null;
  if (action.name === 'reject_array') return statusIs200(action) ? QX_REWRITE_PRIMITIVES.reject_array_200 : null;
  if (action.name === 'redirect') {
    const code = action.args[0];
    if (code?.type === 'number' && code.value === 302) return QX_REWRITE_PRIMITIVES.redirect_302;
    if (code?.type === 'number' && code.value === 307) return QX_REWRITE_PRIMITIVES.redirect_307;
    return null;
  }
  if (action.name === 'request.json.jq') return QX_REWRITE_PRIMITIVES.request_json_jq;
  if (action.name === 'response.json.jq') return QX_REWRITE_PRIMITIVES.response_json_jq;
  if (action.name === 'request.body.replace') return QX_REWRITE_PRIMITIVES.request_body_replace;
  if (action.name === 'response.body.replace') return QX_REWRITE_PRIMITIVES.response_body_replace;
  return null;
}
