// Converted: 2026-10-03 17:44:39 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /(^https:\/\/c\.pc\.qq\.com\/index\.html\?pfurl=)(http.*)(&pfuin=.*)/i as urlMatch then redirect(307, "${urlMatch.2}")
const __wayxCaptures=Object.create(null);
function __wayxHeader(phase,name){
  const h=phase==="request"?$request.headers:$response.headers;
  const wanted=String(name).toLowerCase();
  if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===wanted);return x?.value;}
  const k=Object.keys(h||{}).find(x=>x.toLowerCase()===wanted);
  return k===undefined?undefined:h[k];
}
const __wayxUrl=$request.url;
if(((__wayxCaptures["urlMatch"]=String($request.url ?? "").match(new RegExp("(^https:\\/\\/c\\.pc\\.qq\\.com\\/index\\.html\\?pfurl=)(http.*)(&pfuin=.*)")))!==null)){
  const __wayxMatch=__wayxCaptures["urlMatch"];
  if(!__wayxMatch){$done({});}else{
    const __wayxTemplate="${urlMatch.2}";
    const __wayxReplacement=__wayxTemplate.replace(/\$\{urlMatch\.(\d+)\}/g,(_,n)=>__wayxMatch[Number(n)] ?? "");
    const __wayxLocation=__wayxUrl.slice(0,__wayxMatch.index)+__wayxReplacement+__wayxUrl.slice(__wayxMatch.index+__wayxMatch[0].length);
    $done({status:"HTTP/1.1 307 Temporary Redirect",headers:{Location:__wayxLocation},body:""});
  }
}else{$done({});}
