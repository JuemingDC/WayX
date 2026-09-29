// Converted: 2026-09-29 19:54:41 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: response if ${url} ~= /https:\/\/(rule\.)?kelee\.one\//i then response.header.add("content-disposition", "inline")
const __wayxHeaders = {...$response.headers};
function __wayxKey(name) {
  const wanted = String(name).toLowerCase();
  return Object.keys(__wayxHeaders).find(key => key.toLowerCase() === wanted);
}
function __wayxAdd(name, value) {
  const key = __wayxKey(name);
  __wayxHeaders[key || name] = value;
}
function __wayxSet(name, value) {
  const key = __wayxKey(name);
  __wayxHeaders[key || name] = value;
}
function __wayxDel(name) {
  const wanted = String(name).toLowerCase();
  for (const key of Object.keys(__wayxHeaders)) if (key.toLowerCase() === wanted) delete __wayxHeaders[key];
}
function __wayxReplace(name, source, flags, replacement) {
  const key = __wayxKey(name);
  if (key !== undefined) __wayxHeaders[key] = String(__wayxHeaders[key]).replace(new RegExp(source, flags), replacement);
}
__wayxAdd("content-disposition", "inline");
$done({headers: __wayxHeaders});
