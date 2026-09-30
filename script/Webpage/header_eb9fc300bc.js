// Converted: 2026-09-30 15:52:32 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /https:\/\/(rule\.)?kelee\.one\//i then request.header.set("user-agent", "Loon/786 CFNetwork/1568.200.51 Darwin/24.1.0")
const __wayxCaptures=Object.create(null);
let __wayxHeaders={...($request.headers||{})};
let __wayxBody=$request.body;
function __wayxTpl(parts){let out="";for(const p of parts){if(p[0]==="s"){out+=p[1];continue}if(p[0]==="a"){const v=__wayxArgs[p[1]];if(v===undefined)return undefined;out+=String(v);continue}const v=__wayxCaptures[p[1]]?.[p[2]];if(v===undefined)return undefined;out+=String(v)}return out}
function __wayxWith(v,fn){if(v!==undefined)fn(v)}
function __wayxJsonAction(fn){try{const j=JSON.parse(String(__wayxBody ?? ""));fn(j);__wayxBody=JSON.stringify(j)}catch{}}
function __wayxJsonParent(root,path){let x=root;for(let i=0;i<path.length-1;i++){if(x==null||!(path[i] in Object(x)))return null;x=x[path[i]];}return x;}
function __wayxJsonAdd(root,path,value){let x=root;for(let i=0;i<path.length-1;i++){const k=path[i],next=path[i+1];if(x==null||typeof x!=="object")return;if(!(k in x))x[k]=typeof next==="number"?[]:{};x=x[k]}if(x!=null&&typeof x==="object"&&!(path[path.length-1] in x))x[path[path.length-1]]=value;}
function __wayxJsonDelete(root,path){const p=__wayxJsonParent(root,path);if(p==null)return;const k=path[path.length-1];if(Array.isArray(p)&&typeof k==="number"){if(k>=0&&k<p.length)p.splice(k,1);}else delete p[k];}
function __wayxJsonReplace(root,path,value){const p=__wayxJsonParent(root,path);if(p!=null&&path[path.length-1] in Object(p))p[path[path.length-1]]=value;}
function __wayxHeader(phase,name){const h=phase==="request"?$request.headers:$response.headers;const w=String(name).toLowerCase();if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===w);return x?.value;}const k=Object.keys(h||{}).find(x=>x.toLowerCase()===w);return k===undefined?undefined:h[k];}
function __wayxSet(n,v){const k=__wayxKey(n);__wayxHeaders[k||n]=v;}
function __wayxDel(n){const w=String(n).toLowerCase();for(const k of Object.keys(__wayxHeaders))if(k.toLowerCase()===w)delete __wayxHeaders[k];}
function __wayxHeaderReplace(n,p,r){const k=__wayxKey(n);if(k!==undefined)__wayxHeaders[k]=String(__wayxHeaders[k]).replace(new RegExp(p),r);}
function __wayxKey(n){return Object.keys(__wayxHeaders).find(k=>k.toLowerCase()===String(n).toLowerCase());}
if((new RegExp("https://(rule\\.)?kelee\\.one/").test(String($request.url ?? "")))){
  __wayxWith("Loon/786 CFNetwork/1568.200.51 Darwin/24.1.0",v=>__wayxSet("user-agent",v));
  $done({headers:__wayxHeaders});
}else{$done({});}
