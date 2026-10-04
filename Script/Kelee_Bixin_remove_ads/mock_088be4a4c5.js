// Converted: 2026-10-04 18:07:08 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/gateway\.xxqapp\.cn\/living\/room\/fetch\/recommend-follow-list$/i then response.body.mock("json", "{\"code\":\"8000\",\"msg\":\"SUCCESS\",\"success\":true}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"code\":\"8000\",\"msg\":\"SUCCESS\",\"success\":true}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
