const __wayxContentType = "application/json";
const __wayxBody = "{\"no\":0,\"error\":\"success\"}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
