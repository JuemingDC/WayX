import type { ParsedPlugin, SourceEntry } from "../domain/contracts.ts";
import { checkFailureExcerpt } from "../domain/check-failure.ts";
import { readValidationReport } from "./automation.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript application layer; preserve source behavior.
// WayX automated conversion issue proposer.
// Author: chance
// Category: Automation / Conversion / Issue Proposal
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadLoonSourceCatalog } from "../parser/input.ts";
import { parseLoonPlugin } from "../parser/input.ts";
import {
  isRewriteV2,
  parseRewriteV2,
  selectRewritePipelineLayer,
  classifyLegacyRewriteAction,
  validateRewriteV2Ast,
  LOON_LEGACY_MOCK_OPTION_NAMES,
} from "../parser/rewrite.ts";
import {
  isScriptV2,
  parseScriptV2,
  parseLegacyScriptLine,
} from "../parser/script.ts";
import { ensureAdblockNumbers } from "./adblock-numbers.ts";
import type { AdblockNumbers } from "./adblock-numbers.ts";
import { groupedIssuePlans } from "../domain/issue-groups.ts";
import { reconcileGroupedIssues } from "./grouped-issues.ts";
const ROOT = process.cwd();
const TARGET_DIRS = [
  path.join(ROOT, "Adblock", "Quantumult X"),
  path.join(ROOT, "Adblock", "Surge"),
];
const runtimeDir = path.join(ROOT, ".github", "monitor", ".runtime");
const summaryPath = path.join(runtimeDir, "conversion-issues.md");
const dryRun = process.argv.includes("--dry-run");
const repo = process.env.GITHUB_REPOSITORY || "";
const REVIEW_RE = /^# \[WayX\]\s*([^:]*REVIEW REQUIRED):\s*(.*)$/;
const ISSUE_RE = /^# \[WayX\]\s*ISSUE REQUIRED \[([^\]]+)\]:\s*(.*)$/;
const SOURCE_RE = /^# Source declaration:\s*(.*)$/;
// Modified: 2026-11-28 (chance). Describe validated report and issue payloads at their boundaries.
type SourceLine = { section: string; line: string };
type IssueRecord = { title: string; state: string; labels?: { name: string }[] };
type TargetProblem = {
  fingerprint: string;
  kind: string;
  code: string;
  plugin: SourceEntry;
  source: string;
  reasons: string[];
  locations: { file: string; line: number }[];
  sourceSection: string | null;
  declarations: SourceLine[];
};
type SyncFailure = {
  plugin: SourceEntry;
  stage: string;
  reason: string;
  detail?: string;
  declarationContext?: string;
  declarations?: SourceLine[];
};
type MonitorSource = { id: string; url?: string; repo?: string; ref?: string };
type MonitorFailure = { source: MonitorSource; stage: string; reason: string; errorType: string; rollbackSucceeded: boolean };
type SyncReport = { version?: number; failures: SyncFailure[]; publishable?: boolean; convertedPlugins?: string[] };
type MonitorReport = { version?: number; failures: MonitorFailure[]; complete?: boolean; results?: { source: MonitorSource; succeeded: boolean }[] };
type ValidationReport = Awaited<ReturnType<typeof readValidationReport>>;
type ValidationFailure = { stage: string; checks: ValidationReport["stages"][string]["checks"] };
type QuarantinedRule = { source: string; code: string; declaration: string; reason: string };
type RuleReport = { version: number; complete: boolean; quarantined: QuarantinedRule[] };
type RuleProblem = { fingerprint: string; source: string; code: string; items: QuarantinedRule[] };
type IssueCollectionOptions = {
  root?: string;
  catalog?: readonly SourceEntry[] | null;
  sourceOverrides?: ReadonlyMap<string, string> | null;
  includeTargets?: boolean;
  includeSyncFailures?: boolean;
};
function gh(args: string[]) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    // Modified: 2026-11-13 (chance). Bound one projected API page rather than
    // overflowing Node's default 1 MiB buffer on historical issue bodies.
    maxBuffer: 32 * 1024 * 1024,
  }).trim();
}
function fingerprint(parts: readonly unknown[]) {
  return crypto
    .createHash("sha256")
    .update(parts.map((x) => String(x ?? "")).join("\0"))
    .digest("hex")
    .slice(0, 16);
}
async function readFailureReport(file: string, kind: "sync"): Promise<SyncReport>;
async function readFailureReport(file: string, kind: "monitor"): Promise<MonitorReport>;
async function readFailureReport(file: string, kind: "sync" | "monitor"): Promise<SyncReport | MonitorReport> {
  let report: SyncReport | MonitorReport;
  try {
    report = JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return { version: 1, failures: [] };
    throw new Error(
      "Cannot read failure report " + file + ": " + error.message,
      { cause: error },
    );
  }
  const invalid = (reason: string) => {
    throw new Error("Invalid failure report " + file + ": " + reason);
  };
  const object = (value: unknown) =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const text = (value: unknown) =>
    typeof value === "string" && value.trim().length > 0;
  if (
    !object(report) ||
    !(kind === "sync" ? [1, 2] : [1]).includes(report.version!) ||
    !Array.isArray(report.failures)
  )
    invalid("expected supported version and failures array");
  for (const [index, failure] of report.failures.entries()) {
    const owner = (failure as SyncFailure & MonitorFailure)?.[kind === "sync" ? "plugin" : "source"];
    if (
      !object(failure) ||
      !object(owner) ||
      !text(owner.id) ||
      !text(failure.stage) ||
      !text(failure.reason)
    )
      invalid("invalid failures[" + index + "]");
    if (
      kind === "monitor" &&
      (!text((failure as MonitorFailure).errorType) ||
        typeof (failure as MonitorFailure).rollbackSucceeded !== "boolean")
    )
      invalid("invalid monitor failure details at " + index);
  }
  for (const key of kind === "sync" ? ["publishable"] : ["complete"]) {
    if (key in report && typeof (report as SyncReport & MonitorReport)[key as "publishable" | "complete"] !== "boolean")
      invalid(key + " must be boolean");
  }
  if (kind === "monitor" && (report as MonitorReport).complete === true && report.failures.length)
    invalid("complete report contains failures");
  return report;
}
async function targetFiles(): Promise<string[]> {
  const out: string[] = [];
  for (const dir of TARGET_DIRS) {
    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(?:snippet|sgmodule)$/i.test(entry.name))
        continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out.sort();
}
function extractTargetMarkers(text: string, file: string) {
  const lines = String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const out: { kind: string; code: string; reason: string; source: string; file: string; line: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const value = lines[i].trim();
    const review = value.match(REVIEW_RE);
    const issue = value.match(ISSUE_RE);
    if (!review && !issue) continue;
    let source = "";
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const candidate = lines[j].trim();
      const match = candidate.match(SOURCE_RE);
      if (match) {
        source = match[1].trim();
        break;
      }
      if (
        REVIEW_RE.test(candidate) ||
        ISSUE_RE.test(candidate) ||
        /^\[[^\]]+\]$/.test(candidate)
      )
        break;
    }
    out.push({
      kind: review ? "review" : "unknown",
      code: review ? review[1].trim() : issue![1].trim(),
      reason: (review ? review[2] : issue![2]).trim(),
      source,
      file,
      line: i + 1,
    });
  }
  return out;
}
function targetMap(catalog: readonly SourceEntry[]) {
  const map = new Map<string, SourceEntry>();
  for (const entry of catalog) {
    map.set("Adblock/Quantumult X/" + entry.qx, entry);
    map.set("Adblock/Surge/" + entry.surge, entry);
  }
  return map;
}
async function sourceContextFor(
  entry: SourceEntry,
  declaration: string,
  { limit = 40 }: { limit?: number } = {},
): Promise<{ section: string | null; declarations: SourceLine[] }> {
  if (!entry) return { section: null, declarations: [] };
  try {
    const text = await fs.readFile(
      path.join(ROOT, "Resource", "Loon", entry.file),
      "utf8",
    );
    const parsed = parseLoonPlugin(text);
    const fallback: SourceLine[] = [];
    for (const [section, lines] of parsed.sections) {
      if (section === "Argument") continue;
      for (const raw of lines) {
        const line = String(raw ?? "").trim();
        if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
        if (declaration && line === declaration)
          return { section, declarations: [{ section, line }] };
        if (fallback.length < limit) fallback.push({ section, line });
      }
    }
    return { section: null, declarations: fallback };
  } catch {
    return { section: null, declarations: [] };
  }
}
async function groupedTargetProblems(catalog: readonly SourceEntry[]): Promise<TargetProblem[]> {
  const mapping = targetMap(catalog);
  const groups = new Map<string, Omit<TargetProblem, "reasons" | "sourceSection" | "declarations"> & { reasons: Set<string> }>();
  for (const file of await targetFiles()) {
    const relative = path.relative(ROOT, file).replaceAll(path.sep, "/");
    const entry = mapping.get(relative);
    if (!entry) continue;
    const text = await fs.readFile(file, "utf8");
    for (const marker of extractTargetMarkers(text, relative)) {
      const key = fingerprint([
        entry.id,
        marker.kind,
        marker.code,
        marker.source,
      ]);
      if (!groups.has(key)) {
        groups.set(key, {
          fingerprint: key,
          kind: marker.kind,
          code: marker.code,
          plugin: entry,
          source: marker.source,
          reasons: new Set(),
          locations: [],
        });
      }
      const group = groups.get(key)!;
      if (marker.reason) group.reasons.add(marker.reason);
      if (
        !group.locations.some(
          (x) => x.file === marker.file && x.line === marker.line,
        )
      ) {
        group.locations.push({ file: marker.file, line: marker.line });
      }
    }
  }
  const out: TargetProblem[] = [];
  for (const group of groups.values()) {
    const context = await sourceContextFor(group.plugin, group.source);
    out.push({
      ...group,
      reasons: [...group.reasons].sort(),
      sourceSection: context.section,
      declarations: context.declarations,
    });
  }
  return out.sort((a, b) =>
    a.fingerprint.localeCompare(b.fingerprint),
  );
}
function ruleBlock(section: string | null, declarations: readonly SourceLine[] | undefined) {
  if (!declarations?.length) return "(new upstream rule content unavailable)";
  return declarations
    .map((item) => {
      if (typeof item === "string") return item;
      return "[" + (item.section || section || "Source") + "] " + item.line;
    })
    .join("\n");
}
export function targetProblemIssueBody(group: TargetProblem) {
  const plugin = group.plugin;
  return [
    "## Related plugin",
    "",
    "- Plugin: " + plugin.id,
    "- Source file: Resource/Loon/" + plugin.file,
    "- Upstream: " + plugin.source,
    "- Quantumult X target: Adblock/Quantumult X/" + plugin.qx,
    "- Surge target: Adblock/Surge/" + plugin.surge,
    "",
    "## Failure reason",
    "",
    "- Type: " + group.kind,
    "- Code: " + group.code,
    ...group.reasons.map((reason) => "- " + reason),
    "",
    "## Corresponding source rule",
    "",
    "~~~text",
    ruleBlock(group.sourceSection, group.declarations),
    "~~~",
    "",
    "## Generated target locations",
    "",
    ...(group.locations.length
      ? group.locations.map((x) => "- " + x.file + ":" + x.line)
      : ["- (none)"]),
    "",
    "## Automation behavior",
    "",
    "WayX failed closed for this declaration. No guessed active target rule is generated. The workflow continues other plugins and tracks the original declaration through this Issue.",
    "",
  ].join("\n");
}
export function syncFailureIssueBody(failure: SyncFailure) {
  const plugin = failure.plugin;
  return [
    "## Related plugin",
    "",
    "- Plugin: " + plugin.id,
    "- Source file: Resource/Loon/" + plugin.file,
    "- Upstream: " + plugin.source,
    "- Quantumult X target: Adblock/Quantumult X/" + plugin.qx,
    "- Surge target: Adblock/Surge/" + plugin.surge,
    "",
    "## Failure reason",
    "",
    "- Stage: " + failure.stage,
    "- Reason: " + failure.reason,
    "",
    "~~~text",
    failure.detail || failure.reason,
    "~~~",
    "",
    "## Corresponding source rule",
    "",
    "- Context: " + failure.declarationContext,
    "",
    "~~~text",
    ruleBlock(null, failure.declarations),
    "~~~",
    "",
    "## Automation behavior",
    "",
    "This plugin did not pass the Actions conversion/validation transaction, so its new upstream Source/targets are not intentionally committed by the converter. Other plugins continue independently.",
    "",
  ].join("\n");
}
export function targetProblemTitle(group: TargetProblem) {
  return (
    "[conversion-" +
    group.kind +
    ":" +
    group.fingerprint +
    "] " +
    group.plugin.id +
    " " +
    group.code
  );
}
export function syncFailureTitle(failure: SyncFailure) {
  const fp = fingerprint([
    failure.plugin.id,
    failure.stage,
    failure.reason,
    ...(failure.declarations || []).map(
      (x) => (x.section || "") + "\0" + x.line,
    ),
  ]);
  return (
    "[conversion-failure:" + fp + "] " + failure.plugin.id + " " + failure.stage
  );
}
async function sourceSemanticProblems(
  catalog: readonly SourceEntry[],
  { root = ROOT, sourceOverrides = null }: Pick<IssueCollectionOptions, "root" | "sourceOverrides"> = {},
): Promise<TargetProblem[]> {
  const out: TargetProblem[] = [];
  for (const entry of catalog) {
    let plugin: ParsedPlugin;
    try {
      plugin = parseLoonPlugin(
        sourceOverrides?.has(entry.id)
          ? sourceOverrides.get(entry.id)!
          : await fs.readFile(
              path.join(root, "Resource/Loon", entry.file),
              "utf8",
            ),
      );
    } catch {
      continue;
    } // Source I/O failures belong to the sync transaction.
    for (const section of ["Rewrite", "Script"])
      for (const raw of plugin.sections.get(section) || []) {
        const line = raw.trim();
        if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
        try {
          if (isScriptV2(line)) parseScriptV2(line);
          else if (section === "Rewrite" && isRewriteV2(line))
            validateRewriteV2Ast(
              selectRewritePipelineLayer(parseRewriteV2(line)),
            );
          else if (section === "Rewrite") {
            const separator = line.search(/\s/);
            if (separator < 1)
              throw new Error("Malformed Legacy Rewrite declaration");
            const operation = classifyLegacyRewriteAction(
              line
                .slice(separator)
                .trim()
                .replace(/^\-\s+/, ""),
            );
            if (operation.kind === "unknown")
              throw new Error(
                operation.reason || "Unknown Legacy Rewrite action",
              );
            for (const option of (operation as { optionNames?: string[] }).optionNames || [])
              if (!LOON_LEGACY_MOCK_OPTION_NAMES.has(option))
                throw new Error("Unknown Legacy mock option: " + option);
          } else if (!parseLegacyScriptLine(line))
            throw new Error("Unregistered Legacy Script declaration or option");
        } catch (error) {
          const code = "unknown-source-syntax";
          out.push({
            fingerprint: fingerprint([entry.id, "unknown", code, line]),
            kind: "unknown",
            code,
            plugin: entry,
            source: line,
            reasons: ["Source syntax requires review: " + error.message],
            locations: [],
            sourceSection: section,
            declarations: [{ section, line }],
          });
        }
      }
  }
  return out;
}
export async function validationIssueCandidates(
  root: string = ROOT,
  stages: Record<string, { outcome?: string }> = {},
) {
  const report = await readValidationReport(root);
  const failures: ValidationFailure[] = [];
  for (const [stage, result] of Object.entries(report.stages)) {
    const checks = result.checks.filter(
      (check) => check.status === "failed",
    );
    if (!result.complete)
      checks.push({
        id: "incomplete-stage",
        status: "failed",
        detail:
          "Stage did not finish; previous successful evidence is invalid.",
      });
    if (checks.length) failures.push({ stage, checks });
  }
  for (const [stage, result] of Object.entries(stages))
    if (
      result.outcome === "failure" &&
      !["issues", "gate", "publish"].includes(stage) &&
      !failures.some((failure) => failure.stage === stage)
    ) {
      failures.push({
        stage,
        checks: [
          {
            id: "stage-failure",
            status: "failed",
            detail:
              "Workflow stage failed before complete check evidence was available. Inspect the stage log in the run artifact.",
          },
        ],
      });
    }
  return { validationReport: report, validationFailures: failures };
}
export function validationFailureTitle(failure: ValidationFailure) {
  return (
    "[WayX validation] " +
    failure.stage +
    " [" +
    fingerprint(["validation", failure.stage]) +
    "]"
  );
}
export function validationFailureIssueBody(failure: ValidationFailure) {
  const run = process.env.GITHUB_RUN_ID,
    server = process.env.GITHUB_SERVER_URL || "https://github.com";
  const lines = [
    "Automated checks found results that require review. Publication remains gated.",
    "",
    "- Stage: " + failure.stage,
    "- Failed checks: " + failure.checks.length,
    "- Run: " +
      (run ? server + "/" + repo + "/actions/runs/" + run : "local validation"),
    "- Full evidence: validation-results.json and per-check logs in the run artifact",
    "",
  ];
  for (const check of failure.checks.slice(0, 30)) {
    lines.push(
      "### " + check.id,
      "",
      "- Log: " + (check.log || "workflow stage log"),
      "",
      "~~~text",
      // Modified: 2026-11-14 (chance). Keep plain log lines readable and error-first;
      // JSON escaping previously spent the excerpt budget on routine progress.
      checkFailureExcerpt(
        check.findings?.length
          ? JSON.stringify(check.findings, null, 2)
          : check.detail || "Check failed",
        1400,
      ),
      "~~~",
      "",
    );
  }
  if (failure.checks.length > 30)
    lines.push("Additional failures are preserved in the artifact.");
  return lines.join("\n");
}
export function recoveredValidationIssues(report: ValidationReport, issues: readonly IssueRecord[]) {
  return issues.filter((issue) => {
    const match = String(issue.title ?? "").match(
      /^\[WayX validation\] (\S+) \[([a-f0-9]{16})\]$/,
    );
    const result = match && report?.stages?.[match[1]];
    return (
      issue.state === "OPEN" &&
      issue.labels?.some(
        (label) => label.name === "validation-failure",
      ) &&
      result?.complete === true &&
      result.checks?.length > 0 &&
      result.checks.every((check) => check.status === "passed")
    );
  });
}
export async function ruleIssueCandidates(root: string = ROOT) {
  let report: RuleReport;
  try {
    report = JSON.parse(
      await fs.readFile(
        path.join(root, ".github/monitor/.runtime/rules-result.json"),
        "utf8",
      ),
    );
  } catch (error) {
    if (error.code === "ENOENT") return { ruleReport: null, ruleProblems: [] };
    throw error;
  }
  if (
    report?.version !== 1 ||
    typeof report.complete !== "boolean" ||
    !Array.isArray(report.quarantined)
  )
    throw new Error("Invalid rules-result.json");
  const groups = new Map<string, RuleProblem>();
  for (const item of report.quarantined) {
    if (!item.source || !item.code || !item.declaration || !item.reason)
      throw new Error("Invalid quarantined source rule");
    const key = fingerprint([item.source, item.code]);
    if (!groups.has(key))
      groups.set(key, {
        fingerprint: key,
        source: item.source,
        code: item.code,
        items: [],
      });
    groups.get(key)!.items.push(item);
  }
  return { ruleReport: report, ruleProblems: [...groups.values()] };
}
export function ruleProblemTitle(group: RuleProblem) {
  return (
    "[WayX rules:" + group.fingerprint + "] " + group.source + " " + group.code
  );
}
export function ruleProblemBody(group: RuleProblem) {
  return [
    "Native rule aggregation quarantined declarations that cannot be emitted without changing matching semantics.",
    "- Source: " + group.source,
    "- Type: " + group.code,
    "- Declarations: " + group.items.length,
    "- Full evidence: rules-result.json in the Action artifact",
    "- Supported rules continue to publish; quarantined rules are not widened or converted into scripts.",
    "",
    "~~~json",
    JSON.stringify(group.items.slice(0, 40), null, 2).slice(0, 48000),
    "~~~",
  ].join("\n");
}
export function recoveredRuleIssues(
  report: RuleReport | null,
  problems: readonly RuleProblem[],
  issues: readonly IssueRecord[],
) {
  if (report?.complete !== true) return [];
  const active = new Set(problems.map(ruleProblemTitle));
  return issues.filter(
    (issue) =>
      issue.state === "OPEN" &&
      issue.labels?.some((label) => label.name === "rules-review") &&
      /^\[WayX rules:[a-f0-9]{16}\] /.test(issue.title) &&
      !active.has(issue.title),
  );
}
export async function collectIssueCandidates({
  root = ROOT,
  catalog = null,
  sourceOverrides = null,
  includeTargets = true,
  includeSyncFailures = true,
}: IssueCollectionOptions = {}) {
  catalog =
    catalog ||
    (await loadLoonSourceCatalog(path.join(root, ".github/sources/loon.json")));
  const targetProblems = includeTargets
    ? await groupedTargetProblems(catalog)
    : [];
  for (const problem of await sourceSemanticProblems(catalog, {
    root,
    sourceOverrides,
  })) {
    if (
      !targetProblems.some(
        (group) =>
          group.plugin.id === problem.plugin.id &&
          group.source === problem.source,
      )
    )
      targetProblems.push(problem);
  }
  const syncReport: SyncReport = includeSyncFailures
    ? await readFailureReport(
        path.join(root, ".github/monitor/.runtime/sync-failures.json"),
        "sync",
      )
    : { failures: [] };
  const syncFailures = syncReport.failures;
  const monitorReport: MonitorReport = includeSyncFailures
    ? await readFailureReport(
        path.join(root, ".github/monitor/.runtime/monitor-result.json"),
        "monitor",
      )
    : { failures: [] };
  const monitorFailures = monitorReport.failures;
  const validation: { validationReport: ValidationReport; validationFailures: ValidationFailure[] } = includeSyncFailures
    ? await validationIssueCandidates(
        root,
        JSON.parse(process.env.STAGES || "{}"),
      )
    : { validationReport: { version: 1, stages: {} }, validationFailures: [] };
  const rules: { ruleReport: RuleReport | null; ruleProblems: RuleProblem[] } = includeSyncFailures
    ? await ruleIssueCandidates(root)
    : { ruleReport: null, ruleProblems: [] };
  return {
    targetProblems,
    syncFailures,
    monitorFailures,
    monitorReport,
    syncReport,
    ...validation,
    ...rules,
  };
}
export function monitorFailureTitle(failure: MonitorFailure) {
  const source = failure.source;
  return (
    "[WayX monitor] " +
    source.id +
    " [" +
    fingerprint([
      source.id,
      source.url || source.repo,
      source.ref,
      failure.stage,
      failure.errorType,
    ]) +
    "]"
  );
}
export function monitorFailureIssueBody(failure: MonitorFailure) {
  const source = failure.source;
  return [
    "Upstream monitoring failed; publication remains blocked until a complete run succeeds.",
    "",
    "- Source: " + source.id,
    "- Upstream: " + (source.url || "https://github.com/" + source.repo),
    "- Ref: " + (source.ref || "not applicable"),
    "- Stage: " + failure.stage,
    "- Reason: " + failure.reason,
    "- Rollback succeeded: " + failure.rollbackSucceeded,
    "- Configuration: .github/monitor/sources.json",
    "- Report: .github/monitor/.runtime/monitor-result.json",
    "",
    "No conversion semantics are inferred from this monitoring failure.",
  ].join("\n");
}
// Only explicit successful source results can resolve managed monitoring alerts.
export function recoveredMonitorIssues(report: MonitorReport, issues: readonly IssueRecord[]) {
  if (
    report?.complete !== true ||
    !Array.isArray(report.failures) ||
    report.failures.length ||
    !Array.isArray(report.results)
  )
    return [];
  const recovered = new Set(
    report.results
      .filter(
        (result) =>
          result?.succeeded === true && typeof result.source?.id === "string",
      )
      .map((result) => result.source.id),
  );
  const failed = new Set(
    report.results
      .filter((result) => result?.succeeded !== true)
      .map((result) => result?.source?.id),
  );
  return issues.filter((issue) => {
    const match = String(issue.title ?? "").match(
      /^\[WayX monitor\] (\S+) \[([a-f0-9]{16})\]$/,
    );
    return (
      issue.state === "OPEN" &&
      issue.labels?.some(
        (label) => label.name === "upstream-monitor-failure",
      ) &&
      match &&
      recovered.has(match[1]) &&
      !failed.has(match[1])
    );
  });
}
export function recoveredConversionIssues(
  { syncReport, targetProblems }: { syncReport: SyncReport; targetProblems: readonly TargetProblem[] },
  issues: readonly IssueRecord[],
) {
  if (
    syncReport?.publishable !== true ||
    !Array.isArray(syncReport.convertedPlugins) ||
    !Array.isArray(syncReport.failures)
  )
    return [];
  const healthy = new Set(syncReport.convertedPlugins),
    failed = new Set(
      syncReport.failures.map((failure) => failure.plugin.id),
    );
  for (const problem of targetProblems) failed.add(problem.plugin.id);
  return issues.filter((issue) => {
    const match = String(issue.title ?? "").match(
      /^\[conversion-(failure|unknown|review):[a-f0-9]{16}\] (\S+) /,
    );
    return (
      issue.state === "OPEN" &&
      match &&
      issue.labels?.some(
        (label) => label.name === "conversion-" + match[1],
      ) &&
      healthy.has(match[2]) &&
      !failed.has(match[2])
    );
  });
}
// Modified: 2026-11-12 (chance). Details remain grouped by problem type; only
// acquisition failures lower to stable IDs, never one issue per plugin/stage.
export function buildIssueGroupPlans(context: Awaited<ReturnType<typeof collectIssueCandidates>>, numbers: AdblockNumbers) {
  const { targetProblems, syncFailures, monitorFailures, validationFailures, ruleProblems,
    syncReport, monitorReport, ruleReport, validationReport } = context;
  const number = (id: string) => {
    const value = numbers.items[id]?.number;
    if (!value) throw Error("Missing Adblock number for " + id);
    return value;
  };
  const fetchFailures = syncFailures.filter((failure) => /fetch|download/.test(failure.stage) ||
    /HTTP \d{3} from original source|source timed out|fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN/i.test(failure.reason));
  const conversions = syncFailures.filter((failure) => !fetchFailures.includes(failure));
  return groupedIssuePlans({
    fetch: { entries: fetchFailures.map((failure) => number(failure.plugin.id)), complete: syncReport.publishable === true },
    conversion: {
      entries: [
        ...targetProblems.map((group) => "## " + number(group.plugin.id) + " · " + group.plugin.id + "\n\n" + targetProblemIssueBody(group)),
        ...conversions.map((failure) => "## " + number(failure.plugin.id) + " · " + failure.plugin.id + "\n\n" + syncFailureIssueBody(failure)),
      ],
      complete: syncReport.publishable === true,
    },
    rules: { entries: ruleProblems.map(ruleProblemBody), complete: ruleReport?.complete === true },
    monitor: { entries: monitorFailures.map(monitorFailureIssueBody), complete: monitorReport.complete === true },
    validation: { entries: validationFailures.map(validationFailureIssueBody), complete: syncReport.publishable === true && monitorReport.complete === true && ruleReport?.complete === true &&
      Object.values(validationReport.stages ?? {}).length > 0 && Object.values(validationReport.stages ?? {}).every(stage => stage.complete) },
  });
}
async function main() {
  const {
    targetProblems,
    syncFailures,
    monitorFailures,
    monitorReport,
    syncReport,
    validationReport,
    validationFailures,
    ruleReport,
    ruleProblems,
  } = await collectIssueCandidates();
  await fs.mkdir(runtimeDir, { recursive: true });
  const lines = [
    "# WayX automated conversion issues",
    "",
    "- Source/target semantic problems: " + targetProblems.length,
    "- Hard sync failures: " + syncFailures.length,
    "- Upstream monitor failures: " + monitorFailures.length,
    "- Validation stages requiring review: " + validationFailures.length,
    "- Quarantined rule groups: " + ruleProblems.length,
    "",
  ];
  for (const group of targetProblems) {
    lines.push("- " + targetProblemTitle(group));
    for (const location of group.locations)
      lines.push("  - " + location.file + ":" + location.line);
  }
  for (const failure of syncFailures)
    lines.push("- " + syncFailureTitle(failure));
  for (const failure of monitorFailures)
    lines.push("- " + monitorFailureTitle(failure));
  for (const failure of validationFailures)
    lines.push("- " + validationFailureTitle(failure));
  for (const problem of ruleProblems)
    lines.push("- " + ruleProblemTitle(problem));
  await fs.writeFile(summaryPath, lines.join("\n") + "\n");
  const output = process.env.GITHUB_OUTPUT;
  if (output) {
    await fs.appendFile(
      output,
      "has_issues=" +
        (targetProblems.length ||
        syncFailures.length ||
        monitorFailures.length ||
        validationFailures.length ||
        ruleProblems.length
          ? "true"
          : "false") +
        "\n",
    );
    await fs.appendFile(
      output,
      "summary=" +
        path.relative(ROOT, summaryPath).replaceAll(path.sep, "/") +
        "\n",
    );
  }
  if (dryRun) {
    console.log(
      JSON.stringify(
        {
          targetProblems,
          syncFailures,
          monitorFailures,
          validationFailures,
          ruleProblems,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (!repo) throw Error("GITHUB_REPOSITORY is required to reconcile grouped issues");
  const extra = [...syncFailures.map((failure) => failure.plugin), ...targetProblems.map((group) => group.plugin)]
    .map((plugin) => ({ id: plugin.id, paths: [] as string[] }));
  const numbers = await ensureAdblockNumbers(ROOT, undefined, extra);
  const plans = buildIssueGroupPlans({ targetProblems, syncFailures, monitorFailures,
    validationFailures, ruleProblems, syncReport, monitorReport, ruleReport, validationReport }, numbers);
  const result = await reconcileGroupedIssues(plans, repo, gh, Object.fromEntries(Object.entries(numbers.items).map(([id, item]) => [id, item.number])));
  if (result.totalOpen > 5) throw Error("Existing manual issues alone exceed the five-issue limit");
  console.log(JSON.stringify({ categories: plans.length, ...result }));

}
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
if (isMain) await main();
