// Converted: 2026-10-04 17:52:03 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.sofascore\.com\/api\/v\d\/trending\/grid\/tiles\/[A-Z]{2}$/i then response.body.mock("json", "{\"tiles\":[]}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"tiles\":[]}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
