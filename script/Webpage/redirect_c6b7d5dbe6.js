// Converted: 2026-10-01 14:35:57 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https?:\/\/(www\.)?(?:g|google)\.cn/i then redirect(302, "https://www.google.com")
const __wayxRe = new RegExp("^https?:\\/\\/(www\\.)?(?:g|google)\\.cn");
const __wayxUrl = $request.url;
const __wayxMatch = __wayxRe.exec(__wayxUrl);
if (!__wayxMatch) {
  $done({});
} else {
  const __wayxTemplate = "https://www.google.com";
  const __wayxReplacement = __wayxTemplate;
  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);
  $done({status: "HTTP/1.1 302 Found", headers: {Location: __wayxLocation}, body: ""});
}
