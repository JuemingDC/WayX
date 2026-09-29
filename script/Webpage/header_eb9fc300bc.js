// Converted: 2026-09-29 18:33:47 +08:00
// Converted by: chance
// Category: 去广告
// Source Loon: request if ${url} ~= /https:\/\/(rule\.)?kelee\.one\//i then request.header.set("user-agent", "Loon/786 CFNetwork/1568.200.51 Darwin/24.1.0")
const __wayxHeaders = {...$request.headers};
function __wayxKey(name) {
  const wanted = String(name).toLowerCase();
  return Object.keys(__wayxHeaders).find(key => key.toLowerCase() === wanted);
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
__wayxSet("user-agent", "Loon/786 CFNetwork/1568.200.51 Darwin/24.1.0");
$done({headers: __wayxHeaders});
