// WayX deterministic Safe Tier analyzer for Loon Rewrite v2
// Author: chance
// Category: Converter / Rewrite v2 / Safe Tier
import { isRewriteV2, parseRewriteV2 } from './rewrite-v2.mjs';
import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';
import { normalizeRegexBodyForTarget } from './target-regex.mjs';

const SAFE_REJECT_ACTIONS = new Map([
  ['reject_dict', 'reject-dict'],
  ['reject_array', 'reject-array'],
  ['reject_img', 'reject-img'],
]);

function review(reason, ast = null) {
  return { matched: true, safe: false, reason, ast };
}

export function analyzeSimpleUrlRegexCondition(condition) {
  if (!condition || condition.type !== 'comparison') return { ok: false, reason: 'condition is compound or grouped' };
  if (condition.operator !== '~=') return { ok: false, reason: 'condition is not a URL regex match' };
  if (condition.left?.type !== 'variable' || condition.left.name !== 'url') return { ok: false, reason: 'left operand is not ${url}' };
  if (condition.right?.type !== 'regex') return { ok: false, reason: 'right operand is not a literal regex' };
  if (condition.capture) return { ok: false, reason: 'as capture requires semantic review' };
  return { ok: true, pattern: normalizeRegexBodyForTarget(condition.right.pattern) };
}

function safeRejectAction(action) {
  if (action?.name === 'reject') {
    if (action.args.length !== 1) return { ok: false, reason: 'reject with custom body requires semantic review' };
    const status = action.args[0];
    if (status?.type !== 'number' || !Number.isInteger(status.value) || status.value < 100 || status.value > 599) {
      return { ok: false, reason: 'reject status must be an integer in Loon 100...599' };
    }
    if (status.value === 404) return { ok: true, action: 'reject', sourceAction: 'reject', status: 404 };
    if (status.value === 200) return { ok: true, action: 'reject-200', sourceAction: 'reject', status: 200 };
    return { ok: false, reason: 'reject status has no direct QX primitive' };
  }

  const mapped = SAFE_REJECT_ACTIONS.get(action?.name);
  if (!mapped) return { ok: false, reason: 'action is outside the deterministic reject subset' };
  const status = action.args[0];
  if (status?.type !== 'number' || !Number.isInteger(status.value) || status.value < 100 || status.value > 599) {
    return { ok: false, reason: 'reject status must be an integer in Loon 100...599' };
  }
  // QX reject-dict/reject-array/reject-img are documented 200-response primitives.
  if (status.value !== 200) return { ok: false, reason: 'structured/image reject status has no direct QX primitive' };
  return { ok: true, action: mapped, sourceAction: action.name, status: status.value };
}

export function analyzeSafeRewriteV2(line) {
  if (!isRewriteV2(line)) return { matched: false, safe: false, reason: 'not Rewrite v2' };
  let ast;
  try {
    ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
  } catch (error) {
    return review(`Rewrite v2 parse/action validation failed: ${String(error?.message || error).split('\n')[0]}`);
  }

  if (ast.actions.length !== 1) return review('action pipeline remains Review Tier', ast);

  const condition = analyzeSimpleUrlRegexCondition(ast.condition);
  if (!condition.ok) return review(condition.reason, ast);

  const action = safeRejectAction(ast.actions[0]);
  if (!action.ok) return review(action.reason, ast);

  return {
    matched: true,
    safe: true,
    ast,
    phase: ast.phase,
    pattern: condition.pattern,
    action: action.action,
    sourceAction: action.sourceAction,
    status: action.status,
  };
}
