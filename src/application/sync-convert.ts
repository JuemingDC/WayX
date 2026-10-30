import { loadIconIndex } from "../ingest/icons.ts";
import { backfillIcons } from "./icons.ts";
import {
  identifyResource,
  archiveOpaque,
  clearOpaque,
} from "../ingest/formats.ts";
import { fetchOriginalBytes } from "../ingest/resources.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript application layer; preserve source behavior.
import { keleePaused, isKeleeSource } from "../ingest/source-pause.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { createResourceSnapshot } from "../ingest/resources.ts";
import { loadLoonSourceCatalog, fetchOriginalText } from "../parser/input.ts";
import {
  materializeConversionRunContext,
  convertPluginWithContext,
} from "../emit/conversion.ts";
import {
  prepareNativeQxSync,
  commitNativeQxSync,
  createWorkflowFailureReporter,
  writeReadmePlan,
  normalizeManagedSource,
  nowConversionStamp,
  inspectManagedSource,
  readCatalogSource,
  readManagedTargetState,
  commitManagedConversion,
  buildSyncFailure,
  writeSyncFailureReport,
} from "../publish/workflow.ts";
import { collectIssueCandidates } from "./propose-conversion-issues.ts";
const ROOT: any = process.cwd();
const RAW_BASE: any = "https://raw.githubusercontent.com/JuemingDC/WayX/main";
export function isLoonPluginSource(text: any): any {
  const source: any = String(text ?? "");
  return /^#!name\s*=\s*\S/m.test(source) && /^\[[^\]]+\]\s*$/m.test(source);
}
// Modified: 2026-10-25 (chance). Preparation can be separated from the
// per-plugin conversion/write transaction without repeating acquisition.
// Each plugin has its own conversion and write transaction. The catalog loop
// continues only after a failure has left the previous artifacts intact.
export async function syncCatalogEntry(
  entry: any,
  {
    root = ROOT,
    fetchText = fetchOriginalText,
    fetchBytes = null,
    materialize = materializeConversionRunContext,
    convert = convertPluginWithContext,
    commit = commitManagedConversion,
    log = console.log,
    resources = null,
    prepared = null,
    prepareOnly = false,
    icons = null,
  }: any = {},
): Promise<any> {
  // Modified: 2026-10-29 (chance). Direct callers also honor source freeze.
  if ((await keleePaused(root)) && isKeleeSource(entry.source))
    return { id: entry.id, paused: true };
  let stage: any = "read-current-source",
    previousSource: any = null,
    source: any = null,
    targetState: any = null;
  const onStage: any = (value: any): any => {
    stage = value;
  };
  let declarations: any = null;
  try {
    let context: any, sourceState: any, changed: any;
    if (prepared) {
      if (prepared.id !== entry.id || prepared.sourceUrl !== entry.source)
        throw new Error("Prepared entry does not match catalog source");
      ({ previousSource, source, targetState, context, sourceState, changed } =
        prepared);
      stage = "convert";
    } else {
      try {
        previousSource = await readCatalogSource(root, entry);
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
      }
      stage = "read-target-state";
      targetState = await readManagedTargetState(root, entry);
      stage = "fetch-upstream";
      // Modified: 2026-10-30 (chance). Preserve opaque original bytes before
      // decoding. A successful encrypted download is not a conversion.
      const bytes = resources?.fetchBytes
        ? await resources.fetchBytes(entry.source)
        : fetchBytes
          ? await fetchBytes(entry.source)
          : fetchText === fetchOriginalText
            ? await fetchOriginalBytes(entry.source)
            : Buffer.from(await fetchText(entry.source), "utf8");
      const format = identifyResource(bytes, entry.source);
      if (format === "opaque" || format === "encrypted-loon") {
        const record = await archiveOpaque(
          root,
          entry.id,
          entry.source,
          bytes,
          format,
        );
        return {
          id: entry.id,
          opaque: true,
          record,
          baselineAvailable: Boolean(
            previousSource && targetState?.qx && targetState?.surge,
          ),
        };
      }
      source = normalizeManagedSource(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
      stage = "validate-source";
      if (!isLoonPluginSource(source))
        throw new Error("downloaded content is not a valid Loon plugin");
      await clearOpaque(root, entry.id);
      stage = "inspect-source-change";
      sourceState = await inspectManagedSource(root, entry, source);
      changed = sourceState.changed;
      log(
        `${changed ? "changed" : "unchanged"} upstream source via ${entry.source}; sha256=${sourceState.digest}`,
      );
      // Every Action compiles every entry, including unchanged upstream text:
      // Generator, specification and remote dependency changes affect output too.
      stage = "review-source-semantics";
      const semantic: any = await collectIssueCandidates({
        root,
        catalog: [entry],
        sourceOverrides: new Map([[entry.id, source]]),
        includeTargets: false,
        includeSyncFailures: false,
      });
      if (semantic.targetProblems.length) {
        declarations = semantic.targetProblems.flatMap(
          (problem: any): any => problem.declarations,
        );
        throw new Error(
          "Unknown or invalid source grammar: " +
            semantic.targetProblems
              .flatMap((problem: any): any => problem.reasons)
              .join("; "),
        );
      }
      context = await materialize(entry, source, {
        onStage,
        resources,
        fetchText,
      });
    }
    if (prepareOnly)
      return {
        id: entry.id,
        sourceUrl: entry.source,
        previousSource,
        source,
        targetState,
        context,
        sourceState,
        changed,
      };
    const out: any = convert(entry, source, context, {
      stamp: nowConversionStamp(),
      rawBase: RAW_BASE,
      icons,
      onStage,
    });
    stage = "review-target-mapping";
    if (
      /^# \[WayX\].*(?:REVIEW REQUIRED|ISSUE REQUIRED)/m.test(
        out.qx + "\n" + out.surge,
      )
    ) {
      declarations = [
        ...(out.qx + "\n" + out.surge).matchAll(
          /^# Source declaration:\s*(.+)$/gm,
        ),
      ].map((match: any): any => ({ section: "Source", line: match[1] }));
      throw new Error(
        "Target mapping requires review; previous source and outputs retained",
      );
    }
    const { helperChanges, targetChanges } = await commit(
      root,
      entry,
      targetState,
      out,
      { sourceState, source, onStage },
    );
    log(
      targetChanges.length || helperChanges.length || changed
        ? `synced -> ${entry.file}; ${targetState.qxRelativePath}; ${targetState.surgeRelativePath}`
        : "conversion verified: source and outputs unchanged",
    );
    return { id: entry.id, changed, helperChanges, targetChanges };
  } catch (error: any) {
    error.syncFailure = buildSyncFailure({
      entry,
      stage,
      error,
      previousSource,
      fetchedSource: source,
    });
    if (declarations?.length) error.syncFailure.declarations = declarations;
    error.baselineAvailable = Boolean(
      previousSource && targetState?.qx && targetState?.surge,
    );
    error.rollbackSucceeded = error.rollbackSucceeded !== false;
    throw error;
  }
}
async function deferCatalogEntries(
  root: any,
  manifest: any,
  deferredPlugins: any,
): Promise<any> {
  if (!deferredPlugins.length) return;
  const deferred: any = new Set(deferredPlugins);
  const catalog: any = path.join(root, ".github/sources/loon.json");
  const snapshot: any = path.join(
    root,
    ".github/monitor/.runtime/kelee-catalog.json",
  );
  const originals: any = new Map();
  for (const file of [catalog, snapshot])
    try {
      originals.set(file, await fs.readFile(file));
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
      originals.set(file, null);
    }
  try {
    await fs.writeFile(
      catalog,
      JSON.stringify(
        manifest.filter((entry: any): any => !deferred.has(entry.id)),
        null,
        2,
      ) + "\n",
    );
    if (originals.get(snapshot)) {
      const data: any = JSON.parse(originals.get(snapshot));
      data.plugins = data.plugins
        .filter((plugin: any): any => !deferred.has(plugin.id))
        .map((plugin: any, order: any): any => ({ ...plugin, order }));
      data.count = data.plugins.length;
      await fs.writeFile(snapshot, JSON.stringify(data, null, 2) + "\n");
    }
  } catch (error: any) {
    for (const [file, bytes] of originals)
      if (bytes) await fs.writeFile(file, bytes);
      else await fs.rm(file, { force: true });
    throw error;
  }
}
export async function runCatalogSync({
  root = ROOT,
  entryOptions = {},
  log = console.log,
  writeError = console.error,
  warn = console.warn,
}: any = {}): Promise<any> {
  const manifest: any = await loadLoonSourceCatalog(
    path.join(root, ".github/sources/loon.json"),
  );
  const failures: any = createWorkflowFailureReporter({
    summaryLabel: "Isolated sync failures",
    writeError,
  });
  const structuredFailures: any = [],
    opaquePlugins: any = [],
    validatedPlugins: any = [],
    convertedPlugins: any = [],
    updatedPlugins: any = [],
    unchangedPlugins: any = [],
    retainedPlugins: any = [],
    deferredPlugins: any = [];
  let publishable: any = true;
  // Modified: 2026-10-25 (chance). Finish acquisition for the complete catalog
  // and seal one shared snapshot before any target is generated or committed.
  const resources: any = createResourceSnapshot({
    directory: path.join(
      root,
      ".github/monitor/.runtime/resources",
      crypto.randomUUID(),
    ),
    fetchText: entryOptions.fetchText,
    fetchBytes:
      entryOptions.fetchBytes ??
      (entryOptions.fetchText
        ? async (url: string) =>
            Buffer.from(await entryOptions.fetchText(url), "utf8")
        : undefined),
  });
  // Modified: 2026-10-30 (chance). Share one original icon snapshot with all emitters.
  const icons = await loadIconIndex(root, resources);
  const preparedEntries: any = [];
  const capture: any = (entry: any, error: any): any => {
    failures.capture(entry, error);
    structuredFailures.push(
      error.syncFailure || buildSyncFailure({ entry, stage: "sync", error }),
    );
    if (!error.rollbackSucceeded) publishable = false;
    else if (error.baselineAvailable) retainedPlugins.push(entry.id);
    else deferredPlugins.push(entry.id);
  };
  for (const entry of manifest) {
    log(`\n== acquire ${entry.id} ==`);
    try {
      const prepared: any = await syncCatalogEntry(entry, {
        ...entryOptions,
        root,
        log,
        fetchText: resources.fetchText,
        resources,
        prepareOnly: true,
      });
      if (prepared.opaque) {
        opaquePlugins.push({
          id: entry.id,
          ...prepared.record,
          baselineAvailable: prepared.baselineAvailable,
        });
        if (prepared.baselineAvailable) retainedPlugins.push(entry.id);
        log(
          `opaque ${entry.id}: downloaded original retained; target conversion skipped`,
        );
        continue;
      }
      if (prepared.paused) {
        retainedPlugins.push(entry.id);
        log(`paused ${entry.id}: existing artifacts retained`);
        continue;
      }
      preparedEntries.push({ entry, prepared });
    } catch (error: any) {
      capture(entry, error);
    }
  }
  // Modified: 2026-10-25 (chance). Acquire native QX app bundles in the same
  // run snapshot; a failed/partial source set prevents publication.
  let nativeQxPlan: any = null;
  try {
    nativeQxPlan = await prepareNativeQxSync(root, {
      fetchText: resources.fetchText,
      icons,
    });
  } catch (error: any) {
    publishable = false;
    writeError("Native QX acquisition failed: " + String(error.stack || error));
  }
  await resources.seal();
  for (const { entry, prepared } of preparedEntries) {
    log(`\n== convert ${entry.id} ==`);
    try {
      const result: any = await syncCatalogEntry(entry, {
        ...entryOptions,
        root,
        log,
        resources,
        prepared,
        icons,
      });
      validatedPlugins.push(entry.id);
      convertedPlugins.push(entry.id);
      (result.targetChanges.length || result.helperChanges.length
        ? updatedPlugins
        : unchangedPlugins
      ).push(entry.id);
    } catch (error: any) {
      capture(entry, error);
    }
  }
  try {
    if (publishable) {
      await deferCatalogEntries(root, manifest, deferredPlugins);
    }
    if (publishable) await commitNativeQxSync(root, nativeQxPlan);
    if (publishable) await backfillIcons(root, icons);
    await writeReadmePlan(root);
  } catch (error: any) {
    publishable = false;
    writeError(
      "Catalog/README publication preparation failed: " +
        String(error.stack || error),
    );
  }
  const summary: any = {
    publishable,
    validatedPlugins,
    convertedPlugins,
    updatedPlugins,
    unchangedPlugins,
    retainedPlugins,
    deferredPlugins,
    opaquePlugins,
  };
  await writeSyncFailureReport(root, structuredFailures, { summary });
  failures.report();
  if (structuredFailures.length)
    warn(
      `::warning::${structuredFailures.length} plugin(s) failed; structured failures are available for automatic Issues.`,
    );
  return { ...summary, failures: structuredFailures };
}
async function main(): Promise<any> {
  const result: any = await runCatalogSync();
  if (process.env.GITHUB_OUTPUT)
    await fs.appendFile(
      process.env.GITHUB_OUTPUT,
      "publishable=" +
        result.publishable +
        "\nhas_failures=" +
        (result.failures.length > 0) +
        "\n",
    );
  if (!result.publishable) process.exitCode = 1;
}
const __wayxIsMain: any =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
if (__wayxIsMain) await main();
export { normalizeManagedSource as cleanSource };
