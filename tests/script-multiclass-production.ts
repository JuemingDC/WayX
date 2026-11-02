// Modified: 2026-11-02 (chance). The HTTP and completion classes must compose
// in the real backup transaction, with one unchanged raw source and shared URL.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
import { scriptReferences } from "../src/parser/backup-references.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-multiclass-"));
try {
  const url = "https://author.test/combined.js";
  const source =
    '$task.fetch({url:"http://fixture.test/",headers:{"User-Agent":"fixture","Accept":"*/*","Accept-Encoding":"identity"},opts:{"auto-cookie":false,redirection:false}}).then(response=>{const alias=response;const {body}=alias;const result=Object.assign({}, {body});$done(result);});\r\n';
  const raw = Buffer.from(source);
  const qx = "Adblock/Quantumult X/test.snippet",
    surge = "Adblock/Surge/test.sgmodule";
  for (const file of [qx, surge])
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(
    path.join(root, qx),
    "# Managed by: WayX Native QX\n^https://example.test/ url script-response-body " +
      url +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "# Managed by: WayX Native QX\n[Script]\nTest = type=http-response,pattern=^https://example.test/,script-path=" +
      url +
      ",requires-body=true\n",
  );
  await refreshSourceBackups(root, {
    catalog: [],
    resources: {
      cachedBytes: async () => null,
      fetchBytes: async (u: string) => {
        assert.equal(u, url);
        return raw;
      },
    },
    log: () => {},
  });
  const report = JSON.parse(
    await fs.readFile(
      path.join(root, "Resource/Backup/script-api-status.json"),
      "utf8",
    ),
  );
  assert.equal(report.universal, 1);
  assert.equal(report.adapted, 2);
  assert.equal(report.blocked, 0);
  const index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  const adapter = Object.values<any>(index.adapters)[0];
  assert.deepEqual(adapter.targets, ["qx", "surge"]);
  assert.equal(adapter.contexts.response.surge.httpTask, true);
  assert.deepEqual(await fs.readFile(path.join(root, index.latest[url])), raw);
  const a = scriptReferences(await fs.readFile(path.join(root, qx), "utf8"))[0]
    .value;
  const b = scriptReferences(
    await fs.readFile(path.join(root, surge), "utf8"),
  )[0].value;
  assert.equal(a, b);
  assert.ok(a.endsWith("/combined.js"));
  assert.deepEqual(await validateSourceBackups(root), []);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "Multiple-class production transaction passed: HTTP alias + completion assign, exact raw bytes, one QX/Surge URL, persisted contracts and validated index",
);
