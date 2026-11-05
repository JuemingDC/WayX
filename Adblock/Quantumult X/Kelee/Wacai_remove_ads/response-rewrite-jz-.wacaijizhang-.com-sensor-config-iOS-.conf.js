const __wayxContentType = "application/json";
const __wayxBody = "{\"v\":\"v2\",\"configs\":{\"disableSDK\":true,\"disableDebugMode\":true,\"supportTransportEncrypt\":false}}";
const headers = { "Content-Type": __wayxContentType };
const output = { status: "HTTP/1.1 200 OK", headers };
output.body = __wayxBody;
$done(output);
