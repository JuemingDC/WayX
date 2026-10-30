// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript ingest layer; preserve source behavior.
// Modified: 2026-10-29 (chance). Freeze Kelee acquisition/conversion without
// removing catalog entries or touching their checked-in artifacts.
import fs from "node:fs/promises";
import path from "node:path";
export async function keleePaused(root: string): Promise<boolean> {
  try {
    return (
      JSON.parse(
        await fs.readFile(
          path.join(root, ".github/sources/kelee-pause.json"),
          "utf8",
        ),
      ).paused === true
    );
  } catch (error: any) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
export function isKeleeSource(source: string): boolean {
  const host: any = new URL(source).hostname;
  return host === "kelee.one" || host.endsWith(".kelee.one");
}
