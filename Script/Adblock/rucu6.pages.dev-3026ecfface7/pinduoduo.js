(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const __wayxContexts={"response":{"qx":{"from":"loon","to":"qx","phase":"response","binary":false,"headerReads":{}},"surge":{"from":"loon","to":"surge","phase":"response","binary":false,"headerReads":{}},"loon":{"from":"loon","to":"loon","phase":"response","binary":false}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
// 2026-09-26 12:55

const url = $request.url;
if (!$response.body) $done({});
let body = $response.body;

if (url.includes("/api/alexa/homepage/hub")) {
  let obj = JSON.parse(body);
  // 底部标签栏
  if (obj?.result) {
    if (obj?.result?.bottom_tabs?.length > 0) {
      // 标签栏1
      obj.result.bottom_tabs = obj.result.bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
    }
    if (obj?.result?.buffer_bottom_tabs?.length > 0) {
      // 标签栏2
      obj.result.buffer_bottom_tabs = obj.result.buffer_bottom_tabs.filter((i) => /(?:chat_list|index|personal)/.test(i?.link));
    }
    if (obj?.result?.dy_module?.irregular_banner_dy) {
      delete obj.result.dy_module.irregular_banner_dy; // 首页 顶部banner
    }
    // delete obj.result.icon_set; // 顶部图标 多多买菜 现金大转盘
    if (obj?.result?.search_bar_hot_query) {
      delete obj.result.search_bar_hot_query; // 搜索框填充词
    }
    if (obj?.result?.top_skin) {
      delete obj.result.top_skin; // 首页 顶部背景图
    }
  }
  body = JSON.stringify(obj);
} else if (url.includes("/comment_result")) {
  // 评价页面
  if (/^\s*<!DOCTYPE html>/i.test(body) !== false) {
    // 构造我们要注入的 CSS 样式
    const hideCSS = `
      <style>
        /* 隐藏推荐商品容器 */
        #recommend-wrapper,
        #downloader-container {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
      </style>
    </head>
    `;

    // 将样式代码注入到 HTML 的 </head> 标签之前
    body = body.replace("</head>", hideCSS);
    // 数据层面声明"没有更多了"，阻止翻页时继续请求推荐接口
    if (body.includes('"has_more":true')) {
      body = body.replace('"has_more":true', '"has_more":false');
    }
  }
} else if (url.includes("/mdkd/package")) {
  // 取件页面
  if (/^\s*<!DOCTYPE html>/i.test(body) !== false) {
    // 构造我们要注入的 CSS 样式
    const hideCSS = `
      <style>
        /* 1. 隐藏底部大面积的商品推荐瀑布流 */
        #goods-list-big-container,
        [class^="index_goods-list-big-container"],
        .goods-list-container {
          display: none !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* 2. 隐藏右下角悬浮的 GIF 活动动图 */
        [class^="index_gif-container"] {
          display: none !important;
        }

        /* 3. 【可选】如果你说的红框是“近一周已取出快递”模块，请删除下面这行代码前后的注释斜杠 */
        /* [class^="index_recently-package-container"] { display: none !important; } */
        
        /* 4. 【可选】如果你说的红框是“暂无手机尾号收到的快递”的引导，请删除下面这行代码前后的注释斜杠 */
        /* .empty-package_package-none-container__35DEn { display: none !important; } */
      </style>
    </head>
    `;

    // 将样式代码注入到 HTML 的 </head> 标签之前
    body = body.replace("</head>", hideCSS);
  }
} else {
  $done({});
}

$done({ body });

};
if(__wayxTarget==="loon")return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxHost.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval);
return (function(config,host,run){
  const fail=message=>{throw new Error('WayX API contract: '+message);};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const bytes=value=>value instanceof Uint8Array?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('expected Uint8Array or ArrayBuffer');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&value.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s.*)?$/);return m?Number(m[1]):fail('unsupported HTTP status');};
  const reasons={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',307:'Temporary Redirect',308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable'};
  // Modified: 2026-11-02 (chance). Validate only queried singleton fields;
  // preserve the author's dictionary and case-insensitive lookup unchanged.
  function view(value,role){
    if(value===undefined)return undefined;
    const names=config.headerReads&&config.headerReads[role]||[];
    if(names.length){
      if(!value.headers||typeof value.headers!=='object'||Array.isArray(value.headers))fail('header dictionary required');
      for(const name of names){const keys=Object.keys(value.headers).filter(k=>k.toLowerCase()===name);if(keys.length>1||keys.some(k=>typeof value.headers[k]!=='string'))fail('header lookup requires a singleton string field: '+name);}
    }
    const result=Object.assign({},value);
    if(config.from==='qx'){
      if(own(result,'status')){result.statusCode=status(result.status);delete result.status;}
      if(result.body instanceof Uint8Array||result.body instanceof ArrayBuffer){result.bodyBytes=buffer(result.body);delete result.body;}
    }else{
      if(own(result,'statusCode')){result.status=result.statusCode;delete result.statusCode;}
      if(own(result,'bodyBytes')){result.body=new Uint8Array(result.bodyBytes);delete result.bodyBytes;}
    }
    return result;
  }
  const sourceStore={
    read:key=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');const v=host.store?host.store.read(key):host.prefs.valueForKey(key);return v==null?null:v;},
    write:(value,key)=>{if(typeof key!=='string'||/[\\/]/.test(key))fail('explicit plain storage key required');if(value===undefined&&config.from==='loon')value=null;if(value!==null&&typeof value!=='string')fail('unsupported storage coercion');return host.store?host.store.write(value,key):value===null?host.prefs.removeValueForKey(key):host.prefs.setValueForKey(value,key);}
  };
  const sourcePrefs={valueForKey:key=>sourceStore.read(key),setValueForKey:(value,key)=>sourceStore.write(value,key),removeValueForKey:key=>sourceStore.write(null,key)};
  function notify(title,subtitle,body){
    if(arguments.length>3)fail('notification options require an explicit platform mapping');
    if(config.to==='egern')return host.ctx.notify({title,subtitle,body});
    return host.notify?host.notify.post(title,subtitle,body):host.notifyQx(title,subtitle,body);
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
  function canonical(value){
    if(value===undefined||value===null)return {};
    if(typeof value==='string'){if(config.from!=='qx')fail('non-QX string completion');return config.phase==='echo'?{response:{status:200,body:value}}:{body:value};}
    if(typeof value!=='object'||Array.isArray(value))fail('unsupported completion result');
    if(config.from==='qx'&&config.phase==='echo')value={response:value};
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
    if(config.to==='qx'){
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
    if(!host.http)fail('native callback HTTP transport unavailable');
    const client={};let active=false;
    for(const method of ['get','post','put','delete','head','options','patch'])client[method]=(input,callback)=>{
      if(active)fail('callback HTTP subset permits one active request');active=true;
      const opts=Object.assign({},input,{headers:Object.assign({},input.headers)});
      opts.timeout=input.timeout*(config.from==='surge'?1000:1)/(config.to==='surge'?1000:1);
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
  function start(request,response){
    const script={name:config.name||host.script&&host.script.name||host.ctx&&host.ctx.script.name};
    if(host.script&&host.script.startTime!==undefined){const start=host.script.startTime;script.startTime=config.from==='loon'?(start instanceof Date?start:new Date(start*1000)):(start instanceof Date?start.getTime()/1000:start);}
    const ctx={request:ctxMessage(request),response:ctxMessage(response),script,respond:value=>({response:value}),abort:()=>({abort:true})};
    const sourceTimer=(callback,delay,...args)=>setTimeout(()=>callback(...args),delay);
    const result=run(view(request,'request'),view(response,'response'),done,config.from==='qx'?undefined:script,config.from==='qx'?undefined:sourceStore,config.from==='qx'?sourcePrefs:undefined,config.from==='qx'?undefined:{post:notify},config.from==='qx'?notify:undefined,ctx,config.from==='loon'?sourceTimer:setTimeout,config.from==='loon'?sourceTimer:undefined,callbackHttp());
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
