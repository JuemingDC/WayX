// Modified: 2026-10-30 (chance). Match app icons deterministically without
// changing existing author metadata or inventing matches from substrings.
export interface IconSource {
  id: string;
  url: string;
}
export interface IconRegistry {
  version: 1;
  sources: IconSource[];
  aliases: string[][];
}
export interface IconRecord {
  name: string;
  url: string;
  collection: string;
  priority: number;
  variant: number;
  order: number;
}
export interface IconIndex {
  records: Map<string, IconRecord[]>;
  aliases: Map<string, string[]>;
}
export interface IconResult {
  text: string;
  status: "existing" | "added" | "unmatched";
  icon?: IconRecord;
}
export function iconKey(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/\.(?:png|jpe?g|webp|svg)$/i, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}
export function validateIconRegistry(value: unknown): IconRegistry {
  const registry = value as IconRegistry;
  if (
    registry?.version !== 1 ||
    !Array.isArray(registry.sources) ||
    !registry.sources.length ||
    !Array.isArray(registry.aliases)
  )
    throw Error("Invalid icon registry");
  const ids = new Set<string>(),
    urls = new Set<string>(),
    aliases = new Set<string>();
  for (const source of registry.sources) {
    if (!/^[a-z0-9-]+$/.test(source?.id) || ids.has(source.id))
      throw Error("Invalid/duplicate icon source");
    const url = new URL(source.url);
    if (url.protocol !== "https:" || urls.has(source.url))
      throw Error("Invalid/duplicate icon source URL");
    ids.add(source.id);
    urls.add(source.url);
  }
  for (const group of registry.aliases) {
    if (
      !Array.isArray(group) ||
      !group.length ||
      group.some((x) => typeof x !== "string" || !iconKey(x))
    )
      throw Error("Invalid app icon aliases");
    const local = new Set<string>();
    for (const name of group) {
      const key = iconKey(name);
      if (local.has(key)) continue;
      if (aliases.has(key)) throw Error("Conflicting app icon alias: " + name);
      local.add(key);
      aliases.add(key);
    }
  }
  return registry;
}
export function buildIconIndex(
  registry: IconRegistry,
  documents: unknown[],
): IconIndex {
  validateIconRegistry(registry);
  if (documents.length !== registry.sources.length)
    throw Error("Incomplete icon collections");
  const index: IconIndex = { records: new Map(), aliases: new Map() };
  registry.sources.forEach((source, priority) => {
    const document = documents[priority] as {
      icons?: { name: string; url: string }[];
    };
    if (!Array.isArray(document?.icons) || !document.icons.length)
      throw Error("Empty/invalid icon collection: " + source.id);
    document.icons.forEach((item, order) => {
      if (
        typeof item?.name !== "string" ||
        !iconKey(item.name) ||
        typeof item.url !== "string" ||
        /[\r\n]/.test(item.url)
      )
        throw Error("Invalid icon entry: " + source.id);
      const url = new URL(item.url);
      if (!["https:", "http:"].includes(url.protocol))
        throw Error("Invalid icon URL: " + source.id);
      const base = item.name.replace(/\.(?:png|jpe?g|webp|svg)$/i, "");
      const plain = base.replace(/(?:\(\d+\)|[_-]\d+)$/, "");
      const record: IconRecord = {
        name: item.name,
        url: url.href,
        collection: source.url,
        priority,
        variant: plain === base ? 0 : 1,
        order,
      };
      for (const key of new Set([iconKey(base), iconKey(plain)])) {
        const list = index.records.get(key) ?? [];
        list.push(record);
        index.records.set(key, list);
      }
    });
  });
  for (const group of registry.aliases) {
    const keys = group.map(iconKey);
    for (const key of keys) index.aliases.set(key, keys);
  }
  return index;
}
export function findAppIcon(
  index: IconIndex,
  names: string[],
): IconRecord | undefined {
  for (const name of names) {
    const clean = name
      .replace(/^(?:(?:ishowshu|zenmofeishi|kelee|rucu6)_)/i, "")
      .replace(/\.(?:snippet|sgmodule|lpxe?)$/i, "");
    const candidates = [
      clean,
      clean
        .replace(/(?:App\s*)?\s*v?\d+(?:\.\d+){1,4}$/i, "")
        .replace(/(?:全面净化|净化页面布局|去广告|净化|增强|解锁会员)$/u, "")
        .replace(/\s*App$/i, ""),
    ];
    for (const candidate of candidates) {
      const key = iconKey(candidate),
        matches = (index.aliases.get(key) ?? [key])
          .flatMap((alias) => index.records.get(alias) ?? [])
          .sort(
            (a, b) =>
              a.priority - b.priority ||
              a.variant - b.variant ||
              a.order - b.order,
          );
      if (matches.length) return matches[0];
    }
  }
  return undefined;
}
export function existingIcon(text: string): string | undefined {
  return text.match(
    /^\s*(?:#!\s*|#\s*(?:!\s*|Upstream\s+)?)(?:icon|image|img-url|图标)\s*[:=]\s*(\S+)/im,
  )?.[1];
}
export function addAppIcon(
  text: string,
  index: IconIndex | null | undefined,
  hints: string[] = [],
): IconResult {
  if (existingIcon(text)) return { text, status: "existing" };
  if (!index) return { text, status: "unmatched" };
  const names = [
    ...text.matchAll(
      /^\s*(?:#!\s*|#\s*(?:Upstream\s+)?)(?:name)\s*[:=]\s*(.+)$/gim,
    ),
  ].map((x) => x[1].trim());
  const icon = findAppIcon(index, [...names, ...hints]);
  if (!icon) return { text, status: "unmatched" };
  const lines = text.split("\n"),
    nameLine = lines.findIndex((line) =>
      /^\s*(?:#!|#\s*)name\s*[:=]/i.test(line),
    );
  lines.splice(
    nameLine < 0 ? 0 : nameLine + 1,
    0,
    "# Icon: " + icon.url,
    "# Icon Collection: " + icon.collection,
  );
  return { text: lines.join("\n"), status: "added", icon };
}
