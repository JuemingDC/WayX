// Converted: 2026-09-30 16:17:47 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/grpc\.biliapi\.net\/bilibili\.app\.interface\.v1\.Search\/DefaultWords$/i then response.body.mock("text", "AAAAACEaHeaQnOe0ouinhumikeOAgeeVquWJp+aIlnVw5Li7KAE=", 200, true) | response.header.set("grpc-status", "0")
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBodyBase64 = "AAAAACEaHeaQnOe0ouinhumikeOAgeeVquWJp+aIlnVw5Li7KAE=";
function __wayxBase64ToArrayBuffer(input) {
  const table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const text = String(input || "").replace(/\s+/g, "").replace(/=+$/, "");
  let bits = 0, value = 0;
  const out = [];
  for (const ch of text) {
    const index = table.indexOf(ch);
    if (index < 0) throw new Error("invalid base64 character");
    value = (value << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >> bits) & 255);
    }
  }
  return new Uint8Array(out).buffer;
}
const headers = {"Content-Type": __wayxContentType};
function __wayxHeaderKey(headers, name) {
  const wanted = String(name).toLowerCase();
  return Object.keys(headers).find(key => key.toLowerCase() === wanted);
}
function __wayxHeaderSet(headers, name, value) {
  const key = __wayxHeaderKey(headers, name);
  headers[key || name] = value;
}
function __wayxHeaderDel(headers, name) {
  const wanted = String(name).toLowerCase();
  for (const key of Object.keys(headers)) if (key.toLowerCase() === wanted) delete headers[key];
}
function __wayxHeaderReplace(headers, name, source, replacement) {
  const key = __wayxHeaderKey(headers, name);
  if (key !== undefined) headers[key] = String(headers[key]).replace(new RegExp(source), replacement);
}
__wayxHeaderSet(headers, "grpc-status", "0");
const output = {status: "HTTP/1.1 200 OK", headers};
output.bodyBytes = __wayxBase64ToArrayBuffer(__wayxBodyBase64);
$done(output);
