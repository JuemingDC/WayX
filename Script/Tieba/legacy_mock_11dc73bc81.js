// Converted: 2026-10-01 17:29:49 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: ^https?:\/\/tieba\.baidu\.com\/mo\/q\/search\/startPage\? mock-response-body data-type=json data="{"no":0,"error":"success"}" status-code=200
const __wayxContentType = "application/json";
const __wayxBody = "{\"no\":0,\"error\":\"success\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
