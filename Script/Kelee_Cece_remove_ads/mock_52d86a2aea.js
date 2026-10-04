// Converted: 2026-10-04 11:20:38 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.cece\.com\/live\/user\/coupon_tab\?/i then response.body.mock("json", "{\"code\":0,\"msg\":\"\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":0,\"msg\":\"\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
