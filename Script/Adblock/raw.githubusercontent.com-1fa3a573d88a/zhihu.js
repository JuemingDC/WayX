(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const __wayxContexts={"response":{"qx":{"from":"qx","to":"qx","phase":"response","binary":false},"surge":{"from":"qx","to":"surge","phase":"response","binary":false,"headerReads":{}},"loon":{"from":"qx","to":"loon","phase":"response","binary":false,"headerReads":{}}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
// 2026-01-19 20:50:00

if (!$response.body) $done({});
const url = $request.url;
let obj = JSON.parse($response.body);

if (url.includes("/answers/v2/") || url.includes("/articles/v2/")) {
  // 2024-04-29 新版知乎 回答列表下的相关提问
  if (obj?.third_business?.related_queries?.queries?.length > 0) {
    obj.third_business.related_queries.queries = [];
  }
} else if (url.includes("/api/cloud/zhihu/config/all")) {
  // 全局配置
  if (obj?.data?.configs?.length > 0) {
    for (let i of obj.data.configs) {
      if (i?.configKey === "feed_gray_theme") {
        if (i?.configValue) {
          i.configValue.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
          i.configValue.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
          i.status = false;
        }
      } else if (i?.configKey === "feed_top_res") {
        // 首页顶部背景图
        if (i?.configValue) {
          i.configValue.start_time = 3818332800; // Unix 时间戳 2090-12-31 00:00:00
          i.configValue.end_time = 3818419199; // Unix 时间戳 2090-12-31 23:59:59
        }
      }
    }
  }
} else if (url.includes("/api/v4/answers")) {
  delete obj.data;
  delete obj.paging;
} else if (url.includes("/api/v4/articles")) {
  const item = ["ad_info", "paging", "recommend_info"];
  item.forEach((i) => {
    delete obj[i];
  });
} else if (url.includes("/appcloud2.zhihu.com/v3/config")) {
  delete obj.config.hp_channel_tab;
  if (obj?.config) {
    if (obj.config?.homepage_feed_tab) {
      obj.config.homepage_feed_tab.tab_infos = obj.config.homepage_feed_tab.tab_infos.filter((i) => {
        if (i.tab_type === "activity_tab") {
          i.start_time = "3818332800"; // Unix 时间戳 2090-12-31 00:00:00
          i.end_time = "3818419199"; // Unix 时间戳 2090-12-31 23:59:59
          return true;
        } else {
          return false;
        }
      });
    }
    if (obj.config?.zombie_conf) {
      obj.config.zombie_conf.zombieEnable = false;
    }
    if (obj.config?.gray_mode) {
      obj.config.gray_modeenable = false;
      obj.config.gray_mode.start_time = "3818332800"; // Unix 时间戳 2090-12-31 00:00:00
      obj.config.gray_mode.end_time = "3818419199"; // Unix 时间戳 2090-12-31 23:59:59
    }
    if (obj.config?.zhcnh_thread_sync) {
      obj.config.zhcnh_thread_sync.LocalDNSSetHostWhiteList = [];
      obj.config.zhcnh_thread_sync.isOpenLocalDNS = "0";
      obj.config.zhcnh_thread_sync.ZHBackUpIP_Switch_Open = "0";
      obj.config.zhcnh_thread_sync.dns_ip_detector_operation_lock = "1";
      obj.config.zhcnh_thread_sync.ZHHTTPSessionManager_setupZHHTTPHeaderField = "1";
    }
    obj.config.zvideo_max_number = 1;
    obj.config.is_show_followguide_alert = false;
  }
} else if (url.includes("/commercial_api/app_float_layer")) {
  // 悬浮图标
  if (obj?.feed_egg) {
    delete obj.feed_egg;
  }
} else if (url.includes("/feed/render/tab/config")) {
  // 首页二级标签 白名单 live直播 edu人工智能AI
  if (obj?.selected_sections?.length > 0) {
    obj.selected_sections = obj.selected_sections.filter((i) => ["recommend", "section"]?.includes(i?.tab_type));
  }
} else if (url.includes("/moments_v3")) {
  if (obj?.data?.length > 0) {
    obj.data = obj.data.filter((i) => !i?.title?.includes("为您推荐"));
  }
} else if (url.includes("/next-bff")) {
  if (obj?.data?.length > 0) {
    obj.data = obj.data.filter(
      (i) =>
        !(
          i?.origin_data?.type?.includes("ad") ||
          i?.origin_data?.resource_type?.includes("ad") ||
          i?.origin_data?.next_guide?.title?.includes("推荐")
        )
    );
  }
} else if (url.includes("/next-data")) {
  if (obj?.data?.data?.length > 0) {
    obj.data.data = obj.data.data.filter((i) => !(i?.type?.includes("ad") || i?.data?.answer_type?.includes("PAID")));
  }
} else if (url.includes("/next-render")) {
  if (obj?.data?.length > 0) {
    obj.data = obj.data.filter(
      (i) =>
        !(
          i?.adjson ||
          i?.biz_type_list?.includes("article") ||
          i?.biz_type_list?.includes("content") ||
          i?.business_type?.includes("paid") ||
          i?.section_info ||
          i?.tips ||
          i?.type?.includes("ad")
        )
    );
  }
} else if (url.includes("/questions/")) {
  // 问题回答列表
  delete obj.ad_info;
  delete obj.data.ad_info;
  delete obj.query_info;
  if (obj?.data?.length > 0) {
    obj.data = obj.data.filter((i) => !i?.target?.answer_type?.includes("paid"));
  }
} else if (url.includes("/root/tab")) {
  // 首页一级标签 白名单
  if (obj?.tab_list?.length > 0) {
    obj.tab_list = obj.tab_list.filter((i) => ["follow", "hot", "recommend"]?.includes(i?.tab_type));
  }
} else if (url.includes("/topstory/hot-lists/everyone-seeing")) {
  // 热榜信息流
  if (obj?.data?.data?.length > 0) {
    // 合作推广
    obj.data.data = obj.data.data.filter((i) => !i.target?.metrics_area?.text?.includes("合作推广"));
  }
} else if (url.includes("/topstory/hot-lists/total")) {
  // 热榜排行榜
  if (obj?.data?.length > 0) {
    // 品牌甄选
    obj.data = obj.data.filter((i) => !i.hasOwnProperty("ad"));
  }
} else if (url.includes("/topstory/recommend")) {
  // 推荐信息流
  if (obj?.data?.length > 0) {
    obj.data = obj.data.filter((i) => {
      if (i.type === "market_card" && i.fields?.header?.url && i.fields.body?.video?.id) {
        let videoID = getUrlParamValue(item.fields.header.url, "videoID");
        if (videoID) {
          i.fields.body.video.id = videoID;
        }
      } else if (i.type === "common_card") {
        if (i.extra?.type === "drama") {
          // 直播内容
          return false;
        } else if (i.extra?.type === "zvideo") {
          // 推广视频
          let videoUrl = i.common_card.feed_content.video.customized_page_url;
          let videoID = getUrlParamValue(videoUrl, "videoID");
          if (videoID) {
            i.common_card.feed_content.video.id = videoID;
          }
        } else if (i.common_card?.feed_content?.video?.id) {
          let search = '"feed_content":{"video":{"id":';
          let str = $response.body.substring($response.body.indexOf(search) + search.length);
          let videoID = str.substring(0, str.indexOf(","));
          i.common_card.feed_content.video.id = videoID;
        } else if (i.common_card?.footline?.elements?.[0]?.text?.panel_text?.includes("广告")) {
          return false;
        } else if (i.common_card?.feed_content?.source_line?.elements?.[1]?.text?.panel_text?.includes("盐选")) {
          return false;
        } else if (i?.promotion_extra) {
          // 营销信息
          return false;
        }
        return true;
      } else if (i.type?.includes("aggregation_card")) {
        // 横排卡片 知乎热榜
        return false;
      } else if (i.type === "feed_advert") {
        // 伪装成正常内容的卡片
        return false;
      }
      return true;
    });
    fixPos(obj.data);
  }
}

$done({ body: JSON.stringify(obj) });

// 修复offset
function fixPos(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i].offset = i + 1;
  }
}

function getUrlParamValue(url, queryName) {
  return Object.fromEntries(
    url
      .substring(url.indexOf("?") + 1)
      .split("&")
      .map((pair) => pair.split("="))
  )[queryName];
}

};
if(__wayxTarget==="qx")return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxHost.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval);
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
