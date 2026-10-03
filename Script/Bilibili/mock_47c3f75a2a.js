// Converted: 2026-10-04 01:04:04 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /^https:\/\/grpc\.biliapi\.net\/bilibili\.app\.interface\.v1\.Teenagers\/ModeStatus$/i then response.body.mock("text", "AAAAABMKEQgCEgl0ZWVuYWdlcnMgAioA", 200, true) | response.header.set("grpc-status", "0")
const __wayxContentType = "text/plain; charset=utf-8";
const __wayxBodyBase64 = "AAAAABMKEQgCEgl0ZWVuYWdlcnMgAioA";
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
const __wayxRegexReplace=(()=>{const SUPPORTED_FLAGS=/^[ims]*$/;function assertRegexNode(node) {
  if (!node || node.type!=='regex') throw new TypeError('Expected Loon semantic Regex node');
  const flags=String(node.flags || '');
  if (!SUPPORTED_FLAGS.test(flags)) throw new Error('Unsupported Loon regex flag(s): '+flags);
  if (new Set(flags).size!==flags.length) throw new Error('Duplicate Loon regex flag(s): '+flags);
  return {source:String(node.pattern ?? ''),flags};
}
function compileSourceRegex(node) {
  const {source,flags}=assertRegexNode(node);
  return new RegExp(source,flags);
}
function replaceSourceRegex(node,text,replacement) {
  const match=compileSourceRegex(node).exec(text);
  if (!match) return text;
  const out=String(replacement).replace(/\$(\d+)/g,(_,index)=>match[Number(index)] ?? '');
  return text.slice(0,match.index)+out+text.slice(match.index+match[0].length);
};return (text,pattern,flags,replacement)=>replaceSourceRegex({type:"regex",pattern,flags},String(text),replacement);})();
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
function __wayxHeaderReplace(headers, name, source, replacement, flags="") {
  const key = __wayxHeaderKey(headers, name);
  if (key !== undefined) headers[key] = __wayxRegexReplace(headers[key],source,flags,replacement);
}
__wayxHeaderSet(headers, "grpc-status", "0");
const output = {status: "HTTP/1.1 200 OK", headers};
output.bodyBytes = __wayxBase64ToArrayBuffer(__wayxBodyBase64);
$done(output);
