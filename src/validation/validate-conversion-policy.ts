// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript validation layer; preserve source behavior.
// Manifest-scoped conversion policy CLI; delegates all syntax to target validators.
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Validation / CLI
import fs from "node:fs/promises";
import { writeValidationEvidence } from "../publish/workflow.ts";
import { execFileSync } from "node:child_process";
import {
  validateQxFilterList,
  validateSurgeRuleSet,
  validateSurgeRuleSection,
  validateQX,
} from "./output.ts";
import { validateSurgeModule } from "./output.ts";
import { validateConversionMetadata } from "./output.ts";
import { loadLoonSourceCatalog } from "../parser/input.ts";
const manifest: any = await loadLoonSourceCatalog(".github/sources/loon.json");
const targets: any = manifest.flatMap((entry: any): any => [
  { entry, target: "qx", file: "Adblock/Quantumult X/" + entry.qx },
  { entry, target: "surge", file: "Adblock/Surge/" + entry.surge },
]);
const changed: any = new Set([
  ...execFileSync("git", ["diff", "--name-only", "HEAD"], { encoding: "utf8" })
    .trim()
    .split("\n"),
  ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .trim()
    .split("\n"),
]);
const selected: any = process.argv.includes("--all")
  ? targets
  : targets.filter(({ file }: any): any => changed.has(file));
const errors: any = [];
for (const { entry, target, file } of selected) {
  try {
    const text: any = await fs.readFile(file, "utf8");
    validateConversionMetadata(text, entry, target);
    if (target === "qx") validateQX(text, entry);
    else validateSurgeModule(text, entry);
  } catch (error: any) {
    errors.push({
      file,
      plugin: entry.id,
      code: "target-format",
      text: String(error.message || error),
    });
  }
}
// Routing collections share the same target validators as converted plugins.
let routing: any = { outputs: {} };
try {
  routing = JSON.parse(
    await fs.readFile(".github/sources/rules-state.json", "utf8"),
  );
} catch (error: any) {
  if (error.code !== "ENOENT") throw error;
}
for (const file of Object.keys(routing.outputs || {})) {
  try {
    if (
      !/^Rule\/(?:QuantumultX\/[a-z0-9_]+\.list|Surge\/[a-z0-9_]+\.(?:list|dconf))$/.test(
        file,
      )
    )
      throw new Error("Invalid managed rule collection path");
    const text: any = await fs.readFile(file, "utf8");
    if (file.startsWith("Rule/QuantumultX/"))
      validateQxFilterList(text, { id: file }, { builtInPoliciesOnly: true });
    else if (file.endsWith(".dconf"))
      validateSurgeRuleSection(text, { id: file });
    else validateSurgeRuleSet(text, { id: file });
  } catch (error: any) {
    errors.push({
      file,
      code: "rule-collection-format",
      text: String(error.message || error),
    });
  }
}
await writeValidationEvidence(
  selected.length + Object.keys(routing.outputs || {}).length,
  errors,
);
if (errors.length) {
  for (const error of errors)
    console.error("ERROR: " + error.file + ": " + error.text);
  process.exitCode = 1;
} else
  console.log(
    "Conversion policy validation passed for " +
      (selected.length + Object.keys(routing.outputs || {}).length) +
      " generated target/rule resource(s).",
  );
