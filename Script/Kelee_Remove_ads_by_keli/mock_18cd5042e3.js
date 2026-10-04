// Converted: 2026-10-04 18:07:18 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https?:\/\/m\.client\.10010\.com\/mobileService\/customer\/accountListData\.htm/i then response.body.mock("json", "{\"imgIndex\":\"0\",\"adv\":{\"startup_adv\":{\"advCntList\":[],\"buttonList\":[]}},\"respCode\":\"0000\"}")
const __wayxContentType = "application/json";
const __wayxBody = "{\"imgIndex\":\"0\",\"adv\":{\"startup_adv\":{\"advCntList\":[],\"buttonList\":[]}},\"respCode\":\"0000\"}";
const headers = {"Content-Type": __wayxContentType};
const output = {status: "HTTP/1.1 200 OK", headers};
output.body = __wayxBody;
$done(output);
