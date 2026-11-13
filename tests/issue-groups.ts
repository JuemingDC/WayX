// Modified: 2026-11-12 (chance). Exercise stable numbers across layout changes,
// category reuse/recovery and the five-issue cap with a stateful GitHub fixture.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { allocateAdblockNumbers, ensureAdblockNumbers, loadAdblockNumbers, adblockNumberForPath, applyAdblockNumber } from "../src/application/adblock-numbers.ts";
import { groupedIssuePlans } from "../src/domain/issue-groups.ts";
import { reconcileGroupedIssues } from "../src/application/grouped-issues.ts";
import { publishLayout, prepareWorkingLayout } from "../src/application/release-layout.ts";
import { buildReadmePlan } from "../src/publish/workflow.ts";
import { buildIssueGroupPlans } from "../src/application/propose-conversion-issues.ts";

const empty = { version: 1 as const, next: 1, items: {} };
const first = allocateAdblockNumbers(empty, [{ id: "B", paths: ["b.qx", "b.surge"] }, { id: "A", paths: ["a.qx"] }]);
const second = allocateAdblockNumbers(first, [{ id: "0-New", paths: ["new.qx"] }, { id: "B", paths: ["new-b.qx"] }]);
assert.equal(second.items.A.number, "AD0001");
assert.equal(second.items.B.number, "AD0002");
assert.equal(second.items["0-New"].number, "AD0003");
assert.equal(adblockNumberForPath(second, "b.surge"), "AD0002");
assert.equal(adblockNumberForPath(second, "new-b.qx"), "AD0002");
const reusedPath = allocateAdblockNumbers(second, [{ id: "Replacement", paths: ["a.qx"] }]);
assert.equal(reusedPath.items.A.number, "AD0001");
assert.equal(adblockNumberForPath(reusedPath, "a.qx"), "AD0004");
assert.equal(applyAdblockNumber(applyAdblockNumber("#!name=Demo\n", "AD0001"), "AD0001"), "#!name=Demo\n# WayX ID: AD0001\n");
assert.equal(applyAdblockNumber("#!name=Demo", "AD0001"), "#!name=Demo\n# WayX ID: AD0001\n");
assert.throws(() => allocateAdblockNumbers({ ...first, items: { ...first.items, C: { number: "AD0001", paths: [] } } }, []), /duplicate/);

function plans(fetch = ["AD0002", "AD0001", "AD0002"], other = true) {
  return groupedIssuePlans({
    fetch: { entries: fetch, complete: true },
    conversion: { entries: other ? ["转换原因与对应声明"] : [], complete: true },
    rules: { entries: other ? ["规则隔离原因"] : [], complete: true },
    monitor: { entries: other ? ["监控失败原因"] : [], complete: true },
    validation: { entries: other ? ["校验失败原因"] : [], complete: true },
  });
}
assert.equal(plans()[0].body, "AD0001\nAD0002");
assert.throws(() => plans(["HTTP 403"]), /numeric/);
const actualPlans = buildIssueGroupPlans({
  targetProblems: [], syncFailures: [{ plugin: { id: "B" }, stage: "script-api", reason: "HTTP 403 from original source https://example.test/script.js" }],
  monitorFailures: [], validationFailures: [], ruleProblems: [], syncReport: { publishable: true },
  monitorReport: { complete: true }, ruleReport: { complete: true }, validationReport: { stages: { verify: { complete: true } } },
}, first);
assert.equal(actualPlans[0].body, "AD0002");
assert.equal(actualPlans[1].body, "");
let sequence = 100;
const issues: any[] = Array.from({ length: 30 }, (_, i) => ({ number: i + 1, title: "[conversion-failure:1234567890abcdef] Item" + i + " fetch-upstream", body: "old failure", state: "open" }));
const calls: string[][] = [];
const call = (args: string[]) => {
  calls.push(args);
  if (args[0] === "api") return JSON.stringify(structuredClone(issues));
  const number = Number(args[2]);
  const issue = issues.find(value => value.number === number);
  const bodyFile = args.indexOf("--body-file");
  if (args[1] === "create") {
    const created = { number: sequence++, title: args[args.indexOf("--title") + 1], body: readFileSync(args[bodyFile + 1], "utf8"), state: "open" };
    issues.push(created);
    return "https://github.com/fixture/repo/issues/" + created.number;
  }
  assert.ok(issue);
  if (args[1] === "edit") issue.body = readFileSync(args[bodyFile + 1], "utf8");
  if (args[1] === "close") issue.state = "closed";
  if (args[1] === "reopen") issue.state = "open";
  return "";
};
let result = await reconcileGroupedIssues(plans(), "fixture/repo", call);
assert.equal(result.totalOpen, 5);
const canonical = issues.filter(value => value.state === "open").map(value => value.number);
assert.ok(issues.slice(0, 30).every(value => value.state === "closed"));
const creates = calls.filter(args => args[1] === "create").length;
await reconcileGroupedIssues(plans(), "fixture/repo", call);
assert.equal(calls.filter(args => args[1] === "create").length, creates);
assert.deepEqual(issues.filter(value => value.state === "open").map(value => value.number), canonical);
await reconcileGroupedIssues(plans([], false), "fixture/repo", call);
assert.equal(issues.filter(value => value.state === "open").length, 0);
await reconcileGroupedIssues(plans(), "fixture/repo", call);
assert.deepEqual(issues.filter(value => value.state === "open").map(value => value.number), canonical);
const incomplete = plans([], false); incomplete[0].complete = false;
await reconcileGroupedIssues(incomplete, "fixture/repo", call);
assert.equal(issues.find(value => value.title === incomplete[0].title).body.trim(), "AD0001\nAD0002");
issues.push({ number: sequence++, title: "User report", body: "keep", state: "open" });
result = await reconcileGroupedIssues(plans(), "fixture/repo", call);
assert.equal(result.totalOpen, 5);
assert.equal(issues.find(value => value.title === "User report").body, "keep");
assert.match(issues.find(value => value.title === "[WayX] 拉取失败").body, /^AD0001\nAD0002\n?$/);
const failureCalls: string[][] = [];
await assert.rejects(reconcileGroupedIssues(plans(), "fixture/repo", args => {
  failureCalls.push(args);
  if (args[0] === "api") return JSON.stringify([{ number: 1, title: "[conversion-failure:1234567890abcdef] B fetch-upstream", body: "legacy evidence", state: "open" }]);
  throw Error("simulated GitHub write failure");
}), /simulated/);
assert.ok(!failureCalls.some(args => args[1] === "close"));
// Modified: 2026-11-13 (chance). Historical issue bodies are not accumulated;
// every API call projects a single page before Node captures its stdout.
const pageCalls: string[][] = [];
await reconcileGroupedIssues(plans([], false), "fixture/repo", args => {
  pageCalls.push(args);
  assert.equal(args[0], "api");
  assert.ok(args.includes("--jq"));
  assert.match(args[args.indexOf("--jq") + 1], /if \.state == "open" then \.body else "" end/);
  return JSON.stringify(args[1].endsWith("page=1") ? Array.from({ length: 100 }, (_, i) => ({ number: i, title: "closed history", state: "closed", body: "" })) : []);
});
assert.equal(pageCalls.length, 2);

const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-adblock-ids-"));
try {
  await fs.mkdir(path.join(root, ".github/sources"), { recursive: true });
  await fs.writeFile(path.join(root, ".github/sources/loon.json"), JSON.stringify([{ id: "Kelee_Demo", file: "Demo.lpx", qx: "Demo.snippet", surge: "Demo.sgmodule", source: "https://kelee.one/Tool/Loon/Lpx/Demo.lpx", category: "去广告" }]));
  for (const [file, text] of [
    ["Adblock/Quantumult X/Demo.snippet", "# Name: Demo\n^https://ads\\.test/ url reject\n"],
    ["Adblock/Surge/Demo.sgmodule", "#!name=Demo\n[URL Rewrite]\n^https://ads\\.test/ - reject\n"],
  ]) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  }
  await publishLayout(root, { validateCode: false });
  const saved = await loadAdblockNumbers(root);
  assert.equal(Object.keys(saved.items).length, 1);
  assert.equal(saved.items.Kelee_Demo.paths.length, 4);
  const readme = await buildReadmePlan(root);
  assert.ok(readme.get("README.md").includes("AD0001"));
  assert.ok(readme.get("README.md").includes("编号"));
  await ensureAdblockNumbers(root);
  assert.deepEqual(await loadAdblockNumbers(root), saved);
  await prepareWorkingLayout(root);
  await publishLayout(root, { validateCode: false });
  assert.deepEqual(await loadAdblockNumbers(root), saved);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log("Grouped issues: stable Adblock IDs, shared client numbering, numeric-only fetch reports, migration/reuse/recovery and five-issue cap passed");
