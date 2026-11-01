import { prepareScriptApiAdapters } from "./script-api.ts";
// Modified: 2026-11-01 (chance). Archive upstream bytes and publish only verified WayX script references, in one repository transaction.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  listFiles,
  readJson,
  readOptional,
  safePath,
  commitFiles,
} from "../publish/transaction.ts";
import {
  scriptReferences,
  repairScriptEchoDeclarations,
  sourceScriptUrls,
  replaceScriptReferences,
} from "../parser/backup-references.ts";
import { identifyResource } from "../ingest/formats.ts";
const RAW_BASE = "https://raw.githubusercontent.com/JuemingDC/WayX/main";
const INDEX = "Resource/Backup/index.json";
const digest = (value: string | Uint8Array) =>
  crypto.createHash("sha256").update(value).digest("hex");
export type BackupObject = {
  url: string;
  path: string;
  sha256: string;
  size: number;
  kind: "script" | "plugin";
  acquiredUrl?: string;
  provenance?: string;
  updatedAt?: string;
  author?: string;
  category?: string;
};
type BackupIndex = {
  version: number;
  objects: Record<string, BackupObject>;
  latest: Record<string, string>;
  adapters?: Record<string, any>;
  bindings?: Record<string, any>;
};
function sourceKey(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}
export function backupObject(
  url: string,
  bytes: Uint8Array,
  kind: BackupObject["kind"],
): BackupObject {
  const key = sourceKey(url),
    sha256 = digest(bytes);
  let name =
    path.posix
      .basename(new URL(key).pathname)
      .replace(/[^a-zA-Z0-9_.-]/g, "_") ||
    (kind === "script" ? "script.js" : "plugin.bin");
  if (kind === "script" && !/\.(?:js|mjs|cjs)$/.test(name)) name += ".js";
  return {
    url: key,
    // Modified: 2026-11-01 (chance). Keep the URL stable and update bytes in place; Git retains every previous revision.
    path: `Resource/Backup/${kind}/${digest(key)}/${name}`,
    sha256,
    size: bytes.byteLength,
    kind,
  };
}
export async function refreshSourceBackups(
  root: string,
  {
    resources,
    catalog = [],
    nativeInputs = [],
    rawBase = RAW_BASE,
    log = console.log,
  }: any,
) {
  const prior = await readJson<BackupIndex>(path.join(root, INDEX), {
    version: 1,
    objects: {},
    latest: {},
  });
  if (prior.version !== 1 || !prior.objects || !prior.latest)
    throw Error("Invalid backup index");
  const index: BackupIndex = structuredClone(prior),
    changes = new Map<string, string | Uint8Array | null>();
  const failures: any[] = [],
    sources: any[] = [],
    pending = new Map<string, Promise<BackupObject | null>>();
  const usedScripts = new Set<string>(),
    requested = new Set<string>(),
    seenSources = new Set<string>(),
    verified = new Set<string>();
  const own = (value: string) =>
    value.startsWith(rawBase + "/") || value.startsWith(RAW_BASE + "/");
  const ownPath = (value: string): string | null => {
    if (!own(value)) return null;
    const url = new URL(value),
      base = value.startsWith(rawBase + "/") ? rawBase : RAW_BASE;
    return decodeURIComponent(
      url.pathname.slice(new URL(base).pathname.length + 1),
    );
  };
  async function verify(record: BackupObject) {
    if (verified.has(record.path)) return;
    if (
      backupObject(record.url, new Uint8Array(), record.kind)
        .path.split("/")
        .slice(0, 4)
        .join("/") !== record.path.split("/").slice(0, 4).join("/")
    )
      throw Error("Invalid backup identity: " + record.path);
    const bytes =
      changes.get(record.path) ??
      (await readOptional(safePath(root, record.path)));
    if (
      !bytes ||
      typeof bytes === "string" ||
      bytes.byteLength !== record.size ||
      digest(bytes) !== record.sha256
    )
      throw Error("Backup checksum mismatch: " + record.path);
    if (record.path !== backupObject(record.url, bytes, record.kind).path)
      throw Error("Backup identity mismatch: " + record.path);
    verified.add(record.path);
  }
  function store(
    url: string,
    bytes: Uint8Array,
    kind: BackupObject["kind"],
    extra = {},
  ): BackupObject {
    if (bytes.byteLength > 95 * 1024 * 1024)
      throw Error("Upstream archive exceeds GitHub file limit: " + url);
    if (!bytes.byteLength) throw Error("Empty upstream response: " + url);
    if (
      /^\s*(?:<!doctype\s+html|<html\b)/i.test(
        Buffer.from(bytes).toString("utf8", 0, 512),
      )
    )
      throw Error("HTML response instead of " + kind + ": " + url);
    const item = backupObject(url, bytes, kind),
      old = prior.objects[item.path];
    const record = {
      ...item,
      ...extra,
      author: "chance",
      category: "Upstream " + kind + " backup",
      updatedAt:
        old?.sha256 === item.sha256
          ? (old.updatedAt ?? new Date().toISOString())
          : new Date().toISOString(),
    };
    index.objects[record.path] = record;
    index.latest[record.url] = record.path;
    changes.set(record.path, bytes);
    verified.add(record.path);
    return record;
  }
  async function script(value: string): Promise<BackupObject | null> {
    const key = sourceKey(value);
    if (!pending.has(key))
      pending.set(
        key,
        (async () => {
          usedScripts.add(key);
          try {
            return store(key, await resources.fetchBytes(key), "script");
          } catch (error: any) {
            const cached = index.objects[prior.latest[key]];
            if (cached) await verify(cached);
            failures.push({
              url: key,
              error: String(error.message || error),
              retained: cached?.path ?? null,
            });
            return cached ?? null;
          }
        })(),
      );
    return pending.get(key)!;
  }
  async function source(
    url: string,
    bytes: Buffer,
    provenance: string,
    acquiredUrl = url,
  ) {
    const record = store(url, bytes, "plugin", { provenance, acquiredUrl });
    sources.push(record);
    seenSources.add(sourceKey(url));
    const format = identifyResource(bytes, url);
    if (format === "opaque" || format === "encrypted-loon") return;
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return;
    }
    for (const ref of sourceScriptUrls(text, url)) requested.add(ref);
  }
  // Read the exact run response when acquired, otherwise archive the frozen/retained source snapshot with explicit provenance.
  for (const entry of catalog) {
    let bytes: Buffer | null = null;
    try {
      bytes = await resources.cachedBytes?.(entry.source);
    } catch {}
    const acquired = bytes !== null;
    bytes ??= await readOptional(path.join(root, "Resource/Loon", entry.file));
    if (bytes)
      await source(
        entry.source,
        bytes,
        acquired ? "run-response" : "retained-repository-snapshot",
      );
  }
  for (const input of nativeInputs) {
    const bytes = await resources.cachedBytes(input.acquiredUrl);
    if (!bytes)
      throw Error(
        "Native source response missing from run snapshot: " +
          input.acquiredUrl,
      );
    await source(input.sourceUrl, bytes, "run-response", input.acquiredUrl);
  }
  const artifacts: {
    relative: string;
    text: string;
    refs: ReturnType<typeof scriptReferences>;
  }[] = [];
  for (const directory of ["Adblock", "Module"])
    for (const file of await listFiles(path.join(root, directory))) {
      if (!/\.(?:snippet|sgmodule|plugin|conf)$/i.test(file)) continue;
      const relative = directory + "/" + file,
        original = await fs.readFile(path.join(root, relative), "utf8");
      // Modified: 2026-11-02 (chance). Apply authorized script-echo corrections to retained/pause artifacts before backup operand discovery.
      const repaired = repairScriptEchoDeclarations(original),
        text = repaired.text;
      if (repaired.count) changes.set(relative, text);
      const refs = scriptReferences(text);
      artifacts.push({ relative, text, refs });
      for (const ref of refs) {
        if (!/^https?:\/\//.test(ref.value)) continue;
        const local = ownPath(ref.value);
        if (local) {
          const old = index.objects[local];
          if (
            old?.kind !== "script" &&
            !(await readOptional(safePath(root, local)))
          )
            throw Error("Missing WayX script: " + relative + " -> " + local);
        }
      }
    }
  // Preserve additional manually registered plugin origins, without re-fetching paused catalog bodies.
  for (const { text } of artifacts)
    for (const [, url] of text.matchAll(
      /^# Source:\s*(https?:\/\/\S+)\s*$/gm,
    )) {
      if (seenSources.has(sourceKey(url)) || own(url)) continue;
      seenSources.add(sourceKey(url));
      try {
        await source(url, await resources.fetchBytes(url), "run-response");
      } catch (error: any) {
        failures.push({
          url,
          error: error.message,
          kind: "plugin",
          retained: prior.latest[sourceKey(url)] ?? null,
        });
      }
    }
  for (const { refs } of artifacts)
    for (const { value } of refs) {
      if (!/^https?:\/\//.test(value)) continue;
      const local = ownPath(value),
        old = local
          ? (index.objects[local] ??
            (index.adapters?.[local]
              ? { url: index.adapters[local].sourceUrl }
              : null))
          : null;
      if (!local || old) requested.add(old?.url ?? value);
    }
  const urls = [...requested];
  for (let i = 0; i < urls.length; i += 8)
    await Promise.all(urls.slice(i, i + 8).map(script));
  let rewritten = 0,
    unresolved = 0;
  for (const { relative, text } of artifacts) {
    const next = replaceScriptReferences(text, (value) => {
      if (!/^https?:\/\//.test(value)) return value;
      const local = ownPath(value),
        original = local ? index.objects[local]?.url : value;
      if (!original) return value;
      const record = index.objects[index.latest[sourceKey(original)]];
      if (!record || record.kind !== "script") {
        unresolved++;
        return value;
      }
      return rawBase + "/" + record.path + new URL(value).hash;
    });
    if (next !== text) {
      changes.set(relative, next);
      rewritten++;
    }
  }
  // Modified: 2026-11-01 (chance). API adaptation uses the archived body, never replaces it, and records every unsupported cross-client API separately.
  const scriptApi = await prepareScriptApiAdapters(root, {
    artifacts,
    catalog,
    index,
    changes,
    rawBase,
  });
  for (const record of Object.values(index.objects)) await verify(record);
  changes.set(INDEX, JSON.stringify(index, null, 2) + "\n");
  const report = {
    version: 1,
    pluginSources: sources.length,
    scriptUrls: usedScripts.size,
    backedUpScripts: [...usedScripts].filter((u) => index.latest[u]).length,
    rewrittenArtifacts: rewritten,
    // Modified: 2026-11-01 (chance). Count shared adblock programs separately from per-declaration references and excluded utilities.
    scriptApi: {
      universal: scriptApi.universal,
      adapted: scriptApi.adapted,
      blocked: scriptApi.blocked,
      excluded: scriptApi.excluded,
    },
    unresolvedReferences: unresolved,
    failures,
  };
  changes.set(
    "Resource/Backup/status.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await commitFiles(root, changes);
  log(
    `Source backups: ${report.backedUpScripts}/${report.scriptUrls} script URLs; ${rewritten} artifacts now reference verified WayX bytes; ${failures.length} acquisition failures`,
  );
  if (failures.length)
    log(
      "::warning::Some upstream scripts are unavailable; see Resource/Backup/status.json. Missing bytes never receive a backup URL.",
    );
  return report;
}
