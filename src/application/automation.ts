import { checkFailureExcerpt } from "../domain/check-failure.ts";
// Modified: 2026-10-30 (chance). One TypeScript application owns checks, gates
// and publication; GitHub Actions only dispatches commands and stores artifacts.
import fs from "node:fs/promises";
import { prepareWorkingLayout } from "./release-layout.ts";
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
  // Modified: 2026-11-05 (chance). Publish migrated manual-resource references with their target files.
  ".github/manual-assets.json",
  "Resource/Loon",
  // Modified: 2026-11-14 (chance). Stage deletions of retired generated jq copies.
  "Resource/JQ",
  "Resource/Encrypted",
  // Modified: 2026-11-01 (chance). Publish exact upstream archives and their source-to-backup index with generated targets.
  "Resource/Backup",
  "Adblock/Quantumult X",
  "Adblock/Surge",
  // Modified: 2026-11-03 (chance). One Module root covers native and client-specific outputs.
  "Module",
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
interface ValidationCheck {
  id: string;
  status: "passed" | "failed";
  command?: string[];
  exitCode?: number;
  log?: string;
  detail?: string;
  checked?: number;
  findings?: unknown[];
  coverage?: Record<string, unknown>;
}
interface ValidationStage {
  complete: boolean;
  checks: ValidationCheck[];
}
interface ValidationReport {
  version: 1;
  stages: Record<string, ValidationStage>;
}
interface PipelineResult {
  publishable: boolean;
  failedGates?: string[];
  stages?: Record<string, string>;
  publication?: string;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export async function readValidationReport(root = process.cwd()): Promise<ValidationReport> {
  const value = await readJson<unknown>(path.join(root, runtime, "validation-results.json"), {
    version: 1,
    stages: {},
  });
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.stages))
    throw Error("Invalid validation-results.json");
  for (const [stage, result] of Object.entries(value.stages)) {
    if (!isRecord(result) || typeof result.complete !== "boolean" || !Array.isArray(result.checks) ||
        result.checks.some(check => !isRecord(check) || typeof check.id !== "string" || !check.id ||
          (check.status !== "passed" && check.status !== "failed") ||
          (check.findings !== undefined && !Array.isArray(check.findings)) ||
          (check.coverage !== undefined && !isRecord(check.coverage)) ||
          (check.status === "passed" &&
            ((Array.isArray(check.findings) && check.findings.length > 0) ||
             (check.exitCode !== undefined && check.exitCode !== 0)))))
      throw Error("Invalid validation-results.json stage: " + stage);
    const ids = result.checks.map(check => check.id);
    if (new Set(ids).size !== ids.length)
      throw Error("Duplicate validation check: " + stage);
  }
  return value as unknown as ValidationReport;
}
export function validAuditEvidence(check: ValidationCheck | undefined): check is ValidationCheck & {
  checked: number;
  findings: unknown[];
  coverage: { plugins: string[]; artifacts: Record<string, string>; regexPatterns: number };
} {
  if (!check) return false;
  const coverage = check.coverage;
  return Number.isSafeInteger(check.checked) && check.checked! > 0 &&
    Array.isArray(check.findings) && check.findings.length === 0 &&
    !!coverage && Array.isArray(coverage.plugins) &&
    coverage.plugins.every(id => typeof id === "string") &&
    isRecord(coverage.artifacts) && Object.keys(coverage.artifacts).length > 0 &&
    Object.values(coverage.artifacts).every(hash => typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)) &&
    Number.isSafeInteger(coverage.regexPatterns) && Number(coverage.regexPatterns) >= 0;
}
export async function readReport<T>(name: string, fallback: T): Promise<T> {
  return readJson<T>(path.join(runtime, name), fallback);
}
async function writeReport(name: string, value: unknown) {
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
  const report = await readValidationReport();
  const results: ValidationCheck[] = [];
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
    const item: ValidationCheck = {
      id,
      command,
      status: result.status === 0 && !result.error ? "passed" : "failed",
      exitCode: result.status ?? 127,
      log,
    };
    const evidenceBytes = await readOptional(evidence);
    try {
      if (evidenceBytes) {
        const value: unknown = JSON.parse(evidenceBytes.toString("utf8"));
        if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.findings))
          throw Error("Invalid check evidence");
        item.findings = value.findings;
        if (typeof value.checked === "number") item.checked = value.checked;
        if (isRecord(value.coverage)) item.coverage = value.coverage;
        if (item.findings.length) item.status = "failed";
      }
      if (stage === "verify" && id === "repository-audit" && item.status === "passed" &&
          !validAuditEvidence(item))
        throw Error("Missing or incomplete repository audit evidence");
    } catch (error) {
      item.status = "failed";
      item.findings = [{ code: "invalid-check-evidence", text: error.message }];
      await fs.appendFile(log, "\n" + error.message + "\n");
    }
    if (item.status === "failed") {
      const text = await fs.readFile(log, "utf8");
      // Modified: 2026-11-14 (chance). Surface mid-log failures before progress.
      item.detail = checkFailureExcerpt(text);
      console.error(
        `::error title=WayX validation::${stage}/${id}: see ${log}`,
      );
    }
    // Modified: 2026-11-14 (chance). Actions and Issues share the error-first excerpt.
    if (item.status === "failed")
      console.error(item.detail);
    results.push(item);
    await writeReport("validation-results.json", report);
  }
  report.stages[stage].complete = true;
  await writeReport("validation-results.json", report);
  const failed = results.filter((r) => r.status === "failed").length;
  console.log(`${stage}: passed=${results.length - failed}, failed=${failed}`);
  if (failed) throw Error(`${stage}: ${failed} check(s) require review`);
}
// Modified: 2026-11-17 (chance). Early diagnostics setup must not restore
// working paths before regression tests inspect the published resource layout.
export async function prepare({ logsOnly = false }: { logsOnly?: boolean } = {}) {
  await fs.mkdir(runtime, { recursive: true });
  // Previous run evidence is never valid for a fresh run, including early failures.
  for (const file of ["validation-results.json", "pipeline-result.json"])
    await fs.rm(path.join(runtime, file), { force: true });
  if (logsOnly) return;
  // Modified: 2026-11-05 (chance). Restore converter working paths before acquisition; only the final client layout is published.
  await prepareWorkingLayout(process.cwd());
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
  const changed = new Set<string>();
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
  // Modified: 2026-11-25 (chance). Preserve full target coverage and batch files
  // to avoid launching one TypeScript CLI process per program.
  const programs: string[] = [];
  for (const directory of ["Script", "Adblock", "Module", "Rule"]) {
    for (const file of await listFiles(directory)) {
      const relative = directory + "/" + file;
      const isProgram = file.endsWith(".js") || (directory === "Script" && file.startsWith("Adblock/"));
      if (isProgram && (!changedScripts || changed.has(relative) || directory !== "Script"))
        programs.push(relative);
    }
  }
  programs.sort();
  const batchSize = 64;
  for (let offset = 0; offset < programs.length; offset += batchSize)
    checks.push([
      "syntax:batch-" + (offset / batchSize + 1),
      ["node", "src/cli.ts", "script-syntax", ...programs.slice(offset, offset + batchSize)],
    ]);
  return checks;
}
export async function publicationGate(env: NodeJS.ProcessEnv = process.env) {
  const required = ["catalog", "rules", "loon_sync", "verify", "reports", "issues"];
  if (env.MONITOR_ENABLED === "true") required.push("monitor");
  const failed: string[] = [];
  const stages: Record<string, string> = {};
  try {
    const value: unknown = JSON.parse(env.STAGES ?? "{}");
    if (!isRecord(value)) throw Error("Invalid workflow stages");
    for (const [stage, result] of Object.entries(value)) {
      if (!isRecord(result) || typeof result.outcome !== "string")
        throw Error("Invalid workflow stage: " + stage);
      stages[stage] = result.outcome;
    }
  } catch {
    failed.push("workflow integrity");
  }
  failed.push(...required.filter(stage => stages[stage] !== "success"));
  try {
    const validation = await readValidationReport();
    if (required.filter(stage => stage !== "issues").some(stage => {
      const result = validation.stages[stage];
      return result?.complete !== true || !result.checks.length ||
        result.checks.some(check => check.status !== "passed");
    })) throw Error("Incomplete validation");
    const audit = validation.stages.verify.checks.find(check => check.id === "repository-audit");
    if (!audit || !validAuditEvidence(audit)) throw Error("Missing repository audit evidence");
  } catch {
    failed.push("validation integrity");
  }
  if (env.SYNC_PUBLISHABLE !== "true") failed.push("sync integrity");
  if (env.MONITOR_ENABLED === "true" && env.MONITOR_COMPLETE !== "true")
    failed.push("monitor integrity");
  const result: PipelineResult = {
    publishable: !failed.length,
    failedGates: failed,
    stages,
  };
  await writeReport("pipeline-result.json", result);
  await setOutput("publishable", String(result.publishable));
  for (const stage of failed) console.error("::error::Publication blocked: " + stage);
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
  if (run(["git", "diff", "--cached", "--name-only"], true))
    throw Error("Publication requires a clean staging index");
  const remote = run(
    ["git", "ls-remote", "origin", "refs/heads/" + branch],
    true,
  ).split(/\s+/)[0];
  if (remote !== expected)
    throw Error("Destination advanced; rerun from its new baseline");
  const publicationPaths = [
    ...managed,
    ...(process.env.MONITOR_ENABLED === "true"
      ? [".github/monitor/state.json", ".github/monitor/upstream"]
      : []),
  ];
  const existing: string[] = [];
  for (const item of publicationPaths)
    if ((await readOptionalDirectory(item)) || run(["git", "ls-files", "--", item], true))
      existing.push(item);
  if (existing.length) run(["git", "add", "-A", "--", ...existing]);
  const diff = spawnSync("git", ["diff", "--cached", "--quiet"]);
  if (diff.status !== 0 && diff.status !== 1)
    throw Error("Cannot inspect staged Git diff");
  if (diff.status === 1) {
    run(["git", "config", "user.name", "chance-upstream-bot"]);
    run([
      "git",
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    ]);
    run(["git", "commit", "--quiet", "-m", "chore: sync upstream and regenerate targets"]);
    const files = run(["git", "diff", "--name-only", "-z", expected, "HEAD"], true).split("\0").filter(Boolean);
    if (files.some(file => !publicationPaths.some(item =>
      file === item || file.startsWith(item.endsWith("/") ? item : item + "/"))))
      throw Error("Publication commit contains an unmanaged path");
  }
  if (run(["git", "status", "--porcelain", "--untracked-files=all", "--", ...publicationPaths], true))
    throw Error("Managed working tree is not clean before publication");
  if (diff.status === 1) {
    run(["git", "push", "origin", "HEAD:" + branch]);
    await setOutput("publication", "pushed");
  } else await setOutput("publication", "unchanged");
}
function readmeSections(text: string) {
  const headings = [...text.matchAll(/^##[ \t]+(.+?)\s*$/gm)];
  return new Map(headings.map((heading, index) => [
    heading[1],
    text.slice(heading.index, headings[index + 1]?.index).trim(),
  ]));
}
export async function summary() {
  const result = await readReport<PipelineResult>("pipeline-result.json", {
    publishable: false,
  });
  result.publication = process.env.PUBLICATION || "blocked";
  await writeReport("pipeline-result.json", result);
  const lines = [
    "# WayX Actions result",
    "",
    `Publication: ${result.publication}`,
  ];
  const baseline = process.env.EXPECTED_HEAD;
  const published = result.publication === "pushed" || result.publication === "unchanged";
  if (baseline) {
    const previous = readmeSections(run(["git", "show", `${baseline}:README.md`], true));
    const current = readmeSections(published
      ? run(["git", "show", "HEAD:README.md"], true)
      : await fs.readFile("README.md", "utf8"));
    const changed = ["BoxJs", "Module", "Adblock", "Rule"].filter(
      (name) => previous.get(name) !== current.get(name),
    );
    lines.push(
      "",
      published
        ? "## README changes"
        : "## README changes in working tree",
      "",
      ...(changed.length ? changed.map((name) => `- ${name}`) : ["No catalog sections changed."]),
    );
    const catalogDirectories = ["Boxjs", "Module", "Adblock", "Rule"];
    const files = [
      run(
        ["git", "diff", "--name-only", "-z", "--no-renames", baseline, ...(published ? ["HEAD"] : []), "--", ...catalogDirectories],
        true,
      ),
      ...(published ? [] : [run(
        ["git", "ls-files", "--others", "--exclude-standard", "-z", "--", ...catalogDirectories],
        true,
      )]),
    ].join("\0").split("\0").filter(Boolean);
    if (files.length)
      lines.push(
        "",
        published
          ? "## Changed published resources"
          : "## Changed resources in working tree",
        "",
        ...[...new Set(files)].sort().map((file) => `- \`${file}\``),
      );
  }
  if (result.failedGates?.length)
    lines.push("", "Failed gates: " + result.failedGates.join(", "));
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
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
}
