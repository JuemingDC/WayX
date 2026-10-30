import { addAppIcon } from "../domain/icons.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript publish layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / workflow
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { convertNativeQxToSurge } from "../emit/conversion.ts";
import { normalizeUrlRegexForTarget } from "../domain/core.ts";
import { quoteJq } from "../parser/rewrite.ts";
import { validateQX } from "../validation/output.ts";
import { spawnSync } from "node:child_process";
import { normalizePluginSource, parseLoonPlugin } from "../parser/input.ts";

// Managed source/target/helper artifact I/O for WayX converter workflows.
// Author: chance
// Category: Converter / Managed Artifact I/O
export const AD_BLOCK_ROOT: any = "Adblock";
export const QX_ADBLOCK_DIR: any = "Adblock/Quantumult X";
export const SURGE_ADBLOCK_DIR: any = "Adblock/Surge";
export const BOXJS_SUBSCRIPTION: any = "Boxjs/QuantumultX/Chanceの订阅.json";
export function qxTargetPath(entry: any): any {
  if (!entry?.qx) throw new Error("manifest entry missing qx filename");
  return `${QX_ADBLOCK_DIR}/${entry.qx}`;
}
export function surgeTargetPath(entry: any): any {
  if (!entry?.surge) throw new Error("manifest entry missing surge filename");
  return `${SURGE_ADBLOCK_DIR}/${entry.surge}`;
}
const GENERATED_HELPER_FILENAME_RE: any =
  /^(?:features_(?:qx|surge)|phase_(?:qx|surge)_(?:request|response)|mock|header|complex_qx|mock_file|json_add_qx|redirect|reject|complex_surge|request_mock|json_mutation_surge|legacy_header|legacy_json_add_(?:qx|surge)|legacy_mock|legacy_request_mock)_[0-9a-f]{10}\.js$/;
export function isWayxGeneratedHelperFilename(name: any): any {
  return GENERATED_HELPER_FILENAME_RE.test(String(name ?? ""));
}
async function staleGeneratedHelpers(
  root: any,
  entry: any,
  generatedScripts: any,
  { scriptDir = "Script" }: any = {},
): Promise<any> {
  const dir: any = path.join(root, scriptDir, entry.id);
  let names: any = [];
  try {
    names = await fs.readdir(dir);
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return names
    .filter(
      (name: any): any =>
        isWayxGeneratedHelperFilename(name) && !generatedScripts.has(name),
    )
    .sort();
}
export function normalizeManagedSource(text: any): any {
  return normalizePluginSource(text).replace(/\n*$/, "\n");
}
export function managedSourceDigest(text: any, length: any = 12): any {
  return crypto
    .createHash("sha256")
    .update(String(text ?? ""))
    .digest("hex")
    .slice(0, length);
}
export function nowConversionStamp(): any {
  return (
    new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .format(new Date())
      .replace(" ", "T")
      .replace("T", " ") + " +08:00"
  );
}
export function conversionStampFromText(
  text: any,
  { trim = false }: any = {},
): any {
  const match: any = String(text ?? "").match(/^# Converted:\s*(.+)$/m);
  if (!match) return null;
  return trim ? match[1].trim() : match[1];
}
export function firstConversionStamp(
  texts: any,
  { trim = false }: any = {},
): any {
  for (const text of texts) {
    const stamp: any = conversionStampFromText(text, { trim });
    if (stamp) return stamp;
  }
  return null;
}
// Conversion timestamps describe a write, not a content change. Compare each
// artifact independently so changing one rule/helper cannot rewrite its peers.
function artifactContent(text: any): any {
  if (text === null || text === undefined) return text;
  return String(text).replace(/^(#|\/\/) Converted:[^\n]*/gm, "$1 Converted:");
}
async function managedFileExists(file: any): Promise<any> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}
export async function readManagedTextIfExists(file: any): Promise<any> {
  return (await managedFileExists(file))
    ? normalizePluginSource(await fs.readFile(file, "utf8"))
    : null;
}
export async function inspectManagedSource(
  root: any,
  entry: any,
  source: any,
  { resourceDir = "Resource/Loon" }: any = {},
): Promise<any> {
  const sourcePath: any = path.join(root, resourceDir, entry.file);
  const previous: any = await readManagedTextIfExists(sourcePath);
  return {
    sourcePath,
    previous,
    changed: previous !== source,
    digest: managedSourceDigest(source),
  };
}
export async function writeManagedSource(
  state: any,
  source: any,
): Promise<any> {
  if (!state.changed) return false;
  await fs.mkdir(path.dirname(state.sourcePath), { recursive: true });
  await fs.writeFile(state.sourcePath, source);
  return true;
}
export async function syncManagedSource(
  root: any,
  entry: any,
  source: any,
  options: any = {},
): Promise<any> {
  const state: any = await inspectManagedSource(root, entry, source, options);
  await writeManagedSource(state, source);
  return state;
}
export async function readCatalogSource(
  root: any,
  entry: any,
  { resourceDir = "Resource/Loon" }: any = {},
): Promise<any> {
  const sourcePath: any = path.join(root, resourceDir, entry.file);
  return normalizeManagedSource(await fs.readFile(sourcePath, "utf8"));
}
export async function readManagedTargetState(
  root: any,
  entry: any,
): Promise<any> {
  const qxRelativePath: any = qxTargetPath(entry);
  const surgeRelativePath: any = surgeTargetPath(entry);
  const qxPath: any = path.join(root, qxRelativePath);
  const surgePath: any = path.join(root, surgeRelativePath);
  const [qx, surge] = await Promise.all([
    readManagedTextIfExists(qxPath),
    readManagedTextIfExists(surgePath),
  ]);
  return {
    qxRelativePath,
    surgeRelativePath,
    qxPath,
    surgePath,
    qx,
    surge,
  };
}
export async function generatedScriptDiffs(
  root: any,
  entry: any,
  generatedScripts: any,
  { scriptDir = "Script" }: any = {},
): Promise<any> {
  const diffs: any = [];
  for (const [name, content] of generatedScripts) {
    const file: any = path.join(root, scriptDir, entry.id, name);
    if (
      artifactContent(await readManagedTextIfExists(file)) !==
      artifactContent(content)
    )
      diffs.push(name);
  }
  for (const name of await staleGeneratedHelpers(
    root,
    entry,
    generatedScripts,
    { scriptDir },
  )) {
    diffs.push("delete:" + name);
  }
  return diffs;
}
export async function syncGeneratedScripts(
  root: any,
  entry: any,
  generatedScripts: any,
  { scriptDir = "Script" }: any = {},
): Promise<any> {
  const changed: any = [];
  for (const [name, content] of generatedScripts) {
    const file: any = path.join(root, scriptDir, entry.id, name);
    if (
      artifactContent(await readManagedTextIfExists(file)) ===
      artifactContent(content)
    )
      continue;
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
    changed.push(name);
  }
  for (const name of await staleGeneratedHelpers(
    root,
    entry,
    generatedScripts,
    { scriptDir },
  )) {
    await fs.unlink(path.join(root, scriptDir, entry.id, name));
    changed.push("delete:" + name);
  }
  return changed;
}
// Internal workflow transaction; the public converter index remains unchanged.
export async function commitManagedConversion(
  root: any,
  entry: any,
  state: any,
  out: any,
  {
    sourceState = null,
    source = null,
    onStage = (): any => {},
    writeHelpers = syncGeneratedScripts,
    writeTargets = writeManagedTargets,
    writeSource = writeManagedSource,
  }: any = {},
): Promise<any> {
  const stale: any = await staleGeneratedHelpers(
    root,
    entry,
    out.generatedScripts,
  );
  const files: any = [
    state.qxPath,
    state.surgePath,
    ...(sourceState ? [sourceState.sourcePath] : []),
  ];
  for (const name of new Set([...out.generatedScripts.keys(), ...stale])) {
    if (path.basename(name) !== name)
      throw new Error("Generated helper filename must be local to its plugin");
    files.push(path.join(root, "Script", entry.id, name));
  }
  const snapshot: any = new Map(
    await Promise.all(
      files.map(async (file: any): Promise<any> => {
        try {
          return [file, await fs.readFile(file)];
        } catch (error: any) {
          if (error.code === "ENOENT") return [file, null];
          throw error;
        }
      }),
    ),
  );
  try {
    onStage("write-generated-helpers");
    const helperChanges: any = await writeHelpers(
      root,
      entry,
      out.generatedScripts,
    );
    onStage("write-targets");
    const targetChanges: any = await writeTargets(state, out);
    if (sourceState) {
      onStage("write-source");
      await writeSource(sourceState, source);
    }
    return { helperChanges, targetChanges };
  } catch (error: any) {
    const rollbackErrors: any = [];
    for (const [file, bytes] of snapshot)
      try {
        if (bytes === null) await fs.rm(file, { force: true });
        else {
          const current: any = await fs
            .readFile(file)
            .catch((failure: any): any => {
              if (failure.code === "ENOENT") return null;
              throw failure;
            });
          if (current?.equals(bytes)) continue;
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, bytes);
        }
      } catch (failure: any) {
        rollbackErrors.push(failure);
      }
    if (rollbackErrors.length) {
      const failure: any = new AggregateError(
        [error, ...rollbackErrors],
        "Managed conversion write and rollback failed",
        { cause: error },
      );
      failure.rollbackSucceeded = false;
      throw failure;
    }
    error.rollbackSucceeded = true;
    throw error;
  }
}
export function managedTargetDiffs(state: any, out: any): any {
  const changed: any = [];
  if (artifactContent(state.qx) !== artifactContent(out.qx)) changed.push("qx");
  if (artifactContent(state.surge) !== artifactContent(out.surge))
    changed.push("surge");
  return changed;
}
export async function writeManagedTargets(state: any, out: any): Promise<any> {
  const changed: any = managedTargetDiffs(state, out);
  if (changed.includes("qx")) {
    await fs.mkdir(path.dirname(state.qxPath), { recursive: true });
    await fs.writeFile(state.qxPath, out.qx);
  }
  if (changed.includes("surge")) {
    await fs.mkdir(path.dirname(state.surgePath), { recursive: true });
    await fs.writeFile(state.surgePath, out.surge);
  }
  return changed;
}
// Modified: 2026-10-25 (chance). Import native QX resources without passing
// through the Loon compiler. Keep upstream active text/order and original JS URLs.
const NATIVE_QX_MARKER: any = "# Managed by: WayX Native QX";
export function mergeNativeQxSources(
  sources: any,
  { name, author, stamp = nowConversionStamp() }: any = {},
): any {
  const sections: any = { filter_local: [], rewrite_local: [], mitm: [] },
    hosts: any = [];
  for (const source of sources) {
    let pending: any = ["# Source: " + source.url];
    for (const original of source.text
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n")
      .split("\n")) {
      const line: any = original.trim();
      if (!line || /^(?:#|;|\/\/)/.test(line)) {
        pending.push(
          original.startsWith("#!")
            ? "# Upstream " + original.slice(2)
            : /^(?:;|\/\/)/.test(line)
              ? "# " + original
              : original,
        );
        continue;
      }
      if (/^\[(?:filter_local|rewrite_local|mitm)\]$/i.test(line)) {
        pending.push("# " + line);
        continue;
      }
      const mitm: any = line.match(/^hostname\s*=\s*(.*)$/i);
      if (mitm) {
        sections.mitm.push(...pending, "# Upstream " + original);
        pending = [];
        for (const host of mitm[1]
          .split(",")
          .map((x: any): any => x.trim())
          .filter(Boolean))
          if (!hosts.includes(host)) hosts.push(host);
        continue;
      }
      const key: any = /\surl(?:-and-header)?\s/.test(line)
        ? "rewrite_local"
        : /^(?:host(?:-suffix|-keyword|-wildcard)?|ip-cidr|ip6-cidr|geoip|user-agent)\s*,/i.test(
              line,
            )
          ? "filter_local"
          : null;
      if (!key)
        throw Error(
          "Unknown native QX declaration in " + source.url + ": " + line,
        );
      // Modified: 2026-10-25 (chance). Serialize upstream bare jq into the
      // existing quoted config format without changing its program or actions.
      const jq: any =
        key === "rewrite_local"
          ? original.match(
              /^(.*?\surl(?:-and-header)?\s+jsonjq-(?:request|response)-body)\s+(.+)$/,
            )
          : null;
      const quoted: any =
        jq && !/^'.*'$/.test(jq[2]) ? jq[1] + " " + quoteJq(jq[2]) : original;
      let serialized: any = quoted.replace(
        /^(\S+(?:\s+\S+)?\s+url(?:-and-header)?\s+)REJECT$/,
        "$1reject",
      );
      // Modified: 2026-10-26 (chance). Normalize only the URL matcher;
      // retain original declarations for provenance, not script URLs or bodies.
      if (key === "rewrite_local")
        serialized = serialized.replace(
          /^(\s*)(\S+)/,
          (_: any, space: any, pattern: any): any =>
            space + normalizeUrlRegexForTarget(pattern),
        );
      sections[key].push(
        ...pending,
        ...(serialized !== original
          ? ["# Source declaration: " + original]
          : []),
        serialized,
      );
      pending = [];
    }
    // Trailing comments are still source content, even after a MITM declaration.
    sections.mitm.push(...pending);
  }
  const authors: any = [
    ...new Set([
      author,
      ...sources.flatMap((source: any): any =>
        (source.text.match(/^#!author\s*=\s*(.+)$/im)?.[1] || "")
          .split(/[,，、&]/)
          .map((x: any): any => x.trim())
          .filter(Boolean),
      ),
    ]),
  ];
  const out: any = [
    "# Name: " + name,
    "# Updated: " + stamp,
    "# Merged by: chance",
    "# Source Authors: " + authors.join(", "),
    "# Category: app",
    NATIVE_QX_MARKER,
    "",
  ];
  for (const key of ["filter_local", "rewrite_local", "mitm"]) {
    if (
      !sections[key].some((x: any): any => x.trim()) &&
      !(key === "mitm" && hosts.length)
    )
      continue;
    out.push("# [" + key + "]", ...sections[key]);
    if (key === "mitm" && hosts.length)
      out.push("hostname = " + hosts.join(", "));
    out.push("");
  }
  return out.join("\n").replace(/\n*$/, "\n");
}
export async function prepareNativeQxSync(
  root: any,
  { fetchText, icons = null }: any = {},
): Promise<any> {
  let registry: any;
  try {
    registry = JSON.parse(
      await fs.readFile(
        path.join(root, ".github/sources/native-qx.json"),
        "utf8",
      ),
    );
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  // Modified: 2026-10-25 (chance). Isolated author registries share a
  // single acquisition/commit transaction; v1 remains valid for existing users.
  const configs: any = registry.version === 2 ? registry.sources : [registry];
  if (!Array.isArray(configs) || !configs.length)
    throw Error("Empty native QX registry");
  const plans: any = [];
  for (const config of configs)
    plans.push(await prepareNativeQxSource(config, { fetchText, icons }));
  const outputs: any = new Map();
  for (const plan of plans)
    for (const [file, text] of plan.outputs) {
      if (outputs.has(file)) throw Error("Duplicate native QX output: " + file);
      outputs.set(file, text);
    }
  return {
    outputs,
    commit: plans.length === 1 ? plans[0].commit : undefined,
    sources: plans.map((plan: any, i: any): any => ({
      repository: configs[i].repository,
      prefix: configs[i].prefix,
      commit: plan.commit,
    })),
    inputs: plans.flatMap((p: any): any => p.inputs),
    skipped: plans.flatMap((p: any): any => p.skipped),
    diagnostics: plans.flatMap((p: any): any => p.diagnostics),
  };
}
async function prepareNativeQxSource(
  config: any,
  { fetchText, icons = null }: any,
): Promise<any> {
  if (
    config.version !== 1 ||
    !/^[\w.-]+\/[\w.-]+$/.test(config.repository) ||
    !/^[a-z0-9_]+$/.test(config.prefix)
  )
    throw Error("Invalid native QX registry");
  const api: any = "https://api.github.com/repos/" + config.repository;
  const commit: any = JSON.parse(
    await fetchText(api + "/commits/" + encodeURIComponent(config.ref)),
  ).sha;
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw Error("Invalid native QX snapshot commit");
  const tree: any = JSON.parse(
    await fetchText(api + "/git/trees/" + commit + "?recursive=1"),
  );
  if (tree.truncated || !Array.isArray(tree.tree))
    throw Error("Incomplete native QX source tree");
  const files: any = tree.tree
    .filter(
      (x: any): any =>
        x.type === "blob" &&
        (config.layout === "root"
          ? /^[^/]+\.snippet$/
          : /^(?:filter|rewrite)\/[^/]+\.snippet$/
        ).test(x.path) &&
        !(config.exclude || []).includes(x.path),
    )
    .sort((a: any, b: any): any => a.path.localeCompare(b.path, "en"));
  if (!files.length) throw Error("Empty native QX source catalog");
  const groups: any = new Map(),
    inputs: any = [],
    skipped: any = [],
    diagnostics: any = [];
  for (const file of files) {
    const url: any =
      "https://raw.githubusercontent.com/" +
      config.repository +
      "/" +
      commit +
      "/" +
      file.path;
    const text: any = await fetchText(url);
    if (/^\s*</.test(text)) throw Error("HTML response for " + url);
    const stem: any = path.posix.basename(file.path, ".snippet"),
      key: any =
        config.aliases?.[stem] ||
        (config.layout === "root"
          ? stem.toLowerCase().replace(/_/g, "-")
          : stem);
    if (!/^[a-z0-9-]+$/.test(key))
      throw Error("Invalid native QX application key");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      text,
      path: file.path,
      url:
        "https://raw.githubusercontent.com/" +
        config.repository +
        "/" +
        config.ref +
        "/" +
        file.path,
    });
    inputs.push({
      repository: config.repository,
      path: file.path,
      sha256: crypto.createHash("sha256").update(text).digest("hex"),
    });
  }
  const outputs: any = new Map();
  for (const [key, allSources] of groups) {
    let sources: any = allSources;
    // Modified: 2026-10-25 (chance). For alternative app versions, retain
    // only a uniquely single-author version, never infer an attribution.
    const rewrites: any = allSources.filter((x: any): any =>
      x.path.startsWith("rewrite/"),
    );
    if (rewrites.length > 1) {
      const preferred: any = config.preferred_versions?.[key];
      const eligible: any = rewrites.filter((x: any): any => {
        if (preferred) return x.path === preferred;
        const authors: any = x.text
          .match(/^#!author\s*=\s*(.+)$/im)?.[1]
          ?.split(/[,，、&]/)
          .map((a: any): any => a.trim())
          .filter(Boolean);
        return authors?.length === 1;
      });
      if (eligible.length !== 1) {
        skipped.push({
          application: key,
          reason: "No unique single-author version",
          sources: rewrites.map((x: any): any => x.path),
        });
        continue;
      }
      sources = allSources.filter(
        (x: any): any => !x.path.startsWith("rewrite/") || x === eligible[0],
      );
    }
    const name: any =
      sources
        .map((x: any): any => x.text.match(/^#!name\s*=\s*(.+)$/im)?.[1])
        .filter(Boolean)
        .at(-1) ||
      config.names?.[key] ||
      key;
    // Modified: 2026-10-30 (chance). Apply app metadata before stable native output comparison.
    const text: any = addAppIcon(
      mergeNativeQxSources(sources, {
        name,
        author: config.author,
      }),
      icons,
      [key],
    ).text;
    validateQX(text, { id: config.prefix + key });
    outputs.set(QX_ADBLOCK_DIR + "/" + config.prefix + key + ".snippet", text);
    if (config.surge) {
      // Modified: 2026-10-29 (chance). User requires no JS downloads/API conversion;
      // forward every original URL and declaration mode unchanged.
      const converted: any = convertNativeQxToSurge(text, {
        id: config.prefix + key,
      });
      outputs.set(
        SURGE_ADBLOCK_DIR + "/" + config.prefix + key + ".sgmodule",
        converted.surge,
      );
      diagnostics.push(
        ...converted.diagnostics.map((item: any): any => ({
          repository: config.repository,
          application: key,
          ...item,
        })),
      );
    }
  }
  return { outputs, commit, inputs, skipped, diagnostics };
}
export async function commitNativeQxSync(root: any, plan: any): Promise<any> {
  if (!plan) return;
  const statePath: any = ".github/sources/native-qx-state.json";
  let prior: any = { outputs: [] };
  try {
    prior = JSON.parse(await fs.readFile(path.join(root, statePath), "utf8"));
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  const old: any = new Map(),
    writes: any = new Map();
  for (const relative of new Set([...prior.outputs, ...plan.outputs.keys()])) {
    if (
      !/^Adblock\/(?:Quantumult X\/(?:ishowshu|zenmofeishi)_[a-z0-9-]+\.snippet|Surge\/(?:ishowshu|zenmofeishi)_[a-z0-9-]+\.sgmodule)$/.test(
        relative,
      )
    )
      throw Error("Native QX ownership boundary violation");
    let previous: any = null;
    try {
      previous = await fs.readFile(path.join(root, relative), "utf8");
    } catch (error: any) {
      if (error.code !== "ENOENT") throw error;
    }
    if (previous !== null && !previous.includes(NATIVE_QX_MARKER))
      throw Error(
        "Refusing to overwrite unmanaged native QX resource: " + relative,
      );
    old.set(relative, previous);
    let next: any = plan.outputs.get(relative) ?? null;
    if (
      previous &&
      next &&
      previous.replace(/^# Updated:.*$/m, "") ===
        next.replace(/^# Updated:.*$/m, "")
    )
      next = previous;
    if (next !== previous) writes.set(relative, next);
  }
  let state: any = null;
  try {
    state = await fs.readFile(path.join(root, statePath), "utf8");
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  old.set(statePath, state);
  writes.set(
    statePath,
    JSON.stringify(
      {
        version: 1,
        commit: plan.commit,
        sources: plan.sources,
        inputs: plan.inputs,
        skipped: plan.skipped,
        diagnostics: plan.diagnostics,
        outputs: [...plan.outputs.keys()],
      },
      null,
      2,
    ) + "\n",
  );
  try {
    for (const [relative, text] of writes) {
      const file: any = path.join(root, relative);
      await fs.mkdir(path.dirname(file), { recursive: true });
      if (text === null) await fs.rm(file, { force: true });
      else await fs.writeFile(file, text);
    }
  } catch (error: any) {
    for (const [relative, text] of old) {
      const file: any = path.join(root, relative);
      if (text === null) await fs.rm(file, { force: true });
      else await fs.writeFile(file, text);
    }
    throw error;
  }
}

export const README_AUTO_UPDATE_INTERVAL: any = 86400;
export const QX_MIXED_REWRITE_MIN_BUILD: any = 844;
export const README_CATEGORY_ORDER: any = Object.freeze([
  "BoxJs",
  "Module",
  "Adblock",
  "Rule",
]);
const RAW_BASE: any = "https://raw.githubusercontent.com/JuemingDC/WayX/main";
const BLOB_BASE: any = "https://github.com/JuemingDC/WayX/blob/main";
const QX_UNIVERSAL_BASE: any =
  "https://quantumult.app/x/open-app/add-resource?remote-resource=";
const SURGE_WEB_INSTALL_BASE: any = "https://surge.app/install-module?url=";
const BOXJS_SUBSCRIBE_BASE: any = "https://boxjs.com/#/sub/add/";
const STALE_WAYX_SCRIPT_RAW: any = `${RAW_BASE}/${["scr", "ipt"].join("")}/`;
function normalizePlatformPart(value: any): any {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}
function encodeRepoPath(rel: any): any {
  return String(rel).split("/").map(encodeURIComponent).join("/");
}
export function rawRepoUrl(rel: any): any {
  return `${RAW_BASE}/${encodeRepoPath(rel)}`;
}
export function blobRepoUrl(rel: any): any {
  return `${BLOB_BASE}/${encodeRepoPath(rel)}`;
}
export function extractResourceName(text: any, fallback: any = ""): any {
  const source: any = String(text ?? "");
  const qx: any = source.match(/^#\s*name\s*:\s*(.+?)\s*$/im);
  if (qx?.[1]) return qx[1].trim();
  const surge: any = source.match(/^#!name\s*=\s*(.+?)\s*$/im);
  if (surge?.[1]) return surge[1].trim();
  try {
    const json: any = JSON.parse(source);
    if (typeof json?.name === "string" && json.name.trim())
      return json.name.trim();
  } catch {}
  return String(fallback ?? "").trim();
}
export function qxAddResourceUrl(payload: any): any {
  return QX_UNIVERSAL_BASE + encodeURIComponent(JSON.stringify(payload));
}
function safeTag(value: any): any {
  return String(value ?? "")
    .replace(/,/g, "，")
    .trim();
}
function qxRemoteDescriptor(url: any, tag: any): any {
  return `${url}, tag=${safeTag(tag)}, update-interval=${README_AUTO_UPDATE_INTERVAL}, enabled=true`;
}
export function surgeModuleInstallUrl(rel: any): any {
  return SURGE_WEB_INSTALL_BASE + encodeURIComponent(rawRepoUrl(rel));
}
export function boxJsSubscribeUrl(rel: any): any {
  return BOXJS_SUBSCRIBE_BASE + encodeURIComponent(rawRepoUrl(rel));
}
async function walkFiles(root: any, rel: any): Promise<any> {
  const abs: any = path.join(root, rel);
  let entries: any;
  try {
    entries = await fs.readdir(abs, { withFileTypes: true });
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const out: any = [];
  for (const ent of entries.sort((a: any, b: any): any =>
    a.name.localeCompare(b.name, "en"),
  )) {
    if (ent.name.startsWith(".")) continue;
    const child: any = path.posix.join(rel.replaceAll(path.sep, "/"), ent.name);
    if (ent.isDirectory()) out.push(...(await walkFiles(root, child)));
    else if (ent.isFile()) out.push(child);
  }
  return out;
}
function detectPlatform(rel: any): any {
  for (const part of String(rel).split("/")) {
    const key: any = normalizePlatformPart(part);
    if (key === "quantumultx" || key === "quanx") return "qx";
    if (key === "surge") return "surge";
  }
  return null;
}
function stemOf(rel: any): any {
  const base: any = path.posix.basename(rel);
  return base.replace(/\.[^.]+$/, "");
}
function rowKey(category: any, rel: any): any {
  const parts: any = rel.split("/");
  if (category === "Module")
    return parts.length === 2 ? stemOf(rel) : parts[1] || stemOf(rel);
  return stemOf(rel);
}
async function catalogRowMetadata(root: any, category: any): Promise<any> {
  const empty: any = (): any => ({ order: new Map(), sources: new Map() });
  if (category !== "Adblock") return empty();
  let manifest: any;
  try {
    manifest = JSON.parse(
      await fs.readFile(path.join(root, ".github/sources/loon.json"), "utf8"),
    );
  } catch (error: any) {
    if (error?.code === "ENOENT") return empty();
    throw error;
  }
  if (!Array.isArray(manifest))
    throw new Error("README catalog order source must be an array");
  const order: any = new Map();
  const sources: any = new Map();
  manifest.forEach((entry: any, index: any): any => {
    for (const field of ["qx", "surge"]) {
      const value: any = entry?.[field];
      if (typeof value !== "string" || !value.trim()) continue;
      const key: any = stemOf(value.trim());
      if (!order.has(key)) order.set(key, index);
      if (!sources.has(key) && typeof entry.source === "string")
        sources.set(key, entry.source);
    }
  });
  return { order, sources };
}
async function scanCategory(root: any, category: any): Promise<any> {
  const dir: any = category === "BoxJs" ? "Boxjs" : category;
  const files: any = await walkFiles(root, dir);
  const rows: any = new Map();
  for (const rel of files) {
    const ext: any = path.posix.extname(rel).toLowerCase();
    if (category === "BoxJs" && ext !== ".json") continue;
    if (category === "Module" && ![".snippet", ".sgmodule"].includes(ext))
      continue;
    if (category === "Adblock" && ![".snippet", ".sgmodule"].includes(ext))
      continue;
    if (
      category === "Rule" &&
      ![".list", ".snippet", ".sgmodule", ".dconf"].includes(ext)
    )
      continue;
    // Root-level Module files do not include a platform directory.
    // Infer the platform only there, from the unambiguous module extension.
    const platform: any =
      detectPlatform(rel) ??
      (category === "Module" && rel.split("/").length === 2
        ? ext === ".sgmodule"
          ? "surge"
          : ext === ".snippet"
            ? "qx"
            : null
        : null);
    if (!platform && category !== "BoxJs") continue;
    const text: any = await fs.readFile(path.join(root, rel), "utf8");
    if (text.includes(STALE_WAYX_SCRIPT_RAW)) {
      throw new Error(
        `stale lowercase WayX Script raw URL in indexed resource: ${rel}`,
      );
    }
    const fallback: any = stemOf(rel);
    const name: any = extractResourceName(text, fallback);
    const key: any = rowKey(category, rel);
    const row: any = rows.get(key) ?? { key, qx: null, surge: null };
    const item: any = { rel, name, text, ext };
    if (category === "BoxJs") {
      if (platform === "surge") row.surge = item;
      else row.qx = item;
    } else {
      if (platform === "qx") row.qx = item;
      if (platform === "surge") row.surge = item;
    }
    rows.set(key, row);
  }
  const { order: sourceOrder, sources } = await catalogRowMetadata(
    root,
    category,
  );
  for (const row of rows.values()) row.catalogSource = sources.get(row.key);
  // Modified: 2026-10-25 (chance). Keep fetch-source group order separate
  // from alphabetical resource order within each existing author group.
  return [...rows.values()].sort((a: any, b: any): any => {
    const ar: any = sourceOrder.has(a.key) ? sourceOrder.get(a.key) : Infinity;
    const br: any = sourceOrder.has(b.key) ? sourceOrder.get(b.key) : Infinity;
    return ar - br || a.key.localeCompare(b.key, "en");
  });
}
export function qxSnippetInstallUrl(item: any): any {
  if (!item?.rel || item.ext !== ".snippet") {
    throw new Error(
      "Quantumult X module/adblock install target must be a .snippet resource",
    );
  }
  // Modified: 2026-10-25 (chance). QX build 844+ reads filter rules
  // inside a rewrite snippet. All authors use one file and one subscription;
  // never register that same app snippet in filter_remote a second time.
  return qxAddResourceUrl({
    rewrite_remote: [qxRemoteDescriptor(rawRepoUrl(item.rel), item.name)],
  });
}
function qxInstallerForRule(item: any): any {
  const payload: any = {
    filter_remote: [qxRemoteDescriptor(rawRepoUrl(item.rel), item.name)],
  };
  return qxAddResourceUrl(payload);
}
function markdownLink(label: any, url: any): any {
  return `[${label}](${url})`;
}
function resourceNameCell(row: any): any {
  const item: any = row.qx ?? row.surge;
  return item
    ? `**[${item.name}](${blobRepoUrl(item.rel)})**`
    : `**${row.key}**`;
}
function rowInstallCells(category: any, row: any): any {
  let qx: any = "—";
  let surge: any = "—";
  if (category === "BoxJs" && row.qx) {
    qx = markdownLink("一键添加", boxJsSubscribeUrl(row.qx.rel));
  } else if (row.qx && (category === "Module" || category === "Adblock")) {
    qx = markdownLink("一键导入", qxSnippetInstallUrl(row.qx));
  } else if (row.qx && category === "Rule") {
    qx = markdownLink("一键导入", qxInstallerForRule(row.qx));
  }
  if (row.surge) {
    if (row.surge.ext === ".sgmodule") {
      surge = markdownLink("一键安装", surgeModuleInstallUrl(row.surge.rel));
      const count: any = Number(
        row.surge.text?.match(/^# Native QX review count: (\d+)$/m)?.[1] || 0,
      );
      if (count) surge += " · " + count + " 条待核对";
    } else surge = markdownLink("查看规则", rawRepoUrl(row.surge.rel));
  }
  return { qx, surge };
}
function adblockSource(row: any): any {
  const source: any =
    row.catalogSource ||
    [row.qx, row.surge]
      .map(
        (item: any): any =>
          item?.text.match(/^#\s*Source:\s*(https?:\/\/\S+)\s*$/im)?.[1],
      )
      .find(Boolean);
  if (!source) return "本地资源";
  try {
    const url: any = new URL(source),
      host: any = url.hostname.toLowerCase();
    if (host === "kelee.one" || host.endsWith(".kelee.one")) return "可莉";
    if (host === "rucu6.pages.dev") return "RuCu6";
    if (
      ["github.com", "raw.githubusercontent.com"].includes(host) &&
      url.pathname.split("/")[1] === "ishowshu"
    )
      return "树先生";
    // Modified: 2026-10-25 (chance). Keep the new native author in its own A–Z group.
    if (
      ["github.com", "raw.githubusercontent.com"].includes(host) &&
      url.pathname.split("/")[1].toLowerCase() === "zenmofeishi"
    )
      return "怎么肥事";
    if (host === "raw.githubusercontent.com" || host === "github.com")
      return url.pathname.split("/").filter(Boolean)[0] || host;
    return host;
  } catch {
    return "本地资源";
  }
}
function escapeHtml(value: any): any {
  return String(value).replace(
    /[&<>"']/g,
    (char: any): any =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[char],
  );
}
function renderTable(
  category: any,
  rows: any,
  heading: any = category,
  level: any = 2,
): any {
  const lines: any = [
    ...(heading === null ? [] : [`${"#".repeat(level)} ${heading}`, ""]),
    "| Name | Quantumult X | Surge |",
    "| :--- | :---: | :---: |",
  ];
  for (const row of rows) {
    const cells: any = rowInstallCells(category, row);
    lines.push(`| ${resourceNameCell(row)} | ${cells.qx} | ${cells.surge} |`);
  }
  if (!rows.length) lines.push("| — | — | — |");
  return lines.join("\n");
}
// Modified: 2026-10-25 (chance). Group visible names by Latin/pinyin initial;
// numeric and other names retain dedicated groups after A-Z.
const nameCollator: any = new Intl.Collator("zh-Hans-CN-u-co-pinyin", {
  numeric: true,
  sensitivity: "base",
});
const initialBoundaries: any = [
  ["A", "阿"],
  ["B", "八"],
  ["C", "擦"],
  ["D", "搭"],
  ["E", "蛾"],
  ["F", "发"],
  ["G", "噶"],
  ["H", "哈"],
  ["J", "击"],
  ["K", "喀"],
  ["L", "垃"],
  ["M", "妈"],
  ["N", "拿"],
  ["O", "哦"],
  ["P", "啪"],
  ["Q", "期"],
  ["R", "然"],
  ["S", "撒"],
  ["T", "塌"],
  ["W", "挖"],
  ["X", "昔"],
  ["Y", "压"],
  ["Z", "匝"],
];
function rowName(row: any): any {
  return (row.qx ?? row.surge)?.name || row.key;
}
function rowInitial(row: any): any {
  const first: any = rowName(row)
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .charAt(0);
  if (/[a-z]/i.test(first)) return first.toUpperCase();
  if (/[0-9]/.test(first)) return "0–9";
  if (/\p{Script=Han}/u.test(first)) {
    for (const [letter, boundary] of [...initialBoundaries].reverse())
      if (nameCollator.compare(first, boundary) >= 0) return letter;
  }
  return "其他";
}
function alphabetTables(category: any, rows: any, level: any = 4): any {
  const groups: any = new Map();
  for (const row of rows) {
    const letter: any = rowInitial(row);
    if (!groups.has(letter)) groups.set(letter, []);
    groups.get(letter).push(row);
  }
  return [...groups]
    .sort(([a]: any, [b]: any): any => {
      const rank: any = (x: any): any =>
        /^[A-Z]$/.test(x) ? x.charCodeAt(0) : x === "0–9" ? 100 : 101;
      return rank(a) - rank(b);
    })
    .map(([letter, items]: any): any =>
      renderTable(
        category,
        items.sort(
          (a: any, b: any): any =>
            nameCollator.compare(rowName(a), rowName(b)) ||
            a.key.localeCompare(b.key),
        ),
        letter,
        level,
      ),
    )
    .join("\n\n");
}
// README grouping only: preserve the actual policies and install descriptors.
function ruleGroup(row: any): any {
  const actions: any = new Set();
  for (const line of (row.qx?.text || row.surge?.text || "").split("\n")) {
    if (!line.trim() || /^[#;]/.test(line.trim()) || line.startsWith("//"))
      continue;
    // Modified: 2026-10-27 (chance). Classify ssid as proxy routing in the resource index.
    const action: any = line
      .match(/,\s*(direct|proxy|ssid|reject(?:-[a-z0-9]+)?)\s*$/i)?.[1]
      ?.toLowerCase();
    if (action)
      actions.add(
        action.startsWith("reject")
          ? "reject"
          : action === "ssid"
            ? "proxy"
            : action,
      );
  }
  if (actions.size === 1 && actions.has("reject")) return "Reject";
  if (actions.has("proxy")) return "Proxy";
  if (actions.size === 1 && actions.has("direct")) return "Direct";
  if (/(?:^|_)(?:direct|cn)(?:_|$)/i.test(row.key)) return "Direct";
  if (/(?:adblock|reject)/i.test(row.key)) return "Reject";
  return "Proxy";
}
// Modified: 2026-10-27 (chance). Show Apple/Microsoft import order separately from resource-index display order.
export async function buildReadmePlan(root: any = process.cwd()): Promise<any> {
  const sections: any = [];
  for (const category of README_CATEGORY_ORDER) {
    const rows: any = await scanCategory(root, category);
    if (category === "Adblock" && rows.length) {
      const groups: any = new Map();
      for (const row of rows) {
        const author: any = adblockSource(row);
        if (!groups.has(author)) groups.set(author, []);
        groups.get(author).push(row);
      }
      sections.push(
        "## Adblock\n\n按拉取来源分组，点击展开；各来源内部按名称 A–Z 分栏，中文按拼音首字母，数字单列。\n\n" +
          [...groups]
            .map(
              ([author, items]: any): any =>
                "<details>\n<summary><strong>" +
                escapeHtml(author) +
                "</strong> · " +
                items.length +
                " 项</summary>\n\n" +
                alphabetTables(category, items) +
                "\n\n</details>",
            )
            .join("\n\n"),
      );
    } else if (category === "Module")
      sections.push("## Module\n\n" + alphabetTables(category, rows, 3));
    else if (category === "Rule")
      sections.push(
        "## Rule\n\n按 Reject → Proxy → Direct 展示；这不是引用优先级。Apple 在 Surge 中按 apple_cn（DIRECT）→ apple_proxy（代理）引用；Microsoft 按 microsoft_direct（DIRECT）→ microsoft_proxy（代理）引用。混合策略资源导入时保留逐条策略。\n\n" +
          ["Reject", "Proxy", "Direct"]
            .map((group: any): any =>
              renderTable(
                category,
                rows
                  .filter((row: any): any => ruleGroup(row) === group)
                  .sort((a: any, b: any): any =>
                    nameCollator.compare(rowName(a), rowName(b)),
                  ),
                group,
                3,
              ),
            )
            .join("\n\n"),
      );
    else sections.push(renderTable(category, rows));
  }
  const readme: any = [
    '<div align="center">',
    "",
    "# WayX",
    "",
    "**Quantumult X · Surge**",
    "",
    "规则、模块及去广告资源转换与维护",
    "",
    "[BoxJs](#boxjs) · [Module](#module) · [Adblock](#adblock) · [Rule](#rule)",
    "",
    "</div>",
    "",
    "---",
    "",
    sections.join("\n\n---\n\n"),
    "",
    "---",
    "",
    '<div align="center">',
    "",
    "WayX · Maintained by **chance**",
    "",
    "</div>",
    "",
  ].join("\n");
  return new Map([["README.md", readme]]);
}
export async function readmePlanDiff(
  root: any = process.cwd(),
  plan: any = null,
): Promise<any> {
  const desired: any = plan ?? (await buildReadmePlan(root));
  const changed: any = [];
  for (const [rel, content] of desired) {
    let current: any = null;
    try {
      current = await fs.readFile(path.join(root, rel), "utf8");
    } catch (error: any) {
      if (error?.code !== "ENOENT") throw error;
    }
    if (current !== content) changed.push(rel);
  }
  return changed.sort();
}
export async function writeReadmePlan(
  root: any = process.cwd(),
  plan: any = null,
): Promise<any> {
  const desired: any = plan ?? (await buildReadmePlan(root));
  for (const [rel, content] of desired) {
    const abs: any = path.join(root, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content);
  }
  return desired;
}

// Scheduled upstream conversion failure reporting.
// Author: chance
// Category: Converter / Automation / Failure Report
function activeDeclarations(text: any): any {
  if (!text) return [];
  const parsed: any = parseLoonPlugin(text);
  const out: any = [];
  for (const [section, lines] of parsed.sections) {
    if (section === "Argument") continue;
    for (const raw of lines) {
      const line: any = String(raw ?? "").trim();
      if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
      out.push({ section, line });
    }
  }
  return out;
}
function multiset(items: any): any {
  const counts: any = new Map();
  for (const item of items) {
    const key: any = item.section + "\0" + item.line;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
export function failureDeclarationContext(
  previous: any,
  current: any,
  { limit = 40 }: any = {},
): any {
  const before: any = activeDeclarations(previous);
  const after: any = activeDeclarations(current);
  const counts: any = multiset(before);
  const changed: any = [];
  for (const item of after) {
    const key: any = item.section + "\0" + item.line;
    const count: any = counts.get(key) || 0;
    if (count) counts.set(key, count - 1);
    else changed.push(item);
  }
  if (changed.length)
    return {
      kind: "changed-upstream-declarations",
      items: changed.slice(0, limit),
    };
  if (after.length)
    return {
      kind: "current-upstream-declarations",
      items: after.slice(0, limit),
    };
  if (before.length)
    return {
      kind: "current-local-declarations",
      items: before.slice(0, limit),
    };
  return { kind: "unavailable", items: [] };
}
export function buildSyncFailure({
  entry,
  stage,
  error,
  previousSource = null,
  fetchedSource = null,
}: any): any {
  const reason: any = String(error?.message || error || "unknown failure");
  const detail: any = String(
    error?.stack || error?.message || error || "unknown failure",
  );
  const context: any = failureDeclarationContext(previousSource, fetchedSource);
  return {
    plugin: {
      id: entry.id,
      file: entry.file,
      source: entry.source,
      qx: entry.qx,
      surge: entry.surge,
    },
    stage,
    reason,
    detail,
    declarationContext: context.kind,
    declarations: context.items,
  };
}
export async function writeSyncFailureReport(
  root: any,
  failures: any,
  { runtimeDir = ".github/monitor/.runtime", summary = null }: any = {},
): Promise<any> {
  const dir: any = path.join(root, runtimeDir);
  await fs.mkdir(dir, { recursive: true });
  const jsonPath: any = path.join(dir, "sync-failures.json");
  const markdownPath: any = path.join(dir, "sync-failures.md");
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      summary ? { version: 2, failures, ...summary } : { version: 1, failures },
      null,
      2,
    ) + "\n",
  );
  const lines: any = [
    "# WayX Actions sync failures",
    "",
    `Total: ${failures.length}`,
    "",
  ];
  for (const failure of failures) {
    lines.push(
      "## " + failure.plugin.id,
      "",
      "- Stage: `" + failure.stage + "`",
      "- Reason: " + failure.reason,
      "- Source: `" + failure.plugin.file + "`",
      "- Upstream: " + failure.plugin.source,
      "",
      "### Related source declarations",
      "",
    );
    if (failure.declarations.length) {
      lines.push("```text");
      for (const item of failure.declarations)
        lines.push("[" + item.section + "] " + item.line);
      lines.push("```", "");
    } else {
      lines.push("(new upstream rule content unavailable)", "");
    }
  }
  await fs.writeFile(markdownPath, lines.join("\n") + "\n");
  return { jsonPath, markdownPath };
}

// Shared workflow diagnostics for catalog conversion runners.
// Author: chance
// Category: Converter / Workflow Diagnostics
// Shared machine evidence for existing validation commands. Successful outputs
// remain counts; mismatches retain bounded actual/expected excerpts and hashes.
export async function writeValidationEvidence(
  checked: any,
  findings: any,
  coverage: any = {},
): Promise<any> {
  const file: any = process.env.WAYX_CHECK_REPORT;
  if (!file) return;
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(
    file,
    JSON.stringify({ version: 1, checked, findings, coverage }, null, 2) + "\n",
  );
}
export async function recordOutputMismatch(
  file: any,
  expected: any,
  actual: any,
  plugin: any = null,
): Promise<any> {
  const finding: any = outputMismatch(file, expected, actual, plugin);
  const report: any = process.env.WAYX_CHECK_REPORT;
  if (!finding || !report) return finding;
  const dir: any = path.join(path.dirname(report), "output-differences");
  await fs.mkdir(dir, { recursive: true });
  const key: any = crypto
    .createHash("sha256")
    .update(file)
    .digest("hex")
    .slice(0, 16);
  const want: any = path.join(dir, key + ".expected"),
    got: any = path.join(dir, key + ".actual"),
    patch: any = path.join(dir, key + ".patch");
  await fs.writeFile(want, artifactContent(expected) ?? "");
  await fs.writeFile(got, artifactContent(actual) ?? "");
  const diff: any = spawnSync(
    "git",
    ["diff", "--no-index", "--no-color", "--", want, got],
    { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  if (diff.error || ![0, 1].includes(diff.status))
    throw new Error(
      "Cannot record output difference: " +
        (diff.error?.message || diff.stderr),
    );
  await fs.writeFile(patch, diff.stdout);
  finding.evidence = {
    expected: path.relative(process.cwd(), want),
    actual: path.relative(process.cwd(), got),
    patch: path.relative(process.cwd(), patch),
  };
  return finding;
}
export function validationArtifactDigest(value: any): any {
  const text: any = artifactContent(value);
  return text == null
    ? null
    : crypto.createHash("sha256").update(text).digest("hex");
}
export function outputMismatch(
  file: any,
  expected: any,
  actual: any,
  plugin: any = null,
): any {
  const want: any = artifactContent(expected),
    got: any = artifactContent(actual);
  if (want === got) return null;
  const a: any = String(want ?? "").split("\n"),
    b: any = String(got ?? "").split("\n");
  let first: any = 0;
  while (first < Math.min(a.length, b.length) && a[first] === b[first]) first++;
  const digest: any = validationArtifactDigest;
  return {
    code: "output-mismatch",
    file,
    plugin,
    line: first + 1,
    expectedHash: digest(want),
    actualHash: digest(got),
    expected:
      want == null
        ? "(absent)"
        : a
            .slice(Math.max(0, first - 1), first + 3)
            .join("\n")
            .slice(0, 2000),
    actual:
      got == null
        ? "(absent)"
        : b
            .slice(Math.max(0, first - 1), first + 3)
            .join("\n")
            .slice(0, 2000),
  };
}
function fallbackValue(error: any, mode: any): any {
  return mode === "error" ? error : error?.message;
}
function failureDetail(error: any, mode: any): any {
  return error?.stack || fallbackValue(error, mode);
}
function annotationValue(error: any, mode: any): any {
  if (mode === "error") return error?.message || error;
  return error?.message;
}
export function formatWorkflowErrorAnnotation(
  entry: any,
  error: any,
  { annotationFallback = "message" }: any = {},
): any {
  const title: any = entry?.id;
  const message: any = String(
    annotationValue(error, annotationFallback),
  ).replaceAll("\n", "%0A");
  return `::error title=${title}::${message}`;
}
export function createWorkflowFailureReporter({
  summaryLabel = "Failures",
  detailFallback = "message",
  annotationFallback = "message",
  writeError = console.error,
}: any = {}): any {
  const failures: any = [];
  function capture(entry: any, error: any): any {
    failures.push(`${entry.id}: ${failureDetail(error, detailFallback)}`);
    writeError(
      formatWorkflowErrorAnnotation(entry, error, { annotationFallback }),
    );
  }
  function report(): any {
    if (!failures.length) return false;
    writeError(`\n${summaryLabel}:\n` + failures.join("\n\n"));
    return true;
  }
  return {
    capture,
    report,
    get size() {
      return failures.length;
    },
    snapshot(): any {
      return [...failures];
    },
  };
}
