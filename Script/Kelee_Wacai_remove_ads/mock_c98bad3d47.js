// Converted: 2026-10-04 17:00:37 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/jz\.wacaijizhang\.com\/sensor\/config\/iOS\.conf\?/i then response.body.mock("json", "{\"v\":\"v2\",\"configs\":{\"disableSDK\":true,\"disableDebugMode\":true,\"supportTransportEncrypt\":false}}", 200)
const __wayxContentType = "application/json";
const __wayxBody = "{\"v\":\"v2\",\"configs\":{\"disableSDK\":true,\"disableDebugMode\":true,\"supportTransportEncrypt\":false}}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
