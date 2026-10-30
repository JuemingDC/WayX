import { opaqueEntries } from "../ingest/formats.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript validation layer; preserve source behavior.
// Managed conversion cleanliness gate.
// Author: chance
// Category: Converter / Full Catalog Validation
import fs from "node:fs/promises";
import path from "node:path";
import { loadLoonSourceCatalog } from "../parser/input.ts";
import {
  writeValidationEvidence,
  buildReadmePlan,
} from "../publish/workflow.ts";
const ROOT: any = process.cwd();
const manifest: any = await loadLoonSourceCatalog(
  path.join(ROOT, ".github/sources/loon.json"),
);
const findings: any = [];
const kelee: any = manifest.filter((entry: any): any =>
  /https:\/\/kelee\.one\/Tool\/Loon\/Lpx\//.test(entry.source),
);
async function readRequired(rel: any, label: any): Promise<any> {
  try {
    return await fs.readFile(path.join(ROOT, rel), "utf8");
  } catch (error: any) {
    findings.push(`${label} missing: ${rel} (${error?.code || error})`);
    return null;
  }
}
const opaque = await opaqueEntries(ROOT);
for (const entry of manifest) {
  if (opaque[entry.id]?.url === entry.source) continue;
  const sourceRel: any = "Resource/Loon/" + entry.file;
  const qxRel: any = "Adblock/Quantumult X/" + entry.qx;
  const surgeRel: any = "Adblock/Surge/" + entry.surge;
  const [source, qx, surge] = await Promise.all([
    readRequired(sourceRel, entry.id + " source"),
    readRequired(qxRel, entry.id + " QX"),
    readRequired(surgeRel, entry.id + " Surge"),
  ]);
  if (source && !/^#!name\s*=\s*\S/m.test(source))
    findings.push(entry.id + ": source lost #!name metadata");
  for (const [target, rel, text] of [
    ["QX", qxRel, qx],
    ["Surge", surgeRel, surge],
  ]) {
    if (!text) continue;
    if (/REVIEW REQUIRED|ISSUE REQUIRED/.test(text))
      findings.push(
        entry.id + ` ${target}: unresolved Review/Issue marker in ${rel}`,
      );
    if (/\[object Object\]|(?:^|[^A-Za-z])undefined(?:[^A-Za-z]|$)/.test(text))
      findings.push(
        entry.id + ` ${target}: accidental serialized runtime token in ${rel}`,
      );
    if (!text.includes("# Source: " + entry.source))
      findings.push(
        entry.id + ` ${target}: source attribution mismatch in ${rel}`,
      );
  }
}
// Discovery prunes retired managed artifacts before conversion; enforce that
// historical leftovers cannot silently remain in the published repository.
for (const [base, field, suffix] of [
  ["Resource/Loon", "file", ".lpx"],
  ["Adblock/Quantumult X", "qx", ".snippet"],
  ["Adblock/Surge", "surge", ".sgmodule"],
]) {
  const expected: any = new Set(
    manifest.map((entry: any): any => entry[field]),
  );
  for (const rel of await fs.readdir(path.join(ROOT, base), {
    recursive: true,
  })) {
    if (!rel.endsWith(suffix) || expected.has(rel)) continue;
    const text: any = await fs.readFile(path.join(ROOT, base, rel), "utf8");
    if (field === "file" || /^# Converted by:\s*chance\s*$/m.test(text))
      findings.push("Retired managed artifact remains: " + base + "/" + rel);
  }
}
const activeIds: any = new Set(manifest.map((entry: any): any => entry.id));
for (const rel of await fs.readdir(path.join(ROOT, "Script"), {
  recursive: true,
})) {
  if (
    activeIds.has(rel.split(path.sep)[0]) ||
    !/[a-z_]+_[0-9a-f]{10}\.js$/.test(rel)
  )
    continue;
  if (
    (await fs.readFile(path.join(ROOT, "Script", rel), "utf8")).includes(
      "// Converted by: chance",
    )
  )
    findings.push("Retired generated helper remains: Script/" + rel);
}
let snapshot: any = null;
try {
  snapshot = JSON.parse(
    await fs.readFile(
      path.join(ROOT, ".github/monitor/.runtime/kelee-catalog.json"),
      "utf8",
    ),
  );
} catch (error: any) {
  if (error?.code !== "ENOENT")
    findings.push(
      "Kelee runtime snapshot unreadable: " + (error?.message || error),
    );
}
if (snapshot) {
  const expected: any = (snapshot.plugins || []).map(
    (item: any): any => item.source,
  );
  const actual: any = kelee.map((entry: any): any => entry.source);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    findings.push("Kelee manifest order differs from plugin-center list order");
  }
  if (Number(snapshot.count) !== actual.length) {
    findings.push(
      `Kelee snapshot count mismatch: snapshot=${snapshot.count} manifest=${actual.length}`,
    );
  }
}
const readme: any = await readRequired("README.md", "README");
if (readme) {
  const expected: any = (await buildReadmePlan(ROOT)).get("README.md");
  if (readme !== expected)
    findings.push(
      "README source groups, collapsed sections or within-source catalog order differ from generated index",
    );
  for (const entry of kelee) {
    const marker: any =
      "Adblock/Quantumult%20X/" +
      encodeURIComponent(entry.qx).replace(/%2F/g, "/");
    let index: any = readme.indexOf(marker);
    if (index < 0) {
      // GitHub blob links percent-encode the directory space, while filenames can
      // contain Unicode/space encodings. Fall back to the encoded filename.
      index = readme.indexOf(encodeURIComponent(entry.qx));
    }
    if (index < 0) {
      findings.push(
        entry.id + ": README missing QX Adblock row for " + entry.qx,
      );
      continue;
    }
  }
}
await writeValidationEvidence(
  manifest.length,
  findings.map((text: any): any => ({ code: "managed-integrity", text })),
);
if (findings.length) {
  console.error(
    "Managed conversion cleanliness gate failed with " +
      findings.length +
      " finding(s):",
  );
  for (const finding of findings) console.error("- " + finding);
  process.exitCode = 1;
} else {
  console.log(
    `Managed conversion cleanliness gate passed: catalog=${manifest.length}, Kelee=${kelee.length}, unresolved Review/Issue=0, README order preserved.`,
  );
}
