// Modified: 2026-11-03 (chance). Keep development notes outside emitted runtime code.
// SPDX-License-Identifier: GPL-3.0-only
// Runtime compatibility derived from ScriptHub qxMock/prefix; see vendor notice.
// Modified: 2026-11-02 (chance). One API-level runtime replaces source-specific
// flow proofs. Dynamic values and Env receivers are handled when APIs are called.
import { scriptCompression } from "./script-compression.ts";
import { scriptCrypto } from "./script-crypto.ts";
import { scriptHubHeaders } from "../vendor/script-hub/headers.ts";
export const scriptApiRuntime = String.raw`function(config,host,run){
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const fail=message=>{throw new TypeError('WayX API: '+message);};
  const source=config.apiPlan.source,target=config.apiPlan.target;
  const headers=(${scriptHubHeaders});
  const abLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get,typed=Object.getPrototypeOf(Uint8Array.prototype),get=name=>Object.getOwnPropertyDescriptor(typed,name).get,tag=Object.getOwnPropertyDescriptor(typed,Symbol.toStringTag).get;
  const bytes=value=>{let length;try{length=abLength.call(value);}catch{}if(length!==undefined)return new Uint8Array(value,0,length);if(ArrayBuffer.isView(value)){const isTyped=tag.call(value)!==undefined,getter=name=>isTyped?get(name).call(value):Object.getOwnPropertyDescriptor(DataView.prototype,name).get.call(value);return new Uint8Array(getter('buffer'),getter('byteOffset'),getter('byteLength'));}return fail('binary body requires BufferSource');};
  const binary=value=>{if(ArrayBuffer.isView(value))return true;try{abLength.call(value);return true;}catch{return false;}};
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&/^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);if(m)return status(Number(m[1]));return fail('invalid HTTP status');};
  const statusLine=value=>{const code=status(value);return typeof value==='string'?value:'HTTP/1.1 '+code+' '+({200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error'}[code]||'Status');};
  // Modified: 2026-11-10 (chance). QX request context and completion use path;
  // retain raw URL bytes instead of resolving a path as a new authority.
  const requestParts=value=>typeof value==='string'?/^(https?):\/\/([^/?#]+)([^#]*)/i.exec(value):null;
  const originalRequest=requestParts(host.request&&host.request.url);
  const rawPath=parts=>parts[3]?(parts[3][0]==='?'?'/':'')+parts[3]:'/';
  function view(value,requestRole=false){
    if(value===undefined)return undefined;
    const result=Object.assign({},value);
    if(requestRole&&config.from==='qx'&&originalRequest){
      if(!own(result,'scheme'))result.scheme=originalRequest[1].toLowerCase();
      if(!own(result,'path'))result.path=rawPath(originalRequest);
    }
    if(value.headers!==undefined)result.headers=headers(value.headers);
    if(own(value,target.responseStatus)){result[source.responseStatus]=status(value[target.responseStatus]);if(source.responseStatus!==target.responseStatus)delete result[target.responseStatus];}
    // Modified: 2026-11-05 (chance). Target-provided BufferSource determines binary conversion.
    if(config.binary||binary(value.bodyBytes)||binary(value.body)){
      const valueBytes=target.binaryField==='bodyBytes'?value.bodyBytes:value.body;
      if(valueBytes!==undefined){const b=bytes(valueBytes);if(source.binaryField==='bodyBytes'){result.bodyBytes=buffer(b);delete result.body;}else{result.body=b;delete result.bodyBytes;}}
    }
    return result;
  }
  const request=view(host.request,true),response=view(host.response);
  let completed=false;
  const finish=value=>{completed=true;return host.done(value);};
  function message(value,synthetic){
    if(!value||typeof value!=='object'||Array.isArray(value))return fail('completion requires an object');
    const out=Object.assign({},value);
    if(!synthetic&&config.phase==='request'&&config.from==='qx'&&own(out,'path')){
      if(typeof out.path!=='string'||!out.path.startsWith('/')||/[\r\n]/.test(out.path))fail('QX request path must be an absolute request path');
      if(config.to!=='qx'){
        if(!originalRequest)fail('QX request path requires the original HTTP URL');
        out.url=originalRequest[1]+'://'+originalRequest[2]+out.path;delete out.path;
      }
    }
    // QX's official request result documents path, not an absolute url field.
    // Same-origin changes map to path; unsupported origin changes follow the
    // existing policy of omitting undocumented QX completion parameters.
    if(config.to==='qx'&&own(out,'url')){
      const next=requestParts(out.url);
      if(!synthetic&&config.phase==='request'&&!own(out,'path')&&next&&originalRequest&&next[1].toLowerCase()===originalRequest[1].toLowerCase()&&next[2]===originalRequest[2])out.path=rawPath(next);
      delete out.url;
    }
    if(own(out,'statusCode')&&!own(out,'status'))out.status=out.statusCode;
    delete out.statusCode;
    if(own(out,'status'))out.status=target.completion.statusEncoding==='line'?statusLine(out.status):status(out.status);
    if(own(out,'headers')){if(!out.headers||typeof out.headers!=='object'||Array.isArray(out.headers))fail('completion headers require a dictionary');out.headers=Object.assign({},headers(out.headers));}
    if(own(out,'bodyBytes')){out.body=bytes(out.bodyBytes);delete out.bodyBytes;}
    if(binary(out.body)){if(target.binaryField==='bodyBytes'){out.bodyBytes=buffer(out.body);delete out.body;}else out.body=bytes(out.body);}
    if(config.to==='surge')for(const key of ['h2_trailers','node','policy'])delete out[key];
    for(const key of Object.keys(out))if(!['url','headers','body','bodyBytes','status','abort',...(config.to==='qx'&&config.phase==='request'&&!synthetic?['path']:[]),...(config.to==='loon'?['h2_trailers']:[])].includes(key)){if(config.to==='qx')delete out[key];else fail('unmapped completion field: '+key);}
    if(target.completion.synthetic==='flat')delete out.abort;
    if(target.completion.synthetic==='flat'&&!synthetic&&config.phase==='response'&&own(out,'headers')&&!own(out,'body')&&!own(out,'bodyBytes')&&config.responseBody)fail('QX response-body requires body with changed headers');
    return out;
  }
  function done(value){
    if(completed)return;
    if(['task','network','generic'].includes(config.phase))return finish(value??{});
    if(value===undefined||value===null)return finish({});
    if(value===response||value===request){
      const out={};for(const k of ['url','headers','body','bodyBytes','h2_trailers',...(config.from==='qx'&&config.phase==='request'?['path']:[]),source.responseStatus])if(own(value,k))out[k]=value[k];
      value=out;
    }
    if(typeof value==='string')value={body:value};
    let synthetic=false,payload=value;
    if(value&&typeof value==='object'&&own(value,'response')){synthetic=true;payload=value.response;}
    else if(config.from==='qx'&&config.phase==='echo')synthetic=true;
    const out=message(payload,synthetic);
    if(synthetic){if(target.completion.synthetic==='flat'){if(config.phase!=='echo')fail('QX synthetic response requires an echo declaration');return finish(out);}return finish({response:out});}
    return finish(out);
  }
  function transport(input,style,method){
    if(typeof input==='string')input={url:input};
    if(!input||typeof input!=='object'||typeof input.url!=='string')return fail('HTTP request requires url');
    const http=style==='promise'?config.apiPlan.qxHttp:source.http;
    const options=style==='promise'?(input.opts||{}):input;
    const verb=String(method||input.method||'GET').toLowerCase();
    if(!config.apiPlan.methods.includes(verb))return fail('HTTP method unavailable: '+verb);
    const req={url:input.url};
    if(own(input,'headers'))req.headers=Object.assign({},input.headers);
    if(own(input,'body')){const value=input.body;req.body=binary(value)?(target.http.style==='promise'?buffer(value):bytes(value)):value;}
    const mapped={};
    for(const semantic of ['redirect','cookie','tls'])mapped[target.http[semantic]]=own(options,http[semantic])?options[http[semantic]]:http.defaults[semantic];
    if(own(options,http.policy))mapped[target.http.policy]=options[http.policy]===http.directPolicy?target.http.directPolicy:options[http.policy];
    if(style==='callback'&&input['body-base64']&&config.from!==config.to){
      if(typeof input.body!=='string')fail('body-base64 requires a String body');
      const raw=host.codecs.atob(input.body),data=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)data[i]=raw.charCodeAt(i);
      req.body=target.http.style==='promise'?buffer(data):data;
    }
    if(target.http.style==='promise'){
      req.method=verb.toUpperCase();req.opts=mapped;
      return {req,verb};
    }
    Object.assign(req,mapped);
    if(http.timeoutMs!==null&&target.http.timeoutMs!==null&&own(input,'timeout'))req.timeout=input.timeout*http.timeoutMs/target.http.timeoutMs;
    for(const key of ['binary-mode','body-base64','alpn'])if(style==='callback'&&own(input,key)&&(key!=='body-base64'||config.from===config.to)&&(key!=='alpn'||config.from===config.to))req[key]=input[key];
    if(style==='promise')req['binary-mode']=true;
    return {req,verb};
  }
  function taskFetch(input){
    return new Promise((resolve,reject)=>{
      let plan;try{plan=transport(input,'promise');}catch(error){reject(error);return;}
      const normalize=(native,data)=>{
        if(!native)return reject({error:'HTTP transport returned no response'});
        const out={statusCode:status(native[target.responseStatus]),headers:headers(native.headers||{})};
        if(binary(data)){
          out.bodyBytes=buffer(data);
          if(target.http.style==='promise'&&typeof native.body==='string')out.body=native.body;
          else{
            const type=out.headers['content-type']||'',match=typeof type==='string'&&/charset\s*=\s*["']?([^;\s"']+)/i.exec(type);
            const encoding=match?match[1]:'utf-8',Decoder=host.codecs.TextDecoder;
            try{out.body=new Decoder(encoding).decode(bytes(data));}catch(cause){const error=new Error('HTTP response charset unavailable: '+encoding);error.code='UNSUPPORTED_RESPONSE_CHARSET';error.encoding=encoding;error.cause=cause;throw error;}
          }
        }else out.body=data;
        resolve(out);
      };
      if(target.http.style==='promise'){
        let promise;try{promise=host.task.fetch(plan.req);}catch(error){reject(error);return;}
        Promise.resolve(promise).then(r=>{try{normalize(r,r&&(own(r,'bodyBytes')?r.bodyBytes:r.body));}catch(error){reject(error);}},reject);
      }else{
        const fn=host.http&&host.http[plan.verb];if(typeof fn!=='function'){reject(new TypeError('Native HTTP method unavailable'));return;}
        try{fn.call(host.http,plan.req,(error,r,data)=>{if(error){reject({error});return;}try{normalize(r,data);}catch(e){reject(e);}});}catch(error){reject(error);}
      }
    });
  }
  const http={};for(const method of config.apiPlan.methods)http[method]=(input,callback)=>{
    if(typeof callback!=='function')return fail('HTTP callback required');
    const plan=transport(input,'callback',method);
    if(target.http.style==='callback'){
      const fn=host.http&&host.http[method];if(typeof fn!=='function')return fail('native HTTP method unavailable');
      return fn.call(host.http,plan.req,(error,r,data)=>{if(error)return callback(error,r,data);if(!r)return callback('HTTP transport returned no response',r,data);const result=Object.assign({},r,{headers:headers(r.headers||{})});result.status=status(r[target.responseStatus]);return callback(null,result,data);});
    }
    return host.task.fetch(plan.req).then(r=>{if(!r)return callback('HTTP transport returned no response',undefined,undefined);return callback(null,{status:status(r.statusCode),headers:headers(r.headers||{})},input&&input['binary-mode']&&own(r,'bodyBytes')?bytes(r.bodyBytes):r.body);},e=>callback(e&&e.error||e,undefined,undefined));
  };
  const nativeStore=target.store.style==='prefs'?host.prefs:host.store;
  const storageKey=key=>{if(key===undefined){const name=config.name||(config.from===config.to&&host.script&&host.script.name);if(!name)return fail('source storage default key needs source script name');return name;}if(typeof key!=='string')return fail('storage key must be String');return key;};
  const store={read:key=>nativeStore[target.store.read](storageKey(key)),write:(value,key)=>{
    key=storageKey(key);if(value===null||(value===undefined&&source.store.undefinedDeletes))return target.store.remove?nativeStore[target.store.remove](key):nativeStore[target.store.write](null,key);
    if(typeof value!=='string')return fail('storage value must be String or deletion marker');return nativeStore[target.store.write](value,key);
  }};
  store.remove=()=>{if(config.to==='loon')return host.store.remove();if(config.to==='qx'){host.prefs.removeAllValues();return;}return;};
  const prefKey=key=>typeof key==='string'?key:fail('QX storage requires an explicit String key');
  const prefs={valueForKey:key=>store.read(prefKey(key)),setValueForKey:(value,key)=>{key=prefKey(key);if(typeof value!=='string')return fail('QX storage value must be String');return store.write(value,key);},removeValueForKey:key=>target.store.remove?nativeStore[target.store.remove](prefKey(key)):nativeStore[target.store.write](null,prefKey(key))};
  if(config.from==='qx'&&config.to==='surge')prefs.removeAllValues=()=>undefined;
  if(config.from==='qx'&&config.to==='qx'&&host.prefs&&typeof host.prefs.removeAllValues==='function')prefs.removeAllValues=host.prefs.removeAllValues.bind(host.prefs);
  function notify(title='',subtitle='',body='',option,delay){
    if(config.apiPlan.omitNotificationOptions)return target.notification.root==='$notify'?host.notifyQx(title,subtitle,body):host.notify.post(title,subtitle,body);
    if(config.from===config.to)return host.notify.post(title,subtitle,body,option,delay);
    const raw=typeof option==='object'&&option!==null?option:{},mapped={};
    const media=raw.mediaUrl;
    if(typeof media==='string'){
      if(/^https?:\/\//i.test(media))mapped['media-url']=media;
      else{
        const uri=/^data:(image\/(?:png|jpeg|gif|webp));base64,([\s\S]*)$/i.exec(media);
        let data=uri?uri[2]:media,decoded;
        try{decoded=host.codecs.atob(data);}catch{}
        if(decoded){
          let mime=decoded.startsWith('\x89PNG\r\n\x1a\n')?'image/png':decoded.startsWith('\xff\xd8\xff')?'image/jpeg':/^GIF8[79]a/.test(decoded)?'image/gif':decoded.startsWith('RIFF')&&decoded.slice(8,12)==='WEBP'?'image/webp':undefined;
          if(mime&&(!uri||uri[1].toLowerCase()===mime)){mapped['media-base64']=host.codecs.btoa(decoded);mapped['media-base64-mime']=mime;}
        }
      }
    }
    return host.notify.post(title,subtitle,body,mapped);
  }
  let argument=config.from==='qx'||target.argument==='absent'?undefined:host.argument;
  if(config.argumentSchema&&config.argumentSchema.kind==='object'&&typeof argument==='string')argument=JSON.parse(argument);
  const script=config.from==='qx'?undefined:Object.assign({},host.script,{name:config.name||host.script&&host.script.name});
  if(script&&script.startTime!==undefined){const t=script.startTime;script.startTime=t instanceof Date?t:new Date(t*1000);}
  const environment=Object.assign({},host.environment);
  const overlay={
    $request:request,$response:response,$done:done,$script:script,
    $task:config.to==='qx'||config.from==='qx'?{fetch:taskFetch}:undefined,$httpClient:http,
    $prefs:config.to==='qx'||config.from==='qx'?prefs:undefined,$persistentStore:store,
    $notify:config.to==='qx'||config.from==='qx'?notify:undefined,$notification:{post:notify},
    $argument:argument,$environment:environment,$loon:config.to==='loon'?host.loon:undefined,
  };
  if(config.from==='loon'){
    overlay.$utils=(${scriptCompression})(host,config);
    overlay.$crypto=(${scriptCrypto})(host,config);
  }
  // Modified: 2026-11-05 (chance). Keep native target timers; do not emulate Loon one-shot interval semantics.
  overlay.TextDecoder=host.codecs.TextDecoder;
  let standards;for(const name of ['URL','URLSearchParams']){
    const set=value=>Object.defineProperty(overlay,name,{value,writable:true,enumerable:true,configurable:true});
    Object.defineProperty(overlay,name,{enumerable:true,configurable:true,get(){if(!standards)standards=typeof host.global.URL==='function'&&typeof host.global.URLSearchParams==='function'?{URL:host.global.URL,URLSearchParams:host.global.URLSearchParams}:host.url(host.codecs);const value=standards[name];set(value);return value;},set});
  }
  for(const name of ['TextEncoder','atob','btoa'])if(typeof host.global[name]==='undefined')overlay[name]=host.codecs[name];
  const scope=new Proxy(overlay,{has:(t,key)=>own(t,key),get:(t,key)=>key===Symbol.unscopables?undefined:Reflect.get(t,key),set:(t,key,value)=>Reflect.set(t,key,value)});
  const global=new Proxy(host.global,{get:(t,key)=>own(overlay,key)?overlay[key]:Reflect.get(t,key),set:(t,key,value)=>own(overlay,key)?Reflect.set(overlay,key,value):Reflect.set(t,key,value),has:(t,key)=>own(overlay,key)||Reflect.has(t,key)});
  overlay.globalThis=global;overlay.window=global;overlay.global=global;
  return run.call(global,scope);
}`;
