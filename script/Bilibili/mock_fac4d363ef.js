// Converted: 2026-10-01 13:58:14 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.bilibili\.com\/pgc\/activity\/deliver\/material\/receive\?/i then response.body.mock("text", "{\"code\":0,\"data\":{\"closeType\":\"close_win\",\"container\":[],\"showTime\":\"\"},\"message\":\"success\"}", 200)
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":0,\"data\":{\"closeType\":\"close_win\",\"container\":[],\"showTime\":\"\"},\"message\":\"success\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
