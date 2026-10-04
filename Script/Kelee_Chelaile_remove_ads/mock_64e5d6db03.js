// Converted: 2026-10-04 17:52:11 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/api\.chelaile\.net\.cn\/encourage\/activity\/control\?/i then response.body.mock("json", "**YGKJ{}YGKJ##", 200)
const __wayxContentType = "application/json";
const __wayxBody = "**YGKJ{}YGKJ##";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
