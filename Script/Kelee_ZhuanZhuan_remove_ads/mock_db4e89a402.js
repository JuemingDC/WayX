// Converted: 2026-10-03 17:45:18 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/app\.zhuanzhuan\.com\/zz\/v2\/zzinfoshow\/getchoicegoodsinfos\?/i then response.body.mock("json", "{\"respCode\":0,\"respData\":{},\"errorMsg\":\"\",\"errMsg\":\"\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"respCode\":0,\"respData\":{},\"errorMsg\":\"\",\"errMsg\":\"\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
