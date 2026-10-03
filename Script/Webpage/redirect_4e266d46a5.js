// Converted: 2026-10-03 10:03:38 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https:\/\/www\.pornhub\.com\//i then redirect(302, "https://cn.pornhub.com/")
const __wayxRe = new RegExp("^https:\\/\\/www\\.pornhub\\.com\\/");
const __wayxUrl = $request.url;
const __wayxMatch = __wayxRe.exec(__wayxUrl);
if (!__wayxMatch) {
  $done({});
} else {
  const __wayxTemplate = "https://cn.pornhub.com/";
  const __wayxReplacement = __wayxTemplate;
  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);
  $done({status: "HTTP/1.1 302 Found", headers: {Location: __wayxLocation}, body: ""});
}
