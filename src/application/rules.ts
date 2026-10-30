// Modified: 2026-10-30 (chance). Rule acquisition, replay and publication use
// shared TypeScript transport/transactions; no Python subprocess remains.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fetchOriginalBytes } from "../ingest/resources.ts";
import { build } from "../domain/aggregate.ts";
import { readJson, readOptional, commitFiles } from "../publish/transaction.ts";
export const MARKER = "# Managed by: WayX Rule Aggregator";
const digest = (v: string | Uint8Array) =>
  crypto.createHash("sha256").update(v).digest("hex");
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        result[i] = await fn(items[i], i);
      }
    }),
  );
  return result;
}
export async function loadInputs(
  root: string,
  config: any,
  online: boolean,
  fetchBytes = fetchOriginalBytes,
): Promise<[Record<string, Buffer>, any]> {
  const configBytes = await fs.readFile(
      path.join(root, ".github/sources/rules.json"),
    ),
    directory = ".github/monitor/.runtime/rule-inputs",
    data: Record<string, Buffer> = {};
  if (!online) {
    const index = await readJson<any>(path.join(root, directory, "index.json"));
    if (index.version !== 1 || index.configuration !== digest(configBytes))
      throw Error("Missing or stale rule input evidence");
    for (const item of index.sources) {
      if (!/^[a-z0-9_-]+$/.test(item.id))
        throw Error("Unsafe rule evidence id");
      const bytes = await fs.readFile(path.join(root, directory, item.id));
      if (digest(bytes) !== item.sha256)
        throw Error("Rule input checksum mismatch: " + item.id);
      data[item.id] = bytes;
    }
    return [data, index];
  }
  const get = (url: string, timeout = 35, allowEmpty = false) =>
    fetchBytes(url, {
      allowEmpty,
      timeoutMs: timeout * 1000,
      maxBytes: 32 * 1024 * 1024,
      headers:
        url.startsWith("https://api.github.com/") && process.env.GITHUB_TOKEN
          ? { Authorization: "Bearer " + process.env.GITHUB_TOKEN }
          : undefined,
      accept: "application/vnd.github+json",
    });
  const release = JSON.parse(
    (await get(config.geosite.release_api)).toString(),
  );
  if (Date.now() - Date.parse(release.published_at) > 14 * 86400000)
    throw Error("Official geosite release is stale");
  const assets = Object.fromEntries(
    release.assets.map((a: any) => [a.name, a.browser_download_url]),
  );
  const descriptors = [
    ...config.sources,
    {
      id: "geosite",
      author: "V2Fly",
      format: "protobuf",
      url: assets["dlc.dat"],
      license: "MIT",
      revision: release.tag_name,
    },
    {
      id: "geosite-checksum",
      author: "V2Fly",
      format: "checksum",
      url: assets["dlc.dat.sha256sum"],
      license: "MIT",
    },
  ];
  const rows = await mapLimit(descriptors, 6, async (item: any) => {
    const errors: string[] = [];
    for (const url of [item.url, ...(item.mirrors ?? [])])
      try {
        const payload = await get(
          url,
          item.timeout ?? 35,
          item.allow_empty === true,
        );
        if (!payload.toString().trim() && !item.allow_empty)
          throw Error("Empty rule source: " + item.id);
        if (/^\s*<(?:!doctype|html)/i.test(payload.toString("utf8", 0, 128)))
          throw Error("HTML received instead of rules: " + item.id);
        if (item.max_age_days) {
          const date = payload
            .toString()
            .match(/# Last Updated: ([^\r\n]+)/)?.[1];
          if (
            !date ||
            Date.now() - Date.parse(date) > item.max_age_days * 86400000
          )
            throw Error("Stale/missing source timestamp: " + item.id);
        }
        return {
          id: item.id,
          payload,
          evidence: { ...item, fetched_url: url, sha256: digest(payload) },
        };
      } catch (error: any) {
        errors.push(error.message);
      }
    throw Error(item.id + ": " + errors.join("; "));
  });
  for (const row of rows) data[row.id] = row.payload;
  const checksum = data["geosite-checksum"].toString().trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(checksum) || digest(data.geosite) !== checksum)
    throw Error("Official V2Fly release checksum mismatch");
  const index = {
      version: 1,
      configuration: digest(configBytes),
      sources: rows.map((r) => r.evidence),
    },
    changes = new Map<string, Uint8Array | string>();
  for (const row of rows) changes.set(directory + "/" + row.id, row.payload);
  changes.set(directory + "/index.json", JSON.stringify(index, null, 2) + "\n");
  await commitFiles(root, changes);
  return [data, index];
}
export function ruleHeader(file: string, meta: any, stamp: string): string {
  return (
    [
      "# Name: " + path.basename(file, path.extname(file)),
      "# Updated: " + stamp,
      "# Converted by: chance",
      "# Source Authors: " + meta.authors.join(", "),
      "# Category: " + meta.category,
      "# Sources: " + meta.sources.join(" ; "),
      "# Licenses: See .github/sources/rules.json and original source repositories",
      "# Rules: " + meta.count,
      MARKER,
      "",
    ].join("\n") + "\n"
  );
}
export async function runRules(
  mode: "sync" | "check",
  root = process.cwd(),
  online = true,
) {
  const configFile = ".github/sources/rules.json",
    stateFile = ".github/sources/rules-state.json",
    config = await readJson<any>(path.join(root, configFile));
  if (config.version !== 1) throw Error("Unsupported rule registry version");
  const names = config.applications.map((a: any) => a.name),
    ids = config.sources.map((s: any) => s.id);
  if (
    new Set(names).size !== names.length ||
    names.some((s: string) => !/^[a-z][a-z0-9_]*$/.test(s))
  )
    throw Error("Invalid or duplicate application category");
  if (
    new Set(ids).size !== ids.length ||
    ids.some((s: string) => !/^[a-z0-9_-]+$/.test(s))
  )
    throw Error("Invalid or duplicate source identifier");
  for (const item of config.sources) {
    if (
      !/^[a-z][a-z0-9_]*$/.test(item.category) ||
      [item.url, ...(item.mirrors ?? [])].some(
        (url) =>
          !url.startsWith("https://") ||
          url.toLowerCase().includes("/blackmatrix7/"),
      )
    )
      throw Error("Invalid source URL/category");
  }
  const [inputs, index] = await loadInputs(
      root,
      config,
      mode === "sync" && online,
    ),
    [outputs, metadata, anomalies] = build(config, inputs);
  if (!Object.keys(outputs).length) throw Error("No generated rule sets");
  const state = await readJson<any>(path.join(root, stateFile), {
      version: 1,
      outputs: {},
    }),
    counts = Object.fromEntries(
      Object.entries(metadata).map(([file, m]) => [file, m.count]),
    ),
    configuration = digest(await fs.readFile(path.join(root, configFile))),
    generator = digest(
      await fs.readFile(new URL("../domain/aggregate.ts", import.meta.url)),
    ),
    hashes = Object.fromEntries(
      Object.entries(outputs).map(([file, content]) => [file, digest(content)]),
    );
  const report: any = {
    version: 1,
    complete: true,
    quarantined: anomalies.filter((a) => !a.code.startsWith("filtered-")),
    filtered: anomalies.filter((a) => a.code.startsWith("filtered-")),
    sources: index.sources,
    counts,
  };
  const changes = new Map<string, string | null>(),
    withoutStamp = (s: string) => s.replace(/^# Updated:.*$/gm, "# Updated:");
  for (const [file, content] of Object.entries(outputs)) {
    if (
      !/^Rule\/(QuantumultX|Surge)\/[a-z][a-z0-9_]*\.(list|dconf)$/.test(file)
    )
      throw Error("Unsafe rule output");
    const before =
      (await readOptional(path.join(root, file)))?.toString() ?? null;
    if (before !== null && !before.includes(MARKER))
      throw Error("Refusing to overwrite an unmanaged rule file: " + file);
    if (mode === "sync") {
      const prior = state.counts?.[file] ?? 0;
      if (
        state.configuration === configuration &&
        state.generator === generator &&
        prior > 100 &&
        counts[file] < prior / 2
      )
        throw Error("Unexpected rule count decrease: " + file);
      const stamp =
          new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC",
        candidate = ruleHeader(file, metadata[file], stamp) + content;
      if (before === null || withoutStamp(before) !== withoutStamp(candidate))
        changes.set(file, candidate);
    } else if (
      before === null ||
      withoutStamp(before) !==
        withoutStamp(ruleHeader(file, metadata[file], "") + content)
    )
      throw Error("Generated rule output/metadata mismatch: " + file);
  }
  if (mode === "sync") {
    for (const file of Object.keys(state.outputs ?? {}))
      if (!(file in outputs)) {
        if (
          !/^Rule\/(QuantumultX|Surge)\/[a-z][a-z0-9_]*\.(list|dconf)$/.test(
            file,
          )
        )
          throw Error("Unsafe retired rule output");
        const old = await readOptional(path.join(root, file));
        if (old && !old.includes(MARKER))
          throw Error("Stale path no longer managed: " + file);
        changes.set(file, null);
      }
    report.updatedFiles = changes.size;
    changes.set(
      stateFile,
      JSON.stringify(
        {
          version: 1,
          outputs: hashes,
          counts,
          sources: index.sources,
          configuration,
          generator,
        },
        null,
        2,
      ) + "\n",
    );
  } else if (
    JSON.stringify(Object.entries(state.outputs).sort()) !==
    JSON.stringify(Object.entries(hashes).sort())
  )
    throw Error("Rule state differs from deterministic replay");
  changes.set(
    ".github/monitor/.runtime/rules-result.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await commitFiles(root, changes);
  console.log(
    `Rule aggregation: files=${Object.keys(outputs).length}, rules=${Object.values(counts).reduce((a: any, b: any) => a + b, 0)}, quarantined=${report.quarantined.length}, ignored=${report.filtered.length}`,
  );
  return report;
}
