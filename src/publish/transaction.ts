// Modified: 2026-10-30 (chance). Stage every byte and restore all owned files
// if any write fails; callers cannot escape the repository root.
import fs from "node:fs/promises";
import path from "node:path";
export function safePath(root: string, relative: string): string {
  const base = path.resolve(root),
    file = path.resolve(base, relative);
  if (
    file === base ||
    !file.startsWith(base + path.sep) ||
    relative.includes("\\")
  )
    throw Error("Unsafe managed path: " + relative);
  return file;
}
export async function readOptional(file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(file);
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}
export async function readJson<T>(file: string, fallback?: T): Promise<T> {
  const bytes = await readOptional(file);
  if (bytes === null) {
    if (fallback !== undefined) return fallback;
    throw Error("Missing JSON: " + file);
  }
  return JSON.parse(bytes.toString("utf8")) as T;
}
export async function commitFiles(
  root: string,
  changes: Map<string, string | Uint8Array | null>,
): Promise<number> {
  const old = new Map<string, Buffer | null>(),
    plans = new Map<string, Buffer | null>();
  for (const [relative, value] of changes) {
    const file = safePath(root, relative),
      before = await readOptional(file),
      after = value === null ? null : Buffer.from(value);
    if (
      (before === null && after === null) ||
      (before && after && before.equals(after))
    )
      continue;
    old.set(file, before);
    plans.set(file, after);
  }
  try {
    for (const [file, bytes] of plans) {
      if (bytes === null) {
        await fs.rm(file, { force: true });
        continue;
      }
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file + ".wayx-tmp", bytes);
      await fs.rename(file + ".wayx-tmp", file);
    }
  } catch (error: any) {
    try {
      for (const [file, bytes] of old) {
        await fs.rm(file + ".wayx-tmp", { force: true });
        if (bytes === null) await fs.rm(file, { force: true });
        else {
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, bytes);
        }
      }
      error.rollbackSucceeded = true;
    } catch (rollback) {
      error.rollbackSucceeded = false;
      error.rollbackError = rollback;
    }
    throw error;
  }
  return plans.size;
}
export async function listFiles(root: string): Promise<string[]> {
  try {
    return (await fs.readdir(root, { recursive: true, withFileTypes: true }))
      .filter((d) => d.isFile())
      .map((d) =>
        path
          .relative(root, path.join(d.parentPath, d.name))
          .split(path.sep)
          .join("/"),
      );
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
