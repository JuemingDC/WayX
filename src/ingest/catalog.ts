// Modified: 2026-10-30 (chance). TypeScript discovery preserves stable ownership,
// explicit retirements and source pauses; encrypted transitions retain identities.
import path from "node:path";
import crypto from "node:crypto";
import { fetchOriginalText, requestOriginal } from "./resources.ts";
import { keleePaused, isKeleeSource } from "./source-pause.ts";
import {
  readJson,
  readOptional,
  listFiles,
  commitFiles,
  safePath,
} from "../publish/transaction.ts";
import type { SourceEntry } from "../domain/contracts.ts";
export const DEFAULT_LIST_URL = "https://hub.kelee.one/list.json";
export const DEFAULT_RUCU6_LIST_URL = "https://t.me/GitCube/327";
const retired = new Set([
  "https://kelee.one/Tool/Loon/Lpx/Bilibili_remove_ads.lpx",
  "https://rucu6.pages.dev/Plugins/bilibili.lpx",
]);
const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const identity = (s: string) => s.replace(/\.lpxe(?=\?|$)/, ".lpx");
const unescapeHtml = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, dec) =>
      String.fromCodePoint(parseInt(hex || dec, hex ? 16 : 10)),
    )
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
export function extractLpxUrl(item: any): string | null {
  const raw = typeof item === "object" ? item?.url : String(item),
    match = String(raw ?? "").match(
      /https:\/\/kelee\.one\/Tool\/Loon\/Lpx\/[^\s"'<>]+?\.lpxe?(?:\?[^\s"'<>]*)?/i,
    );
  if (!match) return null;
  const u = new URL(match[0]);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "kelee.one" ||
    !/^\/Tool\/Loon\/Lpx\/.*\.lpxe?$/i.test(u.pathname)
  )
    return null;
  return u.origin + u.pathname;
}
export function safeFilenameFromUrl(url: string): string {
  const name = decodeURIComponent(path.posix.basename(new URL(url).pathname));
  if (
    !/\.lpxe?$/i.test(name) ||
    /[\\/\0]/.test(name) ||
    [".", ".."].includes(name)
  )
    throw Error("Unsafe plugin filename: " + name);
  return name;
}
export function categoryFor(item: any, _stem?: string): string | null {
  const tags = Array.isArray(item?.tag) ? item.tag : [item?.tag];
  return tags.includes("依赖")
    ? "依赖"
    : tags.includes("去广告")
      ? "去广告"
      : null;
}
export function stableId(stem: string, source: string, used: Set<string>) {
  const base =
    stem.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[._-]+|[._-]+$/g, "") ||
    "plugin_" + hash(source).slice(0, 12);
  let value = "Kelee_" + base;
  if (used.has(value)) value += "_" + hash(source).slice(0, 8);
  if (used.has(value)) throw Error("Cannot derive unique Kelee id");
  used.add(value);
  return value;
}
export function targetName(stem: string, extension: string, used: Set<string>) {
  let value = stem + extension;
  if (used.has(value)) value = "Kelee_" + stem + extension;
  if (used.has(value))
    value = "Kelee_" + stem + "_" + hash(stem).slice(0, 8) + extension;
  if (used.has(value)) throw Error("Cannot derive unique target filename");
  used.add(value);
  return value;
}
export function buildCatalog(
  payload: any,
  previous: SourceEntry[],
  staticEntries: SourceEntry[],
): [SourceEntry[], any[]] {
  const fixed = staticEntries.filter((e) => !retired.has(identity(e.source))),
    lists = Array.isArray(payload) ? payload : payload?.lists;
  if (!Array.isArray(lists))
    throw Error(
      "Kelee list.json must be an array or an object with a 'lists' array",
    );
  const prior = new Map(
      previous
        .filter((e) => isKeleeSource(e.source))
        .map((e) => [identity(e.source), e]),
    ),
    used = Object.fromEntries(
      ["id", "file", "qx", "surge"].map((f) => [
        f,
        new Set(fixed.map((e) => (e as any)[f])),
      ]),
    ) as Record<string, Set<string>>;
  const entries: SourceEntry[] = [],
    metadata: any[] = [],
    seen = new Set<string>();
  for (const item of lists) {
    const source = extractLpxUrl(item);
    if (!source || retired.has(identity(source)) || seen.has(source)) continue;
    seen.add(source);
    const file = safeFilenameFromUrl(source),
      stem = file.replace(/\.lpxe?$/i, ""),
      category = categoryFor(item, stem);
    if (!category) continue;
    let old = prior.get(identity(source));
    if (
      old &&
      ["id", "file", "qx", "surge"].some((f) => used[f].has((old as any)[f]))
    )
      old = undefined;
    let entry: SourceEntry;
    if (old) {
      entry = { ...old, source, category };
      for (const f of ["id", "file", "qx", "surge"])
        used[f].add((entry as any)[f]);
    } else {
      const relative = used.file.has(file) ? "Kelee/" + file : file;
      used.file.add(relative);
      entry = {
        id: stableId(stem, source, used.id),
        file: relative,
        source,
        qx: targetName(stem, ".snippet", used.qx),
        surge: targetName(stem, ".sgmodule", used.surge),
        category,
      };
    }
    entries.push(entry);
    metadata.push({
      order: entries.length - 1,
      source,
      file: entry.file,
      id: entry.id,
      name: item?.name ?? "",
      desc: item?.desc ?? "",
      tag: item?.tag ?? [],
      date: item?.date ?? "",
    });
  }
  if (!entries.length)
    throw Error("Kelee list.json produced zero LPX plugin URLs");
  return [[...entries, ...fixed], metadata];
}
export function rucu6PluginUrl(link: string): string | null {
  let u: URL;
  try {
    u = new URL(unescapeHtml(link));
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (["nsloon.com", "www.nsloon.com"].includes(u.hostname)) {
    if (u.pathname !== "/openloon/import") return null;
    const values = u.searchParams.getAll("plugin");
    if (values.length !== 1) return null;
    let value = values[0];
    for (let n = 0; n < 3 && !value.startsWith("https://"); n++)
      value = decodeURIComponent(value);
    try {
      u = new URL(value);
    } catch {
      return null;
    }
  }
  if (
    u.protocol !== "https:" ||
    u.hostname !== "rucu6.pages.dev" ||
    (u.port && !["443"].includes(u.port)) ||
    u.username ||
    u.password ||
    !/^\/Plugins\/.*\.lpxe?$/.test(u.pathname)
  )
    return null;
  const url = u.origin + u.pathname;
  safeFilenameFromUrl(url);
  return url;
}
export async function resolveRucu6ShortLink(link: string): Promise<string> {
  let current = link;
  for (let n = 0; n < 10; n++) {
    const result = await requestOriginal(current, {
        redirect: "manual",
        maxBytes: 1024 * 1024,
        timeoutMs: 20000,
      }),
      location = result.headers.get("location");
    if (!location)
      throw Error("RuCu6 short link has no plugin redirect: " + link);
    const next = new URL(location, current).toString(),
      plugin = rucu6PluginUrl(next);
    if (plugin) return plugin;
    const u = new URL(next);
    if (u.protocol !== "https:" || u.hostname !== "pse.is")
      throw Error("Unexpected RuCu6 short-link redirect: " + next);
    current = next;
  }
  throw Error("RuCu6 short-link redirect limit");
}
export async function buildRucu6Catalog(
  payload: any,
  previous: SourceEntry[],
  staticEntries: SourceEntry[],
  resolve = resolveRucu6ShortLink,
): Promise<SourceEntry[]> {
  const urls: string[] = [];
  const add = (url: string) => {
    if (!urls.includes(url)) urls.push(url);
  };
  const collect = (value: any) => {
    if (typeof value === "string") {
      for (const m of value.matchAll(
        /https:\/\/rucu6\.pages\.dev\/Plugins\/[^\s"'<>]+?\.lpxe?/g,
      ))
        add(m[0]);
    } else if (value && typeof value === "object")
      for (const child of Object.values(value)) collect(child);
  };
  if (
    typeof payload === "string" &&
    payload.includes("tgme_widget_message_text")
  ) {
    const message = payload.match(
      /<div class="tgme_widget_message_text[^"\n]*"[^>]*>([\s\S]*?)<\/div>/,
    );
    if (!message) throw Error("RuCu6 author message body is unavailable");
    for (const m of message[1].matchAll(/href="([^"]+)"/g)) {
      const link = unescapeHtml(m[1]),
        u = new URL(link);
      if (u.protocol !== "https:") continue;
      const plugin =
        u.hostname === "pse.is" ? await resolve(link) : rucu6PluginUrl(link);
      if (plugin) add(plugin);
      else if (
        ["nsloon.com", "www.nsloon.com", "rucu6.pages.dev"].includes(u.hostname)
      )
        throw Error("Invalid RuCu6 plugin/import link: " + link);
    }
  } else collect(payload);
  if (!urls.length)
    throw Error(
      "RuCu6 index produced zero plugin URLs; refusing catalog deletion",
    );
  const prior = new Map(
      [...previous, ...staticEntries].map((e) => [identity(e.source), e]),
    ),
    other = [...previous, ...staticEntries].filter(
      (e) => new URL(e.source).hostname !== "rucu6.pages.dev",
    ),
    used = Object.fromEntries(
      ["id", "file", "qx", "surge"].map((f) => [
        f,
        new Set(other.map((e) => (e as any)[f])),
      ]),
    ) as Record<string, Set<string>>;
  return urls
    .filter((url) => !retired.has(identity(url)))
    .map((source) => {
      const name = safeFilenameFromUrl(source),
        stem = name.replace(/\.lpxe?$/i, ""),
        old = prior.get(identity(source)),
        entry = old
          ? { ...old, source }
          : {
              id: "RuCu6_" + stem.replace(/[^A-Za-z0-9._-]/g, "_"),
              file: "RuCu6/" + name,
              source,
              qx: "RuCu6_" + stem + ".snippet",
              surge: "RuCu6_" + stem + ".sgmodule",
              category: "插件",
            };
      for (const f of ["id", "file", "qx", "surge"]) {
        const value = (entry as any)[f];
        if (used[f].has(value))
          throw Error("RuCu6 index collision: " + f + "=" + value);
        used[f].add(value);
      }
      return entry;
    });
}
export function validateCombined(entries: SourceEntry[]) {
  const seen = Object.fromEntries(
    ["id", "file", "qx", "surge"].map((k) => [k, new Set<string>()]),
  );
  for (const entry of entries) {
    for (const f of ["id", "file", "source", "qx", "surge", "category"])
      if (typeof (entry as any)[f] !== "string" || !(entry as any)[f].trim())
        throw Error("Missing catalog " + f);
    if (!/^[A-Za-z0-9._-]+$/.test(entry.id)) throw Error("Invalid catalog id");
    for (const [f, suffix] of [
      ["file", /\.lpxe?$/],
      ["qx", /\.snippet$/],
      ["surge", /\.sgmodule$/],
    ] as const) {
      const value = entry[f];
      if (
        value.startsWith("/") ||
        value.includes("\\") ||
        value.split("/").includes("..") ||
        !suffix.test(value)
      )
        throw Error("Unsafe catalog " + f);
    }
    for (const f of Object.keys(seen)) {
      const value = (entry as any)[f];
      if (seen[f].has(value))
        throw Error("Duplicate catalog " + f + ": " + value);
      seen[f].add(value);
    }
  }
}
async function prunePlan(
  root: string,
  current: SourceEntry[],
): Promise<Map<string, null>> {
  const changes = new Map<string, null>();
  for (const [base, field, suffix] of [
    ["Resource/Loon", "file", ".lpx"],
    ["Adblock/Quantumult X", "qx", ".snippet"],
    ["Adblock/Surge", "surge", ".sgmodule"],
  ] as const) {
    const expected = new Set(current.map((e) => e[field]));
    for (const relative of await listFiles(path.join(root, base))) {
      if (!relative.endsWith(suffix) || expected.has(relative)) continue;
      const file = base + "/" + relative,
        text =
          (await readOptional(safePath(root, file)))?.toString("utf8") ?? "";
      if (field === "file" || /^# Converted by:\s*chance\s*$/m.test(text))
        changes.set(file, null);
    }
  }
  const active = new Set(current.map((e) => e.id));
  for (const relative of await listFiles(path.join(root, "Script"))) {
    if (
      active.has(relative.split("/")[0]) ||
      !/^[^/]+\/[a-z_]+_[0-9a-f]{10}\.js$/.test(relative)
    )
      continue;
    const file = "Script/" + relative;
    if (
      (await readOptional(safePath(root, file)))?.includes(
        "// Converted by: chance",
      )
    )
      changes.set(file, null);
  }
  return changes;
}
export async function refreshCatalog(
  root = process.cwd(),
  {
    check = false,
    listUrl = process.env.KELEE_LIST_URL || DEFAULT_LIST_URL,
    rucu6ListUrl = process.env.RUCU6_LIST_URL || DEFAULT_RUCU6_LIST_URL,
    fetchText = fetchOriginalText,
  }: any = {},
) {
  const previous = await readJson<SourceEntry[]>(
      path.join(root, ".github/sources/loon.json"),
      [],
    ),
    fixed = await readJson<SourceEntry[]>(
      path.join(root, ".github/sources/loon-static.json"),
      [],
    ),
    paused = await keleePaused(root);
  let staticEntries = fixed,
    feed = "",
    rucuFeed: string | null = null;
  if (!paused) feed = await fetchText(listUrl);
  if (rucu6ListUrl) {
    if (
      rucu6ListUrl !== DEFAULT_RUCU6_LIST_URL &&
      new URL(rucu6ListUrl).hostname !== "rucu6.pages.dev"
    )
      throw Error(
        "RuCu6 index must be the authorized GitCube post or rucu6.pages.dev",
      );
    rucuFeed = await fetchText(
      rucu6ListUrl === DEFAULT_RUCU6_LIST_URL
        ? "https://telegram.me/GitCube/327?embed=1"
        : rucu6ListUrl,
    );
    let payload: any = rucuFeed;
    try {
      payload = JSON.parse(rucuFeed!);
    } catch {}
    const entries = await buildRucu6Catalog(payload, previous, fixed);
    staticEntries = [
      ...fixed.filter((e) => new URL(e.source).hostname !== "rucu6.pages.dev"),
      ...entries,
    ];
  }
  const frozen = previous.filter((e) => isKeleeSource(e.source)),
    [combined, metadata] = paused
      ? [
          [...frozen, ...staticEntries.filter((e) => !isKeleeSource(e.source))],
          frozen.map((e, order) => ({ ...e, order })),
        ]
      : buildCatalog(JSON.parse(feed), previous, staticEntries);
  validateCombined(combined);
  const desired = JSON.stringify(combined, null, 2) + "\n";
  if (check) {
    const current = (
      await readOptional(path.join(root, ".github/sources/loon.json"))
    )?.toString();
    if (desired !== current) throw Error("Plugin catalog is stale");
    return { count: combined.length, paused };
  }
  const changes: Map<string, string | null> = await prunePlan(root, combined);
  changes.set(".github/sources/loon.json", desired);
  const runtime = ".github/monitor/.runtime/";
  if (!paused)
    changes.set(
      runtime + "kelee-feed.json",
      JSON.stringify({ source: listUrl, text: feed }) + "\n",
    );
  if (rucuFeed !== null)
    changes.set(
      runtime + "rucu6-feed.json",
      JSON.stringify({ source: rucu6ListUrl, text: rucuFeed }) + "\n",
    );
  changes.set(
    runtime + "rucu6-discovery.json",
    JSON.stringify(
      {
        complete: rucuFeed !== null,
        source: rucu6ListUrl || null,
        reason:
          rucuFeed !== null
            ? null
            : "Author-published complete index URL is required; static sources only",
      },
      null,
      2,
    ) + "\n",
  );
  const old = new Map(previous.map((e) => [e.source, e])),
    latest = new Map(combined.map((e) => [e.source, e]));
  changes.set(
    runtime + "catalog-discovery.json",
    JSON.stringify(
      {
        version: 1,
        source: listUrl,
        added: combined.filter((e) => !old.has(e.source)),
        removed: previous.filter((e) => !latest.has(e.source)),
        updated: combined.filter(
          (e) =>
            old.has(e.source) &&
            JSON.stringify(old.get(e.source)) !== JSON.stringify(e),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  changes.set(
    runtime + "kelee-catalog.json",
    JSON.stringify(
      { source: listUrl, count: metadata.length, plugins: metadata },
      null,
      2,
    ) + "\n",
  );
  await commitFiles(root, changes);
  return { count: combined.length, paused };
}
