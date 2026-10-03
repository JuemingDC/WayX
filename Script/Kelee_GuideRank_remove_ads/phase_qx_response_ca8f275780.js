// Converted: 2026-10-04 06:22:27 +08:00
// Converted by: chance
// Category: 去广告
const __wayxRegexReplace=(()=>{const SUPPORTED_FLAGS=/^[ims]*$/;function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}
function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}
function replaceSourceRegex(node,text,replacement) {
  const match=compileSourceRegex(node).exec(text);
  if (!match) return text;
  const out=String(replacement).replace(/\$(\d+)/g,(_,index)=>match[Number(index)] ?? '');
  return text.slice(0,match.index)+out+text.slice(match.index+match[0].length);
};return (text,pattern,flags,replacement)=>replaceSourceRegex({type:"regex",pattern,flags},String(text),replacement);})();
const SUPPORTED_FLAGS=/^[ims]*$/;
function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}
function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}
function execSourceRegex(node,value) {
  if (value===null || value===undefined) return null;
  if (typeof value!=='string') return null;
  return compileSourceRegex(node).exec(value);
}
class SemanticEvaluationError extends Error {
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
function resolveSemanticVariable(name,context,captures=new Map()) {
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
function stringTemplateParts(node) {
  if (node?.type==='raw-string') return [['s',String(node.value)]];
  if (node?.type!=='string') throw new TypeError('Expected a string template');
  const raw=typeof node.raw==='string' && node.raw.startsWith('"');
  const text=raw ? node.raw.slice(1,-1) : String(node.value);
  const parts=[];let literal='';
  const flush=()=>{if(literal){parts.push(['s',literal]);literal='';}};
  for(let i=0;i<text.length;i++) {
    if(text[i]==='\\' && i+1<text.length) {
      if(text.slice(i+1,i+3)==='${'){literal+='${';i+=2;continue;}
      if(raw){const n=text[++i];literal+=({n:'\n',r:'\r',t:'\t','"':'"','\\':'\\'})[n] ?? ('\\'+n);continue;}
    }
    if(text.slice(i,i+2)==='${') {
      let j=i+2,quote=null,escaped=false;
      for(;j<text.length;j++) {
        const c=text[j];
        if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;}
        else if(c==="'")quote=c;
        else if(c==='}')break;
      }
      if(j===text.length)throw new SemanticEvaluationError('Unterminated string template');
      flush();parts.push(['v',text.slice(i+2,j)]);i=j;
    } else literal+=text[i];
  }
  flush();return parts;
}
function expandSemanticString(node,context,captures) {
  let text='';
  for(const [kind,value] of stringTemplateParts(node)) {
    const v=kind==='s' ? value : resolveSemanticVariable(value,context,captures);
    if(v===undefined)return undefined;
    text+=String(v);
  }
  return text;
}
function literalValue(node,context,captures) {
  if (!node) return undefined;
  switch (node.type) {
    case 'variable': return resolveSemanticVariable(node.name,context,captures);
    case 'string': return expandSemanticString(node,context,captures);
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
function evaluateCondition(condition,context={},initialCaptures={}) {
  const captures=initialCaptures instanceof Map
    ? cloneCaptures(initialCaptures)
    : new Map(Object.entries(initialCaptures || {}));
  const result=evaluateNode(condition,context,captures);
  return {
    matched:result.matched,
    captures:Object.fromEntries(result.captures),
  };
}
function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||typeof x!=="object"||!Object.prototype.hasOwnProperty.call(x,path[i]))return null;x=x[path[i]];}return x;}
function __wayxJsonGet(root,path){let x=root;for(const k of path){if(x==null||typeof x!=="object"||!Object.prototype.hasOwnProperty.call(x,k))return undefined;x=x[k]}return x;}
function __wayxJsonSet(root,path,value){let x=root;for(let i=0;i<path.length-1;i++){const k=path[i],next=path[i+1];if(x==null||typeof x!=="object")return;const cur=Object.prototype.hasOwnProperty.call(x,k)?x[k]:undefined;if(cur==null)Object.defineProperty(x,k,{value:typeof next==="number"?[]:{},enumerable:true,writable:true,configurable:true});else if(typeof cur!=="object")return;x=x[k]}if(x!=null&&typeof x==="object")Object.defineProperty(x,path[path.length-1],{value,enumerable:true,writable:true,configurable:true});}
function __wayxJsonAdd(root,path,value){const cur=__wayxJsonGet(root,path);if(cur===undefined||cur===null)__wayxJsonSet(root,path,value);}
function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p==null)return;const k=path[path.length-1];if(Array.isArray(p)&&typeof k==="number"){if(k>=0&&k<p.length)p.splice(k,1);}else delete p[k];}
function __wayxJsonReplace(root,path,value){const cur=__wayxJsonGet(root,path);if(cur!==undefined&&cur!==null&&cur!==false)__wayxJsonSet(root,path,value);}

function __wayxCloneHeaders(h){return Array.isArray(h)?h.map(x=>({...x})):{...(h||{})}}
const __wayxRequest={...$request,headers:__wayxCloneHeaders($request.headers)};
const __wayxResponse=typeof $response==="undefined"?{}:{...$response,headers:__wayxCloneHeaders($response.headers)};
const __wayxResult={};
function __wayxCommit(value){Object.assign(__wayxResult,value);Object.assign(__wayxResponse,value);}
(($request,$response,$done)=>{
// Converted: 2026-10-04 06:22:27 +08:00
// Converted by: chance
// Category: 去广告
const __wayxCaptures=Object.create(null);
const __wayxArgs={};
let __wayxHeaders={...($response.headers||{})};
let __wayxBody=$response.body;
function __wayxValue(name){return resolveSemanticVariable(name,{url:$request.url,request:$request,response:{...$response,headers:__wayxHeaders},arguments:__wayxArgs},new Map(Object.entries(__wayxCaptures)))}
function __wayxTpl(parts){let out="";for(const [kind,name] of parts){const v=kind==="s"?name:__wayxValue(name);if(v===undefined)return undefined;out+=String(v)}return out}
function __wayxWith(v,fn){if(v!==undefined)fn(v)}
function __wayxStringValue(name){const v=__wayxValue(name);return typeof v==="string"?v:undefined}
function __wayxWithArgs(values,fn){if(values.every(v=>v!==undefined))fn(...values)}
function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));if(j===null||typeof j!=="object")return;fn(j);__wayxBody=JSON.stringify(j)}catch{}}
function __wayxSet(n,v){const k=__wayxKey(n);__wayxDel(n);Object.defineProperty(__wayxHeaders,k||n,{value:v,enumerable:true,writable:true,configurable:true});}
function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}
function __wayxHeaderReplace(n,p,r,f=""){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)__wayxHeaders[k]=__wayxRegexReplace(__wayxHeaders[k],p,f,r);}
function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}
if((()=>{
const result=evaluateCondition({"type":"comparison","operator":"~=","left":{"type":"variable","name":"url","raw":"${url}"},"right":{"type":"regex","pattern":"^https:\\/\\/zone\\.guiderank-app\\.com\\/guiderank-web\\/app\\/home\\/getHomePageV","flags":"i","raw":"/^https:\\/\\/zone\\.guiderank-app\\.com\\/guiderank-web\\/app\\/home\\/getHomePageV/i"},"capture":null},{url:$request.url,request:$request,response:typeof $response!=="undefined"?$response:{},arguments:{}});Object.assign(__wayxCaptures,result.captures);return result.matched;})()){
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","countdownBanner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","newEvaluations"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","freeToPayBannerPhotoUrl"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","groupBuyingList"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","multiCountdownBanner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","banners"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","multiPlatformBanner"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","specialSaleBannerPhotoUrl"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","guide90Evaluation"]));
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","insurancePromotions"]));
  $done({body:__wayxBody});
}else{$done({});}

})(__wayxRequest,__wayxResponse,__wayxCommit);
(($request,$response,$done)=>{
// Converted: 2026-10-04 06:22:27 +08:00
// Converted by: chance
// Category: 去广告
const __wayxCaptures=Object.create(null);
const __wayxArgs={};
let __wayxHeaders={...($response.headers||{})};
let __wayxBody=$response.body;
function __wayxValue(name){return resolveSemanticVariable(name,{url:$request.url,request:$request,response:{...$response,headers:__wayxHeaders},arguments:__wayxArgs},new Map(Object.entries(__wayxCaptures)))}
function __wayxTpl(parts){let out="";for(const [kind,name] of parts){const v=kind==="s"?name:__wayxValue(name);if(v===undefined)return undefined;out+=String(v)}return out}
function __wayxWith(v,fn){if(v!==undefined)fn(v)}
function __wayxStringValue(name){const v=__wayxValue(name);return typeof v==="string"?v:undefined}
function __wayxWithArgs(values,fn){if(values.every(v=>v!==undefined))fn(...values)}
function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));if(j===null||typeof j!=="object")return;fn(j);__wayxBody=JSON.stringify(j)}catch{}}
function __wayxSet(n,v){const k=__wayxKey(n);__wayxDel(n);Object.defineProperty(__wayxHeaders,k||n,{value:v,enumerable:true,writable:true,configurable:true});}
function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}
function __wayxHeaderReplace(n,p,r,f=""){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)__wayxHeaders[k]=__wayxRegexReplace(__wayxHeaders[k],p,f,r);}
function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}
if((()=>{
const result=evaluateCondition({"type":"comparison","operator":"~=","left":{"type":"variable","name":"url","raw":"${url}"},"right":{"type":"regex","pattern":"^https:\\/\\/zone\\.guiderank-app\\.com\\/guiderank-web\\/app\\/common\\/getInitData\\.do","flags":"i","raw":"/^https:\\/\\/zone\\.guiderank-app\\.com\\/guiderank-web\\/app\\/common\\/getInitData\\.do/i"},"capture":null},{url:$request.url,request:$request,response:typeof $response!=="undefined"?$response:{},arguments:{}});Object.assign(__wayxCaptures,result.captures);return result.matched;})()){
  __wayxJsonAction(j=>__wayxJsonDelete(j,["data","SpecialSalePageMidTabConfig"]));
  $done({body:__wayxBody});
}else{$done({});}

})(__wayxRequest,__wayxResponse,__wayxCommit);
if(Object.keys(__wayxResult).length && !("body" in __wayxResult))__wayxResult.body=__wayxResponse.body;
$done(__wayxResult);
