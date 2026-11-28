import { keleePaused, isKeleeSource, opaqueEntries } from "../ingest/resources.ts";

// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript publish layer; preserve source behavior.
// WayX machine-readable reconciliation + Review inventory reports
// Author: chance
// Category: Converter / Audit / Reports
import fs from "node:fs/promises";
import path from "node:path";
import { loadLoonSourceCatalog } from "../parser/input.ts";
import { readValidationReport, validAuditEvidence } from "../application/automation.ts";
import {
  validationArtifactDigest,
  qxTargetPath,
  surgeTargetPath,
  readManagedTargetState,
} from "./workflow.ts";
const ROOT = process.cwd();
const SOURCE_CATALOG = path.join(ROOT, ".github", "sources", "loon.json");
const MANUAL_ASSETS = path.join(ROOT, ".github", "manual-assets.json");
const BASELINE = path.join(
  ROOT,
  ".github",
  "converter",
  "fixtures",
  "review-inventory-baseline.json",
);
function argValue(name: string, fallback: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}
const OUT_DIR = path.resolve(
  ROOT,
  argValue("--out-dir", ".github/monitor/.runtime"),
);
const normalize = (text: unknown) =>
  String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "");
const read = async (file: string): Promise<string> =>
  normalize(await fs.readFile(file, "utf8"));
async function readJson<T>(file: string, fallback: T = null as T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}
const rel = (file: string) =>
  path.relative(ROOT, file).split(path.sep).join("/");
const isComment = (line: unknown) =>
  /^(?:#|;|\/\/)/.test(String(line).trim());
interface ReportSourceItem { section: string; line: string; lineNumber: number }
type MarkerKind = "issue" | "review" | "unsupported" | "disabled" | "commented";
interface DeclarationMarker { source: string; kind: MarkerKind; marker: string; line: number }
interface InventoryMarker { kind: "review" | "issue"; code: string | null; family: string; reason: string; source: string; file: string; line: number; platform: string; scope: string }
function sourceItems(text: unknown): { items: ReportSourceItem[]; arguments: ReportSourceItem[] } {
  const items: ReportSourceItem[] = [];
  const argumentsList: ReportSourceItem[] = [];
  let section: string | null = null;
  let lineNumber = 0;
  for (const raw of normalize(text).split("\n")) {
    lineNumber++;
    const trimmed = raw.trim();
    const header = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      continue;
    }
    if (!section || !trimmed || isComment(trimmed)) continue;
    const item = { section, line: trimmed, lineNumber };
    if (section === "Argument") argumentsList.push(item);
    else items.push(item);
  }
  return { items, arguments: argumentsList };
}
function markerKind(line: string): MarkerKind {
  const text = String(line || "");
  if (/ISSUE REQUIRED/.test(text)) return "issue";
  if (/REVIEW REQUIRED/.test(text)) return "review";
  if (/Script disabled by source|disabled by source/i.test(text))
    return "disabled";
  if (/unsupported|commented out|cannot be represented/i.test(text))
    return "unsupported";
  return "commented";
}
function declarationMarkers(text: unknown): DeclarationMarker[] {
  const lines = normalize(text).split("\n");
  const out: DeclarationMarker[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^# Source declaration:\s*(.+)$/);
    if (!match) continue;
    let context = "";
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const candidate = lines[j].trim();
      if (!candidate) continue;
      if (/^# \[WayX\]/.test(candidate)) context = candidate;
      break;
    }
    out.push({
      source: match[1].trim(),
      kind: markerKind(context),
      marker: context,
      line: i + 1,
    });
  }
  return out;
}
function inventoryMarkers(
  text: unknown,
  file: string,
  platform: string,
  scope: string,
): InventoryMarker[] {
  const out: InventoryMarker[] = [];
  const lines = normalize(text).split("\n");
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const review = t.match(
      /^# \[WayX\]\s*([^:]*REVIEW REQUIRED):\s*(.*)$/,
    );
    const issue = t.match(
      /^# \[WayX\]\s*ISSUE REQUIRED \[([^\]]+)\]:\s*(.*)$/,
    );
    if (!review && !issue) continue;
    let source = "";
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const m = lines[j].trim().match(/^# Source declaration:\s*(.+)$/);
      if (m) {
        source = m[1].trim();
        break;
      }
      if (/^# \[WayX\]/.test(lines[j].trim())) break;
    }
    out.push({
      kind: review ? "review" : "issue",
      code: issue ? issue[1] : null,
      family: review ? review[1].trim() : "ISSUE REQUIRED",
      reason: (review ? review[2] : issue![2]).trim(),
      source,
      file,
      line: i + 1,
      platform,
      scope,
    });
  }
  return out;
}
// Modified: 2026-11-03 (chance). Intentional source drops are target independent.
function intentionalDrop(item: ReportSourceItem): string | null {
  if (
    item.section === "Rewrite" &&
    /json\.jq\s*\(\s*["']jq-path=/i.test(item.line)
  )
    return "legacy-jq-path";
  if (
    item.section === "Rewrite" &&
    /(?:request|response)-body-json-jq\b[^\n]*jq-path=/i.test(item.line)
  )
    return "legacy-jq-path";
  if (
    item.section === "Rewrite" &&
    /(?:request|response)-body-json-jq\s+(?:''|"")\s*$/i.test(item.line)
  )
    return "empty-json-jq";
  if (
    item.section === "Rewrite" &&
    /(?:request|response)\s+if\b[\s\S]*?\.json\.jq\(\s*""\s*\)/i.test(item.line)
  )
    return "empty-json-jq";
  return null;
}
function activeTargetStats(text: unknown) {
  let activeLines = 0,
    generatedHelperLines = 0,
    sourceScriptLines = 0;
  for (const raw of normalize(text).split("\n")) {
    const t = raw.trim();
    if (!t || isComment(t) || /^\[[^\]]+\]$/.test(t) || /^#!/.test(t)) continue;
    activeLines++;
    if (/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/Script\//.test(t))
      generatedHelperLines++;
    else if (
      /\bscript-path=/.test(t) ||
      / url script-[a-z-]+ https?:\/\//.test(t)
    )
      sourceScriptLines++;
  }
  return {
    activeLines,
    generatedHelperLines,
    sourceScriptLines,
    nativeOrOtherLines: activeLines - generatedHelperLines - sourceScriptLines,
  };
}
function multimap(markers: DeclarationMarker[]): Map<string, DeclarationMarker[]> {
  const map = new Map<string, DeclarationMarker[]>();
  for (const marker of markers) {
    if (!map.has(marker.source)) map.set(marker.source, []);
    map.get(marker.source)!.push(marker);
  }
  return map;
}
function popMarker(map: Map<string, DeclarationMarker[]>, source: string): DeclarationMarker | null | undefined {
  const list = map.get(source);
  if (!list?.length) return null;
  const order = [
    "issue",
    "review",
    "unsupported",
    "disabled",
    "commented",
  ];
  list.sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
  );
  return list.shift();
}
function reconcileTarget(items: ReportSourceItem[], targetText: string, verified: boolean) {
  const markers = declarationMarkers(targetText);
  const markerMap = multimap(markers);
  const counts: Record<string, number> = {
    converted: 0,
    review: 0,
    issue: 0,
    unsupported: 0,
    disabled: 0,
    commented: 0,
    intentionalDrop: 0,
    unverified: 0,
  };
  const details: (ReportSourceItem & { outcome: string; reason?: string })[] = [];
  for (const item of items) {
    const drop = intentionalDrop(item);
    if (drop) {
      counts.intentionalDrop++;
      details.push({ ...item, outcome: "intentionalDrop", reason: drop });
      continue;
    }
    const marker = popMarker(markerMap, item.line);
    if (marker) {
      counts[marker.kind]++;
      details.push({
        ...item,
        outcome: marker.kind,
        reason: marker.marker || marker.kind,
      });
      continue;
    }
    const outcome = verified ? "converted" : "unverified";
    counts[outcome]++;
    details.push({ ...item, outcome });
  }
  const unmatchedTargetDeclarations: DeclarationMarker[] = [];
  for (const list of markerMap.values())
    for (const marker of list) unmatchedTargetDeclarations.push(marker);
  const total = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0,
  );
  return {
    sourceItems: items.length,
    counts,
    verified,
    reconciled:
      verified &&
      total === items.length &&
      unmatchedTargetDeclarations.length === 0,
    unmatchedTargetDeclarations,
    target: activeTargetStats(targetText),
    details,
  };
}
function summarizeMarkers(items: InventoryMarker[]) {
  const summary: { total: number; byPlatform: Record<string, number>; byFile: Record<string, number>; byReason: Record<string, number> } = {
    total: items.length,
    byPlatform: { qx: 0, surge: 0 },
    byFile: {},
    byReason: {},
  };
  for (const item of items) {
    summary.byPlatform[item.platform] =
      (summary.byPlatform[item.platform] || 0) + 1;
    summary.byFile[item.file] = (summary.byFile[item.file] || 0) + 1;
    const key = item.reason || item.family || item.code || "unknown";
    summary.byReason[key] = (summary.byReason[key] || 0) + 1;
  }
  summary.byFile = Object.fromEntries(Object.entries(summary.byFile).sort());
  summary.byReason = Object.fromEntries(
    Object.entries(summary.byReason).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
  return summary;
}
function markdownInventory(reviews: InventoryMarker[], issues: InventoryMarker[]) {
  const lines = ["# WayX Review / Issue Inventory", ""];
  for (const [title, list] of [
    ["Review", reviews],
    ["Issue", issues],
  ] as [string, InventoryMarker[]][]) {
    const summary = summarizeMarkers(list);
    lines.push(
      "## " + title,
      "",
      "- Total: " + summary.total,
      "- QX: " + (summary.byPlatform.qx || 0),
      "- Surge: " + (summary.byPlatform.surge || 0),
      "",
    );
    if (list.length) {
      lines.push(
        "| Platform | Scope | File | Reason | Source |",
        "|---|---|---|---|---|",
      );
      for (const item of list)
        lines.push(
          "| " +
            item.platform +
            " | " +
            item.scope +
            " | " +
            item.file +
            " | " +
            item.reason.replaceAll("|", "\\|") +
            " | " +
            (item.source || "").replaceAll("|", "\\|") +
            " |",
        );
      lines.push("");
    }
  }
  return lines.join("\n") + "\n";
}
type ReconciliationEntry =
  | { id: string; opaque: true; retained: boolean; acquisition: Awaited<ReturnType<typeof opaqueEntries>>[string] }
  | { id: string; opaque?: never; retained: boolean; paused: boolean; source: { file: string; items: number; arguments: number; bySection: Record<string, number> }; qx: ReturnType<typeof reconcileTarget>; surge: ReturnType<typeof reconcileTarget> };
type ConvertedReconciliation = Extract<ReconciliationEntry, { opaque?: never }>;
type OpaqueReconciliation = Extract<ReconciliationEntry, { opaque: true }>;
type ReconciliationReport = {
  version: number; entries: ReconciliationEntry[];
  summary: { plugins: number; sourceItems: number; arguments: number; qxReconciled: number; surgeReconciled: number };
};
type ManualAssets = { version: number; assets: { id: string; qx?: string; surge?: string; mode?: string }[] };
type SyncEvidence = { publishable?: boolean; convertedPlugins?: string[]; retainedPlugins?: string[]; failures?: { plugin: { id: string } }[] };
function markdownReconciliation(report: ReconciliationReport) {
  const lines = ["# WayX Source to Target Reconciliation", ""];
  lines.push(
    "| Plugin | Source items | QX converted | QX comment/review/issue/drop | QX OK | Surge converted | Surge comment/review/issue/drop | Surge OK |",
  );
  lines.push("|---|---:|---:|---:|:---:|---:|---:|:---:|");
  for (const item of report.entries.filter(
    (entry): entry is ConvertedReconciliation =>
      !entry.opaque && (!entry.qx.reconciled || !entry.surge.reconciled),
  )) {
    const q = item.qx.counts,
      s = item.surge.counts;
    lines.push(
      "| " +
        item.id +
        (item.paused
          ? " (paused; retained baseline)"
          : item.retained
            ? " (retained baseline; see sync Issue)"
            : "") +
        " | " +
        item.source.items +
        " | " +
        q.converted +
        " | " +
        (item.qx.sourceItems - q.converted) +
        " | " +
        (item.qx.reconciled ? "yes" : "NO") +
        " | " +
        s.converted +
        " | " +
        (item.surge.sourceItems - s.converted) +
        " | " +
        (item.surge.reconciled ? "yes" : "NO") +
        " |",
    );
  }
  lines.push(
    "",
    "- Catalog plugins: " + report.summary.plugins,
    "- Source semantic items: " + report.summary.sourceItems,
    "- Source Argument declarations: " + report.summary.arguments,
    "- QX reconciled: " +
      report.summary.qxReconciled +
      "/" +
      report.summary.plugins,
    "- Surge reconciled: " +
      report.summary.surgeReconciled +
      "/" +
      report.summary.plugins,
    "",
  );
  for (const entry of report.entries.filter((e): e is OpaqueReconciliation => e.opaque!))
    lines.push(
      `- ${entry.id}: opaque source archived (${entry.acquisition.sha256}); conversion skipped, prior outputs retained when available.`,
    );
  return lines.join("\n");
}
let baseline: { version: number; review: { byPlatform: Record<string, number> } };
try {
  baseline = JSON.parse(await fs.readFile(BASELINE, "utf8"));
} catch (error) {
  throw new Error(
    "Cannot read Review baseline " + BASELINE + ": " + error.message,
    { cause: error },
  );
}
if (
  baseline?.version !== 1 ||
  !["qx", "surge"].every(
    (platform: string) =>
      Number.isSafeInteger(baseline?.review?.byPlatform?.[platform]) &&
      baseline.review.byPlatform[platform] >= 0,
  )
) {
  throw new Error(
    "Invalid Review baseline " +
      BASELINE +
      ": expected version 1 and nonnegative integer platform counts",
  );
}
await fs.mkdir(OUT_DIR, { recursive: true });
const catalog = await loadLoonSourceCatalog(SOURCE_CATALOG);
const manualConfig = await readJson<ManualAssets>(MANUAL_ASSETS, {
  version: 1,
  assets: [],
});
const reconciliation: ReconciliationReport = {
  version: 1,
  entries: [],
  summary: {
    plugins: catalog.length,
    sourceItems: 0,
    arguments: 0,
    qxReconciled: 0,
    surgeReconciled: 0,
  },
};
const inventory: InventoryMarker[] = [];
const validation = await readValidationReport(ROOT);
const auditCandidate = validation.stages.verify?.checks.find(
  check => check.id === "repository-audit" && check.status === "passed",
);
const audit = validAuditEvidence(auditCandidate) ? auditCandidate : undefined;
const sync = await readJson<SyncEvidence>(
  path.join(ROOT, ".github/monitor/.runtime/sync-failures.json"),
  {},
);
const auditedPlugins = new Set(audit?.coverage.plugins ?? []);
const verifiedPlugins = new Set(
  sync.publishable === true
    ? (sync.convertedPlugins || []).filter((id) =>
        auditedPlugins.has(id),
      )
    : [],
);
const pauseKelee = await keleePaused(ROOT);
// Modified: 2026-10-30 (chance). A deliberately frozen source retains its baseline, not current conversion evidence.
const pausedIds = new Set(
  catalog
    .filter((e) => pauseKelee && isKeleeSource(e.source))
    .map((e) => e.id),
);
const retainedPlugins = new Set(
  sync.publishable === true
    ? (sync.retainedPlugins || []).filter(
        (id) =>
          sync.failures?.some(
            (failure) => failure.plugin.id === id,
          ) || pausedIds.has(id),
      )
    : [],
);
const opaque = await opaqueEntries(ROOT);
for (const entry of catalog) {
  if (opaque[entry.id]?.url === entry.source) {
    const prior = await readManagedTargetState(ROOT, entry);
    reconciliation.entries.push({
      id: entry.id,
      opaque: true,
      retained: Boolean(prior.qx && prior.surge),
      acquisition: opaque[entry.id],
    });
    continue;
  }
  const sourcePath = path.join(ROOT, "Resource", "Loon", entry.file);
  const qxPath = path.join(ROOT, qxTargetPath(entry));
  const surgePath = path.join(ROOT, surgeTargetPath(entry));
  const [source, qx, surge] = await Promise.all([
    read(sourcePath),
    read(qxPath),
    read(surgePath),
  ]);
  const parsed = sourceItems(source);
  const sourceVerified =
    verifiedPlugins.has(entry.id) &&
    audit?.coverage.artifacts[rel(sourcePath)] ===
      validationArtifactDigest(source);
  const qxRecon = reconcileTarget(
    parsed.items,
    qx,
    sourceVerified &&
      audit?.coverage.artifacts[rel(qxPath)] === validationArtifactDigest(qx),
  );
  const surgeRecon = reconcileTarget(
    parsed.items,
    surge,
    sourceVerified &&
      audit?.coverage.artifacts[rel(surgePath)] ===
        validationArtifactDigest(surge),
  );
  reconciliation.entries.push({
    id: entry.id,
    retained: retainedPlugins.has(entry.id),
    paused: pausedIds.has(entry.id),
    source: {
      file: rel(sourcePath),
      items: parsed.items.length,
      arguments: parsed.arguments.length,
      bySection: Object.fromEntries(
        [...new Set(parsed.items.map((x) => x.section))]
          .sort()
          .map((section) => [
            section,
            parsed.items.filter((x) => x.section === section).length,
          ]),
      ),
    },
    qx: qxRecon,
    surge: surgeRecon,
  });
  reconciliation.summary.sourceItems += parsed.items.length;
  reconciliation.summary.arguments += parsed.arguments.length;
  if (qxRecon.reconciled) reconciliation.summary.qxReconciled++;
  if (surgeRecon.reconciled) reconciliation.summary.surgeReconciled++;
  inventory.push(...inventoryMarkers(qx, rel(qxPath), "qx", "catalog"));
  inventory.push(
    ...inventoryMarkers(surge, rel(surgePath), "surge", "catalog"),
  );
}
for (const asset of manualConfig.assets || []) {
  for (const [platform, key] of [
    ["qx", "qx"],
    ["surge", "surge"],
  ] as const) {
    if (!asset[key]) continue;
    const file = path.join(ROOT, asset[key]!);
    inventory.push(
      ...inventoryMarkers(await read(file), rel(file), platform, "manual"),
    );
  }
}
const reviews = inventory.filter(
  (item) => item.kind === "review",
);
const issues = inventory.filter((item) => item.kind === "issue");
const reviewInventory = {
  version: 1,
  review: summarizeMarkers(reviews),
  issue: summarizeMarkers(issues),
  items: inventory,
  manualAssets: (manualConfig.assets || []).map((asset) => ({
    id: asset.id,
    qx: asset.qx,
    surge: asset.surge,
    mode: asset.mode,
  })),
};
for (const platform of ["qx", "surge"]) {
  const current = reviewInventory.review.byPlatform[platform] || 0;
  const prior = baseline.review.byPlatform[platform];
  if (current > prior)
    console.log(
      "::warning title=Review inventory increased::" +
        platform +
        " Review count increased from " +
        prior +
        " to " +
        current,
    );
}
const reconciliationJson = path.join(
  OUT_DIR,
  "conversion-reconciliation.json",
);
const reconciliationMd = path.join(
  OUT_DIR,
  "conversion-reconciliation.md",
);
const reviewJson = path.join(OUT_DIR, "review-inventory.json");
const reviewMd = path.join(OUT_DIR, "review-inventory.md");
await Promise.all([
  fs.writeFile(
    reconciliationJson,
    JSON.stringify(reconciliation, null, 2) + "\n",
  ),
  fs.writeFile(reconciliationMd, markdownReconciliation(reconciliation)),
  fs.writeFile(reviewJson, JSON.stringify(reviewInventory, null, 2) + "\n"),
  fs.writeFile(reviewMd, markdownInventory(reviews, issues)),
]);
console.log("Reconciliation report: " + rel(reconciliationJson));
console.log("Review inventory: " + rel(reviewJson));
console.log(
  "Review totals: QX=" +
    (reviewInventory.review.byPlatform.qx || 0) +
    ", Surge=" +
    (reviewInventory.review.byPlatform.surge || 0) +
    "; Issue=" +
    reviewInventory.issue.total,
);
const bad = reconciliation.entries.filter(
  (entry): entry is ConvertedReconciliation =>
    !entry.opaque &&
    !entry.retained &&
    (!entry.qx.reconciled || !entry.surge.reconciled),
);
if (bad.length) {
  for (const entry of bad) {
    if (!entry.qx.reconciled)
      console.error(
        "::error title=QX reconciliation failed::" +
          entry.id +
          " lacks current conversion/output evidence or has unmatched source/target declarations",
      );
    if (!entry.surge.reconciled)
      console.error(
        "::error title=Surge reconciliation failed::" +
          entry.id +
          " lacks current conversion/output evidence or has unmatched source/target declarations",
      );
  }
  process.exitCode = 1;
}
