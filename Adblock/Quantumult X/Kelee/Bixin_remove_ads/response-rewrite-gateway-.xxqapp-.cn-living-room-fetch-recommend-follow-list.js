const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":\"8000\",\"msg\":\"SUCCESS\",\"success\":true}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
