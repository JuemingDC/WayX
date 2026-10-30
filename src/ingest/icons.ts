// Modified: 2026-10-30 (chance). Acquire original icon manifests once per sealed
// run; monitoring reuses these exact inputs rather than downloading again.
import path from "node:path";
import { buildIconIndex, validateIconRegistry } from "../domain/icons.ts";
import type { IconIndex } from "../domain/icons.ts";
import { readOptional, commitFiles } from "../publish/transaction.ts";
export async function loadIconIndex(
  root: string,
  resources: { fetchText: (url: string) => Promise<string> },
): Promise<IconIndex | null> {
  const bytes = await readOptional(
    path.join(root, ".github/sources/icons.json"),
  );
  if (!bytes) return null;
  const registry = validateIconRegistry(JSON.parse(bytes.toString("utf8")));
  const texts = await Promise.all(
    registry.sources.map((source) => resources.fetchText(source.url)),
  );
  const index = buildIconIndex(
    registry,
    texts.map((text) => JSON.parse(text)),
  );
  await commitFiles(
    root,
    new Map(
      registry.sources.map((source, i) => [
        ".github/monitor/.runtime/icon-feeds/" + source.id + ".json",
        JSON.stringify({ source: source.url, text: texts[i] }) + "\n",
      ]),
    ),
  );
  return index;
}
