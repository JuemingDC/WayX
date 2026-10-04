// Converted: 2026-10-04 17:52:30 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https?:\/\/interface\d?\.music\.163\.com\/e?api\/(ocpc\/)?ad\//i then response.body.mock("text", "")
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
