// Modified: 2026-11-02 (chance). Exercise the shared closed-call proof across
// header operations, Env predicates, storage wrappers and QX request wrappers.
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import { planUniversalAdblockScript as universal } from "../src/parser/universal-script.ts";
const opt = {
  from: "qx" as const,
  to: "surge" as const,
  phase: "response" as const,
  responseBody: true,
};
const env =
  'function isQX(){return typeof $task!=="undefined";}if(isQX()){$done({body:$response.body});}else{require("fs");$done({});}';
const e = universal(env, "qx", [{ phase: "response", responseBody: true }]);
assert.equal(e.status, "universal", JSON.stringify(e.problems));
assert.ok(!e.features.includes("require"));
for (const bad of [
  env.replace("if(isQX())", "leak(isQX);if(isQX())"),
  env.replace("return typeof", "count++;return typeof"),
  env.replace("if(isQX())", "isQX=other;if(isQX())"),
])
  assert.equal(universal(bad, "qx", [{ phase: "response" }]).status, "blocked");
const store =
  'function get(key){return $prefs.valueForKey(key);}function put(value,key){$prefs.setValueForKey(value,key);}const data=get("cache")||"none";put("saved","cache");$done({body:data});';
const p = pair(store, opt);
assert.equal(p.status, "adapted", JSON.stringify(p.problems));
let result: any, written: any;
vm.runInNewContext(p.code!, {
  setTimeout,
  $response: { body: "" },
  $persistentStore: {
    read() {
      return undefined;
    },
    write: (v: any, k: any) => (written = [v, k]),
  },
  $done: (v: any) => (result = v),
});
assert.equal(result.body, "none");
assert.deepEqual(written, ["saved", "cache"]);
for (const bad of [
  store.replace('||"none"', "===undefined"),
  store.replace("const data=", "leak(get);const data="),
  store.replace("return $prefs", 'key="other";return $prefs'),
  store.replace("return $prefs", '({key}={key:"other"});return $prefs'),
])
  assert.equal(pair(bad, opt).status, "blocked", bad);
const request =
  'function send(input){return $task.fetch(input).then(r=>$done({body:r.body}));}send({url:"https://fixture.test/",headers:{"User-Agent":"fixture","Accept":"*/*","Accept-Encoding":"identity"}});';
const h = pair(request, opt);
assert.equal(h.status, "adapted", JSON.stringify(h.problems));
let seen: any;
vm.runInNewContext(h.code!, {
  setTimeout,
  $response: {},
  $httpClient: {
    get: (o: any, cb: any) => {
      seen = o;
      cb(null, { status: 200 }, "reply");
    },
  },
  $done: (v: any) => (result = v),
});
await new Promise((r) => setTimeout(r, 0));
assert.equal(result.body, "reply");
assert.equal(seen.url, "https://fixture.test/");
for (const bad of [
  request.replace(
    "return $task",
    'input.url="https://other.test/";return $task',
  ),
  request.replace("return $task", "leak(input);return $task"),
  request.replace("send({url:", "leak(send);send({url:"),
])
  assert.equal(pair(bad, opt).status, "blocked");
const query =
  'const h=$response.headers ?? {};const type=Object.entries(h).find(([name])=>name.toLowerCase()==="content-type")?.[1];$done({body:type||"missing"});';
const q = pair(query, opt);
assert.equal(q.status, "adapted", JSON.stringify(q.problems));
for (const headers of [{ "CONTENT-TYPE": "text/plain" }, {}]) {
  vm.runInNewContext(q.code!, {
    setTimeout,
    $response: { headers },
    $done: (v: any) => (result = v),
  });
  assert.equal(result.body, (headers as any)["CONTENT-TYPE"] || "missing");
}
assert.throws(
  () =>
    vm.runInNewContext(q.code!, {
      setTimeout,
      $response: { headers: { "Content-Type": "a", "content-type": "b" } },
      $done() {},
    }),
  /singleton/,
);
const deletion =
  'const headers=$request.headers;Object.keys(headers).forEach(key=>{if(key.toLowerCase()==="if-none-match")delete headers[key];});$done({headers});';
const d = pair(deletion, { ...opt, phase: "request" });
assert.equal(d.status, "adapted", JSON.stringify(d.problems));
const original = {
  "IF-NONE-MATCH": "etag",
  "User-Agent": "fixture",
  "Content-Length": "0",
};
vm.runInNewContext(d.code!, {
  setTimeout,
  $request: { url: "https://fixture.test/", headers: original },
  $done: (v: any) => (result = v),
});
assert.deepEqual(JSON.parse(JSON.stringify(result.headers)), {
  "User-Agent": "fixture",
  "Content-Length": "0",
});
assert.equal(original["IF-NONE-MATCH"], "etag");
assert.ok(
  d.operationIR.operations.some((x) =>
    x.fields?.some((f) => f.canonical === "header.delete-ci:if-none-match"),
  ),
);
for (const bad of [
  deletion.replace('"if-none-match"', '"content-length"'),
  deletion.replace("$done({headers})", "leak(headers);$done({headers})"),
  deletion.replace("$done({headers})", 'headers.x="a";$done({headers})'),
  deletion.replace(
    "$done({headers})",
    "delete $response.headers.x;$done({headers})",
  ),
])
  assert.equal(pair(bad, { ...opt, phase: "request" }).status, "blocked", bad);
console.log(
  "Shared wrappers passed: pure Env predicates, closed storage keys/values and absence, request wrappers, entries lookup, detached case-independent Header deletion/return and mutation/escape negatives",
);

// Modified: 2026-11-02 (chance). Same deletion semantics on every authorized
// Loon-source host, including absent fields and retained framing fields.
const shared = universal(deletion, "loon", [{ phase: "request" }]);
assert.equal(shared.status, "universal", JSON.stringify(shared.problems));
for (const host of ["qx", "surge", "loon"]) {
  vm.runInNewContext(shared.code!, {
    setTimeout,
    $request: {
      url: "https://fixture.test/",
      headers: { "If-None-Match": "v", Accept: "*/*" },
    },
    $done: (v: any) => (result = v),
    ...(host === "qx"
      ? { $task: { fetch() {} } }
      : host === "loon"
        ? { $loon: "real" }
        : { $environment: { "surge-version": "real" } }),
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.headers)), {
    Accept: "*/*",
  });
}
// Actual archived YouTube source contains the entries/find idiom. Retain the
// whole script's remaining blockers while recognizing that concrete lookup.
const archive = JSON.parse(
  await fs.readFile("Resource/Backup/index.json", "utf8"),
);
const realUrl = "https://rucu6.pages.dev/Scripts/youtube/ump_gholts.js";
const realText = await fs.readFile(archive.latest[realUrl], "utf8");
assert.ok(realText.includes("Object.entries($response.headers ?? {}).find"));
// End-to-end isolated backup transaction composes the three families, preserving
// exact source bytes, same-source filenames, shared links and semantic evidence.
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-shared-wrappers-"));
try {
  const sources = new Map([
    ["https://author.test/headers.js", deletion],
    ["https://author.test/storage.js", store],
    ["https://author.test/http.js", request],
    ["https://author.test/env.js", env],
  ]);
  const qx = "Adblock/Quantumult X/test.snippet",
    surge = "Adblock/Surge/test.sgmodule";
  for (const file of [qx, surge])
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  const rows = [...sources.keys()];
  await fs.writeFile(
    path.join(root, qx),
    "# Managed by: WayX Native QX\n" +
      rows
        .map(
          (u, n) =>
            `^https://fixture${n}\\.test/ url script-${n === 0 ? "request-header" : "response-body"} ${u}`,
        )
        .join("\n") +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "# Managed by: WayX Native QX\n[Script]\n" +
      rows
        .map(
          (u, n) =>
            `s${n}=type=http-${n === 0 ? "request" : "response"},pattern=^https://fixture${n}\\.test/,${n === 0 ? "" : "requires-body=true,"}script-path=${u}`,
        )
        .join("\n") +
      "\n",
  );
  const report = await refreshSourceBackups(root, {
    catalog: [],
    resources: {
      cachedBytes: async () => null,
      fetchBytes: async (u: string) => Buffer.from(sources.get(u)!),
    },
    log: () => {},
  });
  assert.equal(report.scriptApi.universal, 4, JSON.stringify(report));
  assert.equal(report.scriptApi.blocked, 0);
  const index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  for (const [u, source] of sources) {
    assert.equal(
      await fs.readFile(path.join(root, index.latest[u]), "utf8"),
      source,
    );
    assert.ok(index.apiPlans[u]);
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
