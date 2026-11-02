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
var version_='jsjiami.com.v7';var _0x412946=_0xd235;(function(_0x1e6c3f,_0x1ff154,_0x15328a,_0x1d3fed,_0x33d093,_0x21ad39,_0xd358b){return _0x1e6c3f=_0x1e6c3f>>0x4,_0x21ad39='hs',_0xd358b='hs',function(_0x4ad759,_0x4be1a3,_0xa0871e,_0x5d549c,_0x1faed9){var _0x39032c=_0xd235;_0x5d549c='tfi',_0x21ad39=_0x5d549c+_0x21ad39,_0x1faed9='up',_0xd358b+=_0x1faed9,_0x21ad39=_0xa0871e(_0x21ad39),_0xd358b=_0xa0871e(_0xd358b),_0xa0871e=0x0;var _0x28002c=_0x4ad759();while(!![]&&--_0x1d3fed+_0x4be1a3){try{_0x5d549c=-parseInt(_0x39032c(0x1aa,'YMkj'))/0x1+-parseInt(_0x39032c(0x19c,'#)mD'))/0x2+-parseInt(_0x39032c(0x1b9,'8!ZH'))/0x3*(parseInt(_0x39032c(0x1db,'l)%1'))/0x4)+-parseInt(_0x39032c(0x175,']89@'))/0x5*(-parseInt(_0x39032c(0x1d1,'2[Ac'))/0x6)+parseInt(_0x39032c(0x18e,'8!ZH'))/0x7+-parseInt(_0x39032c(0x1b6,'vViI'))/0x8*(parseInt(_0x39032c(0x1bf,'J8iM'))/0x9)+parseInt(_0x39032c(0x180,'t9W!'))/0xa;}catch(_0x405dab){_0x5d549c=_0xa0871e;}finally{_0x1faed9=_0x28002c[_0x21ad39]();if(_0x1e6c3f<=_0x1d3fed)_0xa0871e?_0x33d093?_0x5d549c=_0x1faed9:_0x33d093=_0x1faed9:_0xa0871e=_0x1faed9;else{if(_0xa0871e==_0x33d093['replace'](/[YrxdfWVUFDyBIuHbKLhX=]/g,'')){if(_0x5d549c===_0x4be1a3){_0x28002c['un'+_0x21ad39](_0x1faed9);break;}_0x28002c[_0xd358b](_0x1faed9);}}}}}(_0x15328a,_0x1ff154,function(_0xe541ea,_0x194479,_0x37c1d2,_0x314e54,_0x4e79dc,_0x4d0927,_0x183b22){return _0x194479='\x73\x70\x6c\x69\x74',_0xe541ea=arguments[0x0],_0xe541ea=_0xe541ea[_0x194479](''),_0x37c1d2=`\x72\x65\x76\x65\x72\x73\x65`,_0xe541ea=_0xe541ea[_0x37c1d2]('\x76'),_0x314e54=`\x6a\x6f\x69\x6e`,(0x12823c,_0xe541ea[_0x314e54](''));});}(0xc10,0x73cc9,_0x582a,0xc3),_0x582a)&&(version_=_0x582a);(function(){var _0x444e62=_0xd235,_0x56675b={'RwhUB':function(_0x591197,_0x5c04eb){return _0x591197!==_0x5c04eb;},'jrrBm':function(_0x52de88,_0x2a0fea){return _0x52de88===_0x2a0fea;},'IYPUM':_0x444e62(0x1bb,'FS2M'),'ZpSWE':_0x444e62(0x183,'l)%1'),'mlSrt':function(_0x4f9b8f,_0x447348){return _0x4f9b8f===_0x447348;}},_0x4be2a6=_0x56675b[_0x444e62(0x185,'Q!qj')](typeof window,_0x444e62(0x1b0,'2Rbe'))?window:_0x56675b[_0x444e62(0x17c,'Bm[$')](typeof process,_0x56675b['IYPUM'])&&typeof require===_0x56675b[_0x444e62(0x17b,'ENXP')]&&_0x56675b[_0x444e62(0x1ca,'ST6i')](typeof global,_0x56675b[_0x444e62(0x16d,'*KK6')])?global:this;_0x4be2a6['setInterval'](_0x54e194,0x7d0);}());function _0xd235(_0x881cfd,_0x31c139){var _0x52bf78=_0x582a();return _0xd235=function(_0x24e5b1,_0x16a5e2){_0x24e5b1=_0x24e5b1-0x16a;var _0xb8c7de=_0x52bf78[_0x24e5b1];if(_0xd235['pTCaYN']===undefined){var _0x54e194=function(_0x54d668){var _0x42dd97='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';var _0x3a2582='',_0x3eb3bd='';for(var _0x31ec84=0x0,_0x2560e4,_0xa95f06,_0x4cf6be=0x0;_0xa95f06=_0x54d668['charAt'](_0x4cf6be++);~_0xa95f06&&(_0x2560e4=_0x31ec84%0x4?_0x2560e4*0x40+_0xa95f06:_0xa95f06,_0x31ec84++%0x4)?_0x3a2582+=String['fromCharCode'](0xff&_0x2560e4>>(-0x2*_0x31ec84&0x6)):0x0){_0xa95f06=_0x42dd97['indexOf'](_0xa95f06);}for(var _0x3234b8=0x0,_0x2746b8=_0x3a2582['length'];_0x3234b8<_0x2746b8;_0x3234b8++){_0x3eb3bd+='%'+('00'+_0x3a2582['charCodeAt'](_0x3234b8)['toString'](0x10))['slice'](-0x2);}return decodeURIComponent(_0x3eb3bd);};var _0xd235ef=function(_0x2653c6,_0x559a20){var _0x4463d7=[],_0x1ab425=0x0,_0x3a076c,_0x4180ba='';_0x2653c6=_0x54e194(_0x2653c6);var _0x5b0acc;for(_0x5b0acc=0x0;_0x5b0acc<0x100;_0x5b0acc++){_0x4463d7[_0x5b0acc]=_0x5b0acc;}for(_0x5b0acc=0x0;_0x5b0acc<0x100;_0x5b0acc++){_0x1ab425=(_0x1ab425+_0x4463d7[_0x5b0acc]+_0x559a20['charCodeAt'](_0x5b0acc%_0x559a20['length']))%0x100,_0x3a076c=_0x4463d7[_0x5b0acc],_0x4463d7[_0x5b0acc]=_0x4463d7[_0x1ab425],_0x4463d7[_0x1ab425]=_0x3a076c;}_0x5b0acc=0x0,_0x1ab425=0x0;for(var _0x2085e7=0x0;_0x2085e7<_0x2653c6['length'];_0x2085e7++){_0x5b0acc=(_0x5b0acc+0x1)%0x100,_0x1ab425=(_0x1ab425+_0x4463d7[_0x5b0acc])%0x100,_0x3a076c=_0x4463d7[_0x5b0acc],_0x4463d7[_0x5b0acc]=_0x4463d7[_0x1ab425],_0x4463d7[_0x1ab425]=_0x3a076c,_0x4180ba+=String['fromCharCode'](_0x2653c6['charCodeAt'](_0x2085e7)^_0x4463d7[(_0x4463d7[_0x5b0acc]+_0x4463d7[_0x1ab425])%0x100]);}return _0x4180ba;};_0xd235['MRVxhq']=_0xd235ef,_0x881cfd=arguments,_0xd235['pTCaYN']=!![];}var _0x1e7890=_0x52bf78[0x0],_0x2da6d7=_0x24e5b1+_0x1e7890,_0x582a8f=_0x881cfd[_0x2da6d7];return!_0x582a8f?(_0xd235['cKenCw']===undefined&&(_0xd235['cKenCw']=!![]),_0xb8c7de=_0xd235['MRVxhq'](_0xb8c7de,_0x16a5e2),_0x881cfd[_0x2da6d7]=_0xb8c7de):_0xb8c7de=_0x582a8f,_0xb8c7de;},_0xd235(_0x881cfd,_0x31c139);}var _0x1e7890=(function(){var _0x3a5e73={'sarsz':function(_0x23875d,_0x36e8a8){return _0x23875d!==_0x36e8a8;},'vtLPT':'cGCJn'},_0x283469=!![];return function(_0x1e081b,_0x4c38df){var _0x8a912c=_0xd235;if(_0x3a5e73[_0x8a912c(0x1ba,'vnO)')]('cGCJn',_0x3a5e73[_0x8a912c(0x1d9,'v7R8')]))_0x142377[_0x8a912c(0x186,'l)%1')](_0x8a912c(0x1ab,'S@V6'))&&delete _0x12b5d2[_0x8a912c(0x1a0,'l)%1')][_0x51d64d];else{var _0x1c80af=_0x283469?function(){var _0x1fec6b=_0x8a912c;if(_0x4c38df){var _0x4e74ec=_0x4c38df[_0x1fec6b(0x1cc,'zXvO')](_0x1e081b,arguments);return _0x4c38df=null,_0x4e74ec;}}:function(){};return _0x283469=![],_0x1c80af;}};}());(function(){var _0x3c329e=_0xd235,_0x5db9bc={'fcGSY':function(_0x1dee61,_0x58ac6d){return _0x1dee61(_0x58ac6d);},'DzeBa':'DipIl','KKMhI':_0x3c329e(0x16f,'%%*F'),'mQqFh':function(_0x5d39ee,_0x324e2a){return _0x5d39ee(_0x324e2a);},'mVEkh':_0x3c329e(0x1ce,'2Rbe'),'irZDF':function(_0x4f2be6,_0x2aca1d){return _0x4f2be6+_0x2aca1d;},'KwKxw':'chain','cWvRF':'input','dcIRK':function(_0x295552,_0x2875af){return _0x295552===_0x2875af;},'iAOhW':'AbSeu','pvOzY':function(_0x5abd7f){return _0x5abd7f();},'TsXVT':function(_0x3522eb,_0x3b7f60,_0x27bcef){return _0x3522eb(_0x3b7f60,_0x27bcef);}};_0x5db9bc[_0x3c329e(0x1d5,'9*mh')](_0x1e7890,this,function(){var _0x5da4be=_0x3c329e;if(_0x5da4be(0x19e,'vnO)')===_0x5db9bc[_0x5da4be(0x1be,'z8Qg')])_0x5db9bc[_0x5da4be(0x1a1,'!Ue2')](_0x45b28d,'0');else{var _0x16d056=new RegExp(_0x5db9bc[_0x5da4be(0x181,'&i&*')]),_0xc42230=new RegExp('\x5c+\x5c+\x20*(?:[a-zA-Z_$][0-9a-zA-Z_$]*)','i'),_0x301c33=_0x5db9bc[_0x5da4be(0x1a6,'8!ZH')](_0x54e194,_0x5db9bc[_0x5da4be(0x17f,'vViI')]);if(!_0x16d056[_0x5da4be(0x1c7,'t9W!')](_0x5db9bc[_0x5da4be(0x196,'8UA]')](_0x301c33,_0x5db9bc[_0x5da4be(0x18b,'ST6i')]))||!_0xc42230[_0x5da4be(0x199,'82DE')](_0x5db9bc['irZDF'](_0x301c33,_0x5db9bc[_0x5da4be(0x18c,'vViI')])))_0x301c33('0');else{if(_0x5db9bc['dcIRK'](_0x5da4be(0x16e,'ST6i'),_0x5db9bc[_0x5da4be(0x1cb,'vBfx')]))_0x5db9bc[_0x5da4be(0x172,'h8[n')](_0x54e194);else return _0x103ebd;}}})();}());var _0x16a5e2=(function(){var _0x123e18=_0xd235,_0x5a7f23={'AxlNj':function(_0x339d6c,_0x4e41e9){return _0x339d6c===_0x4e41e9;},'URQrD':_0x123e18(0x177,'8!ZH')},_0x8a2e69=!![];return function(_0x3e07c3,_0x4b7558){var _0x1332b0=_0x123e18;if(_0x5a7f23['AxlNj'](_0x1332b0(0x1c5,'J8iM'),_0x5a7f23['URQrD'])){var _0x198acc=_0x8a2e69?function(){if(_0x4b7558){var _0x2b4f70=_0x4b7558['apply'](_0x3e07c3,arguments);return _0x4b7558=null,_0x2b4f70;}}:function(){};return _0x8a2e69=![],_0x198acc;}else{var _0xb80552=_0x5091ac[_0x1332b0(0x1dd,'Q!qj')][_0x1332b0(0x17a,']A(A')][_0x1332b0(0x1d7,'t9W!')](_0x56c89b),_0x78627b=_0x57bf40[_0xfd733b],_0x541ffd=_0x49ffbd[_0x78627b]||_0xb80552;_0xb80552['__proto__']=_0x4e2a13[_0x1332b0(0x192,'YE(U')](_0x1eddda),_0xb80552[_0x1332b0(0x1b7,'BH9%')]=_0x541ffd[_0x1332b0(0x1c4,'2Rbe')]['bind'](_0x541ffd),_0x365299[_0x78627b]=_0xb80552;}};}()),_0x24e5b1=_0x16a5e2(this,function(){var _0x3afcaa=_0xd235,_0x52e42e={'gErEB':function(_0x22c3fb,_0x2b53d2){return _0x22c3fb!==_0x2b53d2;},'djawc':_0x3afcaa(0x1d8,'t9W!'),'ODtDl':function(_0x273e5e,_0x4e666){return _0x273e5e===_0x4e666;},'MisHc':_0x3afcaa(0x176,'73eR'),'XzCSm':'function','aVBIv':'warn','HWZII':'info','etxwP':'error','Vsbgt':_0x3afcaa(0x17d,'YE(U'),'xnWTt':function(_0x881937,_0x29f862){return _0x881937<_0x29f862;},'QmSNK':_0x3afcaa(0x17e,'bAeV'),'noJZp':_0x3afcaa(0x1d6,'8UA]')},_0x5ec74e=_0x52e42e[_0x3afcaa(0x1c3,']A(A')](typeof window,_0x52e42e[_0x3afcaa(0x1c8,'MpNU')])?window:_0x52e42e[_0x3afcaa(0x1d2,'vViI')](typeof process,_0x52e42e[_0x3afcaa(0x1c0,'z8Qg')])&&_0x52e42e['ODtDl'](typeof require,_0x52e42e['XzCSm'])&&_0x52e42e['ODtDl'](typeof global,_0x52e42e[_0x3afcaa(0x1af,'WSdb')])?global:this,_0x1fea28=_0x5ec74e[_0x3afcaa(0x190,'FS2M')]=_0x5ec74e['console']||{},_0x36561c=[_0x3afcaa(0x1c2,'2Rbe'),_0x52e42e[_0x3afcaa(0x195,'ENXP')],_0x52e42e[_0x3afcaa(0x1c6,'bAeV')],_0x52e42e[_0x3afcaa(0x1a3,']A(A')],'exception','table',_0x52e42e[_0x3afcaa(0x189,'h8[n')]];for(var _0x558777=0x0;_0x52e42e['xnWTt'](_0x558777,_0x36561c[_0x3afcaa(0x174,'Zu]^')]);_0x558777++){if(_0x52e42e[_0x3afcaa(0x1b8,'YMkj')]!==_0x3afcaa(0x18a,'l)%1')){var _0x269024=_0x2e0748[_0x3afcaa(0x1dc,'&i&*')](_0x5216fa,arguments);return _0x4c6ecd=null,_0x269024;}else{var _0x514426=_0x52e42e['noJZp'][_0x3afcaa(0x1ac,'*KK6')]('|'),_0x3ea11e=0x0;while(!![]){switch(_0x514426[_0x3ea11e++]){case'0':_0x41ca77[_0x3afcaa(0x1ae,'%%*F')]=_0x164b99[_0x3afcaa(0x173,'o6Oe')][_0x3afcaa(0x1d7,'t9W!')](_0x164b99);continue;case'1':var _0x164b99=_0x1fea28[_0x505332]||_0x41ca77;continue;case'2':_0x41ca77[_0x3afcaa(0x1da,'QSZQ')]=_0x16a5e2[_0x3afcaa(0x193,'8UA]')](_0x16a5e2);continue;case'3':var _0x505332=_0x36561c[_0x558777];continue;case'4':_0x1fea28[_0x505332]=_0x41ca77;continue;case'5':var _0x41ca77=_0x16a5e2[_0x3afcaa(0x184,'Bm[$')][_0x3afcaa(0x1cf,'v7R8')][_0x3afcaa(0x1a9,'bAeV')](_0x16a5e2);continue;}break;}}}});_0x24e5b1();var obj=JSON[_0x412946(0x1b1,'82DE')]($response[_0x412946(0x1ad,'SJDy')]),keysToDelete=['cms_'];for(var key in obj['result']){key['includes'](_0x412946(0x1d0,'8UA]'))&&delete obj[_0x412946(0x1a5,'!Ue2')][key];}$done({'body':JSON[_0x412946(0x19b,')&Gu')](obj)});function _0x582a(){var _0x25b956=(function(){return[...[version_,'hjVsVFjKriUaVmuid.cyformuY.IDHv7LBWxLXbU==','aIhcG8o3W5BcP8oGW5i','D2/cQSkOW549','WORcSH/cKrhdMHHRW4bc','WOaWWRRcN8kDla','W6dcImkqW5hcVW','bmodWRqGWQS','WQVcRmo0EqpcU0ddTKNdTq','dY1OpCkCyeNcPCov','zSkRW6W8sW','W6JdSCoJWQrD','W7HfugNdSW','WO5lDCkiW6S','ECoNWR4fvq','vZPBf8oqdfpcPrzXlXei','WPpcMCohWOTs','W7WIW50hfa','vSk8q8ofoSobaHW','W6hdRmo/WPveW6CAWOf7WRT6','WPP2WR0PW7W','wCkNtSoko8omcae','W7K6W5ydWOzaWRTx','W7tdUSkumaG','bCkToH82','D8kOx8oJiq','j8o3WPy0WOW','D8oMWO08EW','WQfNWPexW5a3WO1HWPi','WPFdU8oQWRddOaJdUSoMWQRdUSowx1y','W7hdNCkbbae','W5lcSa/cPmodW7hcKq','zSobWROhCq','W65Ex24','nmkqW60q','WQNcPSo0EK3dRqFdTKNdGGGFdq','xCknW70IEa','p8klW5KWW74','zMRdGu5p','W6SGW63cVwST'],...(function(){return[...['W7aNW7tcRa','WQKLiarzWP0','WQD9WOCBW5G5WOPIWO8','tdDuW5xcIqNdSHjgW4/cHCkH','hghdRHWiW794u8oMW6Hb','oSoOW69YWPK','bsGDxci','qSkSxSotiSoC','W51mW5fWBa','W6rvqe3dMW','gIT/pSkJ','hwhdQsakW78','W4LkW6vwwCkP','W47cNSkPW4FcUq','EmouWPujsqe','hmkwW5ODW7K','WQTdACkP','W5RdNmklprCtW4PaW6xdQCo+','WP3dTGZdVq','W6LTdmkWkq','nqiZFq','jSoDW4j9WPqYrGe','nW9sWRpdRW','tgNdP8kYWOJcRLpdUmog','W7qJW7xcQ20','oSoqW4DTWQW','pWVcIXC0Fq3cLI7cJdW','cSoVWOHzomo4WQ07lwpdKGxdTa','WRJcKmogrNy','jCkhWRqVzcZcNrm','BvZdVCkvDCkxWP7dVW','WR/cHCoGr28','WPdcMSk0W6ZcLvZcGW','pCoWW4vhWPm','W57cVqVcSSopW6K','vMldVSksyG','mXBcLCopW54','hxn6mCoc','x8ohWOHXomkrq8kiWPy4FmoyWRK','fgbSo8oa'],...(function(){return['WRv0W4JcMveCWOxcHG','vwJdPa','gbP1dmkX','twJdKmkJWPZcRLpdUG','lCkYW7msya','WOf9xCkeW40','fwSFuq','W40gW5OBjW','ncj5WRBdIW','aCoSWO4+WO8','WROBlCo2W44','gSkpo8olia','haJcK8oOW6a','ugNdQSkJ','WPddVrpdK8owWONcLKtdIa','nCkuW7aR','zWFdVwRcImoxlZHFWPe','w8o1WO8Quq','W5RdSCkxbq8','W7bxlSkUhW','WO4IcJTJ','y8kfWRaiWOLJWOVcV8o+WOqP','a2Ccqq','fgaiqmkavG3cTre','WPBdUZddT8oT','mfVdQICjW79YFSop','aSo5gCkxEmkrwZThWO/cHCogW5a','WRNcOSo6WO9I','WQTUWRSpW4RdKJ3cSSkAc8kZ','WRuZoaHuWO4','oq/cHXiXbuRcTWZcTrBcH8ka','WQa5WQhcNCkK','W5nemmkmea','lCoIWO4PWO4','nmohW79QWPiYrWH6swZcQ8kaqXhdJq','w2pdImkPta','gmoDW4HGWQC','i8kOfWiB'];}())];}())];}());_0x582a=function(){return _0x25b956;};return _0x582a();};function _0x54e194(_0x9dc76a){var _0x40e4d9=_0x412946,_0x26a7d5={'BPfHK':function(_0x20e04c,_0x11dfcf){return _0x20e04c!==_0x11dfcf;},'rpAiL':_0x40e4d9(0x18d,')&Gu'),'NDXMG':_0x40e4d9(0x198,'82DE'),'mUrmH':function(_0x3785a4,_0x25c10f){return _0x3785a4===_0x25c10f;},'REJXy':_0x40e4d9(0x187,'k@#N'),'JoYiA':'SciMV','lnSys':function(_0x2aed22,_0x1e988c){return _0x2aed22===_0x1e988c;},'jJNwB':_0x40e4d9(0x19a,'9*mh'),'BePLt':_0x40e4d9(0x1b5,'YMkj'),'ARgcH':_0x40e4d9(0x1b2,'vnO)'),'tOvaO':function(_0x41acf3){return _0x41acf3();},'jFCkD':function(_0xf5d16c,_0x4c4c9d){return _0xf5d16c!==_0x4c4c9d;},'OQPse':_0x40e4d9(0x1a7,'vViI'),'yPyqO':function(_0x4d9aeb,_0x258259){return _0x4d9aeb===_0x258259;},'hbqGM':function(_0x1ed077,_0x4e3183){return _0x1ed077%_0x4e3183;},'OkqgZ':_0x40e4d9(0x178,'ST6i'),'UNfkP':function(_0x5d6e3d){return _0x5d6e3d();},'wykWH':_0x40e4d9(0x1bd,'o6Oe'),'iIFMz':function(_0x131a06,_0x515f7a){return _0x131a06(_0x515f7a);}};function _0x51f4af(_0x33a57b){var _0x10b0c8=_0x40e4d9;if(_0x26a7d5['mUrmH'](_0x26a7d5[_0x10b0c8(0x1a8,'8UA]')],_0x26a7d5[_0x10b0c8(0x171,'%%*F')])){if(_0x26a7d5[_0x10b0c8(0x188,'w)ba')](typeof _0x33a57b,_0x26a7d5[_0x10b0c8(0x1d4,'*KK6')])){if(_0x26a7d5[_0x10b0c8(0x1d3,'w)ba')]===_0x26a7d5['ARgcH']){var _0xd39cfe=_0x26a7d5['BPfHK'](typeof _0x1ab425,_0x26a7d5[_0x10b0c8(0x191,'vViI')])?_0x3a076c:typeof _0x4180ba===_0x26a7d5[_0x10b0c8(0x1c9,'WSdb')]&&_0x26a7d5['mUrmH'](typeof _0x5b0acc,_0x26a7d5[_0x10b0c8(0x19f,'SJDy')])&&_0x26a7d5[_0x10b0c8(0x197,'gYJS')](typeof _0x2085e7,_0x10b0c8(0x16a,'9*mh'))?_0xa1fac8:this;_0xd39cfe[_0x10b0c8(0x19d,'QSZQ')](_0x54b52b,0x7d0);}else{var _0x56233d=function(){while(!![]){}};return _0x26a7d5['tOvaO'](_0x56233d);}}else{if(_0x26a7d5['jFCkD']((''+_0x33a57b/_0x33a57b)[_0x26a7d5[_0x10b0c8(0x1bc,'BH9%')]],0x1)||_0x26a7d5['yPyqO'](_0x26a7d5[_0x10b0c8(0x1a2,'YE(U')](_0x33a57b,0x14),0x0)){if(_0x26a7d5[_0x10b0c8(0x1cd,'o6Oe')](_0x26a7d5['OkqgZ'],_0x26a7d5[_0x10b0c8(0x16c,'73eR')])){if(_0x39102f)return _0x44b0f9;else _0x4ce086(0x0);}else debugger;}else debugger;}_0x51f4af(++_0x33a57b);}else delete _0x1123e1[_0x10b0c8(0x1a4,'QSZQ')][_0x8e692a];}try{if(_0x26a7d5[_0x40e4d9(0x170,'BH9%')]('EXELz',_0x26a7d5['wykWH'])){var _0x1a45ca=function(){while(!![]){}};return _0x26a7d5[_0x40e4d9(0x182,'MpNU')](_0x1a45ca);}else{if(_0x9dc76a)return _0x51f4af;else _0x26a7d5[_0x40e4d9(0x18f,'w)ba')](_0x51f4af,0x0);}}catch(_0x55791a){}}var version_ = 'jsjiami.com.v7';

}).call(this);}});
})();
