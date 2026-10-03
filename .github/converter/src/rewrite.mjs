
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Rewrite / Domain

// WayX Loon Rewrite v2 tokenizer/parser/AST
// Author: chance
// Category: Converter / Rewrite v2
const BT=String.fromCharCode(96),PUN='(),[].|';
function fail(s,i,m){throw new SyntaxError(m+' at column '+(i+1)+'\n'+s+'\n'+' '.repeat(Math.max(0,i))+'^')}
function dq(r){let o='';for(let i=1;i<r.length-1;i++){let c=r[i];if(c!=='\\'){o+=c;continue}let n=r[++i];o+=n==='n'?'\n':n==='r'?'\r':n==='t'?'\t':n==='"'?'"':n==='\\'?'\\':'\\'+n}return o}
export function tokenizeRewriteV2(source){const s=String(source??''),a=[];let i=0;const add=(type,raw,value=raw,start=i,end=i+raw.length)=>a.push({type,raw,value,start,end});while(i<s.length){let c=s[i];if(/\s/.test(c)){i++;continue}let st=i,t=s.slice(i,i+2);if(['&&','||','==','~='].includes(t)){add('operator',t,t,st,i+2);i+=2;continue}if(PUN.includes(c)){add('punct',c,c,st,++i);continue}if(c==='$'&&s[i+1]==='{'){i+=2;let d=1,q=null,e=false;while(i<s.length&&d){c=s[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;i++;continue}if(c==="'"){q=c;i++;continue}if(c==='{')d++;else if(c==='}')d--;i++}if(d)fail(s,st,'Unterminated variable');let r=s.slice(st,i);add('variable',r,r.slice(2,-1),st,i);continue}if(c==='"'){i++;let e=false,ok=false;while(i<s.length){c=s[i++];if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c==='"'){ok=true;break}}if(!ok)fail(s,st,'Unterminated string');let r=s.slice(st,i);add('string',r,dq(r),st,i);continue}if(c===BT){i++;let ok=false;while(i<s.length){if(s[i]!==BT){i++;continue}if(s[i+1]===BT){i+=2;continue}i++;ok=true;break}if(!ok)fail(s,st,'Unterminated raw string');let r=s.slice(st,i);add('raw-string',r,r.slice(1,-1).split(BT+BT).join(BT),st,i);continue}if(c==='/'){i++;let e=false,cl=false,ok=false;while(i<s.length){c=s[i++];if(e){e=false;continue}if(c==='\\'){e=true;continue}if(c==='['){cl=true;continue}if(c===']'&&cl){cl=false;continue}if(c==='/'&&!cl){ok=true;break}}if(!ok)fail(s,st,'Unterminated regex');while(i<s.length&&/[A-Za-z]/.test(s[i]))i++;let r=s.slice(st,i),k=r.lastIndexOf('/'),flags=r.slice(k+1);if(/[^ims]/.test(flags))fail(s,st,'Unsupported Loon regex flag(s): '+flags);if(new Set(flags).size!==flags.length)fail(s,st,'Duplicate Loon regex flag(s): '+flags);add('regex',r,{pattern:r.slice(1,k),flags},st,i);continue}let n=s.slice(i).match(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);if(n){let r=n[0];i+=r.length;add('number',r,Number(r),st,i);continue}if(/[A-Za-z_]/.test(c)){i++;while(i<s.length&&/[A-Za-z0-9_-]/.test(s[i]))i++;let r=s.slice(st,i);add('identifier',r,r,st,i);continue}fail(s,i,'Unexpected character '+JSON.stringify(c))}a.push({type:'eof',raw:'',value:null,start:s.length,end:s.length});return a}
class Parser{constructor(s){this.s=String(s??'');this.t=tokenizeRewriteV2(this.s);this.i=0}p(n=0){return this.t[Math.min(this.i+n,this.t.length-1)]}is(t,v,n=0){let x=this.p(n);return x.type===t&&(v===undefined||x.value===v)}kw(v){return this.is('identifier',v)}next(){return this.t[this.i++]}need(t,v,m){let x=this.p();if(!this.is(t,v))fail(this.s,x.start,m||'Expected '+(v??t)+', got '+(x.raw||x.type));return this.next()}parse(){let q=this.need('identifier',undefined,'Expected request or response'),phase=q.value.toLowerCase();if(!['request','response'].includes(phase))fail(this.s,q.start,'Unsupported rewrite phase '+q.raw);this.need('identifier','if');let condition=this.or();this.need('identifier','then');let actions=this.pipe();this.need('eof',undefined,'Unexpected trailing token');return{type:'rewrite',syntax:'loon-rewrite-v2',phase,condition,actions,raw:this.s}}or(){let l=this.and();while(this.is('operator','||')){this.next();l={type:'logical',operator:'||',left:l,right:this.and()}}return l}and(){let l=this.primary();while(this.is('operator','&&')){this.next();l={type:'logical',operator:'&&',left:l,right:this.primary()}}return l}primary(){if(this.is('punct','(')){this.next();let e=this.or();this.need('punct',')','Expected closing condition parenthesis');return{type:'group',expression:e}}return this.cmp()}cmp(){let left=this.val(false),o=this.need('operator',undefined,'Expected == or ~='),right=this.val(false),capture=null;if(!['==','~='].includes(o.value))fail(this.s,o.start,'Unsupported comparison '+o.raw);if(this.kw('as')){if(o.value!=='~=')fail(this.s,this.p().start,'as capture is only valid after ~=');this.next();capture=this.need('identifier',undefined,'Expected capture name').value}return{type:'comparison',operator:o.value,left,right,capture}}pipe(){let a=[this.action()];while(this.is('punct','|')){this.next();a.push(this.action())}return a}action(){let n=[this.need('identifier',undefined,'Expected action name').value];while(this.is('punct','.')){this.next();n.push(this.need('identifier',undefined,'Expected action name after dot').value)}let args=[];if(this.is('punct','(')){this.next();if(!this.is('punct',')'))for(;;){args.push(this.val(true));if(!this.is('punct',','))break;this.next()}this.need('punct',')','Expected closing action parenthesis')}return{type:'action',name:n.join('.'),args}}val(arr){let x=this.p();if(arr&&this.is('punct','['))return this.array();if(x.type==='variable'){this.next();return{type:'variable',name:x.value,raw:x.raw}}if(['string','raw-string'].includes(x.type)){this.next();return{type:x.type,value:x.value,raw:x.raw}}if(x.type==='regex'){this.next();return{type:'regex',pattern:x.value.pattern,flags:x.value.flags,raw:x.raw}}if(x.type==='number'){this.next();return{type:'number',value:x.value,raw:x.raw}}if(x.type==='identifier'&&['true','false'].includes(x.value)){this.next();return{type:'boolean',value:x.value==='true',raw:x.raw}}if(x.type==='identifier'&&x.value==='null'){this.next();return{type:'null',value:null,raw:x.raw}}fail(this.s,x.start,'Expected value, got '+(x.raw||x.type))}array(){this.need('punct','[');let items=[];if(!this.is('punct',']'))for(;;){if(this.is('punct','['))fail(this.s,this.p().start,'Nested arrays are not supported');items.push(this.val(false));if(!this.is('punct',','))break;this.next()}this.need('punct',']','Expected closing array bracket');return{type:'array',items}}}
export function parseRewriteV2(s){return new Parser(s).parse()}
export function isRewriteV2(s){return /^\s*(?:request|response)\s+if\b/.test(String(s??''))}
export function valueToSource(n){if(n.type==='array')return'['+n.items.map(valueToSource).join(', ')+']';if(n.raw!=null)return n.raw;throw new TypeError('Unsupported value '+n.type)}
function prec(n){return n.type==='logical'?(n.operator==='||'?1:2):n.type==='group'?4:3}
export function conditionToSource(n,p=0){if(n.type==='comparison')return valueToSource(n.left)+' '+n.operator+' '+valueToSource(n.right)+(n.capture?' as '+n.capture:'');if(n.type==='group')return'('+conditionToSource(n.expression)+')';if(n.type==='logical'){let q=prec(n),b=conditionToSource(n.left,q)+' '+n.operator+' '+conditionToSource(n.right,q);return q<p?'('+b+')':b}throw new TypeError('Unsupported condition '+n.type)}
export function actionToSource(n){if(n.type!=='action')throw new TypeError('Unsupported action '+n.type);return n.args.length?n.name+'('+n.args.map(valueToSource).join(', ')+')':n.name}
export function rewriteV2ToSource(a){if(!a||a.type!=='rewrite')throw new TypeError('Expected Rewrite v2 AST');return a.phase+' if '+conditionToSource(a.condition)+' then '+a.actions.map(actionToSource).join(' | ')}
export function findRewriteComparisons(n,p=()=>true,o=[]){if(!n)return o;if(n.type==='comparison'){if(p(n))o.push(n);return o}if(n.type==='group')return findRewriteComparisons(n.expression,p,o);if(n.type==='logical'){findRewriteComparisons(n.left,p,o);findRewriteComparisons(n.right,p,o)}return o}


// Target-neutral Rewrite Semantic IR
// Author: chance
// Category: Converter / Rewrite / Semantic IR

const LEGACY_REJECT_VARIANTS = new Map([
  ['reject', {variant:'generic', status:null}],
  ['reject-200', {variant:'empty', status:200}],
  ['reject-img', {variant:'image', status:200}],
  ['reject-dict', {variant:'dict', status:200}],
  ['reject-array', {variant:'array', status:200}],
  ['reject-video', {variant:'video', status:null}],
]);

function shellTokens(input) {
  const out=[];
  let cur='', quote=null, esc=false;
  for (const ch of String(input ?? '')) {
    if (esc) { cur+=ch; esc=false; continue; }
    if (ch==='\\' && quote) { cur+=ch; esc=true; continue; }
    if (quote) {
      cur+=ch;
      if (ch===quote) quote=null;
      continue;
    }
    if (ch==='"' || ch==="'") { quote=ch; cur+=ch; continue; }
    if (/\s/.test(ch)) {
      if (cur) { out.push(cur); cur=''; }
    } else cur+=ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function unquoteRewriteToken(token) {
  const t=String(token ?? '');
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1,-1);
  }
  return t;
}

export const LOON_LEGACY_MOCK_OPTION_NAMES = new Set([
  'data-type',
  'data',
  'status-code',
  'data-path',
  'mock-data-is-base64',
]);

function legacyMockOptionNames(rest) {
  const source=String(rest ?? '');
  const out=[];
  let quote=null, esc=false;
  for(let i=0;i<source.length;){
    const ch=source[i];
    if(quote){
      if(esc){ esc=false; i++; continue; }
      if(ch==='\\'){ esc=true; i++; continue; }
      if(ch===quote) quote=null;
      i++;
      continue;
    }
    if(ch==='"' || ch==="'"){ quote=ch; i++; continue; }
    if(i===0 || /\s/.test(source[i-1])){
      const match=source.slice(i).match(/^([A-Za-z][A-Za-z0-9-]*)=/);
      if(match){ out.push(match[1].toLowerCase()); i+=match[0].length; continue; }
    }
    i++;
  }
  return [...new Set(out)];
}

function parseLegacyMockData(rest) {
  const source=String(rest || '');
  const quotedStart=source.search(/\bdata="/i);
  if (quotedStart>=0) {
    const valueStart=source.indexOf('"',quotedStart)+1;
    const tail=source.slice(valueStart);
    const marker=tail.match(/"\s+(?=(?:status-code|data-path|mock-data-is-base64)=)/i);
    const end=marker ? valueStart+marker.index : source.lastIndexOf('"');
    if (end>=valueStart) {
      return source.slice(valueStart,end)
        .replace(/\\"/g,'"')
        .replace(/\\n/g,'\n')
        .replace(/\\\\/g,'\\');
    }
  }
  const unquoted=source.match(/\bdata=([^\s]+)/i);
  return unquoted ? unquoted[1] : null;
}

function parseLegacyMock(rest) {
  const type=(String(rest).match(/\bdata-type=([^\s]+)/i)||[])[1] || 'text';
  const status=Number((String(rest).match(/\bstatus-code=(\d+)/i)||[])[1] || 200);
  const dataPath=(String(rest).match(/\bdata-path=([^\s]+)/i)||[])[1] || null;
  const base64=/\bmock-data-is-base64=(?:true|1)\b/i.test(String(rest));
  return {type,status,data:parseLegacyMockData(rest),dataPath,base64};
}

export function classifyLegacyRewriteAction(action) {
  const raw=String(action ?? '').trim();
  const lower=raw.toLowerCase();

  if (LEGACY_REJECT_VARIANTS.has(lower)) {
    const semantic=LEGACY_REJECT_VARIANTS.get(lower);
    return {
      kind:'reject',
      action:lower,
      variant:semantic.variant,
      status:semantic.status,
      raw,
    };
  }

  let match=raw.match(/^(302|307)\s+(.+)$/i);
  if (match) {
    return {
      kind:'redirect',
      status:Number(match[1]),
      target:match[2],
      redirectMode:'absolute-location',
      raw,
    };
  }

  match=raw.match(/^header\s+(.+)$/i);
  if (match) {
    return {
      kind:'url-rewrite',
      target:match[1],
      rewriteMode:'transparent-replace',
      raw,
    };
  }

  match=raw.match(/^(response-)?header-(add|del|replace|replace-regex)\s+(.+)$/i);
  if (match) {
    return {
      kind:'header',
      phase:match[1] ? 'response':'request',
      operation:match[2].toLowerCase(),
      rest:match[3],
      raw,
    };
  }

  match=raw.match(/^(request|response)-body-replace-regex\s+(.+)$/i);
  if (match) {
    return {
      kind:'body-regex',
      phase:match[1].toLowerCase(),
      operation:'replace',
      rest:match[2],
      raw,
    };
  }

  match=raw.match(/^(request|response)-body-json-(add|replace|del|jq)\s+(.+)$/i);
  if (match) {
    return {
      kind:'json',
      phase:match[1].toLowerCase(),
      operation:match[2].toLowerCase(),
      rest:match[3],
      raw,
    };
  }

  match=raw.match(/^mock-(request|response)-body\s+(.+)$/i);
  if (match) {
    const optionNames=legacyMockOptionNames(match[2]);
    const unknownOptions=optionNames.filter(name=>!LOON_LEGACY_MOCK_OPTION_NAMES.has(name));
    if(unknownOptions.length){
      return {
        kind:'unknown',
        raw,
        reason:'unknown legacy mock option(s): '+unknownOptions.join(','),
      };
    }
    return {
      kind:'mock',
      phase:match[1].toLowerCase(),
      operation:'inline',
      optionNames,
      mock:parseLegacyMock(match[2]),
      raw,
    };
  }

  return {kind:'unknown',raw};
}

export function isDiscardedLegacyJqPathIr(ir) {
  if (!ir || ir.type!=='rewrite-semantic-ir' || ir.sourceSyntax!=='legacy') return false;
  if (!Array.isArray(ir.operations) || ir.operations.length!==1) return false;
  const op=ir.operations[0];
  return op?.kind==='json' &&
    op?.operation==='jq' &&
    /^jq-path\s*=/i.test(String(op?.rest || '').trim());
}

export function isEmptyJsonJqIr(ir) {
  if (!ir || ir.type!=='rewrite-semantic-ir') return false;
  if (!Array.isArray(ir.operations) || ir.operations.length!==1) return false;
  const op=ir.operations[0];
  if (op?.kind!=='json' || op?.operation!=='jq') return false;

  if (ir.sourceSyntax==='legacy') {
    const raw=String(op?.rest ?? '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/gu,'')
      .trim();
    if (!raw) return true;
    return unquoteRewriteToken(raw).trim()==='';
  }

  if (ir.sourceSyntax==='v2') {
    const node=op?.sourceAction?.args?.[0];
    return Boolean(
      node &&
      ['string','raw-string'].includes(node.type) &&
      String(node.value ?? '').trim()===''
    );
  }

  return false;
}

export function isEmptyLegacyJsonJqIr(ir) {
  return ir?.sourceSyntax==='legacy' && isEmptyJsonJqIr(ir);
}

export function legacyRewriteToSemanticIr(pattern,action) {
  const sourcePattern=String(pattern ?? '').trim();
  const sourceAction=String(action ?? '').trim();
  const op=classifyLegacyRewriteAction(sourceAction);
  return {
    type:'rewrite-semantic-ir',
    sourceSyntax:'legacy',
    source:sourcePattern + (sourceAction ? ' ' + sourceAction : ''),
    phase:op.phase || (op.kind==='redirect' || op.kind==='url-rewrite' || op.kind==='reject' ? 'request' : null),
    condition:{
      type:'url-regex',
      pattern:sourcePattern,
    },
    operations:[op],
    pipeline:false,
    sourcePayload:{
      pattern:sourcePattern,
      action:sourceAction,
    },
  };
}

function scalarValue(node) {
  if (!node) return null;
  if (Object.hasOwn(node,'value')) return node.value;
  return null;
}

function classifyRewriteV2Action(action,phase) {
  const name=String(action?.name || '');
  if (/^reject(?:_|$)/.test(name)) {
    const variant = name==='reject_dict' ? 'dict'
      : name==='reject_array' ? 'array'
      : name==='reject_img' ? 'image'
      : name==='reject_200' ? 'empty'
      : 'generic';
    return {
      kind:'reject',
      actionName:name,
      variant,
      status:scalarValue(action?.args?.[0]),
      sourceAction:action,
    };
  }

  if (name==='redirect') {
    return {
      kind:'redirect',
      actionName:name,
      status:scalarValue(action?.args?.[0]),
      targetNode:action?.args?.[1] || null,
      redirectMode:'matched-range-template',
      sourceAction:action,
    };
  }

  const header=name.match(/^(request|response)\.header\.(add|set|del|replace)$/);
  if (header) {
    return {
      kind:'header',
      phase:header[1],
      operation:header[2],
      actionName:name,
      sourceAction:action,
    };
  }

  const body=name.match(/^(request|response)\.body\.replace$/);
  if (body) {
    return {
      kind:'body-regex',
      phase:body[1],
      operation:'replace',
      actionName:name,
      sourceAction:action,
    };
  }

  const json=name.match(/^(request|response)\.json\.(add|delete|replace|jq|jq_file)$/);
  if (json) {
    return {
      kind:'json',
      phase:json[1],
      operation:json[2],
      actionName:name,
      sourceAction:action,
    };
  }

  const mock=name.match(/^(request|response)\.body\.(mock|mock_file)$/);
  if (mock) {
    return {
      kind:'mock',
      phase:mock[1],
      operation:mock[2]==='mock_file' ? 'file':'inline',
      actionName:name,
      sourceAction:action,
    };
  }

  return {
    kind:'action',
    phase,
    actionName:name,
    sourceAction:action,
  };
}

export function rewriteV2AstToSemanticIr(ast,{source=''}={}) {
  if (!ast || ast.type!=='rewrite') throw new TypeError('Expected Rewrite v2 AST');
  const operations=(ast.actions || []).map(action=>classifyRewriteV2Action(action,ast.phase));
  return {
    type:'rewrite-semantic-ir',
    sourceSyntax:'v2',
    source:String(source || ''),
    phase:ast.phase || null,
    condition:ast.condition || null,
    operations,
    pipeline:operations.length>1,
    sourcePayload:{ast},
  };
}

export function singleRewriteOperation(ir) {
  return ir?.operations?.length===1 ? ir.operations[0] : null;
}

export function rewriteOperationKinds(ir) {
  return (ir?.operations || []).map(op=>op.kind);
}

export function isRewriteOperation(ir,kind,{phase=null,operation=null,actionName=null}={}) {
  const op=singleRewriteOperation(ir);
  if (!op || op.kind!==kind) return false;
  if (phase!==null && op.phase!==phase) return false;
  if (operation!==null && op.operation!==operation) return false;
  if (actionName!==null && op.actionName!==actionName) return false;
  return true;
}

export function legacyRewriteTokens(text) {
  return shellTokens(text).map(unquoteRewriteToken);
}


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

function conditionError(message) {
  const error=new Error(message);
  error.code='WAYX_REWRITE_V2_CONDITION_INVALID';
  return error;
}
function validateCondition(node, phase) {
  if (!node) throw conditionError('missing Rewrite v2 condition');
  if (node.type==='group') return validateCondition(node.expression, phase);
  if (node.type==='logical') {
    validateCondition(node.left, phase);
    validateCondition(node.right, phase);
    return;
  }
  if (node.type!=='comparison'||node.left?.type!=='variable') throw conditionError('condition left side must be a variable');
  const name=node.left.name;
  const header=/^(request|response)\.header\[['"].+['"]\]$/.test(name);
  const known=name==='url'||name==='request.method'||name==='response.status'||header;
  // Other variables may be declared plugin [Argument] references. Their
  // declaration/type is validated by the argument-usage planner before any
  // executable target rule is emitted, so keep them in the AST here.
  if(!known) return;
  if(phase==='request' && (name==='response.status'||name.startsWith('response.header['))) throw conditionError('request phase cannot reference response data: '+name);
  if(node.operator==='~=') {
    if(node.right?.type!=='regex') throw conditionError('~= requires a Regex right-hand value');
    return;
  }
  if(node.operator!=='==') throw conditionError('unsupported condition operator: '+node.operator);
  if(name==='response.status' && node.right?.type!=='number' && node.right?.type!=='variable') throw conditionError('response.status equality requires Number or typed variable');
  if(name==='request.method' && !['string','raw-string','variable'].includes(node.right?.type)) throw conditionError('request.method equality requires String or typed variable');
  if(name==='url' && !['string','raw-string','variable'].includes(node.right?.type)) throw conditionError('url equality requires String or typed variable');
  if(header && !['string','raw-string','null','variable'].includes(node.right?.type)) throw conditionError('header equality requires String, null, or String variable');
}
export function validateRewriteV2Ast(ast) {
  if (!ast || ast.type !== 'rewrite') throw new TypeError('Expected Rewrite v2 AST root');
  validateCondition(ast.condition, ast.phase);
  return ast.actions.map(validateRewriteV2Action);
}


// Target adapters lower semantic fields, never provenance AST/source strings.
export function rewriteIrDeclaration(ir) {
  if (ir?.type!=='rewrite-semantic-ir' || ir.sourceSyntax!=='v2') throw new TypeError('Expected Rewrite v2 Semantic IR');
  return {
    type:'rewrite',phase:ir.phase,condition:ir.condition,
    actions:ir.operations.map(operation=>operation.sourceAction),
    raw:ir.source,
  };
}
