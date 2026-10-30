import { opaqueEntries } from "../ingest/formats.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript publish layer; preserve source behavior.
// WayX machine-readable reconciliation + Review inventory reports
// Author: chance
// Category: Converter / Audit / Reports
import fs from "node:fs/promises";
import path from "node:path";
import { loadLoonSourceCatalog } from "../parser/input.ts";
import {
  validationArtifactDigest,
  qxTargetPath,
  surgeTargetPath,
  readManagedTargetState,
} from "./workflow.ts";
const ROOT: any = process.cwd();
const SOURCE_CATALOG: any = path.join(ROOT, ".github", "sources", "loon.json");
const MANUAL_ASSETS: any = path.join(ROOT, ".github", "manual-assets.json");
const BASELINE: any = path.join(
  ROOT,
  ".github",
  "converter",
  "fixtures",
  "review-inventory-baseline.json",
);
function argValue(name: any, fallback: any): any {
  const index: any = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}
const OUT_DIR: any = path.resolve(
  ROOT,
  argValue("--out-dir", ".github/monitor/.runtime"),
);
const normalize: any = (text: any): any =>
  String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "");
const read: any = async (file: any): Promise<any> =>
  normalize(await fs.readFile(file, "utf8"));
async function readJson(file: any, fallback: any = null): Promise<any> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error: any) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}
const rel: any = (file: any): any =>
  path.relative(ROOT, file).split(path.sep).join("/");
const isComment: any = (line: any): any =>
  /^(?:#|;|\/\/)/.test(String(line).trim());
function sourceItems(text: any): any {
  const items: any = [];
  const argumentsList: any = [];
  let section: any = null;
  let lineNumber: any = 0;
  for (const raw of normalize(text).split("\n")) {
    lineNumber++;
    const trimmed: any = raw.trim();
    const header: any = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      continue;
    }
    if (!section || !trimmed || isComment(trimmed)) continue;
    const item: any = { section, line: trimmed, lineNumber };
    if (section === "Argument") argumentsList.push(item);
    else items.push(item);
  }
  return { items, arguments: argumentsList };
}
function markerKind(line: any): any {
  const text: any = String(line || "");
  if (/ISSUE REQUIRED/.test(text)) return "issue";
  if (/REVIEW REQUIRED/.test(text)) return "review";
  if (/Script disabled by source|disabled by source/i.test(text))
    return "disabled";
  if (/unsupported|commented out|cannot be represented/i.test(text))
    return "unsupported";
  return "commented";
}
function declarationMarkers(text: any): any {
  const lines: any = normalize(text).split("\n");
  const out: any = [];
  for (let i: any = 0; i < lines.length; i++) {
    const match: any = lines[i].trim().match(/^# Source declaration:\s*(.+)$/);
    if (!match) continue;
    let context: any = "";
    for (let j: any = i - 1; j >= Math.max(0, i - 5); j--) {
      const candidate: any = lines[j].trim();
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
  text: any,
  file: any,
  platform: any,
  scope: any,
): any {
  const out: any = [];
  const lines: any = normalize(text).split("\n");
  for (let i: any = 0; i < lines.length; i++) {
    const t: any = lines[i].trim();
    const review: any = t.match(
      /^# \[WayX\]\s*([^:]*REVIEW REQUIRED):\s*(.*)$/,
    );
    const issue: any = t.match(
      /^# \[WayX\]\s*ISSUE REQUIRED \[([^\]]+)\]:\s*(.*)$/,
    );
    if (!review && !issue) continue;
    let source: any = "";
    for (let j: any = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const m: any = lines[j].trim().match(/^# Source declaration:\s*(.+)$/);
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
      reason: (review ? review[2] : issue[2]).trim(),
      source,
      file,
      line: i + 1,
      platform,
      scope,
    });
  }
  return out;
}
function intentionalDrop(item: any, target: any): any {
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
function activeTargetStats(text: any): any {
  let activeLines: any = 0,
    generatedHelperLines: any = 0,
    sourceScriptLines: any = 0;
  for (const raw of normalize(text).split("\n")) {
    const t: any = raw.trim();
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
function multimap(markers: any): any {
  const map: any = new Map();
  for (const marker of markers) {
    if (!map.has(marker.source)) map.set(marker.source, []);
    map.get(marker.source).push(marker);
  }
  return map;
}
function popMarker(map: any, source: any): any {
  const list: any = map.get(source);
  if (!list?.length) return null;
  const order: any = [
    "issue",
    "review",
    "unsupported",
    "disabled",
    "commented",
  ];
  list.sort(
    (a: any, b: any): any => order.indexOf(a.kind) - order.indexOf(b.kind),
  );
  return list.shift();
}
function reconcileTarget(
  items: any,
  targetText: any,
  target: any,
  verified: any,
): any {
  const markers: any = declarationMarkers(targetText);
  const markerMap: any = multimap(markers);
  const counts: any = {
    converted: 0,
    review: 0,
    issue: 0,
    unsupported: 0,
    disabled: 0,
    commented: 0,
    intentionalDrop: 0,
    unverified: 0,
  };
  const details: any = [];
  for (const item of items) {
    const drop: any = intentionalDrop(item, target);
    if (drop) {
      counts.intentionalDrop++;
      details.push({ ...item, outcome: "intentionalDrop", reason: drop });
      continue;
    }
    const marker: any = popMarker(markerMap, item.line);
    if (marker) {
      counts[marker.kind]++;
      details.push({
        ...item,
        outcome: marker.kind,
        reason: marker.marker || marker.kind,
      });
      continue;
    }
    const outcome: any = verified ? "converted" : "unverified";
    counts[outcome]++;
    details.push({ ...item, outcome });
  }
  const unmatchedTargetDeclarations: any = [];
  for (const list of markerMap.values())
    for (const marker of list) unmatchedTargetDeclarations.push(marker);
  const total: any = Object.values(counts).reduce(
    (sum: any, value: any): any => sum + value,
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
function summarizeMarkers(items: any): any {
  const summary: any = {
    total: items.length,
    byPlatform: { qx: 0, surge: 0 },
    byFile: {},
    byReason: {},
  };
  for (const item of items) {
    summary.byPlatform[item.platform] =
      (summary.byPlatform[item.platform] || 0) + 1;
    summary.byFile[item.file] = (summary.byFile[item.file] || 0) + 1;
    const key: any = item.reason || item.family || item.code || "unknown";
    summary.byReason[key] = (summary.byReason[key] || 0) + 1;
  }
  summary.byFile = Object.fromEntries(Object.entries(summary.byFile).sort());
  summary.byReason = Object.fromEntries(
    Object.entries(summary.byReason).sort(
      (a: any, b: any): any => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );
  return summary;
}
function markdownInventory(reviews: any, issues: any): any {
  const lines: any = ["# WayX Review / Issue Inventory", ""];
  for (const [title, list] of [
    ["Review", reviews],
    ["Issue", issues],
  ]) {
    const summary: any = summarizeMarkers(list);
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
function markdownReconciliation(report: any): any {
  const lines: any = ["# WayX Source to Target Reconciliation", ""];
  lines.push(
    "| Plugin | Source items | QX converted | QX comment/review/issue/drop | QX OK | Surge converted | Surge comment/review/issue/drop | Surge OK |",
  );
  lines.push("|---|---:|---:|---:|:---:|---:|---:|:---:|");
  for (const item of report.entries.filter(
    (entry: any): any =>
      !entry.opaque && (!entry.qx.reconciled || !entry.surge.reconciled),
  )) {
    const q: any = item.qx.counts,
      s: any = item.surge.counts;
    lines.push(
      "| " +
        item.id +
        (item.retained ? " (retained baseline; see sync Issue)" : "") +
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
  for (const entry of report.entries.filter((e: any) => e.opaque))
    lines.push(
      `- ${entry.id}: opaque source archived (${entry.acquisition.sha256}); conversion skipped, prior outputs retained when available.`,
    );
  return lines.join("\n");
}
let baseline: any;
try {
  baseline = JSON.parse(await fs.readFile(BASELINE, "utf8"));
} catch (error: any) {
  throw new Error(
    "Cannot read Review baseline " + BASELINE + ": " + error.message,
    { cause: error },
  );
}
if (
  baseline?.version !== 1 ||
  !["qx", "surge"].every(
    (platform: any): any =>
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
const catalog: any = await loadLoonSourceCatalog(SOURCE_CATALOG);
const manualConfig: any = await readJson(MANUAL_ASSETS, {
  version: 1,
  assets: [],
});
const reconciliation: any = {
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
const inventory: any = [];
const validation: any = await readJson(
  path.join(ROOT, ".github/monitor/.runtime/validation-results.json"),
  { stages: {} },
);
const audit: any = validation.stages?.verify?.checks?.find(
  (check: any): any =>
    check.id === "repository-audit" && check.status === "passed",
);
const sync: any = await readJson(
  path.join(ROOT, ".github/monitor/.runtime/sync-failures.json"),
  {},
);
const auditedPlugins: any = new Set(audit?.coverage?.plugins || []);
const verifiedPlugins: any = new Set(
  sync.publishable === true
    ? (sync.convertedPlugins || []).filter((id: any): any =>
        auditedPlugins.has(id),
      )
    : [],
);
const retainedPlugins: any = new Set(
  sync.publishable === true
    ? (sync.retainedPlugins || []).filter((id: any): any =>
        sync.failures?.some((failure: any): any => failure.plugin.id === id),
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
  const sourcePath: any = path.join(ROOT, "Resource", "Loon", entry.file);
  const qxPath: any = path.join(ROOT, qxTargetPath(entry));
  const surgePath: any = path.join(ROOT, surgeTargetPath(entry));
  const [source, qx, surge] = await Promise.all([
    read(sourcePath),
    read(qxPath),
    read(surgePath),
  ]);
  const parsed: any = sourceItems(source);
  const sourceVerified: any =
    verifiedPlugins.has(entry.id) &&
    audit.coverage.artifacts?.[rel(sourcePath)] ===
      validationArtifactDigest(source);
  const qxRecon: any = reconcileTarget(
    parsed.items,
    qx,
    "qx",
    sourceVerified &&
      audit.coverage.artifacts?.[rel(qxPath)] === validationArtifactDigest(qx),
  );
  const surgeRecon: any = reconcileTarget(
    parsed.items,
    surge,
    "surge",
    sourceVerified &&
      audit.coverage.artifacts?.[rel(surgePath)] ===
        validationArtifactDigest(surge),
  );
  reconciliation.entries.push({
    id: entry.id,
    retained: retainedPlugins.has(entry.id),
    source: {
      file: rel(sourcePath),
      items: parsed.items.length,
      arguments: parsed.arguments.length,
      bySection: Object.fromEntries(
        [...new Set(parsed.items.map((x: any): any => x.section))]
          .sort()
          .map((section: any): any => [
            section,
            parsed.items.filter((x: any): any => x.section === section).length,
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
  ]) {
    if (!asset[key]) continue;
    const file: any = path.join(ROOT, asset[key]);
    inventory.push(
      ...inventoryMarkers(await read(file), rel(file), platform, "manual"),
    );
  }
}
const reviews: any = inventory.filter(
  (item: any): any => item.kind === "review",
);
const issues: any = inventory.filter((item: any): any => item.kind === "issue");
const reviewInventory: any = {
  version: 1,
  review: summarizeMarkers(reviews),
  issue: summarizeMarkers(issues),
  items: inventory,
  manualAssets: (manualConfig.assets || []).map((asset: any): any => ({
    id: asset.id,
    qx: asset.qx,
    surge: asset.surge,
    mode: asset.mode,
  })),
};
for (const platform of ["qx", "surge"]) {
  const current: any = reviewInventory.review.byPlatform[platform] || 0;
  const prior: any = baseline.review.byPlatform[platform];
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
const reconciliationJson: any = path.join(
  OUT_DIR,
  "conversion-reconciliation.json",
);
const reconciliationMd: any = path.join(
  OUT_DIR,
  "conversion-reconciliation.md",
);
const reviewJson: any = path.join(OUT_DIR, "review-inventory.json");
const reviewMd: any = path.join(OUT_DIR, "review-inventory.md");
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
const bad: any = reconciliation.entries.filter(
  (entry: any): any =>
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
