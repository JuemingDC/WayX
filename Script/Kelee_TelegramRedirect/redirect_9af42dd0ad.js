// Converted: 2026-10-03 17:44:42 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https:\/\/t\.me\/([A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9])\/?$/ as item then redirect(307, "${app}://resolve?domain=${item.1}")
const __wayxCaptures=Object.create(null);
function __wayxHeader(phase,name){
  const h=phase==="request"?$request.headers:$response.headers;
  const wanted=String(name).toLowerCase();
  if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===wanted);return x?.value;}
  const k=Object.keys(h||{}).find(x=>x.toLowerCase()===wanted);
  return k===undefined?undefined:h[k];
}
const __wayxUrl=$request.url;
if(((__wayxCaptures["item"]=String($request.url ?? "").match(new RegExp("^https:\\/\\/t\\.me\\/([A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9])\\/?$")))!==null)){
  const __wayxMatch=__wayxCaptures["item"];
  if(!__wayxMatch){$done({});}else{
    const __wayxTemplate="${app}://resolve?domain=${item.1}";
    const __wayxReplacement=__wayxTemplate.replace(/\$\{item\.(\d+)\}/g,(_,n)=>__wayxMatch[Number(n)] ?? "");
    const __wayxLocation=__wayxUrl.slice(0,__wayxMatch.index)+__wayxReplacement+__wayxUrl.slice(__wayxMatch.index+__wayxMatch[0].length);
    $done({status:"HTTP/1.1 307 Temporary Redirect",headers:{Location:__wayxLocation},body:""});
  }
}else{$done({});}
