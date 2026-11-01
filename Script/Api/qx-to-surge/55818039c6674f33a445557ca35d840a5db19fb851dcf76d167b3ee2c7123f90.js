// Modified: 2026-11-01 (chance). Documented script API subset: qx -> surge; upstream body preserved in its separate raw backup.
// Category: Script API adapter
// Source: https://raw.githubusercontent.com/ishowshu/qx/refs/heads/main/script/goofish.js
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
})({"from":"qx","to":"surge","phase":"response","binary":false,"responseBody":true,"sourceUrl":"https://raw.githubusercontent.com/ishowshu/qx/refs/heads/main/script/goofish.js"},__wayxHost,function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,__wayxContext,setTimeout,setInterval){
//  2026-10-24
//  树先生
//  当前文件内容仅供个人学习和研究使用，若使用过程中发生任何问题概不负责

let url = $request.url;
let body = $response.body;
let obj = JSON.parse(body);

if (url.includes("/gw/mtop.taobao.idlehome.home.nextfresh")) {
  // 可能存在的首页标签
  delete obj.data.widgetReturnDO;
  // 删除banner图
  delete obj.data.bannerReturnDO;
  // 信息流广告
  if (obj.data?.sections) {
    obj.data.sections = obj.data.sections.filter(section => {
      return !(section.data && (section.data.bizType === "AD" || section.data.bizType === "homepage"));
    });

    let excludeNames = ['fish_home_yunying_card_d3', 'idlefish_seafood_market', 'fish_home_chat_room'];
    obj.data.sections = obj.data.sections.filter(function(section) {  
      return !excludeNames.includes(section.template.name);  
    });
    
    obj.data.sections = obj.data.sections.filter(section => {
      return (section.data && (section.data.cardTypeValue === "Item"));
    });
  }
  // 首页新的顶部图标菜单
  obj.data.homeTopList = [];
}

if (url.includes("/gw/mtop.taobao.idle.local.home")) {
  if (obj.data?.sections) {
    obj.data.sections = obj.data.sections.filter(section => {
      return !(section.data && section.data.bizType === "AD");
    });
  }
}

if (url.includes("/gw/mtop.taobao.idle.home.whale.modulet")) {
  delete obj.data.container.sections;
}

if (url.includes("/gw/mtop.taobao.idlemtopsearch.search.shade") || url.includes("/gw/mtop.taobao.idle.user.strategy.list")) {
  delete obj.data;
}

if (url.includes("/mtop.idle.user.page.my.adapter")) {
  //  "0"会员等级+我的收藏; "1"我的交易; "2"闲鱼回收; "3"工具栏目; "4"底部大图标菜单; （2026-05-14）

  //  保留 0、1、3
  const indexArr = ["0", "1", "3"];
  obj.data.container.sections = obj.data.container.sections.filter(item => indexArr.includes(item.index));

  //  底部猜你喜欢
  obj.data.ability = [];


  //  处理闲鱼会员信息
  // obj.data.container.sections.forEach(section => {
  //    if (section.index === "0" && section.item?.level) {
  //      //  右边动画
  //      section.item.level.exContent.bubble = "";
  //      //  中间动画
  //      section.item.level.exContent.image = "";
  //      //  提示文字行
  //      section.item.level.exContent.tips = "";
  //      //  箭头图标
  //      section.item.level.exContent.arrowUrl = "";
  //      //  tag提示
  //      section.item.level.exContent.tag = "";
  //      //  轮播图标
  //      section.item.level.exContent.swiper = [];
  //    }
  //    if (section.index === "0" && section.item?.tip) {
  //      delete section.item.tip;
  //    }
  // });
  
}

if (url.includes("/mtop.taobao.idlehome.home.circle.list")) {
  // 过滤 circleList 数组，只保留 circleId 为 1 和 2 的元素
  obj.data.circleList = obj.data.circleList.filter(circle => circle.circleId === "1" || circle.circleId === "2");
  // 首页顶部列表
  if (obj.data?.next?.headList) {
    obj.data.next.headList = obj.data.next.headList.filter(circle => circle.bizCode === "main" || circle.bizCode === "recycle");
    // 顶部回收按钮的动态图
    const target = obj.data.next.headList.find(item => item.bizCode === "recycle");
    if (target) {
      // 确保 showInfo 存在
      if (!target.showInfo) {
        target.showInfo = {};
      }
      target.showInfo.rightTagImage = {};
    }
  }
  if (obj.data?.headList?.length > 0) {
    obj.data.headList = obj.data.headList.filter(circle => circle.bizCode === "main" || circle.bizCode === "recycle");
  
    // 顶部回收按钮的动态图
    const target = obj.data.headList.find(item => item.bizCode === "recycle");
    if (target) {
      // 确保 showInfo 存在
      if (!target.showInfo) {
        target.showInfo = {};
      }
      target.showInfo.rightTagImage = {};
    }
  
  }
}

//if (url.indexOf("/mtop.taobao.idlemtopsearch.search") != -1) {
  //obj.data.resultList = obj.data.resultList.filter(item => {  
    // 过滤掉表示为广告的项
    //return item.data.item.main.exContent.isAliMaMaAD !== "true";  
  //});
//}

// 过滤掉搜索结果表示为广告的项
if (url.includes("/gw/mtop.taobao.idlemtopsearch.search")) {
    if (obj.data && Array.isArray(obj.data.resultList)) {  
      // 使用filter方法遍历resultList数组，并过滤掉不符合条件的元素  
      obj.data.resultList = obj.data.resultList.filter(element => {  
          // 检查当前元素是否包含所需的嵌套属性  
          if (element.data && element.data.item && element.data.item.main && element.data.item.main.exContent) {  
              // 检查isAliMaMaAD的值  
              const isAliMaMaAD = element.data.item.main.exContent.isAliMaMaAD;  
              // 如果isAliMaMaAD是true或"true"，则返回false以过滤掉这个元素  
              return !(isAliMaMaAD === true || isAliMaMaAD === "true");  
          }  
          // 如果没有所需的嵌套属性，也可以返回true来保留这个元素（如果你希望的话）  
          // 或者你可以选择返回false来过滤掉没有这些属性的元素  
          // 这里我们假设没有这些属性的元素应该被保留  
          return true;  
      }); 
      
      //obj.data.resultList = obj.data.resultList.filter(element => {  
        //return element.data.template.name !== "idlefish_search_card_category_select";
      //});
      
      const excludeNames = ["idlefish_search_card_category_select", "idlefish_search_spu_market_publish"];
      obj.data.resultList = obj.data.resultList.filter(element => {
        return !excludeNames.includes(element.data.template.name);
      });
    }
    
    if (obj.data?.resultPrefixBar) {
      delete obj.data.resultPrefixBar;
    }
    
    if (obj.data?.topList) {
      obj.data.topList = [];
    }
}


if (url.includes("/mtop.taobao.idle.group.myself.banner")) {
    obj.data.bannerList = [];
}


if (url.includes("/mtop.taobao.idle.playboy.recommend")) {
    obj.data.recommends = [];
    obj.data.items = [];
    obj.data.next = false;
    //obj.ret = ["fail::"];
}


if (url.includes("/mtop.taobao.idle.item.recommend.list")) {
    //obj.data.windCard.itemList = "";
    obj.data.cardList = [];
}

if (url.includes("/mtop.taobao.idle.local.nearby.itemdetail.enter/1.0")) {
   obj.data.targetUrl = "";
   obj.data.trackParams.itemIds = "";
   obj.data.nearbyItemInfoList = [];
   obj.data.name = "";
   obj.data.desc = "";
   obj.data.poiName = "";
}

if (url.includes("/gw/mtop.taobao.idlemessage.session.sync/3.0")) {
    obj.data.sessions = obj.data.sessions.filter(session => session.session.sessionType !== "25");
}

if (url.includes("idle.fun.follow.feed.list")) {
    obj.data.sections = obj.data.sections.filter(session => session.cardType === 9999);
    obj.data.sections.forEach(section => {
    if (section.cardData?.subText) {
        section.cardData.subText = "";
    }
  });
}

if (url.includes("idle.fun.follow.often.visit")) {
    obj.data.sections = [];
}

if (url.includes("idle.circle.myself.banner/1.0")) {
    obj.data.bannerList = [];
}

if (url.includes("idle.circle.visited/1.0")) {
    obj.data.visitedCircleList = [];
}

if (url.includes("follow.recommend.feed.list")) {
  //if (obj.data?.sections) {
    //obj.data.sections = obj.data.sections.filter(section => {
      //return section.cardData.userInfo.attention;
    //});
  //}
  obj.data.needDecryptKeys = [];
  obj.data.nextPage = false;
  obj.data.fitRecommendAB = true;
}

if (url.includes("/mtop.taobao.idle.local.flow.plat.section")) {
  const keyArr = ["fish_home_activity_enter_cardV1"];
  obj.data.data.components = obj.data.data.components.filter(item => !keyArr.includes(item.key));
}

  
body = JSON.stringify(obj);
$done({body});

});})();
