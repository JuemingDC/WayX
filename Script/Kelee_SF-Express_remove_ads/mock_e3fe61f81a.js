// Converted: 2026-10-04 17:16:06 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/ucmp(-static)?\.sf-express\.com\/proxy\/ccspBase\/module-config\/(login\/)?query\?/i then response.body.mock("json", "{\"version\":\"2.0\",\"success\":true,\"obj\":[{\"positionName\":\"APP2025\",\"positionChannel\":\"app\",\"sceneList\":[{\"urlType\":\"webview\",\"sceneCode\":\"ddcb36295d5d2939ba4bbe2e5e02a4d8\",\"extendField1\":\"{\\\"boundApp\\\":\\\"Android,iOS\\\"}\",\"id\":29130,\"extendFieldOneDTO\":{\"boundApp\":\"Android,iOS\"},\"seq\":0,\"sceneName\":\"寄快递\",\"updateTime\":\"2026-02-06 18:55:15\",\"url\":\"{ \\\"needLogin\\\": true, \\\"classify\\\": \\\"MY_SERVICE\\\", \\\"params\\\": { \\\"jumpName\\\": \\\"快速寄件\\", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"version\":\"2.0\",\"success\":true,\"obj\":[{\"positionName\":\"APP2025\",\"positionChannel\":\"app\",\"sceneList\":[{\"urlType\":\"webview\",\"sceneCode\":\"ddcb36295d5d2939ba4bbe2e5e02a4d8\",\"extendField1\":\"{\\\"boundApp\\\":\\\"Android,iOS\\\"}\",\"id\":29130,\"extendFieldOneDTO\":{\"boundApp\":\"Android,iOS\"},\"seq\":0,\"sceneName\":\"寄快递\",\"updateTime\":\"2026-02-06 18:55:15\",\"url\":\"{ \\\"needLogin\\\": true, \\\"classify\\\": \\\"MY_SERVICE\\\", \\\"params\\\": { \\\"jumpName\\\": \\\"快速寄件\\";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
