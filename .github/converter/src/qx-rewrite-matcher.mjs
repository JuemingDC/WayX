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

function exactPredicates(node) {
  const n=unwrap(node);
  if (!n) return {ok:false,reason:'missing Rewrite condition'};

  if (n.type==='comparison') {
    const item=comparisonKey(n);
    if (!item) return {ok:false,reason:'condition comparison is outside the exact QX matcher subset'};
    return {ok:true,predicates:new Map([[item.key,item]])};
  }

  if (n.type!=='logical' || n.operator!=='&&') {
    return {ok:false,reason:'exact QX matcher currently requires a comparison or AND-only condition'};
  }

  const left=exactPredicates(n.left);
  if (!left.ok) return left;
  const right=exactPredicates(n.right);
  if (!right.ok) return right;

  const merged=new Map([...left.predicates,...right.predicates]);
  const urls=[...merged.values()].filter(item=>item.kind==='url-regex');
  const methods=[...merged.values()].filter(item=>item.kind==='request-method-eq');
  if (urls.length>1) return {ok:false,reason:'exact QX matcher cannot intersect multiple distinct URL regex predicates'};
  if (methods.length>1) return {ok:false,reason:'exact QX matcher cannot satisfy multiple distinct request.method equalities'};
  return {ok:true,predicates:merged};
}

function matcherFromPredicates(predicates) {
  const url=selectUrlPredicate(predicates);
  const method=selectMethodPredicate(predicates);
  const hasUrl=Boolean(url);
  const hasHeaders=Boolean(method);
  const urlPattern=hasUrl ? url.pattern : '^https?://';

  if (hasHeaders) {
    // Quantumult X url-and-header always evaluates the URL first and then the
    // request-side Headers comparison string. Therefore:
    // - URL + Headers condition => preserve both.
    // - Headers-only condition => use an all-HTTP(S) URL guard plus Headers.
    // A URL-only source condition must never be upgraded to url-and-header.
    const headersPattern='^'+regexEscape(method.value)+'[ ]';
    return {
      ok:true,
      matcher:'url-and-header',
      matchScope:hasUrl ? 'url-and-headers' : 'headers-only',
      urlPattern,
      headersPattern,
      prefix:urlPattern+' '+headersPattern+' url-and-header ',
      pushedDown:['request.method'],
    };
  }

  return {
    ok:true,
    matcher:'url',
    matchScope:hasUrl ? 'url-only' : 'unfiltered',
    urlPattern,
    headersPattern:null,
    prefix:urlPattern+' url ',
    pushedDown:[],
  };
}

export function qxExactRewriteMatcherPlan(ast) {
  const exact=exactPredicates(ast?.condition);
  if (!exact.ok) return exact;
  return {...matcherFromPredicates(exact.predicates),exact:true};
}

export function qxRewriteMatcherPlan(ast) {
  const predicates=guaranteedPredicates(ast?.condition);
  // Prefilter mode may intentionally drop non-native predicates because the
  // generated helper re-evaluates the complete source condition.
  return {...matcherFromPredicates(predicates),exact:false};
}
