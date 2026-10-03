// Converted: 2026-10-04 01:38:23 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /(^https:\/\/c\.pc\.qq\.com\/index\.html\?pfurl=)(http.*)(&pfuin=.*)/i as urlMatch then redirect(307, "${urlMatch.2}")
const __wayxCaptures=Object.create(null);
function __wayxHeader(phase,name){
  const h=phase==="request"?$request.headers:$response.headers;
  const wanted=String(name).toLowerCase();
  if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===wanted);return x?.value;}
  const k=Object.keys(h||{}).find(x=>x.toLowerCase()===wanted);
  return k===undefined?undefined:h[k];
}
const __wayxUrl=$request.url;
if((()=>{const SUPPORTED_FLAGS=/^[ims]*$/;
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
const result=evaluateCondition({"type":"comparison","operator":"~=","left":{"type":"variable","name":"url","raw":"${url}"},"right":{"type":"regex","pattern":"(^https:\\/\\/c\\.pc\\.qq\\.com\\/index\\.html\\?pfurl=)(http.*)(&pfuin=.*)","flags":"i","raw":"/(^https:\\/\\/c\\.pc\\.qq\\.com\\/index\\.html\\?pfurl=)(http.*)(&pfuin=.*)/i"},"capture":"urlMatch"},{url:$request.url,request:$request,response:typeof $response!=="undefined"?$response:{},arguments:{}});Object.assign(__wayxCaptures,result.captures);return result.matched;})()){
  const __wayxMatch=__wayxCaptures["urlMatch"];
  if(!__wayxMatch){$done({});}else{
    const __wayxTemplate="${urlMatch.2}";
    const __wayxReplacement=__wayxTemplate.replace(/\$\{urlMatch\.(\d+)\}/g,(_,n)=>__wayxMatch[Number(n)] ?? "");
    const __wayxLocation=__wayxUrl.slice(0,__wayxMatch.index)+__wayxReplacement+__wayxUrl.slice(__wayxMatch.index+__wayxMatch[0].length);
    $done({status:"HTTP/1.1 307 Temporary Redirect",headers:{Location:__wayxLocation},body:""});
  }
}else{$done({});}
