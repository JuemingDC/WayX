// Converted: 2026-10-04 17:52:38 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https?:\/\/newapp2\.szsmk\.com\/app\/config\/(queryCarousel|queryRecommendation)\//i then response.body.mock("json", "{\"code\":\"000000\",\"message\":\"操作成功\",\"list\":[]}")
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":\"000000\",\"message\":\"操作成功\",\"list\":[]}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
