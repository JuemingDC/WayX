const __wayxContentType = "application/json";
const __wayxBody = "{\"message\":\"操作成功\",\"main_ad_list\":[],\"code\":\"000000\"}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
