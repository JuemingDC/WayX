const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
