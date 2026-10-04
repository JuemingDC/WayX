// Converted: 2026-10-04 17:00:43 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/(m|mwsa)\.ximalaya\.com\/community\/square\/v\d\/stream\?/i then response.body.mock("json", "{\"data\":{\"cards\":[{\"content\":{},\"type\":\"RECOMMENDS\"}]},\"ret\":0}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"data\":{\"cards\":[{\"content\":{},\"type\":\"RECOMMENDS\"}]},\"ret\":0}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
