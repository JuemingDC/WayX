// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / core





// core/regex.mjs
// WayX target-neutral source Regex semantics
// Author: chance
// Category: Converter / Core / Semantic Regex

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
  if (value===null || value===undefined) return null;
  if (typeof value!=='string') return null;
  return compileSourceRegex(node).exec(value);
}

export function testSourceRegex(node,value) {
  return execSourceRegex(node,value)!==null;
}

// core/condition-evaluator.mjs
// WayX target-neutral Loon Rewrite condition reference evaluator
// Author: chance
// Category: Converter / Core / Condition Semantics



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
  if (Array.isArray(headers)) {
    const item=headers.find(x=>String(x.field).toLowerCase()===String(name).toLowerCase());
    return item ? String(item.value ?? '') : null;
  }
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

// core/equivalence-plan.mjs
// WayX equivalence-planning result contract
// Author: chance
// Category: Converter / Core / Equivalence Planning



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
  if (proof.noFalseNegatives!==true) {
    throw new Error('guarded-helper requires proof.noFalseNegatives=true');
  }
  if (proof.safeNoop!==true) {
    throw new Error('guarded-helper requires proof.safeNoop=true');
  }
  return {kind:EQUIVALENCE_KINDS.GUARDED,target,prefilter,runtime,proof};
}

export function phaseDispatcher({target,phase,rules,runtime,proof}={}) {
  object(proof,'phase-dispatcher proof');
  if (proof.preservesOrder!==true) {
    throw new Error('phase-dispatcher requires proof.preservesOrder=true');
  }
  if (proof.safeNoop!==true) {
    throw new Error('phase-dispatcher requires proof.safeNoop=true');
  }
  if (!Array.isArray(rules) || rules.length===0) {
    throw new Error('phase-dispatcher requires at least one source rule');
  }
  return {kind:EQUIVALENCE_KINDS.DISPATCHER,target,phase,rules,runtime,proof};
}

export function unsupported(reason,details={}) {
  const message=String(reason || '').trim();
  if (!message) throw new Error('unsupported requires a non-empty reason');
  return {kind:EQUIVALENCE_KINDS.UNSUPPORTED,reason:message,details};
}


function targetMatch(result,index) {
  if (typeof result==='boolean') return result;
  if (result && typeof result==='object' && typeof result.matched==='boolean') {
    return result.matched;
  }
  throw new TypeError('target matcher model case '+index+' must return boolean or {matched:boolean}');
}

/**
 * Differential evidence for one source condition against one target matcher model.
 *
 * This is intentionally evidence, not a proof generator: finite contexts can
 * expose false positives/negatives, but cannot by themselves establish full
 * semantic equivalence.
 */
export function differentialConditionOracle({
  condition,
  target='target',
  targetModel,
  contexts=[],
}={}) {
  if (!condition || typeof condition!=='object') {
    throw new TypeError('differential oracle requires a condition AST');
  }
  if (typeof targetModel!=='function') {
    throw new TypeError('differential oracle requires a target matcher model');
  }
  if (!Array.isArray(contexts) || contexts.length===0) {
    throw new Error('differential oracle requires at least one context');
  }

  const cases=contexts.map((context,index)=>{
    const sourceMatched=Boolean(evaluateCondition(condition,context).matched);
    const targetMatched=targetMatch(targetModel(context),index);
    let classification='match';
    if (sourceMatched && !targetMatched) classification='false-negative';
    else if (!sourceMatched && targetMatched) classification='false-positive';
    return {index,sourceMatched,targetMatched,classification};
  });
  const falseNegatives=cases.filter(item=>item.classification==='false-negative');
  const falsePositives=cases.filter(item=>item.classification==='false-positive');

  return {
    target:String(target || 'target'),
    caseCount:cases.length,
    observedExact:falseNegatives.length===0 && falsePositives.length===0,
    noFalseNegatives:falseNegatives.length===0,
    noFalsePositives:falsePositives.length===0,
    falseNegatives,
    falsePositives,
    cases,
  };
}

// target-regex.mjs
// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Native target regex fields have no verified Loon flag equivalent.
// Preserve bodies; route flagged regexes through the semantic runtime.

export function normalizeRegexBodyForTarget(pattern) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other regex-body rewriting.
  return String(pattern ?? '');
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic', requireEquivalent = false } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = normalizeRegexBodyForTarget(regex.pattern);
  const flags = String(regex.flags || '');

  assertRegexNode(regex);
  if (flags && requireEquivalent) return {ok:false,reason:target+' native '+subject+' regex cannot preserve source flags '+flags,pattern,sourceFlags:flags};
  return {ok:true,pattern,sourceFlags:flags,compatibilityUnverified:Boolean(flags),notes:[]};
}

// qx-official-capabilities.mjs
// Quantumult X official capability registry used by WayX validation
// Author: chance
// Category: Converter / Quantumult X / Adblock Capability Gate

// WayX converts Loon ad-block plugins only. The target capability gate is
// intentionally limited to source-relevant Rule types, Rewrite actions and
// MITM hostname. Full-profile routing/configuration features are out of scope.
export const QX_WAYX_FILTER_TYPES = new Set([
  'host','host-suffix','host-keyword','host-wildcard',
  'ip-cidr','ip6-cidr','geoip','ip-asn','user-agent',
]);

export const QX_WAYX_REWRITE_MATCHERS = new Set([
  'url','url-and-header',
]);

export const QX_WAYX_SCRIPT_ACTIONS = new Set([
  'script-request-header','script-request-body',
  'script-response-header','script-response-body',
  'script-echo-response','script-analyze-echo-response',
]);

export const QX_WAYX_NATIVE_REWRITE_ACTIONS = new Set([
  'reject','reject-200','reject-img','reject-dict','reject-array',
  '302','307',
  'jsonjq-request-body','jsonjq-response-body',
  'request-header','response-header',
  'request-body','response-body','echo-response',
  ...QX_WAYX_SCRIPT_ACTIONS,
]);

export const QX_WAYX_SNIPPET_MITM_KEYS = new Set(['hostname']);

// surge-official-capabilities.mjs
// Surge official capability registry used by WayX validation
// Author: chance
// Category: Converter / Surge / Adblock Capability Gate

// WayX converts Loon ad-block plugins only. This registry deliberately tracks
// only source-relevant Rule types, Rewrite capabilities and MITM hostname.
export const SURGE_WAYX_RULE_TYPES = new Set([
  'DOMAIN','DOMAIN-SUFFIX','DOMAIN-KEYWORD','DOMAIN-WILDCARD','DOMAIN-SET',
  'IP-CIDR','IP-CIDR6','GEOIP','IP-ASN',
  'USER-AGENT','URL-REGEX',
  'PROCESS-NAME',
  'DEST-PORT','SRC-PORT','IN-PORT','SRC-IP','DEVICE-NAME','MAC-ADDRESS',
  'PROTOCOL','HOSTNAME-TYPE','SUBNET','CELLULAR-RADIO','CELLULAR-CARRIER',
  'AND','OR','NOT',
  'SCRIPT','RULE-SET',
]);

export const SURGE_WAYX_RULE_BUILTIN_POLICIES = new Set([
  'DIRECT',
  'REJECT','REJECT-DROP','REJECT-NO-DROP','REJECT-TINYGIF',
  'CELLULAR','CELLULAR-ONLY','HYBRID','NO-HYBRID',
]);

export const SURGE_WAYX_REWRITE_SECTIONS = new Set([
  'URL Rewrite','Header Rewrite','Body Rewrite','Map Local','Script',
]);

export const SURGE_WAYX_URL_REWRITE_TYPES = new Set([
  'header','302','307','reject',
]);

export const SURGE_WAYX_HEADER_REWRITE_ACTIONS = new Set([
  'header-add','header-del','header-replace','header-replace-regex',
]);

export const SURGE_WAYX_BODY_REWRITE_TYPES = new Set([
  'http-request','http-response','http-request-jq','http-response-jq',
]);

export const SURGE_WAYX_MAP_LOCAL_DATA_TYPES = new Set([
  'file','text','tiny-gif','base64',
]);

export const SURGE_WAYX_SCRIPT_TYPES = new Set([
  'http-request','http-response','cron','event','generic',
]);

export const SURGE_WAYX_MITM_KEYS = new Set(['hostname']);

// Shared source evaluator embedded in generated target helpers.
export function conditionRuntimeSource() {
  return 'const SUPPORTED_FLAGS=/^[ims]*$/;\n'+[
    assertRegexNode,compileSourceRegex,execSourceRegex,SemanticEvaluationError,
    cloneCaptures,decodeHeaderName,headerVariable,lookupHeader,argumentValue,
    captureValue,resolveSemanticVariable,literalValue,comparison,evaluateNode,evaluateCondition,
  ].map(fn=>fn.toString()).join('\n');
}

// Source action oracle for the Header/Body/JSON dispatcher subset. Path parsing
// is injected from the source grammar; target emitters use their own lowering.
export function evaluateRewriteActions(ast,context,{parsePath}={}) {
  const state=structuredClone(context);
  const condition=evaluateCondition(ast.condition,state);
  if (!condition.matched) return {matched:false,state,errors:[]};
  const captures=new Map(Object.entries(condition.captures));
  const value=node=>{
    if (node.type==='variable') return resolveSemanticVariable(node.name,state,captures);
    if (node.type!=='string') return node.value;
    let missing=false;
    const text=String(node.value).replace(/\$\{([^}]+)\}/g,(_,name)=>{
      const v=resolveSemanticVariable(name,state,captures);
      if (v===undefined) {missing=true;return '';}
      return String(v);
    });
    if (missing) throw new SemanticEvaluationError('missing action capture/variable');
    return text;
  };
  const errors=[];
  for (const action of ast.actions) {
    const groups=action.args[0]?.type==='array' ? action.args[0].items.map((_,i)=>action.args.map(a=>a.items[i])) : [action.args];
    for (const args of groups) try {
      const phase=state[ast.phase] ||= {};
      const operation=action.name.split('.').at(-1);
      if (action.name.includes('.header.')) {
        const headers=phase.headers ||= {};
        const name=value(args[0]);
        const keys=Object.keys(headers).filter(k=>k.toLowerCase()===String(name).toLowerCase());
        if (operation==='set') {for (const k of keys) delete headers[k];headers[keys[0] || name]=value(args[1]);}
        else if (operation==='del') {for(const k of keys) delete headers[k];}
        else if (operation==='replace') {const replacement=value(args[2]);for(const k of keys) headers[k]=replaceSourceRegex(args[1],String(headers[k]),replacement);}
        else throw new SemanticEvaluationError('unsupported oracle header action: '+operation);
      } else if (action.name.includes('.body.') && operation==='replace') {
        phase.body=replaceSourceRegex(args[0],String(phase.body ?? ''),value(args[1]));
      } else if (action.name.includes('.json.') && ['add','delete','replace'].includes(operation)) {
        let json;try{json=JSON.parse(String(phase.body ?? ''));}catch{continue;}
        const path=parsePath(value(args[0]));
        let parent=json;
        for(let i=0;i<path.length-1;i++) {
          const key=path[i];
          if (parent==null || typeof parent!=='object') {parent=null;break;}
          if (!(key in parent)) {
            if (operation!=='add') {parent=null;break;}
            parent[key]=typeof path[i+1]==='number'?[]:{};
          }
          parent=parent[key];
        }
        if (parent!=null && typeof parent==='object') {
          const key=path.at(-1),current=parent[key];
          if(operation==='delete') {if(Array.isArray(parent) && typeof key==='number') {if(key<parent.length)parent.splice(key,1);}else delete parent[key];}
          else if(operation==='add' ? current==null : current!==undefined && current!==null && current!==false) parent[key]=value(args[1]);
        }
        phase.body=JSON.stringify(json);
      } else throw new SemanticEvaluationError('unsupported oracle action: '+action.name);
    } catch(error) {errors.push({action:action.name,reason:error.message});}
  }
  return {matched:true,state,errors};
}

export function replaceSourceRegex(node,text,replacement) {
  const match=compileSourceRegex(node).exec(text);
  if (!match) return text;
  const out=String(replacement).replace(/\$(\d+)/g,(_,index)=>match[Number(index)] ?? '');
  return text.slice(0,match.index)+out+text.slice(match.index+match[0].length);
}

export function regexReplacementRuntimeSource() {
  return 'const __wayxRegexReplace=(()=>{const SUPPORTED_FLAGS=/^[ims]*$/;'+
    [assertRegexNode,compileSourceRegex,replaceSourceRegex].map(fn=>fn.toString()).join('\n')+
    ';return (text,pattern,flags,replacement)=>replaceSourceRegex({type:"regex",pattern,flags},String(text),replacement);})();';
}
