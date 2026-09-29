// Converted: 2026-09-29 22:48:56 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/app\.bilibili\.com\/x\/resource\/top\/activity\?/i then response.body.mock("text", "{\"code\":-404,\"message\":\"啥都木有\",\"ttl\":1,\"data\":null}", 200)
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":-404,\"message\":\"啥都木有\",\"ttl\":1,\"data\":null}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
