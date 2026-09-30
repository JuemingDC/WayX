// WayX complex Rewrite v2 capability registry
// Author: chance
// Category: Converter / Rewrite v2

import { validateRewriteV2Ast } from './rewrite-v2-actions.mjs';

const families = Object.freeze([
  { id:'header-pipeline', test:a => /^(request|response)\.header\.(add|set|del|replace)$/.test(a.name) },
  { id:'body-pipeline', test:a => /^(request|response)\.body\.replace$/.test(a.name) },
  { id:'json-pipeline', test:a => /^(request|response)\.json\.(add|delete|replace)$/.test(a.name) },
]);

export function classifyComplexRewrite(ast) {
  validateRewriteV2Ast(ast);
  const matched = ast.actions.map(action => families.find(f => f.test(action))?.id || null);
  if (matched.some(x => x === null)) return { ok:false, reason:'unregistered complex action family' };
  return { ok:true, families:[...new Set(matched)], phase:ast.phase };
}

export const COMPLEX_REWRITE_FAMILIES = families.map(x => x.id);

export function complexConditionKinds(node, out = []) {
  if (!node) return out;
  if (node.type === 'group') return complexConditionKinds(node.expression, out);
  if (node.type === 'logical') {
    out.push(node.operator);
    complexConditionKinds(node.left, out);
    complexConditionKinds(node.right, out);
    return out;
  }
  if (node.type === 'comparison') {
    out.push(node.operator);
    out.push(node.left?.name || 'unknown');
    return out;
  }
  out.push('unsupported');
  return out;
}
