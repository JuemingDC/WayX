/* Adapter: GPL-3.0-only; derived from ScriptHub b943361f11be5795b3eb10f9cc4e5497642922fc. See vendor/script-hub/NOTICE.md. */
(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
const __wayxHost={global:globalThis,request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,task:typeof $task==='undefined'?undefined:$task,http:typeof $httpClient==='undefined'?undefined:$httpClient,prefs:typeof $prefs==='undefined'?undefined:$prefs,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,notifyQx:typeof $notify==='undefined'?undefined:$notify,notify:typeof $notification==='undefined'?undefined:$notification,script:typeof $script==='undefined'?undefined:$script,argument:typeof $argument==='undefined'?undefined:$argument,environment:typeof $environment==='undefined'?undefined:$environment,loon:typeof $loon==='undefined'?undefined:$loon,setTimeout:typeof setTimeout==='undefined'?undefined:setTimeout,codecs:(function(){
  const text=value=>{if(typeof value==='symbol')throw new TypeError('Cannot convert a Symbol to a string');return String(value);};
  const dictionary=value=>{if(value===undefined||value===null)return {};if(typeof value!=='object'&&typeof value!=='function')throw new TypeError('Options must be an object');return value;};
  const arrayBufferLength=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'byteLength').get;
  const typedPrototype=Object.getPrototypeOf(Uint8Array.prototype),typedGet=name=>Object.getOwnPropertyDescriptor(typedPrototype,name).get,dataGet=name=>Object.getOwnPropertyDescriptor(DataView.prototype,name).get;
  const typedName=Object.getOwnPropertyDescriptor(typedPrototype,Symbol.toStringTag).get,typedLength=typedGet('length'),typedBuffer=typedGet('buffer'),typedOffset=typedGet('byteOffset'),typedBytes=typedGet('byteLength'),dataBuffer=dataGet('buffer'),dataOffset=dataGet('byteOffset'),dataBytes=dataGet('byteLength'),setBytes=Uint8Array.prototype.set;
  const inputBytes=value=>{
    if(value===undefined)return new Uint8Array(0);
    let length;try{length=arrayBufferLength.call(value);}catch{}
    if(length!==undefined)return new Uint8Array(value,0,length);
    if(ArrayBuffer.isView(value)){
      const typed=typedName.call(value)!==undefined,buffer=(typed?typedBuffer:dataBuffer).call(value),offset=(typed?typedOffset:dataOffset).call(value),size=(typed?typedBytes:dataBytes).call(value);
      arrayBufferLength.call(buffer);return new Uint8Array(buffer,offset,size);
    }
    throw new TypeError('Expected an ArrayBuffer or view');
  };
  const scalar=(s,index)=>{let cp=s.charCodeAt(index),read=1;if(cp>=0xd800&&cp<=0xdbff){const low=s.charCodeAt(index+1);if(low>=0xdc00&&low<=0xdfff){cp=0x10000+((cp-0xd800)<<10)+(low-0xdc00);read=2;}else cp=0xfffd;}else if(cp>=0xdc00&&cp<=0xdfff)cp=0xfffd;return {cp,read};};
  const sequence=cp=>cp<=0x7f?[cp]:cp<=0x7ff?[0xc0|(cp>>6),0x80|(cp&63)]:cp<=0xffff?[0xe0|(cp>>12),0x80|((cp>>6)&63),0x80|(cp&63)]:[0xf0|(cp>>18),0x80|((cp>>12)&63),0x80|((cp>>6)&63),0x80|(cp&63)];
  const encoderInstances=new WeakSet();
  const encoderBrand=value=>{if(!encoderInstances.has(value))throw new TypeError('Illegal TextEncoder receiver');};
  class TextEncoder{
    constructor(){encoderInstances.add(this);}
    get encoding(){encoderBrand(this);return 'utf-8';}
    encode(input=undefined){encoderBrand(this);const s=input===undefined?'':text(input),out=[];for(let i=0;i<s.length;){const point=scalar(s,i);out.push(...sequence(point.cp));i+=point.read;}return new Uint8Array(out);}
    encodeInto(input,destination){encoderBrand(this);if(arguments.length<2)throw new TypeError('Two arguments required');const s=text(input);if(typedName.call(destination)!=='Uint8Array')throw new TypeError('Uint8Array destination required');const capacity=typedLength.call(destination);let read=0,written=0;while(read<s.length){const point=scalar(s,read),bytes=sequence(point.cp);if(written+bytes.length>capacity)break;setBytes.call(destination,bytes,written);written+=bytes.length;read+=point.read;}return {read,written};}
  }
  const decoders=new WeakMap(),decoderState=value=>{const state=decoders.get(value);if(!state)throw new TypeError('Illegal TextDecoder receiver');return state;};
  const reset=state=>{state.point=0;state.seen=0;state.need=0;state.lower=0x80;state.upper=0xbf;};
  class TextDecoder{
    constructor(label='utf-8',options=undefined){
      const encoding=text(label).replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g,'').toLowerCase(),opts=dictionary(options),fatal=!!opts.fatal,ignoreBOM=!!opts.ignoreBOM;
      if(!['utf-8','utf8','unicode-1-1-utf-8','unicode11utf8','unicode20utf8','x-unicode20utf8'].includes(encoding))throw new RangeError('Only UTF-8 labels are supported');
      const state={fatal,ignoreBOM,stream:false,bom:false};reset(state);decoders.set(this,state);
    }
    get encoding(){decoderState(this);return 'utf-8';}
    get fatal(){return decoderState(this).fatal;}
    get ignoreBOM(){return decoderState(this).ignoreBOM;}
    decode(input=undefined,options=undefined){
      const state=decoderState(this),bytes=inputBytes(input),opts=dictionary(options),stream=!!opts.stream,out=[];
      if(!state.stream){reset(state);state.bom=false;}state.stream=stream;
      const emit=cp=>{if(!state.bom){state.bom=true;if(cp===0xfeff&&!state.ignoreBOM)return;}out.push(cp<=0xffff?String.fromCharCode(cp):String.fromCharCode(0xd800+((cp-0x10000)>>10),0xdc00+((cp-0x10000)&1023)));};
      const error=()=>{reset(state);if(state.fatal)throw new TypeError('Invalid UTF-8 data');emit(0xfffd);};
      for(let i=0;i<bytes.length;i++){
        const b=bytes[i];
        if(!state.need){
          if(b<=0x7f){emit(b);continue;}
          if(b>=0xc2&&b<=0xdf){state.need=1;state.point=b&31;continue;}
          if(b>=0xe0&&b<=0xef){state.need=2;state.point=b&15;if(b===0xe0)state.lower=0xa0;if(b===0xed)state.upper=0x9f;continue;}
          if(b>=0xf0&&b<=0xf4){state.need=3;state.point=b&7;if(b===0xf0)state.lower=0x90;if(b===0xf4)state.upper=0x8f;continue;}
          error();continue;
        }
        if(b<state.lower||b>state.upper){error();i--;continue;}
        state.lower=0x80;state.upper=0xbf;state.point=(state.point<<6)|(b&63);state.seen++;
        if(state.seen===state.need){const cp=state.point;reset(state);emit(cp);}
      }
      if(!stream&&state.need)error();return out.join('');
    }
  }
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  class PortableInvalidCharacterError extends Error{get name(){return 'InvalidCharacterError';}get code(){return 5;}get [Symbol.toStringTag](){return 'DOMException';}}
  const invalid=()=>{throw typeof DOMException==='function'?new DOMException('Invalid Base64 character','InvalidCharacterError'):new PortableInvalidCharacterError('Invalid Base64 character');};
  function atob(value){if(!arguments.length)throw new TypeError('One argument required');let s=text(value).replace(/[\t\n\f\r ]/g,'');if(s.length%4===0)s=s.replace(/==?$/,'');if(s.length%4===1||/[^A-Za-z0-9+/]/.test(s))invalid();let bits=0,buffer=0,out='';for(let i=0;i<s.length;i++){buffer=(buffer<<6)|alphabet.indexOf(s[i]);bits+=6;if(bits>=8){bits-=8;out+=String.fromCharCode((buffer>>bits)&255);}}return out;}
  function btoa(value){if(!arguments.length)throw new TypeError('One argument required');const s=text(value);let out='';for(let i=0;i<s.length;i+=3){const a=s.charCodeAt(i),b=s.charCodeAt(i+1),c=s.charCodeAt(i+2);if(a>255||b>255||c>255)invalid();const word=(a<<16)|((b||0)<<8)|(c||0);out+=alphabet[(word>>>18)&63]+alphabet[(word>>>12)&63]+(i+1<s.length?alphabet[(word>>>6)&63]:'=')+(i+2<s.length?alphabet[word&63]:'=');}return out;}
  return {TextEncoder,TextDecoder,atob,btoa};
})(),utils:typeof $utils==='undefined'?undefined:$utils,crypto:typeof $crypto==='undefined'?undefined:$crypto,dns:typeof $dns==='undefined'?undefined:$dns,compression:undefined};
const __wayxContexts={"response":{"qx":{"phase":"response","binary":false,"responseBody":true,"from":"qx","to":"qx","apiPlan":{"version":1,"omitNotificationOptions":true,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"runtimePolicyVersion":2,"omittedParameters":["undocumented-qx-parameters"]},"surge":{"phase":"response","binary":false,"responseBody":true,"from":"qx","to":"surge","apiPlan":{"version":1,"omitNotificationOptions":true,"qxHttp":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"runtimePolicyVersion":2,"omittedParameters":[]}}},__wayxConfig=__wayxContexts[__wayxHost.response===undefined?'request':'response']?.[__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered HTTP source/target declaration');
return (function(config,host,run){
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const fail=message=>{throw new TypeError('WayX API: '+message);};
  const source=config.apiPlan.source,target=config.apiPlan.target;
  const headers=(function(headers){
  if(headers===undefined||headers===null)return headers;
  if(typeof headers!=='object'||Array.isArray(headers))throw new TypeError('Header dictionary required');
  const lowerCaseHeaders=Object.fromEntries(Object.entries(headers).map(([k,v])=>[k.toLowerCase(),v]));
  const key=prop=>typeof prop==='string'?prop.toLowerCase():prop;
  return new Proxy(lowerCaseHeaders,{
    get:(target,prop,receiver)=>{
      if(prop==='hasOwnProperty')return name=>Object.prototype.hasOwnProperty.call(target,key(name));
      if(prop==='propertyIsEnumerable')return name=>Object.prototype.propertyIsEnumerable.call(target,key(name));
      if(typeof prop==='string'&&!Object.prototype.hasOwnProperty.call(target,key(prop))&&['toString','toLocaleString','valueOf','constructor'].includes(prop))return Reflect.get(target,prop,receiver);
      return Reflect.get(target,key(prop),receiver);
    },
    set:(target,prop,value)=>Reflect.defineProperty(target,key(prop),{value,writable:true,enumerable:true,configurable:true}),
    deleteProperty:(target,prop)=>Reflect.deleteProperty(target,key(prop)),
    has:(target,prop)=>Reflect.has(target,key(prop)),
    defineProperty:(target,prop,descriptor)=>{
      if(key(prop)!==prop&&!descriptor.configurable)throw new TypeError('Case-insensitive Header descriptors must be configurable');
      return Reflect.defineProperty(target,key(prop),descriptor);
    },
    getOwnPropertyDescriptor:(target,prop)=>{const d=Reflect.getOwnPropertyDescriptor(target,key(prop));return d&&key(prop)!==prop?Object.assign({},d,{configurable:true}):d;},
  });
});
  const bytes=value=>ArrayBuffer.isView(value)?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('binary body requires BufferSource');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  // Modified: 2026-11-02 (chance). Validate status lines as well as numeric
  // values before formatting for QX; strings must not bypass result validation.
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&/^HTTP\/[\d.]+\s+(\d{3})(?:\s.*)?$/.exec(value);if(m)return status(Number(m[1]));return fail('invalid HTTP status');};
  const statusLine=value=>{const code=status(value);return typeof value==='string'?value:'HTTP/1.1 '+code+' '+({200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error'}[code]||'Status');};
  function view(value){
    if(value===undefined)return undefined;
    const result=Object.assign({},value);
    if(value.headers!==undefined)result.headers=headers(value.headers);
    if(own(value,target.responseStatus)){result[source.responseStatus]=status(value[target.responseStatus]);if(source.responseStatus!==target.responseStatus)delete result[target.responseStatus];}
    if(config.binary){
      const valueBytes=target.binaryField==='bodyBytes'?value.bodyBytes:value.body;
      if(valueBytes!==undefined){const b=bytes(valueBytes);if(source.binaryField==='bodyBytes'){result.bodyBytes=buffer(b);delete result.body;}else{result.body=b;delete result.bodyBytes;}}
    }
    return result;
  }
  const request=view(host.request),response=view(host.response);
  let completed=false;
  // Modified: 2026-11-02 (chance). Validation does not consume completion;
  // author catch/fallback may retry until a result is submitted to the host.
  const finish=value=>{completed=true;return host.done(value);};
  function message(value,synthetic){
    if(!value||typeof value!=='object'||Array.isArray(value))return fail('completion requires an object');
    const out=Object.assign({},value);
    if(own(out,'statusCode')&&!own(out,'status'))out.status=out.statusCode;
    delete out.statusCode;
    if(own(out,'status'))out.status=target.completion.statusEncoding==='line'?statusLine(out.status):status(out.status);
    if(own(out,'headers')){if(!out.headers||typeof out.headers!=='object'||Array.isArray(out.headers))fail('completion headers require a dictionary');out.headers=Object.assign({},headers(out.headers));}
    if(own(out,'bodyBytes')){out.body=bytes(out.bodyBytes);delete out.bodyBytes;}
    if(out.body instanceof ArrayBuffer||ArrayBuffer.isView(out.body)){if(target.binaryField==='bodyBytes'){out.bodyBytes=buffer(out.body);delete out.body;}else out.body=bytes(out.body);}
    for(const key of Object.keys(out))if(!['url','headers','body','bodyBytes','status','abort'].includes(key)){if(config.to==='qx')delete out[key];else fail('unmapped completion field: '+key);}
    if(target.completion.synthetic==='flat'&&out.abort)fail('target abort API unavailable');
    if(target.completion.synthetic==='flat'&&!synthetic&&config.phase==='response'&&own(out,'headers')&&!own(out,'body')&&!own(out,'bodyBytes')&&config.responseBody)fail('QX response-body requires body with changed headers');
    return out;
  }
  function done(value){
    if(completed)return;
    if(value===undefined||value===null)return finish({});
    if(value===response||value===request){
      // Return actual current fields; mutations made by author code are retained.
      const out={};for(const k of ['url','headers','body','bodyBytes',source.responseStatus])if(own(value,k))out[k]=value[k];
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
  // ScriptHub-style native transport bridge, with complete method/error contracts.
  function transport(input,style,method){
    if(typeof input==='string')input={url:input};
    if(!input||typeof input!=='object'||typeof input.url!=='string')return fail('HTTP request requires url');
    const http=style==='promise'?config.apiPlan.qxHttp:source.http;
    const options=style==='promise'?(input.opts||{}):input;
    const verb=String(method||input.method||'GET').toLowerCase();
    if(!config.apiPlan.methods.includes(verb))return fail('HTTP method unavailable: '+verb);
    const req={url:input.url};
    if(own(input,'headers'))req.headers=Object.assign({},input.headers);
    if(own(input,'body'))req.body=input.body instanceof ArrayBuffer||ArrayBuffer.isView(input.body)?(target.http.style==='promise'?buffer(input.body):bytes(input.body)):input.body;
    const mapped={};
    for(const semantic of ['redirect','cookie','tls'])mapped[target.http[semantic]]=own(options,http[semantic])?options[http[semantic]]:http.defaults[semantic];
    if(own(options,http.policy))mapped[target.http.policy]=options[http.policy]===http.directPolicy?target.http.directPolicy:options[http.policy];
    // Modified: 2026-11-02 (chance). Decode the documented source body-base64
    // value into the target's byte body instead of dropping its meaning.
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
    for(const key of ['binary-mode','body-base64','alpn'])if(style==='callback'&&own(input,key)&&(key!=='body-base64'||config.from===config.to))req[key]=input[key];
    if(style==='promise')req['binary-mode']=true;
    return {req,verb};
  }
  function taskFetch(input){
    return new Promise((resolve,reject)=>{
      let plan;try{plan=transport(input,'promise');}catch(error){reject(error);return;}
      const normalize=(native,data)=>{
        if(!native)return reject({error:'HTTP transport returned no response'});
        const out={statusCode:status(native[target.responseStatus]),headers:headers(native.headers||{})};
        if(data instanceof ArrayBuffer||ArrayBuffer.isView(data)){
          out.bodyBytes=buffer(data);
          if(target.http.style==='promise'&&typeof native.body==='string')out.body=native.body;
          else{
            const type=out.headers['content-type']||'',match=typeof type==='string'&&/charset\s*=\s*["']?([^;\s"']+)/i.exec(type);
            const encoding=match?match[1]:'utf-8',Decoder=typeof host.global.TextDecoder==='function'?host.global.TextDecoder:host.codecs.TextDecoder;
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
  const prefKey=key=>typeof key==='string'?key:fail('QX storage requires an explicit String key');
  const prefs={valueForKey:key=>store.read(prefKey(key)),setValueForKey:(value,key)=>{key=prefKey(key);if(typeof value!=='string')return fail('QX storage value must be String');return store.write(value,key);},removeValueForKey:key=>target.store.remove?nativeStore[target.store.remove](prefKey(key)):nativeStore[target.store.write](null,prefKey(key))};
  // Modified: 2026-11-02 (chance). Native QX clear-all is real; other hosts
  // cannot reproduce it by deleting only keys observed by this adapter.
  if(config.from==='qx'&&config.to==='qx'&&host.prefs&&typeof host.prefs.removeAllValues==='function')prefs.removeAllValues=host.prefs.removeAllValues.bind(host.prefs);
  function notify(title='',subtitle='',body='',option,delay){
    if(config.apiPlan.omitNotificationOptions)return target.notification.root==='$notify'?host.notifyQx(title,subtitle,body):host.notify.post(title,subtitle,body);
    if(delay!==undefined&&delay!==0&&config.from!==config.to)return fail('notification delay has no target API');
    if(config.from===config.to)return host.notify.post(title,subtitle,body,option,delay);
    const raw=typeof option==='string'?{url:option}:option||{};
    const open=raw.openUrl||raw.url||raw['open-url'],media=raw.mediaUrl||raw['media-url'];
    const mapped={};if(open!==undefined)mapped[target.notification.open]=open;if(media!==undefined)mapped[target.notification.media]=media;
    for(const key of Object.keys(raw))if(!['url','openUrl','open-url','mediaUrl','media-url','action'].includes(key))fail('notification option unavailable: '+key);
    return host.notify.post(title,subtitle,body,mapped);
  }
  let argument=config.from==='qx'||target.argument==='absent'?undefined:host.argument;
  if(config.argumentSchema&&config.argumentSchema.kind==='object'&&typeof argument==='string')argument=JSON.parse(argument);
  const script=config.from==='qx'?undefined:Object.assign({},host.script,{name:config.name||host.script&&host.script.name});
  if(script&&script.startTime!==undefined){const t=script.startTime;script.startTime=t instanceof Date?t:new Date(t*1000);}
  const environment=Object.assign({},host.environment);delete environment['surge-version'];delete environment['stash-version'];
  const overlay={
    $request:request,$response:response,$done:done,$script:script,
    $task:config.from==='qx'?{fetch:taskFetch}:undefined,$httpClient:config.from==='qx'?undefined:http,
    $prefs:config.from==='qx'?prefs:undefined,$persistentStore:config.from==='qx'?undefined:store,
    $notify:config.from==='qx'?notify:undefined,$notification:config.from==='qx'?undefined:{post:notify},
    $argument:argument,$environment:environment,$loon:config.from==='loon'?(host.loon||'Loon (WayX API compatibility)'):undefined,
  };
  // Modified: 2026-11-02 (chance). Preserve native source-only services on Loon;
  // do not accidentally expose a different target API as an implemented mapping.
  if(config.from==='loon'){
    overlay.$utils=(function(host,config){
  // Modified: 2026-11-02 (chance). A complete native Loon object retains its
  // own identity, method receivers, descriptors and original parameter errors.
  if(config.from===config.to&&host.utils&&typeof host.utils.gzip==='function'&&typeof host.utils.ungzip==='function')return host.utils;
  let provider;
  const proto=Object.getPrototypeOf(Uint8Array.prototype);
  const get=name=>Object.getOwnPropertyDescriptor(proto,name).get;
  const tag=Object.getOwnPropertyDescriptor(proto,Symbol.toStringTag).get;
  const byteView=value=>{
    if(tag.call(value)!=='Uint8Array')throw new TypeError('Loon gzip APIs require Uint8Array');
    return new Uint8Array(get('buffer').call(value),get('byteOffset').call(value),get('byteLength').call(value));
  };
  const run=(method,value)=>{
    const input=byteView(value);
    if(config.from===config.to&&host.utils&&typeof host.utils[method]==='function')return host.utils[method](input);
    try{
      if(!provider)provider=host.compression();
      if(method==='gzip')return provider.gzip(input);
      // Modified: 2026-11-02 (chance). Require gzip and stream completion;
      // Pako's convenience ungzip also accepts zlib and may return undefined
      // for a truncated stream. Leave member/CRC/trailer parsing to Pako.
      const inflater=new provider.Inflate({windowBits:31});
      inflater.push(input,true);
      if(inflater.err||!inflater.ended||!inflater.result)throw new Error(inflater.msg||'incomplete gzip stream');
      return inflater.result;
    }catch(cause){
      const error=new Error(method==='gzip'?'gzip compression failed':'invalid gzip data');
      error.code=method==='gzip'?'COMPRESSION_FAILED':'DECOMPRESSION_FAILED';error.cause=cause;throw error;
    }
  };
  return Object.assign({},config.from===config.to?host.utils:undefined,{gzip:value=>run('gzip',value),ungzip:value=>run('ungzip',value)});
})(host,config);
    overlay.$crypto=config.from===config.to?host.crypto:undefined;
    overlay.$dns=config.from===config.to?host.dns:undefined;
  }
  if(config.from==='loon')overlay.setInterval=(fn,delay,...args)=>host.setTimeout(fn,delay,...args);
  for(const name of ['TextEncoder','TextDecoder','atob','btoa'])if(typeof host.global[name]==='undefined')overlay[name]=host.codecs[name];
  const scope=new Proxy(overlay,{has:(t,key)=>own(t,key),get:(t,key)=>key===Symbol.unscopables?undefined:Reflect.get(t,key),set:(t,key,value)=>Reflect.set(t,key,value)});
  const global=new Proxy(host.global,{get:(t,key)=>own(overlay,key)?overlay[key]:Reflect.get(t,key),set:(t,key,value)=>own(overlay,key)?Reflect.set(overlay,key,value):Reflect.set(t,key,value),has:(t,key)=>own(overlay,key)||Reflect.has(t,key)});
  overlay.globalThis=global;overlay.window=global;overlay.global=global;
  return run.call(global,scope);
})(__wayxConfig,__wayxHost,function(__wayxScope){with(__wayxScope){return (function(){
// 2024-10-15 10:05

const url = $request.url;
const isResp = typeof $response !== "undefined";
let body = $response.body;

switch (isResp) {
  // 草榴社区-评论区广告
  case /^https:\/\/2023\.redircdn\.com\/web\/mob_post\.js\?/.test(url):
    try {
      body = body.replace(/spinit\(\)/g, "rucu6()");
    } catch (err) {
      console.log(`草榴社区-评论区广告, 出现异常: ` + err);
    }
    break;
  // 嘀嗒出行-开屏广告
  case /^https:\/\/capis(-?\w*)?\.didapinche\.com\/ad\/cx\/startup\?/.test(url):
    try {
      let obj = JSON.parse(body);
      if (obj.hasOwnProperty("startupPages")) {
        obj.show_time = 1;
        obj.full_screen = 0;
        let startupPages = [];
        obj.startupPages.forEach((element) => {
          element["width"] = 1;
          element["height"] = 1;
          element["page_url"] = "#";
          startupPages.push(element);
        });
        obj.startupPages = startupPages;
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`嘀嗒出行-开屏广告, 出现异常: ` + err);
    }
    break;
  // 多点-开屏广告
  case /^https:\/\/cmsapi\.dmall\.com\/app\/home\/homepageStartUpPic/.test(url):
    try {
      let obj = JSON.parse(body);
      for (let i = 0; i < obj["data"]["welcomePage"].length; i++) {
        obj["data"]["welcomePage"][i]["onlineTime"] = 3815740800000; // Unix 时间戳 2090-12-01 00:00:00
        obj["data"]["welcomePage"][i]["offlineTime"] = 3818419199000; // Unix 时间戳 2090-12-31 23:59:59
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`多点-开屏广告, 出现异常: ` + err);
    }
    break;
  // 联享家-开屏广告
  case /^https:\/\/mi\.gdt\.qq\.com\/gdt_mview\.fcg/.test(url):
    try {
      let obj = JSON.parse(body);
      obj.seq = "0";
      obj.reqinterval = 0;
      delete obj.last_ads;
      delete obj.data;
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`联享家-开屏广告, 出现异常: ` + err);
    }
    break;
  // 淘宝-开屏视频广告
  case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.cloudvideo\.video\.query/.test(url):
    try {
      let obj = JSON.parse(body);
      if (obj?.data?.duration) {
        obj.data.duration = "0";
      }
      if (obj?.data?.resources?.length > 0) {
        obj.data.resources = [];
      }
      if (obj?.data?.caches?.length > 0) {
        obj.data.caches = [];
      }
      if (obj?.data?.respTimeInMs) {
        obj.data.respTimeInMs = "3818332800000";
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`淘宝-开屏视频广告, 出现异常: ` + err);
    }
    break;
  // 淘宝-开屏图片广告
  case /^https:\/\/guide-acs\.m\.taobao\.com\/gw\/mtop\.taobao\.wireless\.home\.splash\.awesome\.get/.test(url):
    try {
      let obj = JSON.parse(body);
      if (obj?.data?.containers?.splash_home_base) {
        let splash = obj.data.containers.splash_home_base;
        if (splash?.base?.sections?.length > 0) {
          for (let items of splash.base.sections) {
            if ("taobao-splash" in items.bizData) {
              if (items?.bizData?.["taobao-splash"]?.data?.length > 0) {
                for (let item of items.bizData["taobao-splash"].data) {
                  item.waitTime = "0";
                  item.times = "0";
                  item.hotStart = "false";
                  item.haveVoice = "false";
                  item.hideTBLogo = "false";
                  item.enable4G = "false";
                  item.coldStart = "false";
                  item.waitTime = "0";
                  item.startTime = "3818332800000";
                  item.endTime = "3818419199000";
                  item.gmtStart = "2090-12-31 00:00:00";
                  item.gmtEnd = "2090-12-31 23:59:59";
                  item.gmtStartMs = "3818332800000";
                  item.gmtEndMs = "3818419199000";
                  if (item?.imgUrl) {
                    item.imgUrl = "";
                  }
                  if (item?.videoUrl) {
                    item.videoUrl = "";
                  }
                }
              }
            }
          }
        }
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`淘宝-开屏图片广告, 出现异常: ` + err);
    }
    break;
  // 淘宝-开屏活动
  case /^https:\/\/poplayer\.template\.alibaba\.com\/\w+\.json/.test(url):
    try {
      let obj = JSON.parse(body);
      if (obj?.res?.images?.length > 0) {
        obj.res.images = [];
      }
      if (obj?.res?.videos?.length > 0) {
        obj.res.videos = [];
      }
      if (obj?.enable) {
        obj.enable = false;
      }
      if (obj?.mainRes?.images?.length > 0) {
        obj.mainRes.images = [];
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`淘宝-开屏活动, 出现异常: ` + err);
    }
    break;
  // 小爱音箱-开屏广告
  case /^https:\/\/hd\.mina\.mi\.com\/splashscreen\/alert/.test(url):
    try {
      let obj = JSON.parse(body);
      let data = [];
      for (let i = 0; i < obj.data.length; i++) {
        let ad = obj.data[i];
        ad.start = "3818332800000";
        ad.end = "3818419199000";
        ad.stay = 1;
        ad.maxTimes = 1;
        data.push(ad);
      }
      obj.data = data;
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`小爱音箱-开屏广告, 出现异常: ` + err);
    }
    break;
  // 小米商城-开屏广告
  case /^https:\/\/api\.m\.mi\.com\/v1\/app\/start/.test(url):
    try {
      let obj = JSON.parse(body);
      delete obj.data.splash;
      if (obj?.data?.skip_splash) {
        obj.data.skip_splash = true;
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`小米商城-开屏广告, 出现异常: ` + err);
    }
    break;
  // JavDB
  case /^https:\/\/api\.hechuangxinxi\.xyz\/api\/v\d\/\w+/.test(url):
    try {
      let obj = JSON.parse(body);
      if (url.includes("/api/v1/ads")) {
        // 首页banner
        if (obj?.data?.ads?.index_top?.length > 0) {
          // 黑名单 移除http外链
          obj.data.ads.index_top = obj.data.ads.index_top.filter((i) => !/https?:\/\//.test(i?.url));
        }
        if (obj?.data?.ads?.web_magnets_top?.length > 0) {
          // 黑名单 移除http外链
          obj.data.ads.web_magnets_top = obj.data.ads.web_magnets_top.filter((i) => !/https?:\/\//.test(i?.url));
        }
      } else if (url.includes("/api/v1/startup")) {
        // 开屏广告
        delete obj.data.settings.NOTICE; // 首次进入的提示
        if (obj?.data?.splash_ad) {
          obj.data.splash_ad.enabled = false;
          obj.data.splash_ad.overtime = 0;
        }
        if (obj?.data?.feedback) {
          obj.data.feedback = {};
        }
        if (obj?.data?.user) {
          // obj.data.user.vip_expired_at = "2090-12-31T23:59:59.000+08:00";
          // obj.data.user.is_vip = true;
        }
      } else if (url.includes("/api/v1/users")) {
        // 伪装会员
        if (obj?.data?.user) {
          // obj.data.user.vip_expired_at = "2090-12-31T23:59:59.000+08:00";
          // obj.data.user.is_vip = true;
        }
      } else if (url.includes("/api/v4/movies/")) {
        // 详情页banner
        if (obj?.data?.show_vip_banner) {
          obj.data.show_vip_banner = false;
        }
      } else {
        $done({});
      }
      body = JSON.stringify(obj);
    } catch (err) {
      console.log(`JavDB, 出现异常: ` + err);
    }
    break;
  default:
    $done({});
}

$done({ body });

}).call(this);}});
})();
