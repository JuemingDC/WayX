// Converted: 2026-09-30 21:11:06 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /(^https:\/\/live\.bilibili\.com\/\d+)(?:\/?\?.*)/i as urlMatch then redirect(302, "${urlMatch.1}")
const __wayxRe = new RegExp("(^https:\\/\\/live\\.bilibili\\.com\\/\\d+)(?:\\/?\\?.*)");
const __wayxUrl = $request.url;
const __wayxMatch = __wayxRe.exec(__wayxUrl);
if (!__wayxMatch) {
  $done({});
} else {
  const __wayxTemplate = "${urlMatch.1}";
  const __wayxReplacement = __wayxTemplate.replace(/\$\{urlMatch\.(\d+)\}/g, (_, n) => __wayxMatch[Number(n)] ?? "");
  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);
  $done({status: "HTTP/1.1 302 Found", headers: {Location: __wayxLocation}, body: ""});
}
