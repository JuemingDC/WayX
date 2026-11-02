// Modified: 2026-11-02 (chance). Native-QX declaration provenance controls
// string completion and Promise adapters in the real backup/publish transaction.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-qx-flow-"));
try {
  const url = "https://author.test/source.js";
  for (const p of ["Adblock/Quantumult X", "Adblock/Surge"])
    await fs.mkdir(path.join(root, p), { recursive: true });
  const qxFile = "Adblock/Quantumult X/test.snippet",
    surgeFile = "Adblock/Surge/test.sgmodule";
  await fs.writeFile(
    path.join(root, qxFile),
    "# Managed by: WayX Native QX\n^https://example\\.test/ url script-response-body " +
      url +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surgeFile),
    "# Managed by: WayX Native QX\n[Script]\nTest = type=http-response,pattern=^https://example\\.test/,script-path=" +
      url +
      ",requires-body=true\n",
  );
  let bytes = Buffer.from(
    'let body=$response.body;body=body.replace("a","b");$done(body);\r\n',
  );
  const resources = {
    cachedBytes: async () => null,
    fetchBytes: async (u: string) => {
      assert.equal(u, url);
      return bytes;
    },
  };
  await refreshSourceBackups(root, { catalog: [], resources, log: () => {} });
  let report = JSON.parse(
    await fs.readFile(
      path.join(root, "Resource/Backup/script-api-status.json"),
      "utf8",
    ),
  );
  // Modified: 2026-11-02 (chance). QX-source publication has exactly one
  // converted destination and never claims a Loon target in its stored contexts.
  assert.deepEqual(report.targets, ["qx", "surge"]);
  assert.deepEqual(report.conversionDirections, [
    { from: "loon", to: "qx" },
    { from: "loon", to: "surge" },
    { from: "qx", to: "surge" },
  ]);
  assert.equal(report.universal, 1);
  assert.equal(report.adapted, 2);
  let index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  const adapter = Object.values<any>(index.adapters)[0];
  assert.deepEqual(adapter.targets, ["qx", "surge"]);
  assert.deepEqual(adapter.conversionTargets, ["surge"]);
  assert.equal(adapter.contexts.response.loon, undefined);
  assert.equal(adapter.contexts.response.surge.responseBody, true);
  assert.deepEqual(
    await fs.readFile(path.join(root, index.objects[index.latest[url]].path)),
    bytes,
  );
  const previous = await fs.readFile(path.join(root, adapter.path));
  bytes = Buffer.from(
    '$task.fetch({url:"http://fixture.test/",headers:{"User-Agent":"x","Accept":"application/json","Accept-Encoding":"identity"},opts:{redirection:false,"auto-cookie":false,"skip-cert-verify":false,timeout:1},timeout:1}).then(r=>$done({body:r.body}),()=>{$done({});});',
  );
  await refreshSourceBackups(root, { catalog: [], resources, log: () => {} });
  report = JSON.parse(
    await fs.readFile(
      path.join(root, "Resource/Backup/script-api-status.json"),
      "utf8",
    ),
  );
  assert.equal(report.universal, 1);
  assert.equal(report.adapted, 2);
  assert.ok(
    report.diagnostics.every(
      (d: any) =>
        d.omittedParameters.includes("timeout") &&
        d.omittedParameters.includes("opts.timeout"),
    ),
  );
  index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  const next = Object.values<any>(index.adapters)[0];
  assert.equal(next.path, adapter.path);
  assert.equal(next.contexts.response.qx.httpTask, true);
  assert.notDeepEqual(await fs.readFile(path.join(root, next.path)), previous);
  assert.equal((await validateSourceBackups(root)).length, 0);
  assert.ok(
    (await fs.readFile(path.join(root, qxFile), "utf8")).includes(
      "/" + next.path,
    ),
  );
  assert.ok(
    (await fs.readFile(path.join(root, surgeFile), "utf8")).includes(
      "/" + next.path,
    ),
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "QX flow production integration passed: original body-mode provenance, exact raw bytes, one shared stable URL, Promise regeneration and non-error omission metadata",
);
