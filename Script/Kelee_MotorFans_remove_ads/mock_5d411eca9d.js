// Converted: 2026-10-04 17:52:23 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.58moto\.com\/forum\/public\/businessEssayController\.do\?action=22025/i then response.body.mock("json", "{\"code\":0,\"msg\":\"success\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":0,\"msg\":\"success\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
