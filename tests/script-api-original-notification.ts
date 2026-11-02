// Modified: 2026-11-02 (chance). Resolve two real script classes through
// semantic rules, preserving option effects and proving original-context identity.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
import os from "node:os";
import path from "node:path";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import { planUniversalAdblockScript as universal } from "../src/parser/universal-script.ts";
import { refreshSourceBackups } from "../src/application/backups.ts";
const profile = {
  phase: "response" as const,
  responseBody: true,
  binary: false,
  binaryKnown: true,
};
const options = { from: "qx" as const, to: "surge" as const, ...profile };
const untouched =
  'if($request.url.includes("edit")) $done({body:$response.body.replace("ad","ok")}); else $done(($response));';
const plan = pair(untouched, options);
assert.equal(plan.status, "adapted", JSON.stringify(plan.problems));
const operation = plan.operationIR.operations.find(
  (x) => x.rule === "complete.original-context",
)!;
assert.equal(operation.canonical, "complete.pass-original");
assert.equal(operation.fields![0].target, "{}");
assert.equal(plan.contract!.contextPassThrough, true);
let out: any;
const response = {
  body: "ad",
  status: 201,
  headers: { "Content-Type": "text/plain", "Content-Length": "2" },
};
for (const edit of [true, false]) {
  vm.runInNewContext(plan.code!, {
    setTimeout,
    $request: { url: edit ? "https://test/edit" : "https://test/pass" },
    $response: response,
    $done: (v: any) => (out = v),
  });
  assert.deepEqual(JSON.parse(JSON.stringify(out)), edit ? { body: "ok" } : {});
  assert.deepEqual(response.headers, {
    "Content-Type": "text/plain",
    "Content-Length": "2",
  });
}
// Every mutation/escape invalidates the whole original-context proof.
for (const prefix of [
  '$response.body="mutated";',
  '($response.body)="mutated";',
  '({x:$response.body}={x:"mutated"});',
  '[$response.body]=["mutated"];',
  'for($response.body of ["mutated"]){}',
  "delete $response.body;",
  "$response.body++;",
  'const alias=$response;alias.body="mutated";',
  "leak($response);",
  "const h=$response.headers;delete h.x;",
  "$done=other;",
]) {
  const invalid = pair(prefix + "$done($response);", options);
  assert.equal(invalid.status, "blocked", prefix);
  assert.ok(!invalid.contract?.contextPassThrough, prefix);
  assert.ok(
    !invalid.operationIR.operations.some(
      (x) => x.rule === "complete.original-context",
    ),
    prefix,
  );
}
for (const altered of [
  { ...options, phase: "request" as const },
  { ...options, phase: "echo" as const },
  { ...options, binary: true },
  { ...options, responseBody: false },
])
  assert.equal(pair("$done($response);", altered).status, "blocked");
// QX author documents three fields. Every optional expression is evaluated once,
// omitted on native QX and Surge, and reported outside the generated body.
const notify =
  'let count=0;$notify("t","s","b",{get unknown(){throw Error("must not read")},effect:++count},++count);$done({body:String(count)});';
const shared = universal(notify, "qx", [profile]);
assert.equal(shared.status, "universal", JSON.stringify(shared.problems));
for (const host of ["qx", "surge"]) {
  let args: any;
  vm.runInNewContext(shared.code!, {
    setTimeout,
    $response: { body: "" },
    $done: (v: any) => (out = v),
    ...(host === "qx"
      ? { $task: { fetch() {} }, $notify: (...a: any[]) => (args = a) }
      : {
          $environment: { "surge-version": "real" },
          $notification: { post: (...a: any[]) => (args = a) },
        }),
  });
  assert.equal(out.body, "2");
  assert.deepEqual(Array.from(args), ["t", "s", "b"]);
  assert.deepEqual(shared.contexts.response[host].omittedParameters, [
    "notification.argument4",
    "notification.argument5",
  ]);
  const field = shared.operationPlans.response[host].operations
    .find((x) => x.rule === "notify")!
    .fields!.find((x) => x.source === "argument3")!;
  assert.equal(field.action, "omit");
}
let reached = false;
const throws = pair(
  '$notify("t","s","b",(()=>{throw Error("construct");})());$done({});',
  options,
);
assert.equal(throws.status, "adapted");
assert.throws(
  () =>
    vm.runInNewContext(throws.code!, {
      setTimeout,
      $response: {},
      $notification: {
        post() {
          reached = true;
        },
      },
      $done() {},
    }),
  /construct/,
);
assert.equal(reached, false);
assert.equal(
  pair('$notification.post("t","s","b",{mystery:1});$done({});', {
    ...options,
    from: "loon",
  }).status,
  "blocked",
);
const index = JSON.parse(
  await fs.readFile("Resource/Backup/index.json", "utf8"),
);
const originals = [
  "https://kelee.one/Resource/JavaScript/WexinMiniPrograms/xiaotucc/xiaotucc.js",
  "https://raw.githubusercontent.com/fmz200/wool_scripts/main/Scripts/xiaotucc.js",
  "https://github.com/ishowshu/qx/raw/refs/heads/main/script/soul_qx.js",
];
const raw = new Map<string, Buffer>();
for (const url of originals) {
  const bytes = await fs.readFile(index.latest[url]);
  raw.set(url, bytes);
  const from = url.startsWith("https://kelee.one/") ? "loon" : "qx";
  const real = universal(bytes.toString(), from, [profile]);
  assert.equal(real.status, "universal", url + JSON.stringify(real.problems));
  for (const host of from === "loon"
    ? ["loon", "qx", "surge"]
    : ["qx", "surge"]) {
    let notes: any[] = [];
    const input =
      host === "qx"
        ? {
            body: '{"data":{"url":"https://image.test/p.jpg","p3":"ad"}}',
            statusCode: 200,
            headers: {},
          }
        : {
            body: '{"data":{"url":"https://image.test/p.jpg","p3":"ad"}}',
            status: 200,
            headers: {},
          };
    vm.runInNewContext(real.code!, {
      setTimeout,
      console: { log() {} },
      $request: {
        url: url.includes("soul_qx")
          ? "https://app.test/snapchat/url"
          : "https://app.test/pass",
      },
      $response: input,
      $done: (v: any) => (out = v),
      ...(host === "qx"
        ? { $task: { fetch() {} }, $notify: (...a: any[]) => notes.push(a) }
        : {
            ...(host === "loon"
              ? { $loon: "real" }
              : { $environment: { "surge-version": "real" } }),
            $notification: { post: (...a: any[]) => notes.push(a) },
          }),
    });
    if (url.includes("soul_qx")) {
      assert.equal(notes.length, 1);
      assert.equal(notes[0].length, 3);
    } else
      assert.deepEqual(
        JSON.parse(JSON.stringify(out)),
        host === from ? input : {},
      );
  }
}
// Isolated production transaction: same stable URL, exact raw bytes, sidecar
// rules and omission metadata; no production files are generated locally.
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-original-notify-"));
try {
  const qx = "Adblock/Quantumult X/test.snippet",
    surge = "Adblock/Surge/test.sgmodule";
  for (const file of [qx, surge])
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(
    path.join(root, qx),
    "# Managed by: WayX Native QX\n" +
      originals
        .slice(1)
        .map(
          (u, n) =>
            `^https://fixture${n}\\.test/ url script-response-body ${u}`,
        )
        .join("\n") +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "#!name=Test\n# Managed by: WayX Native QX to Surge\n[Script]\n" +
      originals
        .slice(1)
        .map(
          (u, n) =>
            `s${n} = type=http-response,pattern=^https://fixture${n}\\.test/,requires-body=true,script-path=${u}`,
        )
        .join("\n") +
      "\n",
  );
  const entry = {
    id: "loon-original",
    file: "original.lpx",
    source: "https://author.test/original.lpx",
    qx: "loon.snippet",
    surge: "loon.sgmodule",
  };
  const plugin = Buffer.from(
    '[Script]\nresponse if ${url} ~= /fixture/ then script("' +
      originals[0] +
      '") with requires_body=true\n',
  );
  await fs.mkdir(path.join(root, "Resource/Loon"), { recursive: true });
  await fs.writeFile(path.join(root, "Resource/Loon", entry.file), plugin);
  await fs.writeFile(
    path.join(root, "Adblock/Quantumult X", entry.qx),
    "^https://loon\\.test/ url script-response-body " + originals[0] + "\n",
  );
  await fs.writeFile(
    path.join(root, "Adblock/Surge", entry.surge),
    "L=type=http-response,pattern=^https://loon\\.test/,requires-body=true,script-path=" +
      originals[0] +
      "\n",
  );
  const report = await refreshSourceBackups(root, {
    catalog: [entry],
    resources: {
      cachedBytes: async (url: string) =>
        url === entry.source ? plugin : null,
      fetchBytes: async (url: string) => raw.get(url)!,
    },
    log: () => {},
  });
  assert.equal(report.scriptApi.universal, 3, JSON.stringify(report.scriptApi));
  assert.equal(report.scriptApi.blocked, 0);
  const saved = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  const generated = Object.values(saved.adapters) as any[];
  assert.equal(generated.length, 3);
  for (const [url, bytes] of raw) {
    assert.deepEqual(
      await fs.readFile(path.join(root, saved.latest[url])),
      bytes,
    );
    const adapter = generated.find((a) => a.sourceUrl === url)!;
    for (const file of url === originals[0]
      ? ["Adblock/Quantumult X/" + entry.qx, "Adblock/Surge/" + entry.surge]
      : [qx, surge])
      assert.ok(
        (await fs.readFile(path.join(root, file), "utf8")).includes(
          adapter.path,
        ),
      );
  }
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "Original-context/notification classes passed: real Xiaotucc/Soul programs, pass-through identity, mutation/escape negatives, source-QX omission effects on both hosts and atomic backup integration",
);
