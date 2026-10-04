// Converted: 2026-10-04 17:52:09 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/app\.bilibili\.com\/x\/v2\/splash\/list\?/i then response.body.mock("text", "{\"code\":0,\"message\":\"OK\",\"ttl\":1,\"data\":{\"max_time\":0,\"min_interval\":31536000,\"pull_interval\":31536000,\"keep_ids\":[],\"show\":[],\"list\":[{}],\"splash_request_id\":\"\"}}", 200)
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":0,\"message\":\"OK\",\"ttl\":1,\"data\":{\"max_time\":0,\"min_interval\":31536000,\"pull_interval\":31536000,\"keep_ids\":[],\"show\":[],\"list\":[{}],\"splash_request_id\":\"\"}}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
