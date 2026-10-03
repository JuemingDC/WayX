// Quantumult X Rewrite native matcher planner
// Author: chance
// Category: Converter / Quantumult X / Rewrite Matching

import { normalizeRegexBodyForTarget } from './target-regex.mjs';

function unwrap(node) {
  let cur=node;
  while (cur?.type==='group') cur=cur.expression;
  return cur;
}

function fixedString(node) {
  if (!node || !['string','raw-string'].includes(node.type)) return null;
  return String(node.value);
}

function regexEscape(value) {
  return String(value).replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
}

function comparisonKey(node) {
  const n=unwrap(node);
  if (n?.type!=='comparison' || n.left?.type!=='variable') return null;

  if (n.left.name==='url' && n.operator==='~=' && n.right?.type==='regex') {
    return {
      kind:'url-regex',
      key:'url-regex\u0000'+String(n.right.pattern),
      pattern:normalizeRegexBodyForTarget(n.right.pattern),
    };
  }

  if (n.left.name==='request.method' && n.operator==='==') {
    const value=fixedString(n.right);
    if (value===null || !value || /[\s\r\n]/.test(value)) return null;
    return {
      kind:'request-method-eq',
      key:'request-method-eq\u0000'+value,
      value,
    };
  }

  return null;
}

function guaranteedPredicates(node) {
  const n=unwrap(node);
  if (!n) return new Map();

  if (n.type==='comparison') {
    const item=comparisonKey(n);
    return item ? new Map([[item.key,item]]) : new Map();
  }

  if (n.type!=='logical') return new Map();

  const left=guaranteedPredicates(n.left);
  const right=guaranteedPredicates(n.right);

  if (n.operator==='&&') {
    return new Map([...left,...right]);
  }

  if (n.operator==='||') {
    const out=new Map();
    for (const [key,item] of left) if (right.has(key)) out.set(key,item);
    return out;
  }

  return new Map();
}

function selectUrlPredicate(predicates) {
  for (const item of predicates.values()) if (item.kind==='url-regex') return item;
  return null;
}

function selectMethodPredicate(predicates) {
  for (const item of predicates.values()) if (item.kind==='request-method-eq') return item;
  return null;
}

export function qxRewriteMatcherPlan(ast) {
  const predicates=guaranteedPredicates(ast?.condition);
  const url=selectUrlPredicate(predicates);
  const method=selectMethodPredicate(predicates);

  const urlPattern=url?.pattern || '^https?://';

  if (method) {
    // QX official sample documents the Headers comparison string as beginning
    // with the request method/path. Keep the method equality exact by requiring
    // the request-line separator instead of using the broader official ^POST sample.
    const headersPattern='^'+regexEscape(method.value)+'[ ]';
    return {
      ok:true,
      matcher:'url-and-header',
      urlPattern,
      headersPattern,
      prefix:urlPattern+' '+headersPattern+' url-and-header ',
      pushedDown:['request.method'],
    };
  }

  return {
    ok:true,
    matcher:'url',
    urlPattern,
    headersPattern:null,
    prefix:urlPattern+' url ',
    pushedDown:[],
  };
}
