// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript publish layer; preserve source behavior.
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildReadmePlan,
  readmePlanDiff,
  writeReadmePlan,
} from "./workflow.ts";
const ROOT: any = process.cwd();
const mode: any = process.argv.includes("--write") ? "write" : "check";
const plan: any = await buildReadmePlan(ROOT);
const diff: any = await readmePlanDiff(ROOT, plan);
if (mode === "write") {
  if (diff.length) await writeReadmePlan(ROOT, plan);
  console.log(
    `README index write complete; changed=${diff.length}${diff.length ? " [" + diff.join(", ") + "]" : ""}`,
  );
} else if (diff.length) {
  console.error("README index is stale:\n" + diff.join("\n"));
  process.exitCode = 1;
} else {
  console.log("README/install index is current");
}
const __isMain: any =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url));
void __isMain;
