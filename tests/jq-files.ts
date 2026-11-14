// Modified: 2026-11-14 (chance). Full jq programs remain native, repository-linked
// resources; official file compilation and transactional rollback protect publication.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { standardJqPrograms } from "../src/parser/rewrite.ts";
import { materializeConversionRunContext, convertPluginWithContext } from "../src/emit/conversion.ts";
import { commitManagedConversion, readManagedTargetState } from "../src/publish/workflow.ts";
import { planJqFileChanges } from "../src/publish/jq-files.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-jq-files-"));
const entry = {id: "JqFiles", source: "https://author.test/plugins/main.lpx", file: "main.lpx", qx: "main.snippet", surge: "main.sgmodule", category: "去广告"};
const line = 'response if ${url} ~= /^https:\\/\\/api\\.example\\.com/ then response.json.jq_file("filters/remove-ads.jq")';
const source = '#!name=JQ Files\n[Rewrite]\n' + line + '\n';
const program = '# Standard jq program\ndef total: reduce .[] as $n (0; . + $n);\ndel(.ads) | .sum = (.values | total) | .note = "#keep"';
try {
  const ctx = await materializeConversionRunContext(entry, source, {root, fetchText: async (url: string) => {
    assert.equal(url, "https://author.test/plugins/filters/remove-ads.jq"); return program;
  }});
  const out = convertPluginWithContext(entry, source, ctx, {stamp: "2026-11-14", rawBase: "https://raw.githubusercontent.com/JuemingDC/WayX/main"});
  const name = "plugins-filters-remove-ads.jq";
  const relative = "Resource/JQ/JqFiles/" + name;
  assert.equal(out.generatedJqFiles.size, 1);
  for (const target of ["qx", "surge"]) {
    assert.ok(out[target].includes("# JQ File: https://raw.githubusercontent.com/JuemingDC/WayX/main/" + relative));
    assert.doesNotMatch(out[target], /REVIEW REQUIRED|ISSUE REQUIRED|OMITTED|jq_file\(/);
    assert.match(out[target], /reduce/);
  }
  assert.match(out.qx, /jsonjq-response-body/);
  assert.match(out.surge, /http-response-jq/);
  assert.equal(out.generatedScripts.size, 0);
  let state = await readManagedTargetState(root, entry);
  await commitManagedConversion(root, entry, state, out);
  const jqPath = path.join(root, relative);
  const saved = await fs.readFile(jqPath, "utf8");
  assert.equal(saved, out.generatedJqFiles.get(name));
  assert.equal(saved, program + "\n");
  assert.doesNotMatch(saved, /jq_file|response if|request if/);
  const run = spawnSync("jq", ["-f", jqPath], {input: '{"ads":true,"values":[2,3]}', encoding: "utf8"});
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), {values: [2,3], sum: 5, note: "#keep"});
  assert.equal((await planJqFileChanges(root, entry.id, out.generatedJqFiles)).size, 0);
  state = await readManagedTargetState(root, entry);
  await assert.rejects(commitManagedConversion(root, entry, state, {...out, generatedJqFiles: new Map([[name, "response.json.jq_file(\"x\")\n"]])}), /Official jq file validation failed/);
  assert.equal(await fs.readFile(jqPath, "utf8"), saved);
  assert.equal(await fs.readFile(state.qxPath, "utf8"), state.qx);
  await assert.rejects(commitManagedConversion(root, entry, state, {...out, generatedJqFiles: new Map([["new.jq", ".\n"]])}, {writeTargets: async () => {throw Error("fixture write failure");}}), /fixture write failure/);
  assert.equal(await fs.readFile(jqPath, "utf8"), saved);
  await assert.rejects(fs.stat(path.join(root, "Resource/JQ/JqFiles/new.jq")), /ENOENT/);
  await commitManagedConversion(root, entry, state, {...out, generatedJqFiles: new Map()});
  await assert.rejects(fs.stat(jqPath), /ENOENT/);
  assert.throws(() => standardJqPrograms(new Map([["a", {byAction: {0: {sourceFile: "https://a.test/shared.jq", content: ".a"}, 1: {sourceFile: "https://b.test/shared.jq", content: ".b"}}}]])), /Conflicting/);
} finally {
  await fs.rm(root, {recursive: true, force: true});
}
console.log("standard jq resources, native full-language output and rollback passed");
