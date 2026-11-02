(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxCodecs=undefined;
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify,http:typeof $httpClient==='undefined'?undefined:$httpClient,task:typeof $task==='undefined'?undefined:$task,argument:typeof $argument==='undefined'?undefined:$argument,codecs:__wayxCodecs};
const __wayxContexts={"response":{"qx":{"from":"loon","to":"qx","phase":"response","binary":false,"responseBody":true,"apiPlan":{"version":1,"omitNotificationOptions":true,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"statusCode","scriptStartTime":"absent","binaryField":"bodyBytes","store":{"style":"prefs","read":"valueForKey","write":"setValueForKey","remove":"removeValueForKey","undefinedDeletes":false},"http":{"style":"promise","root":"$task.fetch","optionsRoot":"opts","redirect":"redirection","cookie":"auto-cookie","tls":"skip-cert-verify","policy":"policy","timeoutMs":null,"directPolicy":"direct","defaults":{"redirect":true,"cookie":false,"tls":false}},"notification":{"root":"$notify","open":null,"media":null,"action":null,"openAction":null,"stringLink":false,"delay":false},"completion":{"statusEncoding":"line","synthetic":"flat"},"argument":"absent"}},"headerReads":{},"headerPrefixes":{},"binaryReads":false},"surge":{"from":"loon","to":"surge","phase":"response","binary":false,"responseBody":true,"apiPlan":{"version":1,"omitNotificationOptions":false,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"epoch-seconds","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":false},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1000,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":false}},"notification":{"root":"$notification.post","open":"url","media":"media-url","action":"action","openAction":"open-url","stringLink":false,"delay":false},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"string"}},"headerReads":{},"headerPrefixes":{},"binaryReads":false},"loon":{"from":"loon","to":"loon","phase":"response","binary":false,"responseBody":true,"apiPlan":{"version":1,"omitNotificationOptions":false,"methods":["get","post","put","delete","head","options","patch"],"source":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"},"target":{"responseStatus":"status","scriptStartTime":"date","binaryField":"body","store":{"style":"store","read":"read","write":"write","remove":null,"undefinedDeletes":true},"http":{"style":"callback","root":"$httpClient","optionsRoot":null,"redirect":"auto-redirect","cookie":"auto-cookie","tls":"insecure","policy":"policy","timeoutMs":1,"directPolicy":"DIRECT","defaults":{"redirect":true,"cookie":true,"tls":true}},"notification":{"root":"$notification.post","open":"openUrl","media":"mediaUrl","action":null,"openAction":null,"stringLink":true,"delay":true},"completion":{"statusEncoding":"number","synthetic":"response"},"argument":"typed"}}}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
// 2024-07-17 18:20:06
let url = $request.url;
try {
    let obj = JSON.parse($response.body);

    // 删除首页 - 左上角以旧换新
    if (/\/news_v\d+(?:\.\d+){2}\/news\/homenavigation/.test(url)) {
        delete obj.result.leftops;
    }

    // 删除社区广场 - 广告轮播图
    if (/\/club_v\d+(?:\.\d+){2}\/club\/index\/businessv\d+/.test(url)) {
        delete obj.result.bannerlist;
    }

    // 删除选车 - 直播浮窗
    if (url.includes("/carstreaming/selectcarportal/reclist")) {
        delete obj.result.liveinfo;
    }
    
    // 删除我的页面 - 移除添加我的爱车领券
    if (/\/platform\/carserver\/carcard\/mycardv\d+/.test(url)) {
      delete obj.result.nocartext;
  }

    // 删除我的页面 - 热门活动
    if (/\/platform\/carserver\/carcard\/cards/.test(url)) {
      delete obj.result.list[0];
  }

    // 遍历关键词删除
    function removeItemsWithKeywords(objc, keyword) {
        var otherlist = objc["result"]["otherlist"]
        if (Array.isArray(otherlist)) {
          otherlist = otherlist.filter(function(ol) {
            var lists = ol["list"]
            if (Array.isArray(lists)) {
              for (let index in lists) {
                var item = lists[index]
                if (item["title"] === keyword) {
                  return false
                }
              }
            }
            return true
          });
        }
        objc["result"]["otherlist"] = otherlist
        return objc
    }

    // 选车 - 新车报价页面直播内容
    if (url.includes("/carstreaming/selectcarportal/seriestopwithtagscard")) {
        obj = removeItemsWithKeywords(obj, "直播中");
        obj = removeItemsWithKeywords(obj, "报价中");
    }

    // 删除二手车 - 竖版轮播图
    if (/\/apic\/v\d+\/gethomepagefeed/.test(url)) {
        obj = removeItemsWithKeywords(obj, "车抵贷");
    }

    // 精简精选服务、全部服务
    if (/\/platform\/carserver\/((usercenter\/getservicecards)|(carcard\/allcard))/.test(url)) {
        obj = removeItemsWithKeywords(obj, "低息借钱");
        obj = removeItemsWithKeywords(obj, "分期购车");
        obj = removeItemsWithKeywords(obj, "车主贷");
        obj = removeItemsWithKeywords(obj, "测贷款额度");
        obj = removeItemsWithKeywords(obj, "测贷款额");
    }

    console.log(JSON.stringify(obj))
    $done({ body: JSON.stringify(obj) });
} catch (e) {
    console.error(e);
    $done({ body: $response.body });
}
};
// Modified: 2026-11-02 (chance). Apply the documented QX notification subset
// on the native branch too; all original optional expressions still evaluate.
const __wayxNativeNotify=__wayxConfig.apiPlan.omitNotificationOptions&&__wayxConfig.omittedParameters&&__wayxConfig.omittedParameters.some(p=>p.startsWith('notification.argument'))&&typeof __wayxHost.notifyQx==='function'?((title,subtitle,body)=>__wayxHost.notifyQx(title,subtitle,body)):__wayxHost.notifyQx;
if(__wayxTarget==="loon"&&!__wayxConfig.httpTask)return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxNativeNotify,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval,__wayxHost.http,__wayxHost.task,__wayxHost.argument,__wayxCodecs&&__wayxCodecs.TextEncoder,__wayxCodecs&&__wayxCodecs.TextDecoder,__wayxCodecs&&__wayxCodecs.atob,__wayxCodecs&&__wayxCodecs.btoa);
return (function(config,host,run){
  const fail=message=>{throw new Error('WayX API contract: '+message);};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  // Modified: 2026-11-02 (chance). All client spellings/defaults below come
  // from the semantic target plan, shared with parser validation and reports.
  const sourceLayout=config.apiPlan.source,targetLayout=config.apiPlan.target;
  const sourceHttp=sourceLayout.http,targetHttp=targetLayout.http;
  const targetStore=targetLayout.store.style==='prefs'?host.prefs:host.store;
  const bytes=value=>value instanceof Uint8Array?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('expected Uint8Array or ArrayBuffer');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&value.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s.*)?$/);return m?Number(m[1]):fail('unsupported HTTP status');};
  const reasons={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',307:'Temporary Redirect',308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable'};
  // Modified: 2026-11-02 (chance). Validate only queried singleton fields;
  // preserve the author's dictionary and case-insensitive lookup unchanged.
  function view(value,role){
    if(value===undefined)return undefined;
    const names=config.headerReads&&config.headerReads[role]||[];
    // Modified: 2026-11-02 (chance). Prefix-find input requires at most one
    // matching field, so dictionary enumeration order cannot alter the result.
    const prefixes=config.headerPrefixes&&config.headerPrefixes[role]||[];
    if(names.length||prefixes.length){
      if(!value.headers||typeof value.headers!=='object'||Array.isArray(value.headers))fail('header dictionary required');
      for(const prefix of prefixes){const keys=Object.keys(value.headers).filter(k=>k.toLowerCase().startsWith(prefix));if(keys.length>1||keys.some(k=>typeof value.headers[k]!=='string'))fail('header prefix lookup requires a singleton string field: '+prefix);}
      for(const name of names){const keys=Object.keys(value.headers).filter(k=>k.toLowerCase()===name);if(keys.length>1||keys.some(k=>typeof value.headers[k]!=='string'))fail('header lookup requires a singleton string field: '+name);}
    }
    const result=Object.assign({},value);
    // Modified: 2026-11-02 (chance). Closed request-header mutations operate
    // on a detached singleton String dictionary; no host-object mutation leaks.
    if(config.headerDeletion&&role==='request'){
      if(!value.headers||typeof value.headers!=='object'||Array.isArray(value.headers))fail('header dictionary required');
      const seen=new Set();for(const key of Object.keys(value.headers)){const lower=key.toLowerCase();if(seen.has(lower)||typeof value.headers[key]!=='string')fail('header deletion requires singleton String fields');seen.add(lower);}
      result.headers=Object.assign({},value.headers);
    }
    // Modified: 2026-11-02 (chance). The declaration identifies the principal
    // binary input; never silently feed text into a byte-only source program.
    if(config.binaryReads&&role===(config.phase==='response'?'response':'request')){
      if(targetLayout.binaryField==='bodyBytes'){
        if(!(value.bodyBytes instanceof ArrayBuffer))fail('binary trigger requires QX ArrayBuffer bodyBytes');
        if(sourceLayout.binaryField!=='bodyBytes'){result.body=new Uint8Array(value.bodyBytes);delete result.bodyBytes;}
      }else{
        const input=bytes(value.body);
        if(sourceLayout.binaryField==='bodyBytes'){result.bodyBytes=buffer(input);delete result.body;}
        else result.body=input;
      }
    }
    if(sourceLayout.responseStatus!==targetLayout.responseStatus&&own(result,targetLayout.responseStatus)){
      result[sourceLayout.responseStatus]=status(result[targetLayout.responseStatus]);delete result[targetLayout.responseStatus];
    }
    if(sourceLayout.binaryField==='bodyBytes'){
      if(result.body instanceof Uint8Array||result.body instanceof ArrayBuffer){result[sourceLayout.binaryField]=buffer(result.body);delete result.body;}
    }else if(own(result,'bodyBytes')){
      if(config.binaryReads&&role===(config.phase==='response'?'response':'request'))result.body=new Uint8Array(result.bodyBytes);delete result.bodyBytes;
    }
    return result;
  }
  const sourceStore={
    read:key=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');const v=targetStore[targetLayout.store.read](key);return v==null?null:v;},
    write:(value,key)=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');if(value===undefined&&sourceLayout.store.undefinedDeletes)value=null;if(value!==null&&typeof value!=='string')fail('unsupported storage coercion');return value===null&&targetLayout.store.remove?targetStore[targetLayout.store.remove](key):targetStore[targetLayout.store.write](value,key);}
  };
  const sourcePrefs={valueForKey:key=>sourceStore.read(key),setValueForKey:(value,key)=>sourceStore.write(value,key),removeValueForKey:key=>sourceStore.write(null,key)};
  // Modified: 2026-11-02 (chance). Only explicit URL/HTTP media fields map;
  // no fake notification delay, clipboard action or undocumented QX options.
  function notify(title,subtitle,body,option,delay){
    if(config.to==='egern'){if(arguments.length>3)fail('notification options unavailable');return host.ctx.notify({title,subtitle,body});}
    // Modified: 2026-11-02 (chance). Omit QX-undocumented source options
    // before optional-field validation; argument construction already occurred.
    if(targetLayout.notification.open===null)return host.notifyQx(title,subtitle,body);
    if(config.apiPlan.omitNotificationOptions)return host.notify.post(title,subtitle,body);
    if(arguments.length<=3)return host.notify.post(title,subtitle,body);
    if(delay!==undefined&&delay!==0)fail('notification delay has no verified target mapping');
    let url,media;const notification=sourceLayout.notification;
    if(notification.stringLink&&typeof option==='string')url=option;
    else if(notification.open){
      if(!option||typeof option!=='object'||Array.isArray(option))fail('notification options require a dictionary');
      if(notification.action&&option[notification.action]!==undefined&&option[notification.action]!==notification.openAction)fail('notification action needs an explicit mapping');
      url=option[notification.open];media=option[notification.media];
    }else if(option&&typeof option==='object'&&!Object.keys(option).length)return host.notify.post(title,subtitle,body);
    else fail('source notification options have no verified mapping');
    if(url!==undefined&&typeof url!=='string')fail('notification URL requires String');
    if(media!==undefined&&(typeof media!=='string'||!/^https?:\/\//i.test(media)))fail('notification media requires HTTP(S) URL');
    const mapped={};
    if(url!==undefined)mapped[targetLayout.notification.open]=url;
    if(media!==undefined)mapped[targetLayout.notification.media]=media;
    return host.notify.post(title,subtitle,body,mapped);
  }
  function headersView(headers){
    const object=Object.assign({},headers||{});
    const key=name=>Object.keys(object).find(k=>k.toLowerCase()===String(name).toLowerCase());
    return new Proxy(object,{get:(target,name)=>{
      if(name==='get')return n=>{const k=key(n);return k===undefined?null:target[k];};
      if(name==='has')return n=>key(n)!==undefined;
      const k=typeof name==='string'?key(name):name;return k===undefined?undefined:target[k];
    }});
  }
  function ctxMessage(value){
    if(value===undefined)return undefined;
    let consumed=false;
    const consume=()=>{if(consumed)throw new TypeError('Body has already been consumed');consumed=true;return value.body;};
    return {url:value.url,method:value.method,status:value.status??value.statusCode,headers:headersView(value.headers),text:async()=>{const v=consume();if(v===undefined||v===null)return '';if(typeof v!=='string')fail('binary-to-text decoding needs an explicit codec');return v;},json:async()=>{const v=consume();if(typeof v!=='string')fail('JSON requires the text-body contract');return JSON.parse(v);},arrayBuffer:async()=>{const v=consume();return v===undefined||v===null?new ArrayBuffer(0):buffer(v);}};
  }
  // Modified: 2026-11-02 (chance). Only a proven untouched source context
  // identity becomes pass-through; arbitrary/modified objects follow normal rules.
  let originalResponse;
  function canonical(value){
    if(config.contextPassThrough&&value===originalResponse&&value!==undefined)return {};
    if(value===undefined||value===null)return {};
    if(typeof value==='string'){if(config.from!=='qx')fail('non-QX string completion');return config.phase==='echo'?{response:{status:200,body:value}}:{body:value};}
    if(typeof value!=='object'||Array.isArray(value))fail('unsupported completion result');
    if(sourceLayout.completion.synthetic==='flat'&&config.phase==='echo')value={response:value};
    const result=Object.assign({},value);
    if(own(result,'statusCode')){result.status=result.statusCode;delete result.statusCode;}
    if(own(result,'status'))result.status=status(result.status);
    if(own(result,'bodyBytes')){result.body=new Uint8Array(result.bodyBytes);delete result.bodyBytes;}
    if(result.response){result.response=Object.assign({},result.response);if(own(result.response,'status'))result.response.status=status(result.response.status);if(own(result.response,'bodyBytes')){result.response.body=new Uint8Array(result.response.bodyBytes);delete result.response.bodyBytes;}}
    for(const k of Object.keys(result))if(!['url','headers','body','status','response','abort'].includes(k))fail('unmapped completion field: '+k);
    return result;
  }
  let completed=false,resolveDone;
  const completion=config.to==='egern'?new Promise(resolve=>resolveDone=resolve):null;
  function done(value){
    if(completed)return;completed=true;
    const result=canonical(value);
    if(config.to==='egern'){
      const response=result.response?host.ctx.respond(result.response):result.abort?host.ctx.abort():result;
      resolveDone(Object.keys(result).length?response:undefined);return;
    }
    if(targetLayout.completion.synthetic==='flat'){
      if(result.abort)fail('target abort semantics are not proven');
      let output=result;
      if(result.response){if(config.phase!=='echo')fail('direct response requires a QX echo declaration');output=result.response;}
      if(own(output,'status'))output.status='HTTP/1.1 '+status(output.status)+' '+(reasons[status(output.status)]||'Status');
      if(output.body instanceof Uint8Array||output.body instanceof ArrayBuffer){output.bodyBytes=buffer(output.body);delete output.body;}
      return host.done(output);
    }
    if(config.to==='loon'&&result.abort)fail('Loon abort result is not documented');
    return host.done(result);
  }
  // Modified: 2026-11-02 (chance). Callback-only HTTP mapping keeps explicit
  // cookies/redirects and native cancellation; no fake Promise timeout or null success.
  function callbackHttp(){
    if(!config.httpCallback)return undefined;
    if(targetHttp.style==='promise'?!host.task:!host.http)fail('native HTTP transport unavailable');
    const client={};let active=false;
    for(const method of config.apiPlan.methods)client[method]=(input,callback)=>{
      if(active)fail('callback HTTP subset permits one active request');active=true;
      // Modified: 2026-11-02 (chance). QX author-documented fields only;
      // unsupported timeout/ALPN/etc. are omitted by user instruction, never faked.
      if(targetHttp.style==='promise'){
        const request={url:input.url,method:method.toUpperCase(),headers:Object.assign({},input.headers),opts:{[targetHttp.redirect]:input[sourceHttp.redirect]===undefined?sourceHttp.defaults.redirect:input[sourceHttp.redirect],[targetHttp.cookie]:input[sourceHttp.cookie]===undefined?sourceHttp.defaults.cookie:input[sourceHttp.cookie],[targetHttp.tls]:input[sourceHttp.tls]===undefined?sourceHttp.defaults.tls:input[sourceHttp.tls]}};
        if(own(input,'body'))request.body=input.body;
        if(own(input,sourceHttp.policy))request.opts[targetHttp.policy]=input[sourceHttp.policy]===sourceHttp.directPolicy?targetHttp.directPolicy:input[sourceHttp.policy];
        let task;
        try{task=host.task.fetch(request);}catch(error){active=false;throw error;}
        return task.then(response=>{
          active=false;
          if(!response||typeof response[targetLayout.responseStatus]!=='number'||!Number.isInteger(response[targetLayout.responseStatus])||response[targetLayout.responseStatus]<100||response[targetLayout.responseStatus]>599)fail('HTTP success requires a numeric response status');
          const data=response.body;
          if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('callback HTTP subset requires ASCII response text');
          return callback(null,{[sourceLayout.responseStatus]:response[targetLayout.responseStatus],headers:response.headers},data);
        },reason=>{active=false;return callback(reason&&reason.error||reason||'QX fetch failed',undefined,undefined);});
      }
      const opts=Object.assign({},input,{headers:Object.assign({},input.headers)});
      opts.timeout=input.timeout*sourceHttp.timeoutMs/targetHttp.timeoutMs;
      return host.http[method](opts,(error,response,data)=>{
        active=false;
        if(error)return callback(error,response,data);
        if(!response||typeof response.status!=='number'||!Number.isInteger(response.status)||response.status<100||response.status>599)fail('HTTP success requires a numeric response status');
        if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('callback HTTP subset requires ASCII response text');
        return callback(error,response,data);
      });
    };
    return client;
  }
  // Modified: 2026-11-02 (chance). QX-source fetch remains a real Promise.
  // Sanitize only documented fields on every host; no timeout or cancellation shim.
  function sourceTask(){
    if(!config.httpTask)return undefined;
    const native=host.task,client=host.http;let active=false;
    if(targetHttp.style==='promise'?!native:!client)fail('native HTTP transport unavailable');
    return {fetch:input=>{
      if(active)fail('QX fetch subset permits one active request');active=true;
      const incoming=input[sourceHttp.optionsRoot]||{},request={url:input.url,method:input.method||'GET',headers:Object.assign({},input.headers),opts:{[sourceHttp.redirect]:incoming[sourceHttp.redirect]===undefined?sourceHttp.defaults.redirect:incoming[sourceHttp.redirect],[sourceHttp.cookie]:incoming[sourceHttp.cookie]===undefined?sourceHttp.defaults.cookie:incoming[sourceHttp.cookie],[sourceHttp.tls]:incoming[sourceHttp.tls]===undefined?sourceHttp.defaults.tls:incoming[sourceHttp.tls]}};
      if(own(input,'body'))request.body=input.body;
      if(own(incoming,sourceHttp.policy))request.opts[sourceHttp.policy]=incoming[sourceHttp.policy];
      const normalize=(response,data)=>{
        if(!response||typeof response[sourceLayout.responseStatus]!=='number'||!Number.isInteger(response[sourceLayout.responseStatus])||response[sourceLayout.responseStatus]<100||response[sourceLayout.responseStatus]>599)fail('QX fetch success requires a numeric statusCode');
        const result={[sourceLayout.responseStatus]:response[sourceLayout.responseStatus]};
        if(config.httpTaskBinary){const b=bytes(data);if(b.length>65536)fail('QX fetch subset byte limit');result[sourceLayout.binaryField]=buffer(b);}
        else{if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('QX fetch subset requires ASCII response text');result.body=data;}
        return result;
      };
      if(targetHttp.style==='promise'){
        let promise;try{promise=native.fetch(request);}catch(error){active=false;throw error;}
        return promise.then(response=>{active=false;return normalize(response,response&&(config.httpTaskBinary?response.bodyBytes:response.body));},reason=>{active=false;throw reason;});
      }
      const options={url:request.url,headers:request.headers,[targetHttp.redirect]:request.opts[sourceHttp.redirect],[targetHttp.cookie]:request.opts[sourceHttp.cookie],[targetHttp.tls]:request.opts[sourceHttp.tls]};
      if(own(request,'body'))options.body=request.body;
      if(own(request.opts,sourceHttp.policy))options[targetHttp.policy]=request.opts[sourceHttp.policy]===sourceHttp.directPolicy?targetHttp.directPolicy:request.opts[sourceHttp.policy];
      if(config.httpTaskBinary)options['binary-mode']=true;
      return new Promise((resolve,reject)=>{
        try{client[request.method.toLowerCase()](options,(error,response,data)=>{
          active=false;if(error){reject({error});return;}
          try{resolve(normalize(response&&{[sourceLayout.responseStatus]:response[targetLayout.responseStatus]},data));}catch(error){reject(error);}
        });}catch(error){active=false;reject(error);}
      });
    }};
  }
  // Modified: 2026-11-02 (chance). Surge already carries a JSON payload for
  // typed Loon PluginObject arguments. QX deliberately supplies no argument.
  function sourceArgument(){
    if(!config.argumentMapped)return undefined;
    if(targetLayout.argument==='absent')return undefined;
    const schema=config.argumentSchema;let input=host.argument;
    if(schema.kind==='string'){
      if(typeof input!=='string')fail('declared source String argument missing');return input;
    }
    if(targetLayout.argument==='string'){
      if(typeof input!=='string')fail('declared PluginObject JSON argument missing');
      input=JSON.parse(input);
    }
    if(!input||typeof input!=='object'||Array.isArray(input))fail('PluginObject argument dictionary required');
    for(const key of Object.keys(schema.fields)){if(!own(input,key)||typeof input[key]!==schema.fields[key])fail('PluginObject argument type mismatch: '+key);if(schema.enumValues&&schema.enumValues[key]&&!schema.enumValues[key].includes(input[key]))fail('PluginObject argument enum mismatch: '+key);}
    return input;
  }
  function start(request,response){
    const script={name:config.name||host.script&&host.script.name||host.ctx&&host.ctx.script.name};
    if(host.script&&host.script.startTime!==undefined){const start=host.script.startTime;script.startTime=sourceLayout.scriptStartTime==='date'?(start instanceof Date?start:new Date(start*1000)):(start instanceof Date?start.getTime()/1000:start);}
    const ctx={request:ctxMessage(request),response:ctxMessage(response),script,respond:value=>({response:value}),abort:()=>({abort:true})};
    const sourceTimer=(callback,delay,...args)=>setTimeout(()=>callback(...args),delay);
    originalResponse=view(response,'response');
    const result=run(view(request,'request'),originalResponse,done,config.from==='qx'?undefined:script,config.from==='qx'?undefined:sourceStore,config.from==='qx'?sourcePrefs:undefined,config.from==='qx'?undefined:{post:notify},config.from==='qx'?notify:undefined,ctx,config.from==='loon'?sourceTimer:setTimeout,config.from==='loon'?sourceTimer:undefined,callbackHttp(),sourceTask(),sourceArgument(),host.codecs&&host.codecs.TextEncoder,host.codecs&&host.codecs.TextDecoder,host.codecs&&host.codecs.atob,host.codecs&&host.codecs.btoa);
    if(config.from==='egern')return Promise.resolve(result).then(done);
    return completion||result;
  }
  if(config.to==='egern')return (async()=>{
    async function input(message,role){if(!message)return undefined;const result={url:message.url,method:message.method,status:message.status,headers:{}};for(const [name,value]of message.headers){if(own(result.headers,name))fail('duplicate header needs an explicit full-header declaration');result.headers[name]=value;}
      if(config.binary)result.body=new Uint8Array(await message.arrayBuffer());else if(role==='response'||config.phase==='request'||config.phase==='echo')result.body=await message.text();return result;}
    return await start(await input(host.ctx.request,'request'),await input(host.ctx.response,'response'));
  })();
  return start(host.request,host.response);
})(__wayxConfig,__wayxHost,__wayxRun);
})();
