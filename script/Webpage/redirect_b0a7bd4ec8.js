// Converted: 2026-09-29 18:33:47 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https?:\/\/translate\.google\.cn/i then redirect(302, "https://translate.google.com")
const __wayxRe = new RegExp("^https?:\\/\\/translate\\.google\\.cn", "i");
const __wayxUrl = $request.url;
const __wayxMatch = __wayxRe.exec(__wayxUrl);
if (!__wayxMatch) {
  $done({});
} else {
  const __wayxTemplate = "https://translate.google.com";
  const __wayxReplacement = __wayxTemplate;
  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);
  $done({status: "HTTP/1.1 302 Found", headers: {Location: __wayxLocation}, body: ""});
}
