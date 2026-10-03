// Converted: 2026-10-03 11:34:04 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https?:\/\/translate\.google\.cn/i then redirect(302, "https://translate.google.com")
const __wayxCaptures=Object.create(null);
function __wayxHeader(phase,name){
  const h=phase==="request"?$request.headers:$response.headers;
  const wanted=String(name).toLowerCase();
  if(Array.isArray(h)){const x=h.find(x=>String(x.field).toLowerCase()===wanted);return x?.value;}
  const k=Object.keys(h||{}).find(x=>x.toLowerCase()===wanted);
  return k===undefined?undefined:h[k];
}
const __wayxUrl=$request.url;
if((new RegExp("^https?:\\/\\/translate\\.google\\.cn").test(String($request.url ?? "")))){
  const __wayxMatch=String(__wayxUrl ?? "").match(new RegExp("^https?:\\/\\/translate\\.google\\.cn"));
  if(!__wayxMatch){$done({});}else{
    const __wayxTemplate="https://translate.google.com";
    const __wayxReplacement=__wayxTemplate;
    const __wayxLocation=__wayxUrl.slice(0,__wayxMatch.index)+__wayxReplacement+__wayxUrl.slice(__wayxMatch.index+__wayxMatch[0].length);
    $done({status:"HTTP/1.1 302 Found",headers:{Location:__wayxLocation},body:""});
  }
}else{$done({});}
