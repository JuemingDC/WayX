// Converted: 2026-10-03 17:45:02 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.58moto\.com\/forum\/public\/businessEssayController\.do\?action=22038/i then response.body.mock("json", "{\"code\":0,\"msg\":\"success\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":0,\"msg\":\"success\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
