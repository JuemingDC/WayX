// Modified: 2026-11-12 (chance). Assign persistent, never-recycled Adblock IDs;
// both client variants share one identity, independent of sorting and layout.
import path from "node:path";
import { readJson, listFiles, commitFiles } from "../publish/transaction.ts";

export const ADBLOCK_NUMBERS_FILE = ".github/sources/adblock-numbers.json";
export type AdblockNumbers = {
  version: 1;
  next: number;
  items: Record<string, { number: string; paths: string[] }>;
};
export function allocateAdblockNumbers(
  previous: AdblockNumbers,
  candidates: { id: string; paths: string[] }[],
): AdblockNumbers {
  if (previous.version !== 1 || !Number.isSafeInteger(previous.next) || previous.next < 1)
    throw Error("Invalid Adblock number registry");
  const result = structuredClone(previous);
  const used = new Set<string>();
  const owners = new Map<string, string>();
  for (const candidate of candidates)
    for (const file of candidate.paths) {
      if (owners.has(file) && owners.get(file) !== candidate.id)
        throw Error("Ambiguous Adblock number path: " + file);
      owners.set(file, candidate.id);
    }
  let maximum = 0;
  for (const item of Object.values(result.items)) {
    if (!/^AD\d{4,}$/.test(item.number) || used.has(item.number) || !Array.isArray(item.paths))
      throw Error("Invalid or duplicate Adblock number");
    used.add(item.number);
    maximum = Math.max(maximum, Number(item.number.slice(2)));
  }
  result.next = Math.max(result.next, maximum + 1);
  for (const candidate of [...candidates].sort((a, b) => a.id.localeCompare(b.id, "en"))) {
    if (!candidate.id) throw Error("Adblock identity is required");
    const existing = result.items[candidate.id];
    const item = existing ?? { number: "AD" + String(result.next++).padStart(4, "0"), paths: [] };
    item.paths = [...new Set([...item.paths, ...candidate.paths])].sort();
    result.items[candidate.id] = item;
  }
  // A retired ID stays reserved even if a different source later reuses a path.
  for (const [id, item] of Object.entries(result.items))
    item.paths = item.paths.filter(file => !owners.has(file) || owners.get(file) === id);
  return result;
}
export async function loadAdblockNumbers(root: string): Promise<AdblockNumbers> {
  return readJson(path.join(root, ADBLOCK_NUMBERS_FILE), { version: 1, next: 1, items: {} });
}
export function adblockIdentity(file: string, catalog: any[]): string {
  const entry = catalog.find(e => file === "Adblock/Quantumult X/" + e.qx || file === "Adblock/Surge/" + e.surge);
  return entry?.id ?? path.posix.basename(file).replace(/\.(?:snippet|sgmodule)$/, "");
}
export function adblockNumberForPath(registry: AdblockNumbers, file: string): string | undefined {
  return Object.values(registry.items).find(item => item.paths.includes(file))?.number;
}
export function applyAdblockNumber(text: string, number: string): string {
  const clean = text.replace(/^# WayX ID: AD\d+\r?\n/gm, "");
  // Keep native names, parameters and script bodies unchanged; this is metadata.
  const header = clean.match(/^(?:#![^\n]*(?:\n|$))+/)?.[0] ?? "";
  return header + (header && !header.endsWith("\n") ? "\n" : "") + "# WayX ID: " + number + "\n" + clean.slice(header.length);
}
export async function ensureAdblockNumbers(
  root: string,
  artifacts?: Record<string, string>,
  extra: { id: string; paths: string[] }[] = [],
): Promise<AdblockNumbers> {
  const catalog = await readJson<any[]>(path.join(root, ".github/sources/loon.json"), []);
  const layout = artifacts ?? (await readJson<any>(path.join(root, ".github/sources/layout-state.json"), {})).artifacts ?? {};
  const reverse = new Map(Object.entries<string>(layout).map(([logical, published]) => [published, logical]));
  const candidates = catalog.map(e => ({ id: e.id, paths: [
    "Adblock/Quantumult X/" + e.qx, "Adblock/Surge/" + e.surge,
    ...[layout["Adblock/Quantumult X/" + e.qx], layout["Adblock/Surge/" + e.surge]].filter(Boolean),
  ] }));
  const files = new Set([
    ...(await listFiles(path.join(root, "Adblock"))).map(f => "Adblock/" + f),
    ...Object.keys(layout),
  ]);
  for (const file of files) {
    if (!file.startsWith("Adblock/") || !/\.(?:snippet|sgmodule)$/.test(file)) continue;
    const logical = reverse.get(file) ?? file;
    const known = candidates.find(candidate => candidate.paths.includes(file) || candidate.paths.includes(logical));
    if (known) known.paths.push(logical, layout[logical] ?? file);
    else candidates.push({ id: adblockIdentity(logical, catalog), paths: [logical, layout[logical] ?? file] });
  }
  const previous = await loadAdblockNumbers(root);
  const result = allocateAdblockNumbers(previous, [...candidates, ...extra]);
  if (JSON.stringify(result) !== JSON.stringify(previous))
    await commitFiles(root, new Map([[ADBLOCK_NUMBERS_FILE, JSON.stringify(result, null, 2) + "\n"]]));
  return result;
}
