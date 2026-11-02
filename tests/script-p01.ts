// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). Expand only closed P0/P1 domains; execute
// identical bytes on all hosts and preserve blocked ambiguity/escape cases.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript as plan } from "../src/parser/universal-script.ts";
import { inspectScriptApis } from "../src/parser/script-api.ts";
const profile = [{ phase: "response" as const }];
function hosts(
  source: string,
  extra: Record<string, unknown> = {},
  from: "loon" | "qx" = "loon",
) {
  const p = plan(source, from, profile);
  assert.equal(p.status, "universal", JSON.stringify(p.problems));
  const results = [];
  for (const host of (from === "qx" ? ["qx", "surge"] : ["qx", "surge", "loon"])) {
    let out: unknown;
    vm.runInNewContext(p.code!, {
      setTimeout,
      $request: { url: "https://a.test/" },
      $response: { body: "ok" },
      $done: (v: unknown) => (out = v),
      ...extra,
      ...(host === "qx"
        ? { $task: { fetch() {} } }
        : host === "loon"
          ? { $loon: "actual" }
          : { $environment: { "surge-version": "actual" } }),
    });
    results.push(out);
  }
  return results;
}
for (const source of [
  'const u=($request && $request.url)||"";$done({body:u});',
  'const u=(typeof $request!=="undefined" && $request && $request.url)||"";$done({body:u});',
  'const b=($response && $response.body)||"";$done({body:b});',
  'const KEY="bo"+"dy";$done({body:$response[KEY]});',
  'const TABLE=["body"]; $done({body:$response[TABLE[0]]});',
]) {
  const results = hosts(source, {}, "qx");
  assert.ok(
    results.every((x) => JSON.stringify(x) === JSON.stringify(results[0])),
  );
}
for (const bad of [
  "const o=$request&&$response;leak(o);$done({});",
  "const o=$request&&$request;leak(o);$done({});",
  'const TABLE=["body"];TABLE[0]="headers";$done({body:$response[TABLE[0]]});',
  'const TABLE=["body"];mutate(TABLE);$done({body:$response[TABLE[0]]});',
  'const TABLE=["body"];function f(){return $response[TABLE[0]]}$done({body:f()});',
])
  assert.equal(plan(bad, "qx", profile).status, "blocked", bad);
const guarded =
  'const v=$persistentStore.read("k");let b="missing";if(v){b=JSON.parse(v).body;}$done({body:b});';
for (const missing of [null, undefined, ""])
  assert.ok(
    hosts(guarded, {
      $persistentStore: { read: () => missing },
      $prefs: { valueForKey: () => missing },
    }).every((x) => (x as any).body === "missing"),
  );
assert.ok(
  hosts(guarded, {
    $persistentStore: { read: () => '{"body":"stored"}' },
    $prefs: { valueForKey: () => '{"body":"stored"}' },
  }).every((x) => (x as any).body === "stored"),
);
for (const bad of [
  'const v=$persistentStore.read("k");$done({body:JSON.stringify(v)});',
  'const v=$persistentStore.read("k");if(v===undefined)$done({body:"undefined"});else $done({body:"other"});',
])
  assert.equal(plan(bad, "loon", profile).status, "blocked");
const prefix =
  'const h=$request.headers;const k=Object.keys(h).find(k=>/^tok/i.test(k));const v=k?h[k]:null;$done({body:v||"missing"});';
for (const headers of [
  { token: "value" },
  { TOKEN: "value" },
  { other: "value" },
])
  assert.ok(
    hosts(prefix, { $request: { url: "https://a.test/", headers } }).every(
      (x) =>
        (x as any).body ===
        ("token" in headers || "TOKEN" in headers ? "value" : "missing"),
    ),
  );
assert.throws(
  () => hosts(prefix, { $request: { headers: { token: "a", Token2: "b" } } }),
  /singleton/,
);
assert.throws(
  () => hosts(prefix, { $request: { headers: { token: ["a", "b"] } } }),
  /singleton/,
);
for (const bad of [
  prefix.replace("/^tok/i", "/^tok/ig"),
  prefix.replace("find(k=>", "find(async k=>"),
  'Object.keys=()=>["Host"];' + prefix,
  prefix.replace('$done({body:v||"missing"})', '$done({headers:""})'),
  prefix.replace("/^tok/i", "/^t.k/i"),
  prefix.replace("/^tok/i", "/^tok|other/i"),
  prefix.replace('v||"missing"', "JSON.stringify(h)"),
  prefix.replace("k?h[k]:null", "h[k]"),
])
  assert.equal(plan(bad, "loon", profile).status, "blocked");
const noBody = "$done({body:$request.url});";
assert.equal(
  plan(noBody, "loon", [
    { phase: "response", binary: false },
    { phase: "response", binary: true },
  ]).status,
  "universal",
);
assert.equal(
  plan("$done({body:$response.body});", "loon", [
    { phase: "response", binary: false },
    { phase: "response", binary: true },
  ]).status,
  "blocked",
);
assert.equal(
  plan("$done({body:$request[unknown]});", "loon", [
    { phase: "response", binary: false },
    { phase: "response", binary: true },
  ]).status,
  "blocked",
);
assert.ok(
  !inspectScriptApis('const K="url";const u=$request[K];').problems.length,
);
console.log(
  "P0/P1 proofs passed: guarded scalar contexts, immutable keys/tables, profile observability, guarded storage and case-independent singleton header prefixes",
);
