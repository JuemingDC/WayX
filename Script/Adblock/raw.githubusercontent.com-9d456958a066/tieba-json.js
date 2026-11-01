(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const __wayxContexts={"response":{"qx":{"from":"qx","to":"qx","phase":"response","binary":false},"surge":{"from":"qx","to":"surge","phase":"response","binary":false},"loon":{"from":"qx","to":"loon","phase":"response","binary":false}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
const url = $request.url;
const method = $request.method;
const postMethod = "POST";
const notifyTitle = "贴吧json脚本错误";
console.log(`贴吧json-2025.08.28`);

let body = JSON.parse($response.body);
// 直接全局搜索 @Modify(
if (url.includes("c/f/ad/getSplashAd")) {
    if (body.error_code === 0) {
        console.log(`去除开屏广告:${body.error_code}`);
        body.error_code = 2230209;
        body.data = null;
    } else {
        console.log(`无需处理开屏广告:${body.error_code}`);
    }
} else if (url.includes("tiebaads/commonbatch") && method === postMethod) {
    // 看图模式下的广告
    let adCmd = getUrlParamValue(url, "adcmd");
    if (!adCmd) {
        console.log(`url:${url}`);
        $notification.post(notifyTitle, "贴吧-tiebaads/commonbatch", "adCmd参数不存在");
    } else {
        console.log(`commonbatch:${adCmd}`);
        if (body.error_code === 0) {
            if (!body.res.ad?.length) {
                console.log('ad字段为空');
            } else {
                body.res.ad = [];
                // 即使ad有内容 也不一定显示广告
                // 因为如果服务器下发的数据少了一些字段同样是无广告的
                console.log('成功');
            }
        } else {
            console.log('error_code不为0:' + body.error_code);
        }
    }
} else if (url.includes('c/f/pb/picpage')) {
    console.log(`picpage`);
    const liveLength = body.recom_live_list?.length;
    if (liveLength) {
        console.log(`去除直播:${liveLength}`);
        body.recom_live_list = [];
    }
} else if (url.includes('c/s/sync')) {
    // get post(贴吧使用了post)均可访问
    console.log('贴吧-sync');
    if ('floating_icon' in body) {
        console.log('右下角悬浮icon');
        if (body.floating_icon) {
            if (body.floating_icon.homepage?.icon_url) {
                console.log('homepage悬浮去除');
            } else {
                console.log('无需去除homepage悬浮');
            }
            if (body.floating_icon.pb?.icon_url) {
                console.log('pb悬浮去除');
            } else {
                console.log('无需去除pb悬浮');
            }
            body.floating_icon = null;
        } else {
            console.log('无需修改floating_icon字段值');
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无floating_icon字段");
    }

    // 回帖栏的广告
    if ('advertisement_config' in body) {
        if (!body.advertisement_config?.advertisement_str) {
            console.log('无需处理advertisement_config');
        } else {
            console.log(`advertisement_str:${body.advertisement_config.advertisement_str}`);
            body.advertisement_config = null;
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无advertisement_config字段");
    }

    // 部分广告配置在abtest中
    if (body.cloud_control_data_info?.common_config?.external_abtest_switch) {
        console.log(`去除external_abtest_switch:${body.cloud_control_data_info.common_config.external_abtest_switch}`);
        body.cloud_control_data_info.common_config.external_abtest_switch = null;
    }
    if ('config' in body) {
        if (body.config?.switch) {
            for (const item of body.config.switch) {
                // 穿山甲/广点通/快手/Ubix/百青藤/
                if (['platform_csj_init', 'platform_ks_init', 'platform_gdt_init',
                    'platform_baidu_bqt_init', 'platform_jy_init', 'platform_ubix_init', 'platform_hw_init'].includes(item.name)) {
                    if (item.type !== '0') {
                        item.type = '0';
                        console.log(`禁止初始化${item.name}`);
                    }
                }
                if ('ad_baichuan_open' === item.name) {
                    if (item.type !== '0') {
                        item.type = '0';
                        console.log(`关闭开屏广告`);
                    }
                }
            }
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无config字段");
    }

    if ('screen_fill_data_result' in body) {
        if (body.screen_fill_data_result.screen_fill_advertisement_bear_switch === "1") {
            body.screen_fill_data_result.screen_fill_advertisement_bear_switch = '0';
            console.log('开屏不展示小熊广告');
        } else {
            console.log('无需修改screen_fill_advertisement_bear_switch');
        }
        if (body.screen_fill_data_result.screen_fill_advertisement_plj_cpc_switch === "1") {
            body.screen_fill_data_result.screen_fill_advertisement_plj_cpc_switch = '0';
            console.log('开屏不展示序章CPC');
        } else {
            console.log('无需修改screen_fill_advertisement_plj_cpc_switch');
        }
        if (body.screen_fill_data_result.screen_fill_advertisement_plj_switch === "1") {
            body.screen_fill_data_result.screen_fill_advertisement_plj_switch = '0';
            console.log('开屏不展示序章');
        } else {
            console.log('无需修改screen_fill_advertisement_plj_switch');
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无screen_fill_data_result字段");
    }

    if ('ad_stlog_switch' in body) {
        if (body.ad_stlog_switch === '1') {
            body.ad_stlog_switch = '0';
            console.log('修改ad_stlog_switch');
        } else {
            console.log('无需修改ad_stlog_switch');
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无ad_stlog_switch字段");
    }

    if ('lcs_strategy' in body) {
        // 控制长连接开关 开启时帖子会走socket
        if (body.lcs_strategy.conn_conf === '0') {
            // 关闭
            body.lcs_strategy.conn_conf = '1';
            console.log('修改conn_conf');
        } else {
            console.log('无需修改conn_conf');
        }
    } else {
        console.log(`body:${$response.body}`);
        $notification.post(notifyTitle, "贴吧-sync", "无lcs_strategy字段");
    }
} else if (url.includes("c/f/frs/page")) {
    console.log('贴吧-FrsPage');
    if (body.live_fuse_forum?.length) {
        body.live_fuse_forum = [];
        console.log(`去除吧头直播`);
    } else {
        console.log(`无需处理吧头直播`);
    }

    if (body.activityhead?.is_ad) {
        body.activityhead = {};
        console.log('去除吧内header图片广告');
    } else {
        console.log('无需处理activityhead');
    }
    body.thread_list = removeLive(body.thread_list);
    removeGoodsInfo(body.forum?.banner_list?.app);
} else if (url.includes("c/f/frs/threadlist")) {
    console.log('贴吧-threadlist');
    removeGoodsInfo(body.banner_list?.app);
} else if (url.includes("c/f/pb/page")) {
    console.log('贴吧-PbPage');
    if (body.recom_ala_info?.live_id) {
        console.log('帖子详情页推荐的直播广告去除');
        body.recom_ala_info = null;
    } else {
        console.log('帖子详情页无直播广告');
    }

    if (body.post_list?.length) {
        for (const post of body.post_list) {
            if (post.outer_item) {
                console.log('outer_item去除');
                post.outer_item = null;
            }
        }
    } else {
        console.log('无需处理postList中的outer_item');
    }
    removeGoodsInfo(body.banner_list?.app);
    const bannerGoodsInfoLength = body.banner_list?.pb_banner_ad?.goods_info?.length;
    if (bannerGoodsInfoLength) {
        console.log(`去除pb_banner_ad的goods_info:${bannerGoodsInfoLength}`)
        body.banner_list.pb_banner_ad.goods_info = []
    }
} else if (url.includes("c/f/excellent/personalized")) {
    console.log('贴吧-personalized');
    removeGoodsInfo(body.banner_list?.app);
    body.thread_list = removeLive(body.thread_list);
    if (body.live_answer) {
        console.log('去除推荐页上方的banner广告');
        body.live_answer = null;
    } else {
        console.log('推荐页无banner广告');
    }
} else if (url.includes("c/f/frs/generalTabList")) {
    console.log('贴吧-generalTabList');
    removeGoodsInfo(body.app_list);
} else {
    $notification.post(notifyTitle, "路径/请求方法匹配错误:", method + "," + url);
}

body = JSON.stringify(body);

$done({
    body
});


function getUrlParamValue(url, queryName) {
    return Object.fromEntries(url.substring(url.indexOf("?") + 1)
        .split("&")
        .map(pair => pair.split("="))
    )[queryName];
}

function removeGoodsInfo(app) {
    if (app?.length) {
        let goodsInfoSize = 0;
        app.forEach(item => {
            if (item.goods_info?.length) {
                goodsInfoSize++;
                item.goods_info = [];
            }
        })
        if (goodsInfoSize) {
            console.log(`去除goods_info:${goodsInfoSize}`);
        } else {
            console.log(`app内无goods_info`)
        }

    } else {
        console.log(`app为空,无需处理`);
    }
}

function removeLive(threadList) {
    let newThreadList = threadList;
    const beforeLength = threadList?.length;
    if (beforeLength) {
        newThreadList = threadList.filter(item => {
            if (item.ala_info) {
                console.log('去除推荐的直播帖子');
                return false;
            }
            return true;
        });
        if (beforeLength === newThreadList.length) {
            console.log("无推荐的直播帖子");
        }
    } else {
        console.log('无需处理threadList');
    }
    return newThreadList;
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
