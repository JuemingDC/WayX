// Converted: 2026-09-30 18:07:20 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /^https:\/\/exhentai\.org/i then redirect(307, "https://e-hentai.org")
const __wayxRe = new RegExp("^https:\\/\\/exhentai\\.org");
const __wayxUrl = $request.url;
const __wayxMatch = __wayxRe.exec(__wayxUrl);
if (!__wayxMatch) {
  $done({});
} else {
  const __wayxTemplate = "https://e-hentai.org";
  const __wayxReplacement = __wayxTemplate;
  const __wayxLocation = __wayxUrl.slice(0, __wayxMatch.index) + __wayxReplacement + __wayxUrl.slice(__wayxMatch.index + __wayxMatch[0].length);
  $done({status: "HTTP/1.1 307 Temporary Redirect", headers: {Location: __wayxLocation}, body: ""});
}
