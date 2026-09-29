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

export function validateRewriteV2Ast(ast) {
  if (!ast || ast.type !== 'rewrite') throw new TypeError('Expected Rewrite v2 AST root');
  return ast.actions.map(validateRewriteV2Action);
}

// Quantumult X capabilities are deliberately conservative. Only primitives
// directly evidenced by the official sample are declared here; everything
// else remains Review Tier until a separate semantic mapper proves equivalence.
export const QX_REWRITE_PRIMITIVES = Object.freeze({
  reject: 'reject',
  reject_img: 'reject-img',
  reject_dict: 'reject-dict',
  reject_array: 'reject-array',
  redirect_302: '302',
  redirect_307: '307',
  request_json_jq: 'jsonjq-request-body',
  response_json_jq: 'jsonjq-response-body',
  request_body_replace: 'request-body',
  response_body_replace: 'response-body',
});

export function qxPrimitiveForRewriteV2Action(action) {
  validateRewriteV2Action(action);
  if (action.name === 'reject') return QX_REWRITE_PRIMITIVES.reject;
  if (action.name === 'reject_img') return QX_REWRITE_PRIMITIVES.reject_img;
  if (action.name === 'reject_dict') return QX_REWRITE_PRIMITIVES.reject_dict;
  if (action.name === 'reject_array') return QX_REWRITE_PRIMITIVES.reject_array;
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
