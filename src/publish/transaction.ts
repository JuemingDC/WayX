import type { ManagedFileChanges } from "../domain/contracts.ts";
// Modified: 2026-10-30 (chance). Stage every byte and restore all owned files
// if any write fails; callers cannot escape the repository root.
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
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
  } catch (error) {
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
// Modified: 2026-11-25 (chance). Every owned file is restored independently;
// a single rollback failure must not prevent restoration of the remaining files.
export async function rollbackFiles(
  snapshot: ReadonlyMap<string, Buffer | null>,
  cause: unknown,
  temporaryFiles: Iterable<string> = [],
): Promise<never> {
  const failures: unknown[] = [];
  for (const file of temporaryFiles) {
    try {
      await fs.rm(file, { force: true });
    } catch (error) {
      failures.push(error);
    }
  }
  for (const [file, bytes] of snapshot) {
    try {
      const current = await readOptional(file);
      if (bytes === null) {
        if (current !== null) await fs.rm(file, { force: true });
      } else if (!current?.equals(bytes)) {
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, bytes);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) {
    const error = new AggregateError([cause, ...failures], "Managed write and rollback failed", { cause });
    throw Object.assign(error, {
      rollbackSucceeded: false,
      rollbackError: new AggregateError(failures, "Rollback failures"),
    });
  }
  const error = cause instanceof Error ? cause : new Error(String(cause));
  throw Object.assign(error, { rollbackSucceeded: true });
}
async function inspectManagedPath(root: string, file: string, checked: Set<string>) {
  const base = path.resolve(root);
  let current = base;
  for (const component of path.relative(base, file).split(path.sep)) {
    current = path.join(current, component);
    if (checked.has(current)) continue;
    try {
      const info = await fs.lstat(current);
      if (info.isSymbolicLink()) throw Error("Managed path contains a symbolic link: " + current);
      if (info.isDirectory()) checked.add(current);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
  }
}
export async function commitFiles(
  root: string,
  changes: ManagedFileChanges,
): Promise<number> {
  const old = new Map<string, Buffer | null>();
  const plans = new Map<string, Buffer | null>();
  const resolved = new Set<string>();
  const checkedDirectories = new Set<string>();
  for (const [relative, value] of changes) {
    const file = safePath(root, relative);
    if (resolved.has(file)) throw Error("Duplicate managed path: " + relative);
    resolved.add(file);
    await inspectManagedPath(root, file, checkedDirectories);
    const before = await readOptional(file);
    const after = value === null ? null : Buffer.from(value);
    if (
      (before === null && after === null) ||
      (before && after && before.equals(after))
    )
      continue;
    old.set(file, before);
    plans.set(file, after);
  }
  const attempted = new Map<string, Buffer | null>();
  const temporaryFiles = new Set<string>();
  try {
    for (const [file, bytes] of plans) {
      attempted.set(file, old.get(file)!);
      if (bytes === null) {
        await fs.rm(file, { force: true });
        continue;
      }
      await fs.mkdir(path.dirname(file), { recursive: true });
      const temporary = path.join(path.dirname(file), "." + randomUUID() + ".wayx-tmp");
      temporaryFiles.add(temporary);
      await fs.writeFile(temporary, bytes, { flag: "wx" });
      await fs.rename(temporary, file);
      temporaryFiles.delete(temporary);
    }
  } catch (error) {
    return rollbackFiles(attempted, error, temporaryFiles);
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
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
