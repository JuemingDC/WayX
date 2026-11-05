const __wayxContentType = "application/json";
const __wayxBody = "{\"imgIndex\":\"0\",\"adv\":{\"startup_adv\":{\"advCntList\":[],\"buttonList\":[]}},\"respCode\":\"0000\"}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
