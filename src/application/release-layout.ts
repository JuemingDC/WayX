// Modified: 2026-11-05 (chance). Keep the mature converters' logical working
// paths internal; publish one type/client/author/app tree with colocated scripts.
// A reversible manifest restores the working view before the next acquisition.
import { migrateUpdateMetadata } from "../domain/update-metadata.ts";
import { normalizeSurgeModuleHeader } from "../domain/surge-module-header.ts";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import {
  listFiles,
  readJson,
  readOptional,
  commitFiles,
  safePath,
} from "../publish/transaction.ts";
import { scriptReferences } from "../parser/backup-references.ts";
import { executableScript } from "../domain/executable-script.ts";

const stateFile = ".github/sources/layout-state.json";
const base = "https://raw.githubusercontent.com/JuemingDC/WayX/main/";
const digest = (s: string | Uint8Array) =>
  crypto.createHash("sha256").update(s).digest("hex");
type Layout = {
  version: number;
  phase: string;
  artifacts: Record<string, string>;
  scripts: Record<string, { logical: string; owner: string }>;
};
const clean = (s: string) =>
  s
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}_.-]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "script";
const short = (s: string) => {
  let value = clean(s);
  while (Buffer.byteLength(value) > 180)
    value = Array.from(value).slice(0, -1).join("");
  return value.replace(/-+$/, "");
};
const encoded = (s: string) => s.split("/").map(encodeURIComponent).join("/");
function local(url: string): string | null {
  try {
    const u = new URL(url);
    return u.href.startsWith(base)
      ? decodeURIComponent(u.pathname.slice(new URL(base).pathname.length))
      : null;
  } catch {
    return null;
  }
}
function sourceAuthor(url: string) {
  try {
    const u = new URL(url),
      p = u.pathname.split("/").filter(Boolean);
    if (u.hostname === "kelee.one") return "Kelee";
    if (u.hostname === "rucu6.pages.dev") return "RuCu6";
    if (
      [
        "raw.githubusercontent.com",
        "github.com",
        "gist.githubusercontent.com",
      ].includes(u.hostname)
    )
      return clean(p[0]);
    return clean(u.hostname);
  } catch {
    return "chance";
  }
}
function destination(
  file: string,
  text: string,
  catalog: any[],
  native: any[],
) {
  const parts = file.split("/"),
    type = parts[0];
  let client =
    /\.sgmodule$/.test(file) || parts[1] === "Surge" ? "Surge" : "Quantumult X";
  let author = type === "Rule" ? "WayX" : "chance";
  let app = path.posix.basename(file, path.posix.extname(file));
  const entry = catalog.find(
    (e) =>
      file === "Adblock/Quantumult X/" + e.qx ||
      file === "Adblock/Surge/" + e.surge,
  );
  if (entry) author = sourceAuthor(entry.source);
  else {
    const config = native.find((c) => app.startsWith(c.prefix));
    if (config) {
      author = clean(config.repository.split("/")[0]);
      app = app.slice(config.prefix.length);
    } else if (type !== "Rule")
      author = sourceAuthor(
        text.match(/^# Source:\s*(https?:\/\/\S+)/m)?.[1] ?? "",
      );
  }
  if (app.startsWith(author + "_")) app = app.slice(author.length + 1);
  return [
    type,
    client,
    author,
    clean(app),
    clean(app) + path.posix.extname(file),
  ].join("/");
}
function rewrite(text: string, mappings: Record<string, string>) {
  // Only rewrite repository resource operands, never an author's external URL.
  if (!text.includes(base)) return text;
  for (const [from, to] of Object.entries(mappings).sort(
    (a, b) => b[0].length - a[0].length,
  )) {
    for (const value of [base + from, base + encoded(from)])
      text = text.split(value).join(base + encoded(to));
  }
  return text;
}
function jsonPaths(
  value: any,
  map: Record<string, string>,
  suffix: Record<string, string> = {},
  owner = "",
  scriptPaths: Record<string, Record<string, string>> = {},
): any {
  if (typeof value === "string")
    return (
      map[value] ??
      scriptPaths[owner]?.[value] ??
      rewrite(value, { ...map, ...scriptPaths[owner] })
    );
  if (Array.isArray(value))
    return value.map((v) => jsonPaths(v, map, suffix, owner, scriptPaths));
  if (!value || typeof value !== "object") return value;
  owner = value.artifact ?? owner;
  const next: any = {};
  for (const [key, v] of Object.entries(value)) {
    const name = map[key] ?? key;
    next[name] =
      ["qx", "surge"].includes(key) && typeof v === "string" && suffix[v]
        ? suffix[v]
        : jsonPaths(v, map, suffix, owner, scriptPaths);
  }
  return next;
}
async function stateJsonFiles(root: string) {
  return [
    ...(await listFiles(path.join(root, ".github/sources")))
      .filter((f) => f.endsWith(".json"))
      .map((f) => ".github/sources/" + f),
    ".github/manual-assets.json",
    ...(await listFiles(path.join(root, "Resource/Backup")))
      .filter(
        (f) =>
          !f.startsWith("plugin/") &&
          !f.startsWith("script/") &&
          !f.startsWith("script-api/") &&
          f.endsWith(".json"),
      )
      .map((f) => "Resource/Backup/" + f),
  ].filter((f) => f !== stateFile && f !== "Resource/Backup/index.json");
}
function uniqueScripts(text: string) {
  const used = new Set<string>();
  let section = "";
  return text
    .split("\n")
    .map((line) => {
      if (/^\[.*\]$/.test(line)) section = line;
      if (
        section !== "[Script]" ||
        /^\s*(?:#(?!\!REQUIREMENT)|;|\/\/)/.test(line)
      )
        return line;
      const requirement =
        line.match(/^#!REQUIREMENT\s+"(?:\\.|[^"\\])*"\s+/)?.[0] ?? "";
      const declaration = line.slice(requirement.length);
      const match = declaration.match(/^([^=]+?)\s*=\s*(type=.*)$/);
      if (!match) return line;
      const name = match[1].trim();
      if (!used.has(name)) {
        used.add(name);
        return line;
      }
      const route =
        match[2]
          .match(/pattern=(?:"([^"]+)"|([^,]+))/)
          ?.slice(1)
          .find(Boolean) ?? "additional";
      let next =
        name +
        "-" +
        clean(
          route
            .replace(/\(\?[imsx-]+\)/g, "")
            .replace(/https?[^:]*:\\?\/\\?\//, ""),
        );
      while (used.has(next)) next += "-alternate";
      used.add(next);
      return requirement + next + " = " + match[2];
    })
    .join("\n");
}

export async function prepareWorkingLayout(root: string) {
  const state = await readJson<Layout | null>(path.join(root, stateFile), null);
  if (!state || state.phase !== "published") return;
  const reverse: Record<string, string> = {};
  for (const [old, current] of Object.entries(state.artifacts))
    reverse[current] = old;
  for (const [file, record] of Object.entries(state.scripts))
    reverse[file] = record.logical;
  const suffix: Record<string, string> = {};
  for (const [old, current] of Object.entries(state.artifacts))
    if (old.startsWith("Adblock/"))
      suffix[current.split("/").slice(2).join("/")] = old
        .split("/")
        .slice(2)
        .join("/");
  const changes = new Map<string, string | Uint8Array | null>();
  for (const [current, old] of Object.entries(reverse)) {
    const bytes = await readOptional(safePath(root, current));
    if (!bytes) continue;
    const text = rewrite(bytes.toString(), reverse);
    const prior = changes.get(old);
    if (prior && String(prior) !== text)
      throw Error("Conflicting working script copies: " + old);
    // Raw archives are immutable evidence, never reconstructed from cleaned clients.
    if (!old.startsWith("Resource/Backup/")) changes.set(old, text);
    if (old !== current) changes.set(current, null);
  }
  for (const file of await stateJsonFiles(root)) {
    const bytes = await readOptional(safePath(root, file));
    if (!bytes) continue;
    changes.set(
      file,
      JSON.stringify(
        jsonPaths(JSON.parse(bytes.toString()), reverse, suffix),
        null,
        2,
      ) + "\n",
    );
  }
  const index = await readJson<any>(
    path.join(root, "Resource/Backup/index.json"),
    null,
  );
  if (index) {
    const restored = jsonPaths(index, reverse, suffix);
    restored.adapters = {};
    for (const [file, record] of Object.entries<any>(index.adapters ?? {})) {
      const old = reverse[file] ?? file;
      restored.adapters[old] = { ...record, path: old };
      delete restored.adapters[old].logicalPath;
    }
    changes.set(
      "Resource/Backup/index.json",
      JSON.stringify(restored, null, 2) + "\n",
    );
  }
  changes.set(
    stateFile,
    JSON.stringify({ ...state, phase: "working" }, null, 2) + "\n",
  );
  await commitFiles(root, changes);
}

export async function publishLayout(
  root: string,
  { write = true, validateCode = true } = {},
) {
  const catalog = await readJson<any[]>(
    path.join(root, ".github/sources/loon.json"),
    [],
  );
  const nativeConfig = await readJson<any>(
    path.join(root, ".github/sources/native-qx.json"),
    {},
  );
  const native = Array.isArray(nativeConfig.sources)
    ? nativeConfig.sources
    : nativeConfig.repository
      ? [nativeConfig]
      : [];
  const index = await readJson<any>(
    path.join(root, "Resource/Backup/index.json"),
    { objects: {}, adapters: {}, bindings: {} },
  );
  const changes = new Map<string, string | Uint8Array | null>();
  const state: Layout = {
    version: 1,
    phase: "published",
    artifacts: {},
    scripts: {},
  };
  const content = new Map<string, string>();
  for (const type of ["Adblock", "Module", "Rule"])
    for (const relative of await listFiles(path.join(root, type))) {
      if (!/\.(?:snippet|sgmodule|list|dconf)$/.test(relative)) continue;
      const file = type + "/" + relative,
        text = (await readOptional(safePath(root, file)))!.toString();
      const dest = destination(file, text, catalog, native);
      if (Object.values(state.artifacts).includes(dest))
        throw Error("Application layout collision: " + dest);
      state.artifacts[file] = dest;
      content.set(file, text);
    }
  const scriptCopies = new Map<string, Map<string, string>>();
  const occupied = new Map<string, string>();
  const adapterCopies: Record<string, any> = {};
  const scriptFile = async (
    logical: string,
    owner: string,
    context = "",
  ): Promise<string> => {
    const perApp = scriptCopies.get(owner) ?? new Map<string, string>();
    scriptCopies.set(owner, perApp);
    const previous = perApp.get(logical);
    if (previous) return previous;
    const bytes = await readOptional(safePath(root, logical));
    if (!bytes) throw Error("Missing script during layout: " + logical);
    let name = path.posix
      .basename(logical)
      .replace(/\.(?:js|json|mjs|cjs)$/i, "");
    const generated = /_[a-f0-9]{10}$/.test(name);
    if (generated) {
      const phase = /response/.test(context) ? "response" : "request";
      const route =
        context
          .match(/pattern=(?:"([^"]+)"|([^,]+))/)
          ?.slice(1)
          .find(Boolean) ??
        context.split(/\s+url\s+/)[0] ??
        "rewrite";
      name =
        phase +
        "-rewrite-" +
        clean(
          route
            .replace(/\(\?[imsx-]+\)/g, "")
            .replace(/https?[^:]*:\\?\/\\?\//, ""),
        );
    }
    name = short(name) + ".js";
    let dest = path.posix.dirname(state.artifacts[owner]) + "/" + name;
    if (occupied.has(dest) && occupied.get(dest) !== logical) {
      const source =
        index.adapters?.[logical]?.sourceUrl ?? index.objects?.[logical]?.url;
      const hint = source
        ? new URL(source).pathname
            .split("/")
            .slice(1, -1)
            .filter((s) => !/[a-f0-9]{16,}/i.test(s))
            .join("-")
        : path.posix.basename(path.posix.dirname(logical));
      dest =
        path.posix.dirname(state.artifacts[owner]) +
        "/" +
        short(hint + "-" + name.replace(/\.js$/, "")) +
        ".js";
      if (occupied.has(dest) && occupied.get(dest) !== logical)
        throw Error("Script name needs a semantic alias: " + logical);
    }
    occupied.set(dest, logical);
    perApp.set(logical, dest);
    state.scripts[dest] = { logical, owner };
    // Modified: 2026-11-05 (chance). Native QX author scripts are byte copies,
    // including comments/BOM/line endings; no API wrapper or body rewriting.
    const nativeCopy = state.artifacts[owner].includes("/Quantumult X/") && index.objects?.[logical]?.kind === "script";
    if (nativeCopy) {
      if (validateCode) new vm.Script("(function(){\n" + bytes.toString() + "\n})", {filename:dest});
      changes.set(dest, bytes);
      return dest;
    }
    // Dependency discovery operates on executable text, not install instructions in comments.
    let code = validateCode
      ? executableScript(bytes.toString())
      : bytes.toString();
    if (validateCode) {
      try {
        new vm.Script(code, { filename: dest });
      } catch (error: any) {
        // Native proxy entrypoints also accept function-level returns.
        if (!/Illegal return statement/.test(error.message)) throw error;
        code = "(function(){\n" + code + "\n})();\n";
        new vm.Script(code, { filename: dest });
      }
    }
    for (const match of code.matchAll(
      /https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/main\/[^\s"'`<>]+/g,
    )) {
      const dependency = local(match[0]);
      if (
        dependency &&
        dependency !== logical &&
        /^(?:Script\/|Resource\/Backup\/script\/)/.test(dependency)
      )
        await scriptFile(dependency, owner, context);
    }
    const map = Object.fromEntries(perApp);
    code = rewrite(code, map);
    changes.set(dest, code);
    if (index.adapters?.[logical])
      adapterCopies[dest] = {
        ...index.adapters[logical],
        path: dest,
        logicalPath: logical,
        sha256: digest(code),
      };
    return dest;
  };
  for (const [logical, text] of content) {
    let next = text;
    for (const ref of scriptReferences(text).reverse()) {
      const dependency = local(ref.value);
      if (
        !dependency ||
        !/^(?:Script\/|Resource\/Backup\/script\/)/.test(dependency)
      )
        continue;
      const start = text.lastIndexOf("\n", ref.start - 1) + 1,
        end = text.indexOf("\n", ref.end);
      const dest = await scriptFile(
        dependency,
        logical,
        text.slice(start, end < 0 ? undefined : end),
      );
      next =
        next.slice(0, ref.start) +
        base +
        encoded(dest) +
        new URL(ref.value).hash +
        next.slice(ref.end);
    }
    // Modified: 2026-11-08 (chance). Migrate retained timestamp headers after operand offsets are consumed.
    next = migrateUpdateMetadata(rewrite(next, state.artifacts), logical.endsWith(".snippet") && /^# Managed by: WayX Native QX\r?$/m.test(text));
    if (logical.endsWith(".sgmodule")) {
      // Modified: 2026-11-09 (chance). Publish parameter directives before ordinary comments.
      next = normalizeSurgeModuleHeader(next);
      // Modified: 2026-11-05 (chance). Retire inferred defaults only with source evidence;
      // native settings and explicitly declared source values remain authoritative.
      const entry = catalog.find((e) => logical === "Adblock/Surge/" + e.surge);
      const source = entry
        ? await readOptional(safePath(root, "Resource/Loon/" + entry.file))
        : null;
      if (source) {
        const declarations = source
          .toString()
          .split("\n")
          .filter((line) => !/^\s*(?:#|;|\/\/)/.test(line))
          .join("\n");
        if (!/\bmax[-_]size\s*=\s*-1\b/.test(declarations))
          next = next.replace(/,max-size=-1(?=,|$)/gm, "");
        for (const value of [10, 20, 300])
          if (
            !new RegExp("\\btimeout\\s*=\\s*" + value + "\\b").test(
              declarations,
            )
          )
            next = next.replace(
              new RegExp(",timeout=" + value + "(?=,|$)", "gm"),
              "",
            );
      }
      next = uniqueScripts(next);
    }
    changes.set(state.artifacts[logical], next);
    if (state.artifacts[logical] !== logical) changes.set(logical, null);
  }
  // Modified: 2026-11-05 (chance). Validate active published references against the
  // same transaction, including colocated programs outside the legacy Script tree.
  for (const dest of Object.values(state.artifacts)) {
    for (const ref of scriptReferences(String(changes.get(dest)))) {
      const file = local(ref.value);
      if (!file) continue;
      if (
        changes.get(file) === null ||
        (!changes.has(file) && !(await readOptional(safePath(root, file))))
      )
        throw Error(
          "Missing published script reference: " + dest + " -> " + file,
        );
    }
  }
  const suffix: Record<string, string> = {};
  for (const [old, current] of Object.entries(state.artifacts))
    if (old.startsWith("Adblock/"))
      suffix[old.split("/").slice(2).join("/")] = current
        .split("/")
        .slice(2)
        .join("/");
  const perOwner = Object.fromEntries(
    [...scriptCopies].map(([owner, values]) => [
      owner,
      Object.fromEntries(values),
    ]),
  );
  for (const file of await stateJsonFiles(root)) {
    const bytes = await readOptional(safePath(root, file));
    if (!bytes) continue;
    changes.set(
      file,
      JSON.stringify(
        jsonPaths(
          JSON.parse(bytes.toString()),
          state.artifacts,
          suffix,
          "",
          perOwner,
        ),
        null,
        2,
      ) + "\n",
    );
  }
  const mapped = jsonPaths(index, state.artifacts, suffix);
  mapped.adapters = adapterCopies;
  mapped.bindings = {};
  for (const [owner, bindings] of Object.entries<any>(index.bindings ?? {})) {
    const dest = state.artifacts[owner] ?? owner,
      table: any = {};
    for (const [url, binding] of Object.entries<any>(bindings)) {
      const next = scriptCopies.get(owner)?.get(binding.path);
      if (next) table[url] = { ...binding, path: next };
    }
    if (Object.keys(table).length) mapped.bindings[dest] = table;
  }
  changes.set(
    "Resource/Backup/index.json",
    JSON.stringify(mapped, null, 2) + "\n",
  );
  // Only owned converted programs retire; raw source archives remain byte exact.
  for (const file of new Set(
    Object.values(state.scripts).map((r) => r.logical),
  ))
    if (file.startsWith("Script/")) changes.set(file, null);
  for (const file of Object.keys(index.adapters ?? {}))
    if (file.startsWith("Script/Adblock/")) changes.set(file, null);
  changes.set(stateFile, JSON.stringify(state, null, 2) + "\n");
  if (write) await commitFiles(root, changes);
  return state;
}
