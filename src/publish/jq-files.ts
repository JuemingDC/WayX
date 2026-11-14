// Modified: 2026-11-14 (chance). Compile standalone .jq files with the official
// jq -f interface on empty input, then include their writes in the plugin transaction.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
export async function planJqFileChanges(root: string, id: string, programs: Map<string, string>) {
  if (!id || id === "." || id === ".." || /[\\/]/.test(id)) throw new Error("Invalid JQ resource owner");
  const dir = "Resource/JQ/" + id;
  const changes = new Map<string, string | null>();
  let previous: string[] = [];
  try { previous = await fs.readdir(path.join(root, dir)); }
  catch (error: any) { if (error.code !== "ENOENT") throw error; }
  for (const name of programs.keys())
    if (path.basename(name) !== name || !name.endsWith(".jq")) throw new Error("Invalid JQ resource filename");
  const temp = programs.size ? await fs.mkdtemp(path.join(os.tmpdir(), "wayx-jq-")) : null;
  try {
    for (const [name, program] of programs) {
      const file = path.join(temp!, name);
      await fs.writeFile(file, program, "utf8");
      // Empty stdin compiles the filter without evaluating it against dummy JSON.
      const result = spawnSync("jq", ["--from-file", file], {
        input: "", encoding: "utf8", timeout: 10000, maxBuffer: 1024 * 1024,
      });
      if (result.error || result.signal || result.status !== 0)
        throw new Error("Official jq file validation failed for " + name + ": " +
          (result.error?.message || result.stderr || result.signal || result.status));
      let old: string | null = null;
      try { old = await fs.readFile(path.join(root, dir, name), "utf8"); }
      catch (error: any) { if (error.code !== "ENOENT") throw error; }
      if (old !== program) changes.set(dir + "/" + name, program);
    }
    for (const name of previous)
      if (name.endsWith(".jq") && !programs.has(name)) changes.set(dir + "/" + name, null);
    return changes;
  } finally {
    if (temp) await fs.rm(temp, {recursive: true, force: true});
  }
}
