// Modified: 2026-10-30 (chance). One TypeScript application owns checks, gates
// and publication; GitHub Actions only dispatches commands and stores artifacts.
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fetchOriginalBytes } from "../ingest/resources.ts";
import {
  listFiles,
  readJson,
  readOptional,
  commitFiles,
} from "../publish/transaction.ts";
import { setOutput } from "./monitor.ts";
const runtime = ".github/monitor/.runtime";
const managed = [
  ".github/sources/",
  "Resource/Loon",
  "Resource/Encrypted",
  "Adblock/Quantumult X",
  "Adblock/Surge",
  "Script",
  "Rule",
  "README.md",
];
export function run(command: string[], capture = false): string {
  const result = spawnSync(command[0], command.slice(1), {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      `Command failed (${result.status}): ${command.join(" ")}${capture ? "\n" + result.stderr : ""}`,
    );
  return capture ? result.stdout.trim() : "";
}
export async function readReport(name: string, fallback: any) {
  return readJson<any>(path.join(runtime, name), fallback);
}
async function writeReport(name: string, value: any) {
  await commitFiles(
    process.cwd(),
    new Map([[runtime + "/" + name, JSON.stringify(value, null, 2) + "\n"]]),
  );
}
export async function executeChecks(
  stage: string,
  checks: [string, string[]][],
): Promise<void> {
  await fs.mkdir(runtime, { recursive: true });
  const report = await readReport("validation-results.json", {
    version: 1,
    stages: {},
  });
  if (
    report.version !== 1 ||
    !report.stages ||
    typeof report.stages !== "object" ||
    Array.isArray(report.stages)
  )
    throw Error("Invalid validation-results.json");
  const results: any[] = [];
  report.stages[stage] = { complete: false, checks: results };
  await writeReport("validation-results.json", report);
  for (const [index, [id, command]] of checks.entries()) {
    const stem = `${stage}-${String(index).padStart(4, "0")}`,
      log = runtime + "/" + stem + ".log",
      evidence = runtime + "/" + stem + ".json";
    await fs.rm(evidence, { force: true });
    const env = { ...process.env };
    delete env.WAYX_CHECK_REPORT;
    if (stage === "verify") env.WAYX_CHECK_REPORT = path.resolve(evidence);
    const handle = await fs.open(log, "w");
    let result;
    try {
      result = spawnSync(command[0], command.slice(1), {
        stdio: ["ignore", handle.fd, handle.fd],
        env,
        encoding: "utf8",
      });
      if (result.error) await handle.write(String(result.error));
    } finally {
      await handle.close();
    }
    const item: any = {
      id,
      command,
      status: result.status === 0 && !result.error ? "passed" : "failed",
      exitCode: result.status ?? 127,
      log,
    };
    if (await readOptional(evidence))
      try {
        const e = await readJson<any>(evidence);
        if (e.version !== 1 || !Array.isArray(e.findings))
          throw Error("Invalid check evidence");
        item.findings = e.findings;
        item.checked = e.checked ?? 0;
        item.coverage = e.coverage ?? {};
        if (e.findings.length) item.status = "failed";
      } catch (error: any) {
        item.status = "failed";
        item.findings = [
          { code: "invalid-check-evidence", text: error.message },
        ];
      }
    if (item.status === "failed") {
      const text = await fs.readFile(log, "utf8");
      item.detail =
        text.length <= 4000
          ? text
          : text.slice(0, 2000) +
            "\n[full log in artifact]\n" +
            text.slice(-2000);
      console.error(
        `::error title=WayX validation::${stage}/${id}: see ${log}`,
      );
    }
    results.push(item);
    await writeReport("validation-results.json", report);
  }
  report.stages[stage].complete = true;
  await writeReport("validation-results.json", report);
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`${stage}: passed=${results.length - failed}, failed=${failed}`);
  if (failed) throw Error(`${stage}: ${failed} check(s) require review`);
}
export async function prepare() {
  await fs.mkdir(runtime, { recursive: true });
  await fs.rm(runtime + "/validation-results.json", { force: true });
  const branches = run(["git", "ls-remote", "--heads", "origin"], true)
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split(/\s+/)[1].replace("refs/heads/", ""));
  if (
    branches.length < 1 ||
    branches.length > 2 ||
    !branches.includes("main") ||
    branches.some((b) => !["main", "test"].includes(b))
  )
    throw Error("WayX requires main and at most one test branch");
}
export async function setupJq() {
  const version = "1.8.2",
    expected =
      "b1c22172dd303f3be49e935aa56aa48a8b7a46e0bc838b4997d3bb451495870f",
    bytes = await fetchOriginalBytes(
      `https://github.com/jqlang/jq/releases/download/jq-${version}/jq-linux-amd64`,
      { timeoutMs: 60000, maxBytes: 16 * 1024 * 1024 },
    );
  if (crypto.createHash("sha256").update(bytes).digest("hex") !== expected)
    throw Error("Official jq binary SHA-256 mismatch");
  if (!process.env.RUNNER_TEMP) throw Error("RUNNER_TEMP is required");
  const directory = path.join(process.env.RUNNER_TEMP, "wayx-jq-" + version),
    binary = path.join(directory, "jq");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(binary, bytes);
  await fs.chmod(binary, 0o755);
  if (run([binary, "--version"], true) !== "jq-" + version)
    throw Error("Unexpected jq compiler version");
  if (process.env.GITHUB_PATH)
    await fs.appendFile(process.env.GITHUB_PATH, directory + "\n");
}
export async function syntaxChecks(
  changedScripts = false,
): Promise<[string, string[]][]> {
  const checks: [string, string[]][] = [
    ["typescript", ["node", "node_modules/typescript/bin/tsc", "--noEmit"]],
  ];
  let changed = new Set<string>();
  if (changedScripts) {
    for (const command of [
      [
        "git",
        "diff",
        "--name-only",
        "-z",
        "--diff-filter=ACMR",
        "HEAD",
        "--",
        "Script",
      ],
      [
        "git",
        "ls-files",
        "--others",
        "--exclude-standard",
        "-z",
        "--",
        "Script",
      ],
    ]) {
      const result = execFileSync(command[0], command.slice(1), {
        encoding: "utf8",
      });
      for (const f of result.split("\0")) changed.add(f);
    }
  }
  for (const file of await listFiles("Script")) {
    const relative = "Script/" + file;
    if (file.endsWith(".js") && (!changedScripts || changed.has(relative)))
      checks.push(["syntax:" + relative, ["node", "--check", relative]]);
  }
  return checks;
}
export async function publicationGate(env: NodeJS.ProcessEnv = process.env) {
  const stages = JSON.parse(env.STAGES ?? "{}"),
    required = ["catalog", "rules", "loon_sync", "verify", "reports", "issues"];
  if (env.MONITOR_ENABLED === "true") required.push("monitor");
  const failed = required.filter((s) => stages[s]?.outcome !== "success"),
    validation = await readReport("validation-results.json", {
      version: 1,
      stages: {},
    });
  if (
    validation.version !== 1 ||
    required
      .filter((s) => s !== "issues")
      .some(
        (s) =>
          validation.stages?.[s]?.complete !== true ||
          !validation.stages[s].checks?.length ||
          validation.stages[s].checks.some((c: any) => c.status !== "passed"),
      )
  )
    failed.push("validation integrity");
  if (env.SYNC_PUBLISHABLE !== "true") failed.push("sync integrity");
  if (env.MONITOR_ENABLED === "true" && env.MONITOR_COMPLETE !== "true")
    failed.push("monitor integrity");
  const result = {
    publishable: !failed.length,
    failedGates: failed,
    stages: Object.fromEntries(
      Object.entries(stages).map(([s, v]: any) => [s, v.outcome]),
    ),
  };
  await writeReport("pipeline-result.json", result);
  await setOutput("publishable", String(result.publishable));
  for (const s of failed) console.error("::error::Publication blocked: " + s);
  return result;
}
export async function publish() {
  await setOutput("publication", "blocked");
  if (process.env.PUBLISHABLE !== "true")
    throw Error("Publication gates did not pass");
  const branch = process.env.PUBLISH_BRANCH ?? "";
  if (!branch) {
    await setOutput("publication", "read-only");
    return;
  }
  if (!["main", "test"].includes(branch))
    throw Error("Unexpected publication branch: " + branch);
  const expected = process.env.EXPECTED_HEAD;
  if (!expected || run(["git", "rev-parse", "HEAD"], true) !== expected)
    throw Error("Checked-out HEAD differs from requested baseline");
  const existing: string[] = [];
  for (const item of managed)
    if (
      (await readOptionalDirectory(item)) ||
      run(["git", "ls-files", "--", item], true)
    )
      existing.push(item);
  run(["git", "add", "-A", "--", ...existing]);
  if (process.env.MONITOR_ENABLED === "true")
    run([
      "git",
      "add",
      "-A",
      "--",
      ".github/monitor/state.json",
      ".github/monitor/upstream",
    ]);
  const remote = run(
    ["git", "ls-remote", "origin", "refs/heads/" + branch],
    true,
  ).split(/\s+/)[0];
  if (remote !== expected)
    throw Error("Destination advanced; rerun from its new baseline");
  const diff = spawnSync("git", ["diff", "--cached", "--quiet"]);
  if (diff.status === 0) await setOutput("publication", "unchanged");
  else if (diff.status === 1) {
    run(["git", "config", "user.name", "chance-upstream-bot"]);
    run([
      "git",
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    ]);
    run(["git", "commit", "-m", "chore: sync upstream and regenerate targets"]);
    run(["git", "push", "origin", "HEAD:" + branch]);
    await setOutput("publication", "pushed");
  } else throw Error("Cannot inspect staged Git diff");
  if (
    run(
      [
        "git",
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        ...managed,
      ],
      true,
    )
  )
    throw Error("Managed working tree is not clean after publication");
}
export async function summary() {
  const result = await readReport("pipeline-result.json", {
    publishable: false,
  });
  result.publication = process.env.PUBLICATION || "blocked";
  await writeReport("pipeline-result.json", result);
  const sync = await readReport("sync-failures.json", {}),
    monitor = await readReport("monitor-result.json", {}),
    discovery = await readReport("catalog-discovery.json", {}),
    rules = await readReport("rules-result.json", {}),
    validation = await readReport("validation-results.json", { stages: {} });
  const lines = [
    "# WayX Actions result",
    "",
    `Publication: ${result.publication}`,
    "",
  ];
  for (const key of [
    "validatedPlugins",
    "convertedPlugins",
    "updatedPlugins",
    "unchangedPlugins",
    "retainedPlugins",
    "deferredPlugins",
    "opaquePlugins",
  ])
    lines.push(`- ${key}: ${sync[key]?.length ?? 0}`);
  lines.push(
    `- Aggregated rule sets: ${Object.keys(rules.counts ?? {}).length}`,
    `- Intentionally ignored rules: ${rules.filtered?.length ?? 0}`,
    `- Quarantined source rules: ${rules.quarantined?.length ?? 0}`,
    `- Monitor failures: ${monitor.failures?.length ?? 0}`,
  );
  for (const key of ["added", "updated", "removed"])
    lines.push(`- Discovery ${key}: ${discovery[key]?.length ?? 0}`);
  let passed = 0;
  const failed: string[] = [];
  for (const [name, stage] of Object.entries(validation.stages) as [
    string,
    any,
  ][])
    for (const check of stage.checks ?? [])
      if (check.status === "passed") passed++;
      else failed.push(`${name}/${check.id}: ${check.log}`);
  lines.push(
    "",
    `- Automated checks passed: ${passed}`,
    `- Checks requiring review: ${failed.length}`,
    ...failed,
    "",
    "Failed gates: " + (result.failedGates ?? []).join(", "),
  );
  if (process.env.GITHUB_STEP_SUMMARY)
    await fs.appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      lines.join("\n") + "\n",
    );
  else console.log(lines.join("\n"));
}
export async function final() {
  if (
    process.env.PUBLISHABLE !== "true" ||
    process.env.PUBLICATION_OUTCOME !== "success"
  )
    throw Error("Publication blocked or failed");
}

async function readOptionalDirectory(file: string) {
  try {
    await fs.stat(file);
    return true;
  } catch (e: any) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
