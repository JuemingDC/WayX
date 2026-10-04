// Converted: 2026-10-04 17:52:07 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https?:\/\/tieba\.baidu\.com\/mo\/q\/search\/startPage\?/i then response.body.mock("json", "{\"no\":0,\"error\":\"success\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"no\":0,\"error\":\"success\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
