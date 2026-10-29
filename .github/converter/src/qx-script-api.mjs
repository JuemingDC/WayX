// Modified: 2026-10-29 (chance). Convert only documented QX HTTP API contracts;
// unknown APIs stay disabled with diagnostics rather than forwarding QX JS to Surge.
export function planQxScriptApi(source,{mode,sourceUrl}={}) {
  if(typeof source!=='string'||!source.trim())return {ok:false,reason:'Script source unavailable for API verification'};
  const modes=['request-header','request-body','response-header','response-body','echo-response','analyze-echo-response'];
  if(!modes.includes(mode))return {ok:false,reason:'Unsupported QX script mode'};
  // Conservative admission: false positives in comments are safe. No evaluation of
  // downloaded code; dynamic API access cannot be verified by this bounded adapter.
  const forbidden=/\b(?:eval|Function|globalThis|window|this)\b|\$\w+\s*\[|\b(?:sessionIndex|removeAllValues|statusCode)\s*\[/;
  if(forbidden.test(source))return {ok:false,reason:'Dynamic/global API access requires review'};
  const globals=new Set(source.match(/\$[A-Za-z_]\w*/g)||[]);
  const allowed=new Set(['$request','$response','$done','$prefs','$notify']);
  const unknown=[...globals].filter(x=>!allowed.has(x));
  if(unknown.length)return {ok:false,reason:'Unverified QX APIs: '+unknown.join(', ')};
  for(const [global,fields] of [['$request',['url','method','headers','body']],['$response',['statusCode','headers','body']],['$prefs',['valueForKey','setValueForKey','removeValueForKey']]]) {
    for(const match of source.matchAll(new RegExp('\\'+global+'\\s*\\.\\s*(\\w+)','g')))if(!fields.includes(match[1]))return {ok:false,reason:'Unverified QX API: '+global+'.'+match[1]};
  }
  // Storage key restrictions/limits and notification options differ across clients.
  // Retain them as explicit boundaries until source behavior is established.
  if(globals.has('$prefs')||globals.has('$notify'))return {ok:false,reason:'Storage/notification side effects need client parity evidence'};
  const echo=mode.includes('echo-response'),body=mode.endsWith('-body')||mode==='analyze-echo-response';
  const response=mode.startsWith('response-');
  const script=`// Converted: 2026-10-29 by chance. Source: ${sourceUrl}\n`+
`(function(__done,__request,__response){
const mode=${JSON.stringify(mode)};
const response=${response}, echo=${echo}, bodyMode=${body};
const status=value=>{if(typeof value!=="string"||!/^HTTP\\/1\\.[01] [1-5][0-9]{2}(?: .*)?$/.test(value))throw Error("Unsupported QX status line");return Number(value.split(" ")[1]);};
const $request=__request&&{url:__request.url,method:__request.method,headers:__request.headers,...(!response&&bodyMode?{body:__request.body}:{})};
const $response=response?{statusCode:__response.status,headers:__response.headers,...(bodyMode?{body:__response.body}:{})}:undefined;
if(bodyMode&&!echo&&!(response?__response:__request)?.body)return __done({});
const $done=value=>{
 if(value===undefined)return __done({});
 if(typeof value==="string"){if(!bodyMode&&!echo)throw Error("Body returned from header script");value={body:value};}
 if(value===null||typeof value!=="object"||Array.isArray(value))throw Error("Unsupported QX completion result");
 const allowed=echo?["status","headers","body"]:response?["status","headers","body"]:["url","headers","body"];
 for(const key of Object.keys(value))if(!allowed.includes(key))throw Error("Unsupported QX completion field: "+key);
 if(!bodyMode&&!echo&&Object.hasOwn(value,"body"))throw Error("Body returned from header script");
 if(response&&bodyMode&&Object.keys(value).length&&!Object.hasOwn(value,"body"))throw Error("QX response-body requires a body with header/status edits");
 const result={...value};if(Object.hasOwn(result,"status"))result.status=status(result.status);
 return __done(echo?{response:result}:result);
};
// Preserve the author program verbatim inside a QX-shaped lexical environment.
(function($request,$response,$done,$task,$prefs,$notify,$environment,$httpClient,$persistentStore,$notification,$surge){
${source}
})($request,$response,$done);
})($done,typeof $request==='undefined'?undefined:$request,typeof $response==='undefined'?undefined:$response);\n`;
  return {ok:true,script};
}
