// Modified: 2026-10-30 (chance). Backfill declaration comments only in managed
// targets; do not rewrite source plugins, client logic, timestamps or existing URLs.
import path from "node:path";
import crypto from "node:crypto";
import { addAppIcon } from "../domain/icons.ts";
import type { IconIndex } from "../domain/icons.ts";
import { loadIconIndex } from "../ingest/icons.ts";
import { createResourceSnapshot } from "../ingest/resources.ts";
import { commitFiles, readJson, readOptional } from "../publish/transaction.ts";
export async function backfillIcons(root: string, index: IconIndex | null) {
  if (!index) return { added: [], existing: [], unmatched: [] };
  const catalog = await readJson<any[]>(
      path.join(root, ".github/sources/loon.json"),
      [],
    ),
    native = await readJson<{ outputs: string[] }>(
      path.join(root, ".github/sources/native-qx-state.json"),
      { outputs: [] },
    ),
    manual = await readJson<{ assets: { qx?: string; surge?: string }[] }>(
      path.join(root, ".github/manual-assets.json"),
      { assets: [] },
    );
  const files = new Set<string>([
      ...catalog.flatMap((e) => [
        "Adblock/Quantumult X/" + e.qx,
        "Adblock/Surge/" + e.surge,
      ]),
      ...native.outputs,
      ...manual.assets.flatMap((e) =>
        [e.qx, e.surge].filter((f): f is string => Boolean(f)),
      ),
    ]),
    changes = new Map<string, string>(),
    report: { added: string[]; existing: string[]; unmatched: string[] } = {
      added: [],
      existing: [],
      unmatched: [],
    };
  for (const file of [...files].sort()) {
    if (
      !/^Adblock\/(?:Quantumult X\/.*\.snippet|Surge\/.*\.sgmodule)$/.test(file)
    )
      throw Error("Unmanaged icon target: " + file);
    const bytes = await readOptional(path.join(root, file));
    if (!bytes) continue;
    const result = addAppIcon(bytes.toString("utf8"), index, [
      path.basename(file),
    ]);
    report[
      result.status === "added"
        ? "added"
        : result.status === "existing"
          ? "existing"
          : "unmatched"
    ].push(file);
    if (result.status === "added") changes.set(file, result.text);
  }
  changes.set(
    ".github/monitor/.runtime/icons-result.json",
    JSON.stringify({ version: 1, ...report }, null, 2) + "\n",
  );
  await commitFiles(root, changes);
  return report;
}
export async function refreshIcons(root = process.cwd()) {
  const resources = createResourceSnapshot({
    directory: path.join(
      root,
      ".github/monitor/.runtime/resources/icons-" + crypto.randomUUID(),
    ),
  });
  try {
    const index = await loadIconIndex(root, resources);
    await resources.seal();
    const result = await backfillIcons(root, index);
    console.log(
      `App icon metadata: added=${result.added.length}, existing=${result.existing.length}, unmatched=${result.unmatched.length}`,
    );
    return result;
  } finally {
    await resources.seal();
  }
}
