// WayX complex Rewrite v2 handler registry
// Author: chance
// Category: Converter / Rewrite v2 / Complex Routing

import { classifyComplexRewrite } from './complex-rewrite.mjs';

const handlers = [];

export function registerComplexRewriteHandler(definition) {
  if (!definition || !definition.id || typeof definition.match !== 'function' || typeof definition.plan !== 'function') {
    throw new TypeError('Invalid complex Rewrite handler');
  }
  if (handlers.some(item => item.id === definition.id)) throw new Error('Duplicate complex Rewrite handler: ' + definition.id);
  handlers.push(Object.freeze({...definition}));
}

export function planComplexRewrite(ast, target, context = {}) {
  const classified = classifyComplexRewrite(ast);
  if (!classified.ok) return classified;
  if (!Array.isArray(ast?.actions) || ast.actions.length < 2) {
    return {ok:false, reason:'complex Rewrite helper is reserved for multi-action pipelines', classified};
  }
  for (const handler of handlers) {
    if (!handler.targets.includes(target)) continue;
    if (!handler.match(ast, classified, context)) continue;
    const result = handler.plan(ast, target, context);
    if (result?.ok) return {...result, handler:handler.id};
    if (result?.terminal) return {...result, handler:handler.id};
  }
  return {ok:false, reason:'no registered complex Rewrite handler matched', classified};
}

export function listComplexRewriteHandlers() {
  return handlers.map(({id,targets}) => ({id,targets:[...targets]}));
}
