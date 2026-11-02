// Modified: 2026-11-02 (chance). Verify syntax -> semantic operations -> target
// layout -> execution, including real archived inputs and per-field decisions.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
const read = pair("$done({body:String($response.statusCode)});", {
  from: "qx",
  to: "surge",
  phase: "response",
});
assert.equal(read.status, "adapted");
const status = read.operationIR.operations.find(
  (x) => x.rule === "response.status",
)!;
assert.equal(status.canonical, "response.status");
assert.equal(status.target.api, "$response.status");
assert.equal(read.contract!.apiPlan.source.responseStatus, "statusCode");
assert.equal(read.contract!.apiPlan.target.responseStatus, "status");
let result: any;
vm.runInNewContext(read.code!, {
  setTimeout,
  $response: { status: 201 },
  $done: (v: any) => (result = v),
});
assert.equal(result.body, "201");
const deletion = pair('$persistentStore.write(null,"key");$done({});', {
  from: "loon",
  to: "qx",
  phase: "response",
});
const remove = deletion.operationIR.operations.find(
  (x) => x.rule === "storage.remove-by-write",
)!;
assert.equal(remove.target.api, "$prefs.removeValueForKey");
assert.equal(
  remove.fields!.find((x) => x.source === "argument1")!.target,
  "argument0",
);
let key: any;
vm.runInNewContext(deletion.code!, {
  setTimeout,
  $response: {},
  $prefs: { removeValueForKey: (v: any) => (key = v) },
  $done() {},
});
assert.equal(key, "key");
const reversed = pair('$prefs.removeValueForKey("key");$done({});', {
  from: "qx",
  to: "surge",
  phase: "response",
});
const removed = reversed.operationIR.operations.find(
  (x) => x.rule === "storage.remove",
)!;
assert.equal(
  removed.fields!.find((x) => x.source === "argument0")!.target,
  "argument1",
);
assert.ok(removed.fields!.some((x) => x.target === "argument0=null"));
const echo = pair('$done({status:"HTTP/1.1 201 Created",body:"made"});', {
  from: "qx",
  to: "surge",
  phase: "echo",
});
assert.equal(echo.status, "adapted");
assert.equal(
  echo.operationIR.operations[0].fields!.find((x) => x.source === "status")!
    .target,
  "response.status",
);
vm.runInNewContext(echo.code!, {
  setTimeout,
  $request: { url: "https://a.test/" },
  $done: (v: any) => (result = v),
});
assert.equal(result.response.status, 201);
const nativeText = pair("$done($response.body);", {
  from: "qx",
  to: "surge",
  phase: "response",
  responseBody: true,
});
assert.ok(
  nativeText.operationIR.operations
    .find((x) => x.rule === "complete")!
    .fields!.some((x) => x.canonical === "complete.text-or-pass"),
);
const fetch =
  '$task.fetch({url:"http://fixture.test/",timeout:9,headers:{"User-Agent":"fixture","Accept":"*/*","Accept-Encoding":"identity"},opts:{timeout:7,redirection:false,"auto-cookie":false,"skip-cert-verify":true,policy:"direct"}}).then(r=>$done({body:r.body}));';
const http = pair(fetch, { from: "qx", to: "surge", phase: "response" });
assert.equal(http.status, "adapted", JSON.stringify(http.problems));
const request = http.operationIR.operations.find(
  (x) => x.rule === "http.request",
)!;
assert.equal(request.target.api, "$httpClient.get");
for (const name of ["timeout", "opts.timeout"])
  assert.equal(request.fields!.find((x) => x.source === name)!.action, "omit");
assert.equal(
  request.fields!.find((x) => x.source === "opts.skip-cert-verify")!.target,
  "insecure",
);
let options: any;
vm.runInNewContext(http.code!, {
  setTimeout,
  $response: {},
  $done: (v: any) => (result = v),
  $httpClient: {
    get: (o: any, cb: any) => {
      options = o;
      cb(null, { status: 200 }, "fetched");
    },
  },
});
await new Promise((r) => setTimeout(r, 0));
assert.equal(options.timeout, undefined);
assert.equal(options.insecure, true);
assert.equal(options.policy, "DIRECT");
assert.equal(result.body, "fetched");
const notification = pair(
  '$notification.post("t","s","b",{openUrl:"https://a.test/",mediaUrl:"https://a.test/i.png"});$done({});',
  { from: "loon", to: "surge", phase: "response" },
);
const notify = notification.operationIR.operations.find(
  (x) => x.rule === "notify",
)!;
assert.equal(
  notify.fields!.find((x) => x.source === "argument3.openUrl")!.target,
  "argument3.url",
);
assert.equal(
  notify.fields!.find((x) => x.source === "argument3.mediaUrl")!.target,
  "argument3.media-url",
);
const archive = JSON.parse(
  await fs.readFile("Resource/Backup/index.json", "utf8"),
);
const caixin =
  "https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/caixin/caixinAd.js";
const raw = await fs.readFile(archive.latest[caixin]);
const real = pair(raw.toString(), {
  from: "qx",
  to: "surge",
  phase: "response",
});
assert.equal(real.status, "adapted", JSON.stringify(real.problems));
const body = real.operationIR.operations.find(
  (x) => x.rule === "response.body",
)!;
assert.equal(body.target.api, "$response.body");
assert.ok(body.source.memberPath!.includes("replace"));
assert.ok(
  raw
    .toString()
    .slice(body.source.start, body.source.end)
    .includes("$response"),
);
const header =
  "https://raw.githubusercontent.com/app2smile/rules/master/js/spotify-qx-header.js";
const blocked = pair((await fs.readFile(archive.latest[header])).toString(), {
  from: "qx",
  to: "surge",
  phase: "request",
});
assert.equal(blocked.status, "blocked");
const field = blocked.operationIR.operations.find(
  (x) => x.rule === "request.header.delete",
)!;
assert.ok(field.source.memberPath!.includes("If-None-Match"));
assert.equal(field.decision, "requires-proof");
assert.ok(field.diagnostics.length);
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-semantic-api-"));
try {
  const url = "https://author.test/source.js";
  const qx = "Adblock/Quantumult X/test.snippet",
    surge = "Adblock/Surge/test.sgmodule";
  for (const file of [qx, surge])
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(
    path.join(root, qx),
    "# Managed by: WayX Native QX\n^https://a.test/ url script-response-body " +
      url +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "# Managed by: WayX Native QX\n[Script]\nTest = type=http-response,pattern=^https://a.test/,script-path=" +
      url +
      ",requires-body=true\n",
  );
  await refreshSourceBackups(root, {
    catalog: [],
    resources: {
      cachedBytes: async () => null,
      fetchBytes: async () =>
        Buffer.from("$done({body:String($response.statusCode)});\r\n"),
    },
    log: () => {},
  });
  const index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  const manifest = index.apiPlans[url];
  assert.ok(manifest);
  const sidecar = JSON.parse(
    await fs.readFile(path.join(root, manifest.path), "utf8"),
  );
  assert.equal(sidecar.sourceSha256, index.objects[index.latest[url]].sha256);
  assert.ok(
    sidecar.sourceSyntax.operations.some(
      (x: any) => x.api === "$response.statusCode",
    ),
  );
  assert.ok(
    sidecar.plans.response.surge.operations.some(
      (x: any) => x.rule === "response.status",
    ),
  );
  assert.equal(sidecar.plans.response.loon, undefined);
  assert.deepEqual(await validateSourceBackups(root), []);
  await fs.appendFile(path.join(root, manifest.path), " ");
  assert.ok(
    (await validateSourceBackups(root)).some(
      (x) => x.code === "api-plan-integrity",
    ),
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "Script semantic compiler passed: real Caixin/Spotify content, per-call spans and target fields, status/bytes/delete/HTTP/notification rules, executable layouts, omission decisions and hash-bound source sidecars",
);
