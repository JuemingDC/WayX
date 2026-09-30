// Converted: 2026-09-30 12:45:47 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/manga\.bilibili\.com\/twirp\/comic\.v1\.Comic\/(?:Flash|ListFlash|GetActivityTab|GetBubbles)/i then response.body.mock("text", "{\"code\":0,\"msg\":\"\",\"data\":null}")
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBody = "{\"code\":0,\"msg\":\"\",\"data\":null}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
