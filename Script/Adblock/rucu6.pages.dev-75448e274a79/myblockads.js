(function(){
const __wayxTarget=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!__wayxTarget)throw new Error('Unsupported adblock script host');
const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify,http:typeof $httpClient==='undefined'?undefined:$httpClient,task:typeof $task==='undefined'?undefined:$task};
const __wayxContexts={"response":{"qx":{"from":"loon","to":"qx","phase":"response","binary":false,"headerReads":{}},"surge":{"from":"loon","to":"surge","phase":"response","binary":false,"headerReads":{}},"loon":{"from":"loon","to":"loon","phase":"response","binary":false}}},__wayxRole=__wayxHost.response===undefined?'request':'response',__wayxConfig=__wayxContexts[__wayxRole]&&__wayxContexts[__wayxRole][__wayxTarget];
if(!__wayxConfig)throw new Error('Unregistered adblock HTTP trigger');
const __wayxRun=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
// 2026-10-21 20:00
// 网页元素 #===id, .===class, .div > p:has(> a[target="_blank"])

const url = $request.url;
const isHtml = /^\s*<!DOCTYPE html>/i.test($response.body);

if (isHtml) {
  let body = $response.body;

  if (/^https:\/\/(?:18hlw\.com|8olbt\.imsatcmn\.cc)\//.test(url)) {
    // 黑料网：addbox底部常驻按钮 application-popup广告弹窗 footer页脚信息 gotoclick信息流广告 infomation首页底部推广 list-sec底部推广栏目 relation大家都在搜
    const cssBlock = `
      <style>
        #copy-img,
        #copy-success,
        #notice_container,
        .addbox,
        .application-popup,
        .article-tags,
        .client-only-placeholder > p:has(> img[alt="710X240"]),
        .client-only-placeholder > p:has(> img[alt="710X240"]) + p,
        .client-only-placeholder > p:has(> img[alt="812X400"]),
        .editormd-preview blockquote,
        .editormd-preview p a,
        .footer,
        .gotoclick,
        .infomation,
        .list-sec,
        .relation { 
          display: none !important; 
        } 
      </style>
    </head>`;
    body = body.replace(/<\/head>/, cssBlock);
  } else if (/^https:\/\/javdb\.com\//.test(url)) {
    // JavDB：去除顶部域名, 底部下载提醒, 播放页广告
    const cssBlock = `
      <style>
        .app-desktop-banner, 
        .moj-content,
        .sda-content,
        .sub-header { 
          display: none !important; 
        } 
      </style>
    </head>`;
    body = body.replace(/<\/head>/, cssBlock);
  } else if (/^https:\/\/www\.(?:hgeme|xn--wcv59z)\.com\//.test(url)) {
    // 观影：移除机场推荐横幅广告
    let injectCode = `
      <style>
        #bads {
          display: none !important;
          opacity: 0 !important;
        }
      </style>
      <script>
        localStorage.setItem("bads", Date.now());
      </script>
      </head>
    `;
    body = body.replace(/<\/head>/i, injectCode);
  } else if (/^https:\/\/javranking\.cc\/(?:zh-hans|en)\//.test(url)) {
    // 什么值得冲 JavRanking
    body = body
      // Spot A：<aside class="spot-a-wrapper" data-spot-a>…</aside>（内无嵌套 aside，非贪婪到第一个 </aside> 即整块）
      .replace(/<aside\b[^>]*\bdata-spot-a\b[^>]*>[\s\S]*?<\/aside>/g, "")
      // Spot B：<li class="sponsor-grid-slot"><article data-spot-b>…</article><script>…</script></li>（内无嵌套 li）
      .replace(
        /<li\b[^>]*\bclass="[^"]*\bsponsor-grid-slot\b[^"]*"[^>]*>[\s\S]*?<\/li>/g,
        ""
      )
      // 兜底：不在 grid 里的独立 Spot B 大卡
      .replace(/<article\b[^>]*\bdata-spot-b\b[^>]*>[\s\S]*?<\/article>/g, "")
      // 兜底：游离的赞助弹窗（正常都在上面两块内部、已随块删掉）
      .replace(
        /<dialog\b[^>]*\bclass="[^"]*\b(?:spot-dialog|sponsor-dialog)\b[^"]*"[^>]*>[\s\S]*?<\/dialog>/g,
        ""
      )
      // Spot C：<aside class="page-shell spot-c-slot" data-spot-c>…</aside>（内无嵌套 aside，非贪婪到第一个 </aside> 即整块）
      // 按槽位属性删：槽位是通用的，轮换成其他赞助商也一样移除，不只限 AI风月
      .replace(/<aside\b[^>]*\bdata-spot-c\b[^>]*>[\s\S]*?<\/aside>/g, "")
      // 兜底：带 spot-c-slot 类的 aside（属性顺序/写法变化时）
      .replace(
        /<aside\b[^>]*\bclass="[^"]*\bspot-c-slot\b[^"]*"[^>]*>[\s\S]*?<\/aside>/g,
        ""
      )
      // 通栏删掉后清掉 <main> 上的预留高度类，不然顶部多出 --spot-bar-height(2.25rem) 空白
      // 外部 CSS：main.has-spot-top,main.has-sponsor-banner{padding-top:calc(var(--header-height) + var(--spot-bar-height))}
      // 只改 <main> 标签本身的属性，不碰正文/CSS 里的同名字样
      .replace(/<main\b[^>]*>/g, (tag) =>
        tag
          .replace(/\s*\bhas-spot-top\b/g, "")
          .replace(/\s*\bhas-sponsor-banner\b/g, "")
      );
  } else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/search-[^/]+\.html/.test(url)) {
    // 移花宫：底部透明广告

    // 1. 破坏隐形点击层脚本特征：
    // 将生成的隐形方块图层从顶层 (z-index:10) 丢到底层，并彻底禁用其鼠标/触摸事件
    body = body.replace(/z-index:10;/g, "z-index:-9999;pointer-events:none;");
    body = body.replace(/opacity:0.01;/g, "opacity:0;pointer-events:none;");

    // 2. 精准清空广告脚本逻辑：
    // 只清空带 `data-zsky-ad-code` 标记的脚本内容，但保留 <script> 标签本身以防检测
    body = body.replace(/(<script[^>]*data-zsky-ad-code[^>]*>)([\s\S]*?)(<\/script>)/gi, "$1/* ad blocked */$3");

    // 3. 注入安全 CSS 补丁：
    // 在表层视觉上隐藏广告容器，但强行保留 1px 的高度，用来骗过“反广告屏蔽”的高度检测
    const safeCss = `
      <style>
        /* 处理原生广告容器 */
        .zsky-custom-ad-code {
          opacity: 0 !important;
          height: 1px !important;
          min-height: 1px !important;
          margin: 0 !important;
          padding: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
        /* 双保险：屏蔽任何漏网的动态生成劫持块 */
        div[style*="position:fixed"][style*="opacity"],
        [class^="idpmi"] {
          display: none !important;
          pointer-events: none !important;
          z-index: -9999 !important;
        }
      </style>
    </head>`;

    // 将 CSS 注入到网页 <head> 的末尾
    body = body.replace(/<\/head>/i, safeCss);

    /* 
    // 1. 移除生成固定定位透明广告区域的脚本（特征：包含 oeexaywx_b 与 position:fixed）
    body = body.replace(/<script>if\(\!\/\^Mac\|Win\/\.test\(navigator\.platform\)\)\{[\s\S]*?<\/script>/g, "");
    // 2. 移除混淆的大型广告脚本（特征：以 !function(){function a(a){var b={ 开头）
    body = body.replace(/<script>!function\(\)\{function a\(a\)\{var b=\{[\s\S]*?<\/script>/g, "");
    // 3. 可选：移除任何包含可疑广告域或关键字的脚本（进一步净化）
    body = body.replace(/<script[\s\S]*?(otwaahn\.com|3791kc|oeexaywx_b)[\s\S]*?<\/script>/gi, "");
    */
  } else if (/^https:\/\/(?:yhg007\.com|[a-z]{8}\.111107\d\.xyz)\/hash\/(?:[a-fA-F0-9]{40}|[A-Z2-7]{32})\.html/.test(url)) {
    // 移花宫：搜索结果页面

    // 1. 磁力链接直接显示：从 #magnetLink 的 data-hash 拼出磁力链，替换占位文字
    //    （完整模式 textarea 里是「点击按钮后显示并复制磁力链接」；精简模式该块会被第 4 步整块删掉，此步无副作用）
    const ta = body.match(/(<textarea\b[^>]*\bid="magnetLink"[^>]*>)([\s\S]*?)(<\/textarea>)/i);
    if (ta) {
      const hm = ta[1].match(/\bdata-hash="([^"]+)"/i);
      if (hm) body = body.replace(ta[0], ta[1] + `magnet:?xt=urn:btih:${hm[1]}` + ta[3]);
    }

    body = body
      // 2. 移花宫引路人：<section class="zsky-publish-links-mini ..." aria-label="移花宫引路人">…</section>（内无嵌套 section）
      .replace(/<section\b[^>]*\baria-label="移花宫引路人"[^>]*>[\s\S]*?<\/section>/g, "")
      // 3. 推荐应用：<section class="zsky-app-ads-mini ..." aria-label="推荐应用">…</section>（内无嵌套 section）
      .replace(/<section\b[^>]*\baria-label="推荐应用"[^>]*>[\s\S]*?<\/section>/g, "")
      // 4. 使用磁力链接（仅精简模式）：<div class="tbox"><div class="ssbox"><div class="title"><h3>使用磁力链接</h3>…（连续 4 个 </div> 收尾：down_btn/content/ssbox/tbox）
      .replace(
        /<div class="tbox">\s*<div class="ssbox">\s*<div class="title">\s*<h3>使用磁力链接<\/h3>\s*<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g,
        ""
      )
      // 5. 底部广告：<div class="zsky-terminal-code-ad-root">…</div>，用自带的 start/end 注释锚定整块
      .replace(
        /<div class="zsky-terminal-code-ad-root"[^>]*><!--zsky-terminal-code-ad:start-->[\s\S]*?<!--zsky-terminal-code-ad:end--><\/div>/g,
        ""
      );
    /* 
    // 要定位的文本
    const targetText = "下载BT种子文件";
    const pos = body.indexOf(targetText);
    if (pos !== -1) {
      // 向前找到包含该文本的 <div class="tbox"> 开始标签
      const tboxStart = body.lastIndexOf('<div class="tbox">', pos);
      if (tboxStart !== -1) {
        // 截取该 tbox 之前的所有内容
        let newBody = body.substring(0, tboxStart);
        // 原始页面以 <div class="wrapper"> 开头，需要补上闭合标签
        newBody += "</div></body></html>";
        // 将修改后的内容赋给 body 变量
        body = newBody;
      }
    }
    */
  }

  $done({ body });
} else {
  $done({});
}

};
if(__wayxTarget==="loon")return __wayxRun(__wayxHost.request,__wayxHost.response,__wayxHost.done,__wayxHost.script,__wayxHost.store,__wayxHost.prefs,__wayxHost.notify,__wayxHost.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval,__wayxHost.http);
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
    if(config.to==='qx'?!host.task:!host.http)fail('native HTTP transport unavailable');
    const client={};let active=false;
    for(const method of ['get','post','put','delete','head','options','patch'])client[method]=(input,callback)=>{
      if(active)fail('callback HTTP subset permits one active request');active=true;
      // Modified: 2026-11-02 (chance). QX author-documented fields only;
      // unsupported timeout/ALPN/etc. are omitted by user instruction, never faked.
      if(config.to==='qx'){
        const request={url:input.url,method:method.toUpperCase(),headers:Object.assign({},input.headers),opts:{redirection:input['auto-redirect']===undefined?true:input['auto-redirect'],'auto-cookie':input['auto-cookie']===undefined?true:input['auto-cookie'],'skip-cert-verify':input.insecure===undefined?config.from==='loon':input.insecure}};
        if(own(input,'body'))request.body=input.body;
        if(own(input,'policy'))request.opts.policy=input.policy==='DIRECT'?'direct':input.policy;
        let task;
        try{task=host.task.fetch(request);}catch(error){active=false;throw error;}
        return task.then(response=>{
          active=false;
          if(!response||typeof response.statusCode!=='number'||!Number.isInteger(response.statusCode)||response.statusCode<100||response.statusCode>599)fail('HTTP success requires a numeric response status');
          const data=response.body;
          if(typeof data!=='string'||data.length>65536||/[^\x00-\x7f]/.test(data))fail('callback HTTP subset requires ASCII response text');
          return callback(null,{status:response.statusCode,headers:response.headers},data);
        },reason=>{active=false;return callback(reason&&reason.error||reason||'QX fetch failed',undefined,undefined);});
      }
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
