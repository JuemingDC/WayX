// WayX target-neutral semantic core
// Author: chance
// Category: Converter / Core / Semantic IR / Equivalence

const SUPPORTED_FLAGS=/^[ims]*$/;

function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}

export function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}

export function execSourceRegex(node,value) {
  if (value===null || value===undefined || typeof value!=='string') return null;
  return compileSourceRegex(node).exec(value);
}

export function testSourceRegex(node,value) {
  return execSourceRegex(node,value)!==null;
}

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
      if (String(key).toLowerCase()===String(name).toLowerCase()) {
        return value===undefined ? '' : String(value);
      }
    }
    return null;
  }
  if (headers && typeof headers==='object') {
    for (const [key,value] of Object.entries(headers)) {
      if (key.toLowerCase()===String(name).toLowerCase()) {
        return value===undefined ? '' : String(value);
      }
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
    throw new SemanticEvaluationError('Dynamic ~= Regex evaluation is not implemented yet');
  }

  const match=execSourceRegex(node.right,left);
  if (!match) return {matched:false,captures:next};
  if (node.capture) next.set(node.capture,Array.from(match));
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
  return {matched:result.matched,captures:Object.fromEntries(result.captures)};
}

function predicateSignature(predicate) {
  return JSON.stringify(predicate);
}

function comparisonPredicate(node) {
  if (node?.type!=='comparison' || node.left?.type!=='variable') return null;
  if (node.operator==='==' && ['string','raw-string','number','boolean','null'].includes(node.right?.type)) {
    return {
      kind:'equals',
      variable:node.left.name,
      valueType:node.right.type,
      value:node.right.value,
    };
  }
  if (node.operator==='~=' && node.right?.type==='regex') {
    const flags=String(node.right.flags || '');
    return {
      kind:'regex',
      variable:node.left.name,
      pattern:String(node.right.pattern ?? ''),
      flags,
      capture:node.capture || null,
      nativeRegexSafe:flags==='',
    };
  }
  return null;
}

function mergeUnique(left,right) {
  const out=new Map();
  for (const item of [...left,...right]) out.set(predicateSignature(item),item);
  return [...out.values()];
}

function intersectPredicates(left,right) {
  const rightSet=new Set(right.map(predicateSignature));
  return left.filter(item=>rightSet.has(predicateSignature(item)));
}

export function guaranteedConditionPredicates(condition) {
  if (!condition) return [];
  if (condition.type==='group') return guaranteedConditionPredicates(condition.expression);
  if (condition.type==='comparison') {
    const predicate=comparisonPredicate(condition);
    return predicate ? [predicate] : [];
  }
  if (condition.type==='logical') {
    const left=guaranteedConditionPredicates(condition.left);
    const right=guaranteedConditionPredicates(condition.right);
    if (condition.operator==='&&') return mergeUnique(left,right);
    if (condition.operator==='||') return intersectPredicates(left,right);
  }
  return [];
}

export const EQUIVALENCE_KINDS=Object.freeze({
  NATIVE:'native-equivalent',
  GUARDED:'guarded-helper',
  DISPATCHER:'phase-dispatcher',
  UNSUPPORTED:'unsupported',
});

function object(value,label) {
  if (!value || typeof value!=='object') throw new TypeError(label+' must be an object');
  return value;
}

export function nativeEquivalent({target,output,proof}={}) {
  object(proof,'native-equivalent proof');
  if (proof.exact!==true) throw new Error('native-equivalent requires proof.exact=true');
  return {kind:EQUIVALENCE_KINDS.NATIVE,target,output,proof};
}

export function guardedHelper({target,prefilter,runtime,proof}={}) {
  object(proof,'guarded-helper proof');
  if (proof.noFalseNegatives!==true) throw new Error('guarded-helper requires proof.noFalseNegatives=true');
  if (proof.safeNoop!==true) throw new Error('guarded-helper requires proof.safeNoop=true');
  return {kind:EQUIVALENCE_KINDS.GUARDED,target,prefilter,runtime,proof};
}

export function phaseDispatcher({target,phase,rules,runtime,proof}={}) {
  object(proof,'phase-dispatcher proof');
  if (proof.preservesOrder!==true) throw new Error('phase-dispatcher requires proof.preservesOrder=true');
  if (proof.safeNoop!==true) throw new Error('phase-dispatcher requires proof.safeNoop=true');
  if (!Array.isArray(rules) || rules.length===0) throw new Error('phase-dispatcher requires at least one source rule');
  return {kind:EQUIVALENCE_KINDS.DISPATCHER,target,phase,rules,runtime,proof};
}

export function unsupported(reason,details={}) {
  const message=String(reason || '').trim();
  if (!message) throw new Error('unsupported requires a non-empty reason');
  return {kind:EQUIVALENCE_KINDS.UNSUPPORTED,reason:message,details};
}
