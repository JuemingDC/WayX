(function(){
const target=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!target)throw new Error('Unsupported adblock script host');
const host={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify};
const contexts={"response":{"qx":{"from":"qx","to":"qx","phase":"response","binary":false},"surge":{"from":"qx","to":"surge","phase":"response","binary":false},"loon":{"from":"qx","to":"loon","phase":"response","binary":false}}},role=host.response===undefined?'request':'response',config=contexts[role]&&contexts[role][target];
if(!config)throw new Error('Unregistered adblock HTTP trigger');
const run=function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
/***********************************************
> 应用名称：墨鱼自用小红书去广告脚本
> 脚本作者：@blackmatrix7,@ddgksf2013
> 微信账号：墨鱼手记
> 更新时间：2024-08-12
> 通知频道：https://t.me/ddgksf2021
> 贡献投稿：https://t.me/ddgksf2013_bot
> 问题反馈：ddgksf2013@163.com
> 特别提醒：如需转载请注明出处，谢谢合作！
***********************************************/


const version = 'V1.0.6';

let body=$response.body;if(body){try{let t=$request.url,a=JSON.parse(body);switch(!0){case/util\/loading/.test(t):a.data.forEach(t=>{t.start_date="2030-12-24 00:00:00",t.end_date="2030-12-24 23:59:59",t.unix_start_date="1924272000",t.unix_end_date="1924358399",t.is_show_ad="0"});break;case/advert_distribution\/get_all_advertise/.test(t):a.data.start_date="2030-12-24 00:00:00",a.data.end_date="2030-12-24 23:59:59",a.data.unix_start_date="1924272000",a.data.unix_end_date="1924358399",a.data.is_show_ad="0";break;case/^https?:\/\/homepage-api\.smzdm\.com\/v3\/home/.test(t):a.data.component=a.data.component.filter(t=>("banner"===t.zz_type?t.zz_content=t.zz_content.filter(t=>"广告"!==t.tag):"list"===t.zz_type?t.zz_content=t.zz_content.filter(t=>"ads"!==t.zz_content.model_type):"circular_banner"===t.zz_type&&(t.zz_content.circular_banner_option.background="1",t.zz_content.circular_banner_option.color_card="#ffffff",t.zz_content.circular_banner_option.img=""),"top_banner"!==t.zz_type&&"hongbao"!==t.zz_type));break;case/^https?:\/\/haojia-api\.smzdm\.com\/home\/list/.test(t):a.data.banner_v2=a.data.banner_v2.filter(t=>"21028"===t.cell_type),a.data.rows=a.data.rows.filter(t=>!t.hasOwnProperty("ad_banner_id"));break;case/^https?:\/\/haojia\.m\.smzdm\.com\/detail_modul\/article_releated_modul/.test(t):a.data.lanmu_qikan={};break;case/^https?:\/\/s-api.smzdm\.com\/sou\/search_default_keyword/.test(t):a.data={home:[{keyword:"",show_search_word:"",source:"发现"}]};break;case/^https?:\/\/baike-api\.smzdm\.com\/home_v3\/list/.test(t):a.data.rows=a.data.rows.filter(t=>!t.hasOwnProperty("ad_banner_id")||""===t.ad_banner_id);break;case/^https?:\/\/s-api\.smzdm\.com\/sou\/filter\/tags\/hot_tags/.test(t):a.data.hongbao={};break;case/^https?:\/\/s-api\.smzdm\.com\/sou\/list_v10/.test(t):a.data.rows=a.data.rows.filter(t=>"广告"!==t.article_tag);break;case/^https?:\/\/zhiyou\.m\.smzdm\.com\/user\/vip\/ajax_get_banner/.test(t):a.data.big_banner=a.data.big_banner.filter(t=>"广告"!==t.logo_title);break;default:$done({})}body=JSON.stringify(a)}catch(e){console.log(`Error processing URL: ${$request.url}, Error: ${e}`)}$done({body})}else $done({});

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
