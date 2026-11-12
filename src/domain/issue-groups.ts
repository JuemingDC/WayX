// Modified: 2026-11-12 (chance). Five stable issue categories replace per-item
// alerts; acquisition bodies contain only sorted, deduplicated Adblock numbers.
export const ISSUE_GROUPS = [
  ["fetch", "[WayX] 拉取失败"],
  ["conversion", "[WayX] 转换问题"],
  ["rules", "[WayX] 规则问题"],
  ["monitor", "[WayX] 上游监控"],
  ["validation", "[WayX] 校验与自动化"],
] as const;
export type IssueGroupKey = typeof ISSUE_GROUPS[number][0];
export type IssueGroupPlan = { key: IssueGroupKey; title: string; body: string; complete: boolean };
export function groupedIssuePlans(
  input: Record<IssueGroupKey, { entries: string[]; complete: boolean }>,
): IssueGroupPlan[] {
  return ISSUE_GROUPS.map(([key, title]) => {
    const entries = [...new Set(input[key].entries)];
    if (key === "fetch") {
      if (entries.some(value => !/^AD\d{4,}$/.test(value))) throw Error("Fetch issue requires numeric Adblock IDs only");
      entries.sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
    }
    const text = entries.join(key === "fetch" ? "\n" : "\n\n---\n\n");
    // GitHub bodies are bounded; full evidence always remains in Action reports.
    const body = key === "fetch" || text.length <= 55000 ? text :
      text.slice(0, 54000) + "\n\n其余详细内容见本次 Actions 的 conversion-issues.md 和原始报告。";
    return { key, title, body, complete: input[key].complete };
  });
}
export function isManagedIssue(title: string): boolean {
  return ISSUE_GROUPS.some(([, value]) => value === title) ||
    /^\[conversion-(?:failure|review|unknown):[a-f0-9]{16}\]/.test(title) ||
    /^\[WayX (?:monitor\]|validation(?:\]|:)|rules:)/.test(title);
}
export function mergeIncompleteIssueBody(plan: IssueGroupPlan, previous: string[]): string {
  if (plan.complete) return plan.body;
  if (plan.key === "fetch") return [...new Set([...previous, plan.body].join("\n").split("\n").filter(value => /^AD\d{4,}$/.test(value)))].sort().join("\n");
  return [...new Set([...previous, plan.body].filter(Boolean).flatMap(body => body.split("\n\n---\n\n")))].join("\n\n---\n\n").slice(0, 55000);
}
