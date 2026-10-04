// Converted: 2026-10-04 17:52:38 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https?:\/\/newapp2\.szsmk\.com\/app\/config\/queryMainAd/i then response.body.mock("json", "{\"message\":\"操作成功\",\"main_ad_list\":[],\"code\":\"000000\"}")
const __wayxContentType = "application/json";
const __wayxBody = "{\"message\":\"操作成功\",\"main_ad_list\":[],\"code\":\"000000\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
