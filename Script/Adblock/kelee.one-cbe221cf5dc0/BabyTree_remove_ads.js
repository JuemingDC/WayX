(function(){
const target=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!target)throw new Error('Unsupported adblock script host');
const host={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const contexts={"response":{"qx":{"from":"loon","to":"qx","phase":"response","binary":false},"surge":{"from":"loon","to":"surge","phase":"response","binary":false},"loon":{"from":"loon","to":"loon","phase":"response","binary":false}}},role=host.response===undefined?'request':'response',config=contexts[role]&&contexts[role][target];
if(!config)throw new Error('Unregistered adblock HTTP trigger');
const run=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
/*
脚本引用https://raw.githubusercontent.com/RuCu6/QuanX/main/Scripts/babytree.js
*/
// 2024-10-28 01:35

const url = $request.url;
if (!$response.body) $done({});
let obj = JSON.parse($response.body);

if (url.includes("/app_index/get_app_tab")) {
  // 底部tab
  if (obj?.data?.selected_list?.length > 0) {
    obj.data.selected_list = obj.data.selected_list.filter((i) => !["购物", "商城"]?.includes(i?.name));
  }
} else if (url.includes("/bafconfigcenter_intf/config/get")) {
  // 整体配置
  const items = [
    "pregnancy__find_group_guide_image_url", // 加入的圈子
    "pregnancy__home_left_icon", // 直播图标
    "pregnancy__home_left_icon_new", // 直播图标
    "pregnancy__home_left_icon_static", // 直播图标
    "pregnancy__video_white_list" // 宝宝视频
  ];
  if (obj?.data) {
    for (let i of items) {
      if (obj?.data?.[i]) {
        obj.data[i] = "";
      }
    }
  }
} else if (url.includes("/cms_column/get_column_list")) {
  // tab配置
  if (obj?.data?.list?.length > 0) {
    let newLists = [];
    for (let item of obj.data.list) {
      if (item?.data_source_list?.length > 0) {
        let newDatas = [];
        for (let i of item.data_source_list) {
          // 首页顶部tab
          if (i?.tab_name?.includes("精品秒杀")) {
            continue;
          } else {
            newDatas.push(i);
          }
        }
        item.data_source_list = newDatas;
      }
      if (["225", "226", "238", "239"]?.includes(item?.id)) {
        // 我的页面模块
        // 225我的福利 226banner轮播图 238美囤商城 239会员进群
        continue;
      }
      newLists.push(item);
    }
    obj.data.list = newLists;
  }
} else if (url.includes("/feeds/get_index_feeds_list")) {
  // 首页信息流
  if (obj?.data?.list?.length > 0) {
    obj.data.list = obj.data.list.filter(
      (i) => ["发表了", "提问了"]?.includes(i?.action_desc) && !i.hasOwnProperty("seeding_goods_info")
    );
  }
} else if (url.includes("/mobile_search_new/search_index")) {
  // 搜索列表
  if (obj?.data?.find_search) {
    delete obj.data.find_search; // 搜索发现
  }
} else if (url.includes("/user/get_user_info")) {
  // 我的页面
  if (obj?.data?.video_show) {
    delete obj.data.video_show; // 顶部婴儿视频
  }
}

$done({ body: JSON.stringify(obj) });
};
if(target==="loon")return run(host.request,host.response,host.done,host.script,host.store,host.prefs,host.notify,host.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval);
return (function(config,host,run){
  const fail=message=>{throw new Error('WayX API contract: '+message);};
  const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  const bytes=value=>value instanceof Uint8Array?new Uint8Array(value.buffer,value.byteOffset,value.byteLength):value instanceof ArrayBuffer?new Uint8Array(value):fail('expected Uint8Array or ArrayBuffer');
  const buffer=value=>{const b=bytes(value);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
  const status=value=>{if(typeof value==='number'&&Number.isInteger(value)&&value>=100&&value<=599)return value;const m=typeof value==='string'&&value.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s.*)?$/);return m?Number(m[1]):fail('unsupported HTTP status');};
  const reasons={200:'OK',201:'Created',204:'No Content',301:'Moved Permanently',302:'Found',304:'Not Modified',307:'Temporary Redirect',308:'Permanent Redirect',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable'};
  function view(value){
    if(value===undefined)return undefined;
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
  function start(request,response){
    const script={name:config.name||host.script&&host.script.name||host.ctx&&host.ctx.script.name};
    if(host.script&&host.script.startTime!==undefined){const start=host.script.startTime;script.startTime=config.from==='loon'?(start instanceof Date?start:new Date(start*1000)):(start instanceof Date?start.getTime()/1000:start);}
    const ctx={request:ctxMessage(request),response:ctxMessage(response),script,respond:value=>({response:value}),abort:()=>({abort:true})};
    const sourceTimer=(callback,delay,...args)=>setTimeout(()=>callback(...args),delay);
    const result=run(view(request),view(response),done,config.from==='qx'?undefined:script,config.from==='qx'?undefined:sourceStore,config.from==='qx'?sourcePrefs:undefined,config.from==='qx'?undefined:{post:notify},config.from==='qx'?notify:undefined,ctx,config.from==='loon'?sourceTimer:setTimeout,config.from==='loon'?sourceTimer:undefined);
    if(config.from==='egern')return Promise.resolve(result).then(done);
    return completion||result;
  }
  if(config.to==='egern')return (async()=>{
    async function input(message,role){if(!message)return undefined;const result={url:message.url,method:message.method,status:message.status,headers:{}};for(const [name,value]of message.headers){if(own(result.headers,name))fail('duplicate header needs an explicit full-header declaration');result.headers[name]=value;}
      if(config.binary)result.body=new Uint8Array(await message.arrayBuffer());else if(role==='response'||config.phase==='request'||config.phase==='echo')result.body=await message.text();return result;}
    return await start(await input(host.ctx.request,'request'),await input(host.ctx.response,'response'));
  })();
  return start(host.request,host.response);
})(config,host,run);
})();
