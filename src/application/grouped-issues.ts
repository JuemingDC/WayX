// Modified: 2026-11-12 (chance). Reuse one issue per category, replace its body
// instead of commenting, and retire legacy/duplicate alerts after consolidation.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ISSUE_GROUPS, isManagedIssue, mergeIncompleteIssueBody } from "../domain/issue-groups.ts";
import type { IssueGroupPlan } from "../domain/issue-groups.ts";

type Issue = { number: number; title: string; body?: string; state: string; pull_request?: unknown };
type GitHubCall = (args: string[]) => string;
export async function reconcileGroupedIssues(plans: IssueGroupPlan[], repository: string, call: GitHubCall, numberById: Record<string, string> = {}) {
  if (plans.length > 5 || new Set(plans.map(plan => plan.title)).size !== plans.length)
    throw Error("At most five unique managed issue categories are allowed");
  // Fetch all pages once, including closed canonical issues for stable reuse.
  const pages = JSON.parse(call(["api", "--paginate", "--slurp", `repos/${repository}/issues?state=all&per_page=100`]));
  const issues: Issue[] = pages.flat().filter((issue: Issue) => !issue.pull_request);
  // An incomplete run cannot silently resolve older failures. Migrate their
  // evidence into its category first; pull failures still contain IDs only.
  for (const issue of issues) {
    if (issue.state.toLowerCase() !== "open" || !isManagedIssue(issue.title) || ISSUE_GROUPS.some(([, title]) => title === issue.title)) continue;
    const legacy = issue.title.match(/^\[conversion-(failure|review|unknown):[a-f0-9]{16}\] (\S+) (.*)$/);
    const fetchNumber = legacy && /fetch|download/.test(legacy[3]) ? numberById[legacy[2]] : undefined;
    const key = fetchNumber ? "fetch" : /^\[WayX monitor\]/.test(issue.title) ? "monitor" :
      /^\[WayX rules:/.test(issue.title) ? "rules" : /^\[WayX validation/.test(issue.title) ? "validation" : "conversion";
    const plan = plans.find(value => value.key === key);
    if (plan && !plan.complete)
      plan.body = mergeIncompleteIssueBody(plan, [fetchNumber ?? issue.body ?? issue.title]);
  }
  for (const plan of plans)
    plan.body = mergeIncompleteIssueBody(plan, issues.filter(issue => issue.title === plan.title && issue.state.toLowerCase() === "open").map(issue => issue.body ?? ""));
  const unmanaged = issues.filter(issue => issue.state.toLowerCase() === "open" && !isManagedIssue(issue.title));
  const capacity = Math.max(0, 5 - unmanaged.length);
  const active = plans.filter(plan => plan.body || !plan.complete && issues.some(issue => issue.title === plan.title && issue.state.toLowerCase() === "open"));
  // Existing user issues keep their identity. Overflow details remain in the
  // Action report; category bodies are combined without polluting fetch IDs.
  if (active.length > capacity) {
    const keep = active.slice(0, capacity);
    const overflow = active.slice(capacity);
    const sink = [...keep].reverse().find(plan => plan.key !== "fetch");
    if (sink) sink.body = (sink.body + "\n\n" + overflow.map(plan => "## " + plan.title + "\n\n" + plan.body).join("\n\n")).slice(0, 55000);
    for (const plan of overflow) { plan.body = ""; plan.complete = true; }
  }
  const keepNumbers = new Set<number>();
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-group-issues-"));
  try {
    for (const plan of plans) {
      const matches = issues.filter(issue => issue.title === plan.title).sort((a, b) => a.number - b.number);
      const canonical = matches.find(issue => issue.state.toLowerCase() === "open") ?? matches[0];
      const body = mergeIncompleteIssueBody(plan, matches.filter(issue => issue.state.toLowerCase() === "open").map(issue => issue.body ?? ""));
      if (!body) continue;
      const bodyFile = path.join(directory, plan.key + ".md");
      await fs.writeFile(bodyFile, body + "\n");
      if (canonical) {
        if ((canonical.body ?? "").trimEnd() !== body.trimEnd())
          call(["issue", "edit", String(canonical.number), "--repo", repository, "--body-file", bodyFile]);
        if (canonical.state.toLowerCase() !== "open")
          call(["issue", "reopen", String(canonical.number), "--repo", repository]);
        keepNumbers.add(canonical.number);
      } else {
        const url = call(["issue", "create", "--repo", repository, "--title", plan.title, "--body-file", bodyFile]);
        const number = Number(url.match(/\/issues\/(\d+)\s*$/)?.[1]);
        if (!number) throw Error("Cannot determine created category issue number");
        keepNumbers.add(number);
      }
    }
    // Recovered categories and migrated per-plugin alerts are closed only after
    // every current summary was safely written. No per-item issue is reopened.
    for (const issue of issues)
      if (issue.state.toLowerCase() === "open" && isManagedIssue(issue.title) && !keepNumbers.has(issue.number))
        call(["issue", "close", String(issue.number), "--repo", repository, "--reason",
          ISSUE_GROUPS.some(([, title]) => title === issue.title) ? "completed" : "not planned"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
  return { managedOpen: keepNumbers.size, totalOpen: keepNumbers.size + unmanaged.length };
}
