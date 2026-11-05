const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":\"000000\",\"message\":\"操作成功\",\"list\":[]}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
