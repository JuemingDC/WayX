import type { SourceEntry } from "../domain/contracts.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript parser layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / input
import fs from "node:fs/promises";
import {
  splitScriptPipelineSources,
  isScriptV2,
  parseScriptV2,
} from "./script.ts";
import {
  minifyJqFile,
  isRewriteV2,
  parseRewriteV2,
  selectRewritePipelineLayer,
  validateRewriteV2Ast,
  legacyRewriteToSemanticIr,
  dependencySpecFromAction,
  jqDependencySpecFromAction,
  legacyJqPathDependencySpecFromIr,
  isTextRequestMockAction,
} from "./rewrite.ts";
// Modified: 2026-10-25 (chance). Input parsing consumes resource acquisition;
// these exports preserve the existing tools API without a second fetch path.
import {
  fetchOriginalText,
  fetchOriginalBytes,
  memoizeResourceReads,
} from "../ingest/resources.ts";
export {
  fetchOriginalText,
  fetchOriginalBytes,
  selectOriginalFetchProfile,
  resolveOriginalUrl,
  ORIGINAL_FETCH_PROFILES,
  WAYX_FETCH_UA,
} from "../ingest/resources.ts";
import { resolveOriginalUrl } from "../ingest/resources.ts";

// WayX declarative Loon source catalog
// Author: chance
// Category: Converter / Source Catalog
const REQUIRED: any = Object.freeze([
  "id",
  "file",
  "source",
  "qx",
  "surge",
  "category",
]);
function cleanString(value: any): any {
  return typeof value === "string" ? value.trim() : "";
}
function safeRelativePath(value: any, field: any): any {
  const path: any = cleanString(value);
  if (!path) throw new Error(`catalog entry missing ${field}`);
  if (
    path.startsWith("/") ||
    path.includes("\\") ||
    path.split("/").includes("..")
  ) {
    throw new Error(
      `catalog ${field} must be a safe repository-relative path: ${path}`,
    );
  }
  return path;
}
function absoluteHttpUrl(value: any, field: any): any {
  const text: any = cleanString(value);
  let url: any;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`catalog ${field} must be an absolute URL: ${text}`);
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`catalog ${field} must use HTTP(S): ${text}`);
  }
  return text;
}
export function validateLoonSourceEntry(input: any): any {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("catalog entry must be an object");
  }
  for (const field of REQUIRED) {
    if (!cleanString(input[field]))
      throw new Error(`catalog entry missing ${field}`);
  }
  if (Object.prototype.hasOwnProperty.call(input, "mirrors")) {
    throw new Error(
      "catalog mirrors are forbidden; use the original author source URL only",
    );
  }
  const entry: any = {
    id: cleanString(input.id),
    file: safeRelativePath(input.file, "file"),
    source: absoluteHttpUrl(input.source, "source"),
    qx: safeRelativePath(input.qx, "qx"),
    surge: safeRelativePath(input.surge, "surge"),
    category: cleanString(input.category),
  };
  if (!/^[A-Za-z0-9._-]+$/.test(entry.id)) {
    throw new Error(`catalog id contains unsupported characters: ${entry.id}`);
  }
  if (!/\.lpxe?$/i.test(entry.file))
    throw new Error(`catalog file must end in .lpx or .lpxe: ${entry.file}`);
  if (!/\.snippet$/i.test(entry.qx))
    throw new Error(`catalog qx target must end in .snippet: ${entry.qx}`);
  if (!/\.sgmodule$/i.test(entry.surge))
    throw new Error(
      `catalog surge target must end in .sgmodule: ${entry.surge}`,
    );
  return Object.freeze(entry);
}
export function validateLoonSourceCatalog(input: any): any {
  if (!Array.isArray(input))
    throw new TypeError("Loon source catalog must be an array");
  const entries: any = input.map(validateLoonSourceEntry);
  const seen: any = {
    id: new Set(),
    file: new Set(),
    qx: new Set(),
    surge: new Set(),
  };
  for (const entry of entries) {
    for (const field of Object.keys(seen)) {
      const key: any = entry[field];
      if (seen[field].has(key))
        throw new Error(`duplicate catalog ${field}: ${key}`);
      seen[field].add(key);
    }
  }
  return Object.freeze(entries);
}
export async function loadLoonSourceCatalog(
  file: string,
): Promise<SourceEntry[]> {
  const raw: any = JSON.parse(await fs.readFile(file, "utf8"));
  return validateLoonSourceCatalog(raw);
}

// Loon source parser and section/comment structure
// Author: chance
// Category: Converter / Source Parsing
export const WAYX_SUPPORTED_SOURCE_SECTIONS: any = new Set([
  "Argument",
  "General",
  "Rule",
  "Rewrite",
  "Script",
  "MITM",
  "MitM",
]);
export function normalizePluginSource(text: any): any {
  return String(text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "");
}
export function parseLoonPlugin(text: any): any {
  const header: any = [];
  const sections: any = new Map();
  let current: any = null;
  for (const raw of normalizePluginSource(text).split("\n")) {
    const match: any = raw.trim().match(/^\[([^\]]+)\]$/);
    if (match) {
      current = match[1];
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (current === null) header.push(raw);
    else sections.get(current).push(raw);
  }
  return { header, sections };
}
export function isSupportedSourceSection(name: any): any {
  return WAYX_SUPPORTED_SOURCE_SECTIONS.has(String(name ?? ""));
}
export function groupSourceSectionItems(lines: any = []): any {
  const items: any = [];
  let pending: any = [];
  for (let sourceIndex: any = 0; sourceIndex < lines.length; sourceIndex++) {
    const raw: any = String(lines[sourceIndex] ?? "");
    const trimmed: any = raw.trim();
    if (
      !trimmed ||
      trimmed.startsWith("#") ||
      trimmed.startsWith(";") ||
      trimmed.startsWith("//")
    ) {
      pending.push(lines[sourceIndex]);
      continue;
    }
    const members: any = isScriptV2(trimmed)
      ? splitScriptPipelineSources(trimmed)
      : [trimmed];
    members.forEach((line: any, index: any): any =>
      items.push({
        comments: index === 0 ? pending : [],
        line,
        sourceIndex,
        ...(members.length > 1 ? { pipelineMember: true } : {}),
      }),
    );
    pending = [];
  }
  if (pending.length)
    items.push({ comments: pending, line: null, sourceIndex: lines.length });
  return items;
}
export function cleanSourceComments(comments: any = []): any {
  return comments
    .map((value: any): any => value || "")
    .map((value: any): any => (String(value).trim() ? String(value) : ""))
    .filter(
      (value: any, index: any, all: any): any =>
        !(value === "" && all[index - 1] === ""),
    );
}
export function sourceCommentText(raw: any): any {
  const text: any = String(raw ?? "").trim();
  const match: any = text.match(/^(?:#|;|\/\/)\s*(.*?)\s*$/);
  return match ? match[1].trim() : null;
}

// Loon Source Script discovery and materialization
// Author: chance
// Category: Converter / Script / Materialization
// Loon Source Script discovery and materialization
// Author: chance
// Category: Converter / Script / Materialization
export function discoverSourceScriptUrls(
  source: any,
  { parsed = null }: any = {},
): any {
  const text: any = String(source ?? "");
  const urls: any = new Set(
    [...text.matchAll(/script-path=([^,\s]+)/gi)].map((match: any): any =>
      match[1].trim(),
    ),
  );
  const plugin: any = parsed || parseLoonPlugin(text);
  for (const item of [
    ...groupSourceSectionItems(plugin.sections.get("Script")),
    ...groupSourceSectionItems(plugin.sections.get("Rewrite")),
  ]) {
    if (!item.line || !isScriptV2(item.line)) continue;
    try {
      urls.add(parseScriptV2(item.line).script.path);
    } catch {
      // Invalid Script v2 syntax is handled by the conversion pipeline.
    }
  }
  return [...urls];
}
export async function inspectSourceScript(
  reference: any,
  pluginSourceUrl: any,
  { fetchText = fetchOriginalText }: any = {},
): Promise<any> {
  const originalUrl: any = resolveOriginalUrl(reference, pluginSourceUrl);
  try {
    const normalized: any = normalizePluginSource(
      await fetchText(originalUrl),
    ).replace(/\n*$/, "\n");
    return {
      qx: originalUrl,
      surge: originalUrl,
      source: normalized,
      sourceError: null,
    };
  } catch (error: any) {
    return {
      qx: originalUrl,
      surge: originalUrl,
      source: "",
      sourceError: String(error?.message || error),
    };
  }
}
export async function materializeSourceScripts(
  source: any,
  pluginSourceUrl: any,
  { parsed = null, fetchText = fetchOriginalText }: any = {},
): Promise<any> {
  const scriptMap: any = new Map();
  for (const reference of discoverSourceScriptUrls(source, { parsed })) {
    scriptMap.set(
      reference,
      await inspectSourceScript(reference, pluginSourceUrl, { fetchText }),
    );
  }
  return scriptMap;
}

// Loon Rewrite dependency discovery and materialization
// Author: chance
// Category: Converter / Dependency / Materialization
// Modified: 2026-10-25 (chance). Prepare source syntax once, independently of
// target planning. Return clones so one planner cannot mutate the other's IR.
export function prepareRewriteDeclarations(parsed: any): any {
  const declarations: any = new Map();
  for (const item of rewriteDependencyItems(parsed)) {
    if (!item.line || isScriptV2(item.line) || declarations.has(item.line))
      continue;
    try {
      if (isRewriteV2(item.line)) {
        const ast: any = selectRewritePipelineLayer(parseRewriteV2(item.line));
        validateRewriteV2Ast(ast);
        declarations.set(item.line, { ast });
      } else {
        const legacy: any = splitLegacyRewriteLine(item.line);
        if (legacy)
          declarations.set(item.line, {
            ir: legacyRewriteToSemanticIr(legacy.pattern, legacy.action),
          });
      }
    } catch (error: any) {
      declarations.set(item.line, { error });
    }
  }
  return declarations;
}
export function preparedRewriteAst(declarations: any, line: any): any {
  const record: any = declarations?.get(line);
  if (record?.error) throw record.error;
  return record?.ast
    ? structuredClone(record.ast)
    : selectRewritePipelineLayer(parseRewriteV2(line));
}
function rewriteDependencyItems(parsed: any): any {
  return [
    ...groupSourceSectionItems(parsed?.sections?.get("Rewrite")),
    ...groupSourceSectionItems(parsed?.sections?.get("Script")).filter(
      (item: any): any =>
        item.line && isRewriteV2(item.line) && !isScriptV2(item.line),
    ),
  ];
}
// One action-indexed result contract for Mock/JQ dependencies. Payload reading
// stays with each format; one failure must not remove adjacent successful actions.
async function readActionDependencies(
  files: any,
  { single, read, spec, label }: any,
): Promise<any> {
  if (single) return read(files[0].action);
  const byAction: any = {},
    failures: any = [];
  for (const { action, index } of files)
    try {
      byAction[index] = await read(action);
    } catch (error: any) {
      const reason: any = String(error?.message || error).split("\n")[0];
      let sourceFile: any;
      try {
        sourceFile = spec(action)?.url;
      } catch {}
      byAction[index] = {
        error: reason,
        ...(sourceFile ? { sourceFile } : {}),
      };
      failures.push("action " + index + ": " + reason);
    }
  return {
    byAction,
    ...(failures.length
      ? { error: label + " dependency failure: " + failures.join("; ") }
      : {}),
  };
}
export async function materializeMockFiles(
  entry: any,
  parsed: any,
  {
    fetchText = fetchOriginalText,
    fetchBytes = fetchOriginalBytes,
    declarations = null,
  }: any = {},
): Promise<any> {
  const reads: any = memoizeResourceReads({ fetchText, fetchBytes });
  const out: any = new Map();
  for (const item of rewriteDependencyItems(parsed)) {
    if (!item.line || !isRewriteV2(item.line) || isScriptV2(item.line))
      continue;
    try {
      const ast: any = preparedRewriteAst(declarations, item.line);
      validateRewriteV2Ast(ast);
      const files: any = ast.actions
        .map((action: any, index: any): any => ({
          action,
          index: ast.sourceActionIndices?.[index] ?? index,
        }))
        .filter(({ action }: any): any =>
          /^(?:request|response)\.body\.mock_file$/.test(action.name),
        );
      if (!files.length) continue;
      // Separate output retains every file action and its original index.
      // Keep the historical single-file shape for independent declarations.
      const text: any = reads.fetchText;
      const read: any = async (action: any): Promise<any> => {
        const plan: any = dependencySpecFromAction(action, {
          pluginSourceUrl: entry.source,
        });
        if (plan.base64) {
          const body: any = await text(plan.url);
          const compact: any = String(body).replace(/\s+/g, "");
          if (
            !/^[A-Za-z0-9+/]*={0,2}$/.test(compact) ||
            compact.length % 4 === 1
          )
            throw new Error("invalid Base64 mock_file content");
          return {
            bodyBase64: Buffer.from(compact, "base64").toString("base64"),
            sourceFile: plan.url,
          };
        }
        if (plan.binary)
          return {
            bodyBase64: Buffer.from(await reads.fetchBytes(plan.url)).toString(
              "base64",
            ),
            sourceFile: plan.url,
          };
        return { bodyText: await text(plan.url), sourceFile: plan.url };
      };
      out.set(
        item.line,
        await readActionDependencies(files, {
          single: files.length === 1,
          read,
          label: "mock_file",
          spec: (action: any): any =>
            dependencySpecFromAction(action, { pluginSourceUrl: entry.source }),
        }),
      );
    } catch (error: any) {
      out.set(item.line, {
        error: String(error?.message || error).split("\n")[0],
      });
    }
  }
  return out;
}
function splitLegacyRewriteLine(line: any): any {
  const source: any = String(line ?? "").trim();
  const idx: any = source.search(/\s/);
  if (idx < 0) return null;
  const pattern: any = source.slice(0, idx).trim();
  const action: any = source
    .slice(idx)
    .trim()
    .replace(/^\-\s+/, "");
  if (!pattern || !action) return null;
  return { pattern, action };
}
export async function materializeJqFiles(
  entry: any,
  parsed: any,
  { fetchText = fetchOriginalText, declarations = null }: any = {},
): Promise<any> {
  const reads: any = memoizeResourceReads({ fetchText });
  const out: any = new Map();
  for (const item of rewriteDependencyItems(parsed)) {
    if (!item.line) continue;
    try {
      let spec: any = null;
      if (isScriptV2(item.line)) continue;
      if (isRewriteV2(item.line)) {
        const ast: any = preparedRewriteAst(declarations, item.line);
        validateRewriteV2Ast(ast);
        const files: any = ast.actions
          .map((action: any, index: any): any => ({
            action,
            index: ast.sourceActionIndices?.[index] ?? index,
          }))
          .filter(
            ({ action }: any): any =>
              /^(request|response)\.json\.(jq|jq_file)$/.test(action.name) &&
              (action.name.endsWith(".jq_file") ||
                /^jq-path\s*=/i.test(
                  String(action.args[0]?.value || "").trim(),
                )),
          );
        if (!files.length) continue;
        const read: any = async (action: any): Promise<any> => {
          const dependency: any = jqDependencySpecFromAction(action, {
            pluginSourceUrl: entry.source,
          });
          if (!dependency?.resolvable || !dependency.url)
            throw new Error(
              dependency?.reason || "JQ dependency is not resolvable",
            );
          const content: any = minifyJqFile(
            await reads.fetchText(dependency.url),
          );
          if (!content)
            throw new Error("JQ dependency resolved to empty content");
          return {
            content,
            sourceFile: dependency.url,
            legacyAlias: Boolean(dependency.legacyAlias),
          };
        };
        out.set(
          item.line,
          await readActionDependencies(files, {
            single: (ast.sourceActionCount || ast.actions.length) === 1,
            read,
            label: "JQ",
            spec: (action: any): any =>
              jqDependencySpecFromAction(action, {
                pluginSourceUrl: entry.source,
              }),
          }),
        );
        continue;
      } else {
        const legacy: any = splitLegacyRewriteLine(item.line);
        if (!legacy) continue;
        const ir: any = legacyRewriteToSemanticIr(
          legacy.pattern,
          legacy.action,
        );
        spec = legacyJqPathDependencySpecFromIr(ir, {
          pluginSourceUrl: entry.source,
        });
      }
      if (!spec) continue;
      if (!spec.resolvable || !spec.url) {
        throw new Error(spec.reason || "JQ dependency is not resolvable");
      }
      const text: any = await reads.fetchText(spec.url);
      const content: any = minifyJqFile(text);
      if (!content) throw new Error("JQ dependency resolved to empty content");
      out.set(item.line, {
        content,
        sourceFile: spec.url,
        legacyAlias: Boolean(spec.legacyAlias),
      });
    } catch (error: any) {
      out.set(item.line, {
        error: String(error?.message || error).split("\n")[0],
      });
    }
  }
  return out;
}
export async function materializeRewriteDependencies(
  entry: any,
  parsed: any,
  options: any = {},
): Promise<any> {
  const [mockFiles, jqFiles] = await Promise.all([
    materializeMockFiles(entry, parsed, options),
    materializeJqFiles(entry, parsed, options),
  ]);
  return { mockFiles, jqFiles };
}
