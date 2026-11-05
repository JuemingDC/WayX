const __wayxContentType = "application/json";
const __wayxBody = "{\"respCode\":0,\"respData\":{},\"errorMsg\":\"\",\"errMsg\":\"\"}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
