// Observed source-authored Loon Rewrite v2 complex signatures
// Author: chance
// Category: Converter / Rewrite v2 / Complex Type Registry
//
// Production admission is intentionally evidence-driven. Generic renderer code
// may support more combinations, but a multi-action signature is executable
// only after that signature has been observed in Source Catalog input and
// explicitly registered here.

const types = Object.freeze([
  Object.freeze({
    id:'response-mock-header-set',
    phase:'response',
    actions:Object.freeze(['response.body.mock','response.header.set']),
  }),
]);

export function complexRewriteSignature(ast) {
  if (!Array.isArray(ast?.actions)) return '';
  return ast.actions.map(action => String(action?.name || '')).join(' | ');
}

export function observedComplexRewriteType(ast) {
  const signature = complexRewriteSignature(ast);
  return types.find(type =>
    type.phase === ast?.phase &&
    type.actions.join(' | ') === signature
  ) || null;
}

export function isObservedComplexRewrite(ast) {
  return Boolean(observedComplexRewriteType(ast));
}

export const OBSERVED_COMPLEX_REWRITE_TYPES = types;
