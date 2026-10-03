// WayX target-neutral Loon Rewrite condition reference evaluator
// Author: chance
// Category: Converter / Core / Condition Semantics

import { execSourceRegex } from './regex.mjs';

export class SemanticEvaluationError extends Error {
  constructor(message) {
    super(message);
    this.name='SemanticEvaluationError';
  }
}

function cloneCaptures(captures) {
  return new Map(captures);
}

function decodeHeaderName(value) {
  return String(value)
    .replace(/\\\\/g,'\\')
    .replace(/\\'/g,"'")
    .replace(/\\"/g,'"');
}

function headerVariable(name) {
  const match=String(name).match(/^(request|response)\.header\[(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")\]$/);
  if (!match) return null;
  return {phase:match[1],name:decodeHeaderName(match[2] ?? match[3] ?? '')};
}

function lookupHeader(headers,name) {
  if (headers instanceof Map) {
    for (const [key,value] of headers) {
      if (String(key).toLowerCase()===String(name).toLowerCase()) return value===undefined ? '' : String(value);
    }
    return null;
  }
  if (headers && typeof headers==='object') {
    for (const [key,value] of Object.entries(headers)) {
      if (key.toLowerCase()===String(name).toLowerCase()) return value===undefined ? '' : String(value);
    }
  }
  return null;
}

function argumentValue(context,name) {
  const args=context.arguments;
  if (args instanceof Map) return args.has(name) ? args.get(name) : undefined;
  if (args && Object.prototype.hasOwnProperty.call(args,name)) return args[name];
  return undefined;
}

function captureValue(captures,name) {
  const match=String(name).match(/^([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)$/);
  if (!match) return {found:false,value:undefined};
  const values=captures.get(match[1]);
  if (!values) return {found:true,value:undefined};
  return {found:true,value:values[Number(match[2])]};
}

export function resolveSemanticVariable(name,context,captures=new Map()) {
  const key=String(name);
  if (key==='url') return context.url;
  if (key==='request.method') return context.request?.method ?? context.method;
  if (key==='response.status') return context.response?.status ?? context.response?.statusCode;

  const header=headerVariable(key);
  if (header) {
    const headers=header.phase==='request' ? context.request?.headers : context.response?.headers;
    return lookupHeader(headers,header.name);
  }

  const captured=captureValue(captures,key);
  if (captured.found) return captured.value;

  return argumentValue(context,key);
}

function literalValue(node,context,captures) {
  if (!node) return undefined;
  switch (node.type) {
    case 'variable': return resolveSemanticVariable(node.name,context,captures);
    case 'string':
    case 'raw-string':
    case 'number':
    case 'boolean':
    case 'null': return node.value;
    case 'regex': return node;
    default: throw new SemanticEvaluationError('Unsupported condition value node: '+node.type);
  }
}

function comparison(node,context,captures) {
  const next=cloneCaptures(captures);
  const left=literalValue(node.left,context,next);

  if (node.operator==='==') {
    const right=literalValue(node.right,context,next);
    return {matched:Object.is(left,right),captures:next};
  }

  if (node.operator!=='~=') {
    throw new SemanticEvaluationError('Unsupported condition operator: '+node.operator);
  }
  if (node.right?.type!=='regex') {
    throw new SemanticEvaluationError('Dynamic ~= Regex evaluation is not implemented in Phase B core yet');
  }

  const match=execSourceRegex(node.right,left);
  if (!match) return {matched:false,captures:next};

  if (node.capture) {
    next.set(node.capture,Array.from(match));
  }
  return {matched:true,captures:next};
}

function evaluateNode(node,context,captures) {
  if (!node) throw new SemanticEvaluationError('Missing condition node');

  if (node.type==='group') return evaluateNode(node.expression,context,captures);
  if (node.type==='comparison') return comparison(node,context,captures);

  if (node.type==='logical') {
    if (node.operator==='&&') {
      const left=evaluateNode(node.left,context,cloneCaptures(captures));
      if (!left.matched) return {matched:false,captures:cloneCaptures(captures)};
      const right=evaluateNode(node.right,context,left.captures);
      if (!right.matched) return {matched:false,captures:cloneCaptures(captures)};
      return right;
    }

    if (node.operator==='||') {
      const left=evaluateNode(node.left,context,cloneCaptures(captures));
      if (left.matched) return left;
      return evaluateNode(node.right,context,cloneCaptures(captures));
    }

    throw new SemanticEvaluationError('Unsupported logical operator: '+node.operator);
  }

  throw new SemanticEvaluationError('Unsupported condition node: '+node.type);
}

export function evaluateCondition(condition,context={},initialCaptures={}) {
  const captures=initialCaptures instanceof Map
    ? cloneCaptures(initialCaptures)
    : new Map(Object.entries(initialCaptures || {}));
  const result=evaluateNode(condition,context,captures);
  return {
    matched:result.matched,
    captures:Object.fromEntries(result.captures),
  };
}
