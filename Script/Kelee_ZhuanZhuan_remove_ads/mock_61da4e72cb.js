// Converted: 2026-10-04 17:52:39 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/app\.zhuanzhuan\.com\/zzopen\/ptsimpleshow\/recommendbymyloveinfo\?/i then response.body.mock("json", "{\"respCode\":0,\"errorMsg\":\"null\",\"errMsg\":\"\"}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"respCode\":0,\"errorMsg\":\"null\",\"errMsg\":\"\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
