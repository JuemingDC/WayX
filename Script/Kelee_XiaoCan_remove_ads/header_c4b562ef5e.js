// Converted: 2026-10-03 17:45:13 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https:\/\/gw\.xiaocantech\.com\/rpc/i then request.header.replace("methodname", /.*(GetBannerList|IsShowOrderAwardPopup|UserLifeShopList|BrandBannerList|GetPromotionGlobalCfg)/, "null")
const __wayxHeaders = {...$request.headers};
function __wayxKey(name) {
  const wanted = String(name).toLowerCase();
  return Object.keys(__wayxHeaders).find(key => key.toLowerCase() === wanted);
}
function __wayxSet(name, value) {
  const key = __wayxKey(name);
  __wayxHeaders[key || name] = value;
}
function __wayxDel(name) {
  const wanted = String(name).toLowerCase();
  for (const key of Object.keys(__wayxHeaders)) if (key.toLowerCase() === wanted) delete __wayxHeaders[key];
}
function __wayxReplace(name, source, replacement) {
  const key = __wayxKey(name);
  if (key !== undefined) __wayxHeaders[key] = String(__wayxHeaders[key]).replace(new RegExp(source), replacement);
}
__wayxReplace("methodname", ".*(GetBannerList|IsShowOrderAwardPopup|UserLifeShopList|BrandBannerList|GetPromotionGlobalCfg)", "null");
$done({headers: __wayxHeaders});
