(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const __wayxContexts={"response":{"qx":{"from":"qx","to":"qx","phase":"response","binary":false},"surge":{"from":"qx","to":"surge","phase":"response","binary":false},"loon":{"from":"qx","to":"loon","phase":"response","binary":false}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
const url = $request.url;
const method = $request.method;
if (!$response.body) {
    // 穿山甲有概率会有此情况
    console.log('$response.body为空');
    $done({});
}
let body = JSON.parse($response.body);

const getMethod = "GET";
const postMethod = "POST";
const noticeTitle = "广告联盟";

if ((url.includes("api-access.pangolin-sdk-toutiao.com/api/ad/union/sdk")
        || url.includes("is.snssdk.com/api/ad/union/sdk"))
    && method === postMethod) {
    console.log('穿山甲-get_ads');
    if (!body.message) {
        console.log(`body:${$response.body}`);
        // 错误码 https://www.csjplatform.com/supportcenter/5421
        if (!('status_code' in body)) {
            $notification.post(noticeTitle, "穿山甲", "message/status_code字段错误");
        } else {
            console.log('广告为空');
        }
    } else {
        console.log(Object.keys(body));
        body = {
            "request_id": 'F5617E54-3FF4-4052-9B09-4227D09B5105',
            "status_code": 20001,
            "reason": 112,
            "desc": "该代码位请求量过大且消耗过低，因此填充率控制在10%以内，该策略每日生效，如果当天该代码位的消耗上涨或请求量小于5000，则次日不会命中该策略"
        };
        console.log('成功');
    }
} else if (url.includes('mi.gdt.qq.com') && method === getMethod) {
    console.log('优量汇');
    if ('ret' in body) {
        if (body.ret === 0) {
            // https://developers.adnet.qq.com/doc/android/union/union_debug#sdk%20%E9%94%99%E8%AF%AF%E7%A0%81
            body.ret = 102006;
            console.log('修改ret成功');
        } else {
            console.log(`ret不为0,不处理`);
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(noticeTitle, "优量汇", "无ret");
    }
} else if (url.includes('open.e.kuaishou.com') && method === postMethod) {
    console.log('快手联盟');
    if (body.result === 1) {
        // 错误码: https://u.kuaishou.com/home/detail/1158
        body.result = 40003;
        console.log('修改result成功');
    } else {
        console.log('无需修改result');
    }
} else {
    $notification.post(noticeTitle, "路径/请求方法匹配错误:", method + "," + url);
}

body = JSON.stringify(body);

$done({
    body
});

};
if(__wayxTarget==="qx")return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxHost.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval);
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
})(__wayxConfig,__wayxHost,__wayxRun);
})();
