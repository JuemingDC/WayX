// Modified: 2026-11-14 (chance). A mid-log error must survive both report
// compaction and Issue rendering while successful checks remain successful.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { checkFailureExcerpt } from "../src/domain/check-failure.ts";
import { executeChecks } from "../src/application/automation.ts";
import { validationFailureIssueBody } from "../src/application/propose-conversion-issues.ts";
const reason = "Native QX acquisition failed: Error: unsupported request-header url";
const noise = "synced -> example.snippet\n".repeat(500);
const log = noise + reason + "\n    at validateQX (output.ts:581)\n" + noise;
for (const limit of [1400, 4000]) {
  const excerpt = checkFailureExcerpt(log, limit);
  assert.ok(excerpt.startsWith(reason));
  assert.ok(excerpt.length <= limit);
  assert.match(excerpt, /full log in artifact/);
}
assert.equal(checkFailureExcerpt("short failure"), "short failure");
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-error-excerpt-"));
const cwd = process.cwd(), error = console.error;
try {
  process.chdir(root);
  console.error = () => {};
  await assert.rejects(executeChecks("loon_sync", [
    ["full-catalog", [process.execPath, "-e", `console.log(${JSON.stringify(log)});process.exit(1)`]],
    ["ok", [process.execPath, "-e", "process.exit(0)"]],
  ]), /1 check/);
  const report = JSON.parse(await fs.readFile(".github/monitor/.runtime/validation-results.json", "utf8"));
  const checks = report.stages.loon_sync.checks;
  assert.deepEqual(checks.map((c: any) => c.status), ["failed", "passed"]);
  assert.ok(checks[0].detail.startsWith(reason));
  assert.ok((await fs.readFile(checks[0].log, "utf8")).includes(noise + reason));
  const body = validationFailureIssueBody({stage: "loon_sync", checks: [checks[0]]});
  assert.match(body, /~~~text\nNative QX acquisition failed/);
  assert.match(body, /unsupported request-header url/);
} finally {
  console.error = error;
  process.chdir(cwd);
  await fs.rm(root, {recursive: true, force: true});
}
console.log("check-failure fixtures passed");
