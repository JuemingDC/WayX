import { opaqueEntries } from "../ingest/formats.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript validation layer; preserve source behavior.
// Repository-wide static audit for target configs and converter safety.
// Author: chance
// Category: Converter / Repository Audit
import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  writeValidationEvidence,
  validationArtifactDigest,
  qxTargetPath,
  surgeTargetPath,
} from "../publish/workflow.ts";
import { targetRegexValidationInventory } from "../domain/core.ts";
import {
  validateQX,
  validateQxFilterList,
  validateSurgeRuleSet,
  validateSurgeRuleSection,
  validateConversionMetadata,
} from "./output.ts";
import { parseLoonPlugin } from "../parser/input.ts";
import { validateSurgeModule } from "./output.ts";
const ROOT: any = process.cwd();
const findings: any = [];
const validated: any = { qx: 0, surge: 0, loon: 0 };
const artifacts: any = {};
const catalog: any = JSON.parse(
  await fs.readFile(".github/sources/loon.json", "utf8"),
);
const managed: any = new Map(
  catalog.flatMap((entry: any): any => [
    [qxTargetPath(entry), { entry, target: "qx" }],
    [surgeTargetPath(entry), { entry, target: "surge" }],
  ]),
);
const routing: any = new Set(
  Object.keys(
    JSON.parse(await fs.readFile(".github/sources/rules-state.json", "utf8"))
      .outputs,
  ),
);
async function walk(dir: any): Promise<any> {
  const out: any = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (
      ent.name === ".git" ||
      ent.name === "node_modules" ||
      ent.name === ".runtime"
    )
      continue;
    const p: any = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const rel: any = (p: any): any =>
  path.relative(ROOT, p).split(path.sep).join("/");
const add: any = (file: any, line: any, code: any, text: any): any =>
  findings.push({
    file: rel(file),
    line,
    code,
    text: String(text).slice(0, 240),
  });
const active: any = (line: any): any => {
  const t: any = line.trim();
  return t && !t.startsWith("#") && !t.startsWith(";") && !t.startsWith("//");
};
const files: any = await walk(ROOT);
for (const file of files) {
  const rp: any = rel(file);
  if (
    !/\.(?:snippet|sgmodule|ts|js|json|md|txt|yml|yaml|lpx|jq|list|dconf)$/i.test(
      rp,
    )
  )
    continue;
  let text: any;
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    continue;
  }
  if (text.charCodeAt(0) === 0xfeff) add(file, 1, "bom", "UTF-8 BOM present");
  if (/\r/.test(text)) add(file, 1, "crlf", "CR/CRLF newline present");
  const lines: any = text.split("\n");
  artifacts[rp] = validationArtifactDigest(text);
  if (managed.has(rp)) {
    const { entry, target } = managed.get(rp);
    try {
      validateConversionMetadata(text, entry, target);
    } catch (error: any) {
      add(file, 1, "conversion-metadata", error.message);
    }
  }
  if (routing.has(rp)) {
    try {
      if (rp.startsWith("Rule/QuantumultX/"))
        validateQxFilterList(text, { id: rp }, { builtInPoliciesOnly: true });
      else if (rp.endsWith(".dconf"))
        validateSurgeRuleSection(text, { id: rp });
      else validateSurgeRuleSet(text, { id: rp });
    } catch (error: any) {
      add(file, 1, "rule-format", error.message);
    }
  }
  if (rp.endsWith(".snippet")) {
    try {
      validateQX(text, { id: rp });
      validated.qx++;
    } catch (error: any) {
      add(file, 1, "qx-validator", error?.message || error);
    }
    for (let i: any = 0; i < lines.length; i++) {
      const t: any = lines[i].trim();
      if (/^#!(?!source=)/.test(t)) add(file, i + 1, "qx-active-metadata", t);
      if (/^#\s*Category:.*\bLoon\b/i.test(t))
        add(file, i + 1, "source-platform-category", t);
      if (/^\[(?:filter_local|rewrite_local|mitm)\]$/i.test(t))
        add(file, i + 1, "qx-active-section", t);
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(lines[i]))
        add(file, i + 1, "synthetic-casefold", t);
      if (active(lines[i]) && /jq-path=https?:\/\//.test(lines[i]))
        add(file, i + 1, "unresolved-jq-path", t);
      if (
        active(lines[i]) &&
        /\b(?:response-body-json-(?:del|replace|jq)|mock-response-body)\b/.test(
          lines[i],
        )
      )
        add(file, i + 1, "loon-rewrite-token-in-qx", t);
      if (active(lines[i]) && /^(?:request|response)\s+if\b/i.test(t))
        add(file, i + 1, "loon-rewrite-v2-in-qx", t);
      if (active(lines[i]) && /hostname\s*=\s*%APPEND%/i.test(t))
        add(file, i + 1, "surge-append-in-qx", t);
      if (
        active(lines[i]) &&
        /^(?:ip-cidr|ip6-cidr|geoip|ip-asn),/i.test(t) &&
        /,\s*no-resolve(?:,|$)/i.test(t)
      )
        add(file, i + 1, "qx-no-resolve", t);
    }
  }
  if (rp.endsWith(".sgmodule")) {
    if (rp.startsWith("Adblock/Surge/")) {
      try {
        validateSurgeModule(text, { id: rp });
        validated.surge++;
      } catch (error: any) {
        add(file, 1, "surge-adblock-validator", error?.message || error);
      }
    }
    for (let i: any = 0; i < lines.length; i++) {
      const t: any = lines[i].trim();
      if (
        /^#!(?:author|icon|date|loon_version|homepage|tag|openurl|system_version|raw-url|tg-channel)\s*=/i.test(
          t,
        )
      )
        add(file, i + 1, "surge-nonmodule-metadata", t);
      if (/^#\s*Category:.*\bLoon\b/i.test(t))
        add(file, i + 1, "source-platform-category", t);
      if (/Original Loon(?: metadata)?/i.test(lines[i]))
        add(file, i + 1, "source-platform-label", t);
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(lines[i]))
        add(file, i + 1, "synthetic-casefold", t);
      if (active(lines[i]) && /jq-path=https?:\/\//.test(lines[i]))
        add(file, i + 1, "unresolved-jq-path", t);
      if (/^\[(?:Rewrite|Argument)\]$/i.test(t))
        add(file, i + 1, "source-section-in-surge", t);
      if (active(lines[i]) && /^(?:request|response)\s+if\b/i.test(t))
        add(file, i + 1, "loon-rewrite-v2-in-surge", t);
    }
  }
  if (rp.endsWith(".lpx") && rp.startsWith("Resource/Loon/")) {
    try {
      parseLoonPlugin(text);
      validated.loon++;
    } catch (error: any) {
      add(file, 1, "source-plugin-parser", error?.message || error);
    }
  }
  if (/^src\//.test(rp) && rp !== "src/validation/audit-repository.ts") {
    for (let i: any = 0; i < lines.length; i++) {
      const t: any = lines[i];
      if (/\[hH\]\[tT\]\[tT\]\[pP\]/.test(t))
        add(file, i + 1, "converter-synthetic-casefold", t.trim());
      if (/Original Loon metadata|# Original Loon:/.test(t))
        add(file, i + 1, "converter-source-platform-label", t.trim());
      if (
        /renderQxPrefsObjectBridge|renderQxScriptV2Bridge|adaptTiebaQX|adaptDianPingQX|adaptPinDuoDuo/.test(
          t,
        )
      )
        add(file, i + 1, "obsolete-script-body-adapter", t.trim());
    }
  }
  if (/^Script\/.+\.js$/.test(rp)) {
    for (let i: any = 0; i < lines.length; i++) {
      const t: any = lines[i].trim();
      // Adaptation markers are generator metadata/comments. Generated mock
      // helpers may legitimately embed arbitrary upstream JS/HTML text in
      // string literals, so payload content must not be audited as helper code.
      if (
        /^(?:\/\/|\/\*|\*)/.test(t) &&
        /WayX.*(?:bridge|wrapper)|Script v2 ->|Converted Script/i.test(t)
      ) {
        add(file, i + 1, "script-body-adaptation-artifact", t);
      }
    }
  }
}
// Validate the serialized target expressions independently of helper bodies.
const regexAudit: any = spawnSync(process.execPath, ["src/cli.ts", "regex"], {
  input: JSON.stringify(targetRegexValidationInventory()),
  encoding: "utf8",
  maxBuffer: 4 * 1024 * 1024,
});
if (regexAudit.error || regexAudit.status !== 0) {
  findings.push({
    file: ".github/converter",
    line: 1,
    code: "target-icu-regex",
    text: regexAudit.error?.message || regexAudit.stderr || regexAudit.stdout,
  });
} else console.log(regexAudit.stdout.trim());
const plugins: any = catalog
  .filter((entry: any): any =>
    [
      "Resource/Loon/" + entry.file,
      qxTargetPath(entry),
      surgeTargetPath(entry),
    ].every((file: any): any => artifacts[file]),
  )
  .map((entry: any): any => entry.id);
const opaque = await opaqueEntries(process.cwd());
for (const entry of catalog.filter((e: any) => opaque[e.id]?.url !== e.source))
  for (const file of [
    "Resource/Loon/" + entry.file,
    qxTargetPath(entry),
    surgeTargetPath(entry),
  ]) {
    if (!artifacts[file])
      findings.push({
        file,
        line: 1,
        code: "missing-conversion-artifact",
        text: entry.id + ": missing generated file",
      });
  }
await writeValidationEvidence(
  validated.qx + validated.surge + validated.loon,
  findings,
  {
    regexPatterns: targetRegexValidationInventory().length,
    plugins,
    artifacts,
  },
);
if (findings.length) {
  console.error(
    "Repository audit failed with " + findings.length + " finding(s):",
  );
  for (const f of findings)
    console.error(`${f.file}:${f.line} [${f.code}] ${f.text}`);
  process.exitCode = 1;
} else {
  console.log(
    `Repository audit passed: QX=${validated.qx}, Surge adblock=${validated.surge}, source plugins=${validated.loon}; no validator or stale-pattern findings.`,
  );
}
