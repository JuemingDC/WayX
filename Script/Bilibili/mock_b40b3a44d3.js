// Converted: 2026-10-04 17:52:41 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/app\.bilibili\.com\/x\/v2\/search\/square\?/i then response.body.mock("text", "{\"code\":0,\"message\":\"0\",\"ttl\":1,\"data\":{\"type\":\"history\",\"title\":\"搜索历史\",\"search_hotword_revision\":2}}", 200)
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":0,\"message\":\"0\",\"ttl\":1,\"data\":{\"type\":\"history\",\"title\":\"搜索历史\",\"search_hotword_revision\":2}}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
