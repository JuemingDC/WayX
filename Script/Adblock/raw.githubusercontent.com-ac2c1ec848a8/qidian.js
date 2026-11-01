(function(){
const target=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!target)throw new Error('Unsupported adblock script host');
const host={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const contexts={"response":{"qx":{"from":"qx","to":"qx","phase":"response","binary":false},"surge":{"from":"qx","to":"surge","phase":"response","binary":false},"loon":{"from":"qx","to":"loon","phase":"response","binary":false}}},role=host.response===undefined?'request':'response',config=contexts[role]&&contexts[role][target];
if(!config)throw new Error('Unregistered adblock HTTP trigger');
const run=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
let url = $request.url;
let method = $request.method;
if (!$response.body) {
    console.log(`$response.body为undefined:${url}`);
    $done({});
}

let body = JSON.parse($response.body);

const noticeTitle = "起点App脚本错误";
const getMethod = "GET";
const postMethod = "POST";

if (!body.Data) {
    console.log(`body:${$response.body}`);
    $notification.post(noticeTitle, "起点", "Data为空");
} else {
    if (url.includes("v4/client/getsplashscreen") && method === getMethod) {
        console.log('起点-开屏页');
        if (!body.Data.List) {
            console.log(`body:${$response.body}`);
            $notification.post(noticeTitle, "起点", "List字段空");
        } else {
            body.Data.List = null;
            console.log('List成功');
        }
        if ('EnableGDT' in body.Data) {
            if (body.Data.EnableGDT === 1) {
                body.Data.EnableGDT = 0;
                console.log('EnableGDT成功');
            } else {
                console.log('无需修改EnableGDT');
            }
        } else {
            console.log(`body:${$response.body}`);
            $notification.post(noticeTitle, "起点", "EnableGDT字段为空");
        }

    } else if (url.includes("v2/deeplink/geturl") && method === getMethod) {
        console.log(`起点-不跳转精选页:${body.Data.ActionUrl}`);
        if (body.Data.ActionUrl) {
            // QDReader://Bookstore
            // QDReader://Bookstore?query={"abGroupId": "b", "lastReadBarEnabled": "1"}
            console.log('成功');
            body.Data.ActionUrl = '';
        } else {
            console.log('无需处理');
        }
    } else if (url.includes("v1/adv/getadvlistbatch?positions=iOS_tab") && method === getMethod) {
        console.log('起点-iOS_tab');
        if (!body.Data.iOS_tab) {
            console.log(`body:${$response.body}`);
            $notification.post(noticeTitle, "起点-iOS_tab", "iOS_tab字段为空");
        } else {
            if (body.Data.iOS_tab.length === 0) {
                console.log('返回配置空');
            } else {
                body.Data.iOS_tab = [];
                console.log('成功');
            }
        }
    } else if (url.includes("v2/dailyrecommend/getdailyrecommend") && method === getMethod) {
        console.log('起点-每日导读');
        if (body.Data.Items?.length) {
            body.Data.Items = [];
            console.log('成功');
        } else {
            console.log('每日导读无数据');
        }
    } else if (url.includes("v1/bookshelf/getHoverAdv") && method === getMethod) {
        console.log('起点-书架悬浮广告');
        if (body.Data.ItemList?.length) {
            console.log('成功' + body.Data.ItemList.length);
            body.Data.ItemList = [];
        } else {
            console.log('无需处理');
        }
    } else if (url.includes("v1/client/getconf") && method === postMethod) {
        console.log('起点-client/getconf');
        // 精选 和 发现 中间的活动配置
        if (!body.Data.ActivityPopup?.Data) {
            console.log(`body:${$response.body}`);
            $notification.post(noticeTitle, "起点-getconf", "ActivityPopup/Data字段为空");
        } else {
            body.Data.ActivityPopup = null;
            console.log('ActivityPopup(活动弹窗)成功');
        }
        if (body.Data.WolfEye === 1) {
            // 使5.9.196版本 tcp强制走https
            console.log('WolfEye修改为0');
            body.Data.WolfEye = 0;
        } else {
            console.log(`无需修改WolfEye:${body.Data.WolfEye}`);
        }
        if(body.Data.CloudSetting?.TeenShowFreq === '1'){
            body.Data.CloudSetting.TeenShowFreq = '0';
            console.log('去除青少年模式弹框');
        }
        // QDReader://Bookshelf 书架右下角悬浮活动
        if (body.Data.ActivityIcon?.Type !== 0) {
            console.log(`body:${$response.body}`);
            $notification.post(noticeTitle, "起点-getconf", "ActivityIcon/Type字段错误");
        } else {
            // 无活动icon的情况下为{"EndTime":0,"StartTime":0,"Type":0}
            if (body.Data.ActivityIcon.EndTime === 0) {
                console.log('无ActivityIcon配置');
            } else {
                body.Data.ActivityIcon.StartTime = 0;
                body.Data.ActivityIcon.EndTime = 0;
                delete body.Data.ActivityIcon.Actionurl;
                delete body.Data.ActivityIcon.Icon;
                console.log('ActivityIcon成功');
            }
        }

        // 功能增强:搜索页可以搜索用户
        if (body.Data.EnableSearchUser === "1") {
            console.log(`无需修改搜索用户配置`);
        } else {
            body.Data.EnableSearchUser = "1";
            console.log(`允许搜索用户成功:${body.Data.EnableSearchUser}`);
        }

        // if (body.Data.hasOwnProperty('EnableClipboardReading')) {
        //     if (body.Data.EnableClipboardReading === 1) {
        //         body.Data.EnableClipboardReading = 0;
        //         console.log('不允许读取剪切板');
        //     } else {
        //         console.log('无需修改剪切板配置');
        //     }
        // } else {
        //     console.log("body:" + $response.body);
        //     $notification.post(notifiTitle, "起点-getconf", "EnableClipboardReading字段错误");
        // }
        // QDReader://UserCenter   我
        // QDReader://Bookshelf    书架
        // QDReader://Bookstore    精选
    } else {
        $notification.post(noticeTitle, "起点App路径/请求方法匹配错误:", method + "," + url);
    }
}
body = JSON.stringify(body);

$done({
    body
});


};
if(target==="qx")return run(host.request,host.response,host.done,host.script,host.store,host.prefs,host.notify,host.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval);
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
