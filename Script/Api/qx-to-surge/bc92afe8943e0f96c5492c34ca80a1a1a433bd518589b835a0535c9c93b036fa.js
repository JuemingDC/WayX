// Modified: 2026-11-01 (chance). Documented script API subset: qx -> surge; upstream body preserved in its separate raw backup.
// Category: Script API adapter
// Source: https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/hlwxx_remove_ads.js
(function(){const __wayxHost={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};(function(config,host,run){
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
})({"from":"qx","to":"surge","phase":"response","binary":false,"responseBody":true,"sourceUrl":"https://raw.githubusercontent.com/ZenmoFeiShi/Qx/refs/heads/main/hlwxx_remove_ads.js"},__wayxHost,function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
var qx97_body = $response.body;

if (!qx97_body || !/(?:<!doctype|<html)/i.test(qx97_body)) {
  $done({});
} else {
  try {
    var qx97_clear_player_ads = function (match, prefix, quote, raw) {
      try {
        var cfg = JSON.parse(raw);
        var changed = false;
        if (cfg && Array.isArray(cfg.pre_ads)) {
          cfg.pre_ads = [];
          changed = true;
        }
        if (cfg && Array.isArray(cfg.post_ads)) {
          cfg.post_ads = [];
          changed = true;
        }
        if (cfg && (Object.prototype.hasOwnProperty.call(cfg, 'ads_jump_time') || changed)) {
          cfg.ads_jump_time = -1;
          changed = true;
        }
        return changed ? prefix + quote + JSON.stringify(cfg) + quote : match;
      } catch (e) {
        return match;
      }
    };

    qx97_body = qx97_body.replace(/(\bdata-config\s*=\s*)(['"])([\s\S]*?)\2/gi, qx97_clear_player_ads);

    var qx97_css = '<style id="qx97-adblock">'
      + '.adspop,.xqbj-component-adfloat,#adFloat,.horizontal-banner,.article-ads-btn,.article-bottom-apps,.ads-title,article.no-mask,article.post-card-ads,.post-card-ads,.bottom-ads,.message-ad-item,'
      + 'script[src*="adfloat.js"],script[src*="bottom_ad_poll"],script[src*="googletagmanager"],script[src*="google-analytics"],'
      + 'iframe[src*="yandex"],iframe[src*="googletagmanager"],iframe[src*="google-analytics"]'
      + '{display:none!important;width:0!important;height:0!important;max-height:0!important;min-height:0!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important}'
      + '</style>';

    var qx97_js = '<script id="qx97-adblock-js">'
      + '!function(){'
      + 'function qx97_clean(){'
      + 'var s=['
      + '".adspop",".xqbj-component-adfloat","#adFloat",".horizontal-banner",".article-ads-btn",".article-bottom-apps",".ads-title",'
      + '"article.no-mask","article.post-card-ads",".post-card-ads",".bottom-ads",".message-ad-item",'
      + '"[class*=adfloat]","[id*=adFloat]","[data-ad-type]","[data-ad_type]","[data-ad-id]","[data-ad_id]"'
      + '];'
      + 's.forEach(function(x){document.querySelectorAll(x).forEach(function(e){e.remove()})});'
      + 'document.querySelectorAll("script,link,iframe").forEach(function(e){'
      + 'var u=(e.src||e.href||"").toLowerCase();'
      + 'if(/adfloat|bottom_ad_poll|popup-feed|googletagmanager|google-analytics|mc\\.yandex|cloudflareinsights|zyudkkup|shuifeng|cghhqca/.test(u))e.remove()'
      + '});'
      + 'document.querySelectorAll("a.tjtagmanager").forEach(function(e){'
      + 'var p=e.closest(".horizontal-banner,.article-ads-btn,.article-bottom-apps,.ads-title,article,.bottom-ads,.message-ad-item");'
      + 'if(p)p.remove();else e.remove()'
      + '});'
      + 'try{window.dataLayer=[];window.tjDataLayer=[];window.gtag=function(){};window.ym=function(){};window.tjtag=function(){}}catch(e){}'
      + '}'
      + 'if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",qx97_clean);else qx97_clean();'
      + 'setTimeout(qx97_clean,500);setTimeout(qx97_clean,1500);setTimeout(qx97_clean,4000);setTimeout(qx97_clean,8000)'
      + '}();<\/script>';

    qx97_body = qx97_body.replace(/<script[^>]+(?:adfloat\.js|bottom_ad_poll|googletagmanager|google-analytics|mc\.yandex|cloudflareinsights|tjtag)[^>]*>[\s\S]*?<\/script>/gi, '');
    qx97_body = qx97_body.replace(/<link[^>]+(?:AiSuite|im\.css|googletagmanager|google-analytics)[^>]*>/gi, '');
    qx97_body = qx97_body.replace(/<iframe[^>]+(?:yandex|googletagmanager|google-analytics)[^>]*>[\s\S]*?<\/iframe>/gi, '');
    qx97_body = qx97_body.replace(/<article\b[^>]*class=["'][^"']*\bno-mask\b[^"']*["'][^>]*>[\s\S]*?<\/article>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bhorizontal-banner\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\barticle-ads-btn\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\barticle-bottom-apps\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bads-title\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\bbottom-ads\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<div\b[^>]*class=["'][^"']*\badspop\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
    qx97_body = qx97_body.replace(/<script[^>]*id=["']qx97-adblock(?:-js)?["'][^>]*>[\s\S]*?<\/script>/gi, '');
    qx97_body = qx97_body.replace(/<\/head>/i, qx97_css + '</head>');
    qx97_body = qx97_body.replace(/<\/body>/i, qx97_js + '</body>');
    $done({ body: qx97_body });
  } catch (e) {
    $done({});
  }
}

});})();
