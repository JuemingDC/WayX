// Converted: 2026-10-04 17:15:48 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/ap[ip]\.bilibili\.com\/x\/(resource\/(top\/activity|patch\/tab(\/v2)?)|v2\/search\/square|vip\/ads\/materials)\?/i then response.body.mock("text", "{\"code\":-404,\"message\":\"-404\",\"ttl\":1,\"data\":null}", 200)
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":-404,\"message\":\"-404\",\"ttl\":1,\"data\":null}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
