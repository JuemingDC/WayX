// Modified: 2026-11-12 (chance). Keep one TypeScript transport; Kelee and RuCu6
// use the reference downloader's Loon UA, other sources retain the Surge UA.
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import type { FetchOptions, ResourceFormat, AcquisitionRecord } from "../domain/contracts.ts";
import { commitFiles, readJson, safePath } from "../publish/transaction.ts";
const settings = JSON.parse(
  readFileSync(new URL("../../config/fetch.json", import.meta.url), "utf8"),
) as {
  userAgent: string;
  timeoutMs: number;
  attempts: number;
  textMaxBytes: number;
  binaryMaxBytes: number;
};
// Modified: 2026-11-05 (chance). Stop requesting known permanently unavailable files.
const disabledSources: Record<string, string> = JSON.parse(readFileSync(new URL("../../config/unavailable-sources.json", import.meta.url), "utf8")).disabled;
export function unavailableSource(url: string) {
  const u = new URL(url); u.hash = "";
  return disabledSources[u.href] ?? null;
}
export const WAYX_FETCH_UA = process.env.WAYX_FETCH_UA || settings.userAgent;
export const FETCH_LIMITS = Object.freeze({
  text: settings.textMaxBytes,
  binary: settings.binaryMaxBytes,
});
const profile = Object.freeze({
  id: "surge",
  transport: "node-fetch",
  userAgent: WAYX_FETCH_UA,
  accept: "*/*",
  timeoutMs: settings.timeoutMs,
  attempts: settings.attempts,
  headers: {} as Record<string,string>,
});
const loonProfile = Object.freeze({
  ...profile,
  // Modified: 2026-11-12 (chance). Same-runner probes show fetch receives 403
  // while native HTTPS and the reference urllib request receive readable 200s.
  transport: "node-https",
  userAgent: "Loon/860 CFNetwork/3826.500.111.2.2 Darwin/24.4.0",
  // Modified: 2026-11-12 (chance). Match the reference downloader's language,
  // timeout and attempt budget for Kelee/RuCu6 without changing other sources.
  headers: { "Accept-Language": "zh-CN,zh-Hans;q=0.9" },
  timeoutMs: 60000,
  attempts: 5,
});
export const ORIGINAL_FETCH_PROFILES = Object.freeze({
  default: profile,
  kelee: Object.freeze({ ...loonProfile, id: "kelee" }),
  rucu6: Object.freeze({ ...loonProfile, id: "rucu6" }),
});
export function selectOriginalFetchProfile(value: string) {
  const url=new URL(assertHttpUrl(value));
  // Modified: 2026-11-12 (chance). Match source hosts/owners exactly; third-party
  // mirrors and similarly named hosts keep their own default request identity.
  if (url.hostname === "kelee.one" || url.hostname.endsWith(".kelee.one"))
    return ORIGINAL_FETCH_PROFILES.kelee;
  if (url.hostname === "rucu6.pages.dev" ||
      (["raw.githubusercontent.com", "github.com"].includes(url.hostname) &&
       /^\/RuCu6\//i.test(url.pathname)))
    return ORIGINAL_FETCH_PROFILES.rucu6;
  // Modified: 2026-11-12 (chance). Website catalog requests use their declared
  // JSON/HTML types and same-site Referer; download UA remains the observed Surge UA.
  if(url.origin==='https://ddgksf2013.top')return {
    ...profile,id:'ddgksf-site',
    headers:{Accept:url.pathname.endsWith('.json')?'application/json':url.pathname==='/'?'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8':'*/*','Accept-Language':'zh-CN,zh;q=0.9,en;q=0.8',Referer:'https://ddgksf2013.top/','Cache-Control':'no-cache',Pragma:'no-cache'},
  };
  return profile;
}
export function assertHttpUrl(value: string) {
  const text = String(value ?? "").trim();
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw Error("source URL must be absolute: " + text);
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw Error("source URL must use HTTP(S): " + text);
  return text;
}
export function resolveOriginalUrl(
  reference: string,
  baseUrl: string | null = null,
) {
  const ref = String(reference ?? "").trim();
  if (!ref) throw Error("empty original source reference");
  try {
    return new URL(assertHttpUrl(ref)).toString();
  } catch {
    if (!baseUrl)
      throw Error(
        "relative source reference requires original plugin URL: " + ref,
      );
    return assertHttpUrl(new URL(ref, assertHttpUrl(baseUrl)).toString());
  }
}
export function isTransientFetchError(error: any) {
  if (error?.code === "ERR_FETCH_SIZE") return false;
  if (error?.status)
    return (
      [408, 425, 429].includes(error.status) ||
      (error.status >= 500 && error.status <= 599)
    );
  const codes = new Set([
    "ECONNRESET",
    "ECONNREFUSED",
    "EAI_AGAIN",
    "ETIMEDOUT",
    "UND_ERR_CONNECT_TIMEOUT",
    "UND_ERR_HEADERS_TIMEOUT",
    "UND_ERR_BODY_TIMEOUT",
    "UND_ERR_SOCKET",
  ]);
  for (let e = error, seen = new Set(); e && !seen.has(e); e = e.cause) {
    seen.add(e);
    if (codes.has(e.code)) return true;
  }
  return /(?:ECONNRESET|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|Connection reset|Temporary failure|timed out|Timeout|HTTP (?:408|425|429|5\d\d)\b)/i.test(
    String(error?.message ?? error),
  );
}
// Modified: 2026-11-12 (chance). Match urllib's native HTTP request behavior,
// retaining the global agent's environment proxy policy, TLS checks, streaming
// cancellation and bounded redirects. Never fall back to a direct connection.
export async function requestReferenceResponse(
  source: string,
  headers: Headers,
  signal: AbortSignal,
  redirect: "follow" | "manual" = "follow",
  redirects = 0,
): Promise<{ ok: boolean; status: number; headers: Headers; body: ReadableStream<Uint8Array>; url: string }> {
  const url = new URL(assertHttpUrl(source));
  const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const request = (url.protocol === "https:" ? https : http).request(
      url,
      { method: "GET", headers: Object.fromEntries(headers), signal },
      resolve,
    );
    request.on("error", reject);
    request.end();
  });
  const status = response.statusCode ?? 0;
  const responseHeaders = new Headers();
  for (let i = 0; i < response.rawHeaders.length; i += 2)
    responseHeaders.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
  const location = responseHeaders.get("location");
  if (redirect === "follow" && [301, 302, 303, 307, 308].includes(status) && location) {
    response.destroy();
    if (redirects >= 20) throw Error("Too many original source redirects");
    const next = new URL(assertHttpUrl(new URL(location, source).href));
    const nextHeaders = new Headers(headers);
    if (next.origin !== url.origin) {
      nextHeaders.delete("Authorization");
      nextHeaders.delete("Cookie");
      nextHeaders.set("User-Agent", selectOriginalFetchProfile(next.href).userAgent);
    }
    return requestReferenceResponse(next.href, nextHeaders, signal, redirect, redirects + 1);
  }
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: responseHeaders,
    body: Readable.toWeb(response) as ReadableStream<Uint8Array>,
    url: source,
  };
}
export async function requestOriginal(
  url: string,
  options: FetchOptions = {},
): Promise<{
  bytes: Buffer;
  status: number;
  headers: Headers;
  finalUrl: string;
}> {
  const disabled = unavailableSource(url);
  if (disabled) throw Object.assign(Error("Source disabled: " + disabled), { code: "ERR_SOURCE_DISABLED" });
  const source = assertHttpUrl(url),
    selectedProfile = selectOriginalFetchProfile(source),
    maxBytes = options.maxBytes ?? FETCH_LIMITS.binary,
    timeoutMs = options.timeoutMs ?? selectedProfile.timeoutMs;
  if (
    !Number.isSafeInteger(maxBytes) ||
    maxBytes < 1 ||
    !Number.isFinite(timeoutMs) ||
    timeoutMs <= 0
  )
    throw TypeError("Invalid resource size/deadline");
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController(),
      deadline = Object.assign(Error("Original source timed out: " + source), {
        code: "ETIMEDOUT",
      }),
      timer = setTimeout(() => controller.abort(deadline), timeoutMs);
    try {
      const headers = new Headers(selectedProfile.headers);
      new Headers(options.headers).forEach((value,key)=>headers.set(key,value));
      // Modified: 2026-11-10 (chance). Authenticate GitHub REST snapshots with
      // the Actions token only at the exact HTTPS API origin, never upstream hosts.
      if (new URL(source).origin === "https://api.github.com" &&
          process.env.GITHUB_TOKEN && !headers.has("Authorization"))
        headers.set("Authorization", "Bearer " + process.env.GITHUB_TOKEN);
      headers.set("User-Agent", selectedProfile.userAgent);
      if (options.accept || !headers.has("Accept"))
        headers.set("Accept", options.accept ?? "*/*");
      const res = selectedProfile.transport === "node-https"
        ? await requestReferenceResponse(source, headers, controller.signal, options.redirect)
        : await fetch(source, {
            headers,
            redirect: options.redirect ?? "follow",
            signal: controller.signal,
          });
      if (
        !res.ok &&
        !options.allowStatuses?.includes(res.status) &&
        !(
          options.redirect === "manual" &&
          res.status >= 300 &&
          res.status < 400
        )
      ) {
        await res.body?.cancel();
        throw Object.assign(
          Error(`HTTP ${res.status} from original source ${source}`),
          { status: res.status },
        );
      }
      const chunks: Uint8Array[] = [];
      let size = 0;
      for await (const chunk of res.body ?? []) {
        size += chunk.byteLength;
        if (size > maxBytes) {
          controller.abort();
          throw Object.assign(
            Error("Source exceeds bounded download size: " + source),
            { code: "ERR_FETCH_SIZE" },
          );
        }
        chunks.push(chunk);
      }
      return {
        bytes: Buffer.concat(chunks, size),
        status: res.status,
        headers: res.headers,
        finalUrl: res.url,
      };
    } catch (error) {
      const failure = controller.signal.reason === deadline ? deadline : error;
      if (attempt >= selectedProfile.attempts - 1 || !isTransientFetchError(failure))
        throw failure;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}
export async function fetchOriginalBytes(
  url: string,
  options: number | FetchOptions = {},
): Promise<Buffer> {
  const result = await requestOriginal(
    url,
    typeof options === "number" ? { timeoutMs: options } : options,
  );
  // Modified: 2026-10-30 (chance). Only explicitly empty-capable feeds may return zero bytes.
  if (
    !result.bytes.length &&
    !(typeof options === "object" && options.allowEmpty)
  )
    throw Error("empty response from original source " + url);
  return result.bytes;
}
function decodeSourceText(bytes: Uint8Array, url: string): string {
  const text = new TextDecoder("utf-8", { fatal: true })
    .decode(bytes)
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "");
  if (!text.trim()) throw Error("empty response from original source " + url);
  return text;
}
export async function fetchOriginalText(
  url: string,
  options: number | FetchOptions = {},
): Promise<string> {
  const opts = typeof options === "number" ? { timeoutMs: options } : options;
  const bytes = await fetchOriginalBytes(url, {
    ...opts,
    maxBytes: opts.maxBytes ?? FETCH_LIMITS.text,
  });
  return decodeSourceText(bytes, url);
}
export function memoizeResourceReads({
  fetchText = fetchOriginalText,
  fetchBytes = fetchOriginalBytes,
}: any = {}) {
  const pending = new Map<string, Promise<any>>();
  const once = (
    kind: string,
    url: string,
    read: (url: string) => Promise<any>,
  ) => {
    const key = JSON.stringify([kind, assertHttpUrl(url), profile]);
    if (!pending.has(key))
      pending.set(
        key,
        Promise.resolve().then(() => read(url)),
      );
    return pending.get(key)!;
  };
  return {
    fetchText: (url: string) => once("text", url, fetchText),
    fetchBytes: (url: string) => once("binary", url, fetchBytes),
  };
}
interface SnapshotOptions {
  directory?: string;
  fetchBytes?: (url: string, options: FetchOptions) => Promise<Uint8Array>;
  fetchText?: ((url: string) => Promise<string>) | null;
}
interface SnapshotRecord {
  url: string;
  profile: string;
  sha256: string;
  size: number;
  storage: string;
  provenance?: "verified-repository-archive";
}
interface SnapshotFailure {
  url: string;
  error: string;
}
export function createResourceSnapshot({
  directory,
  fetchBytes = fetchOriginalBytes,
  fetchText = null,
}: SnapshotOptions = {}) {
  if (!directory) throw TypeError("Resource snapshot requires a run directory");
  const snapshotDirectory = directory;
  const pending = new Map<string, Promise<SnapshotRecord & { file: string }>>(),
    records = new Map<string, SnapshotRecord | SnapshotFailure>();
  let sealed = false;
  async function read(url: string, kind: "text" | "binary", verifiedBytes?: Uint8Array): Promise<Buffer> {
    // Modified: 2026-11-01 (chance). Fragments are client arguments, never HTTP resource identity; reuse one byte snapshot across fragment variants.
    const requestUrl = new URL(assertHttpUrl(url));
    requestUrl.hash = "";
    const original = requestUrl.href,
      key = JSON.stringify([original, profile]),
      limit = FETCH_LIMITS[kind];
    if (!pending.has(key)) {
      if (sealed) throw Error("Resource snapshot is sealed: " + original);
      pending.set(
        key,
        (async () => {
          try {
            const bytes =
              verifiedBytes !== undefined
                ? Buffer.from(verifiedBytes)
                : kind === "text" && fetchText
                  ? Buffer.from(await fetchText(original), "utf8")
                  : Buffer.from(await fetchBytes(original, { maxBytes: limit }));
            if (bytes.length > limit)
              throw Object.assign(
                Error("Source exceeds bounded download size: " + original),
                { code: "ERR_FETCH_SIZE" },
              );
            const sha256 = crypto
              .createHash("sha256")
              .update(bytes)
              .digest("hex");
            await fs.mkdir(snapshotDirectory, { recursive: true });
            const file = path.join(
              snapshotDirectory,
              crypto.createHash("sha256").update(key).digest("hex") + ".bin",
            );
            await fs.writeFile(file, bytes);
            const record: SnapshotRecord = {
              url: original,
              profile: profile.id,
              sha256,
              size: bytes.length,
              storage: path.basename(file),
              ...(verifiedBytes !== undefined ? { provenance: "verified-repository-archive" } : {}),
            };
            records.set(key, record);
            return { file, ...record };
          } catch (error: any) {
            records.set(key, {
              url: original,
              error: String(error.message || error),
            });
            throw error;
          }
        })(),
      );
    }
    const record = await pending.get(key)!;
    if (record.size > limit)
      throw Object.assign(
        Error("Source exceeds " + kind + " download size: " + original),
        { code: "ERR_FETCH_SIZE" },
      );
    const bytes = await fs.readFile(record.file);
    if (
      bytes.length !== record.size ||
      crypto.createHash("sha256").update(bytes).digest("hex") !== record.sha256
    )
      throw Error("Resource snapshot checksum mismatch: " + original);
    return bytes;
  }
  async function readText(url: string, verifiedBytes?: Uint8Array) {
    return decodeSourceText(await read(url, "text", verifiedBytes), url);
  }
  return Object.freeze({
    // Modified: 2026-11-01 (chance). Expose the acquired response without a second request so archives and conversion share exact bytes.
    async cachedBytes(url: string): Promise<Buffer | null> {
      const requestUrl = new URL(assertHttpUrl(url));
      requestUrl.hash = "";
      const key = JSON.stringify([requestUrl.href, profile]);
      if (!pending.has(key)) return null;
      const record = await pending.get(key)!;
      const bytes = await fs.readFile(record.file);
      if (bytes.length !== record.size || digest(bytes) !== record.sha256)
        throw Error("Resource snapshot checksum mismatch: " + url);
      return bytes;
    },
    reusedArchive(url: string): boolean {
      const requestUrl = new URL(assertHttpUrl(url));
      requestUrl.hash = "";
      const record = records.get(JSON.stringify([requestUrl.href, profile]));
      return record !== undefined && "provenance" in record &&
        record.provenance === "verified-repository-archive";
    },
    fetchBytes: (url: string) => read(url, "binary"),
    fetchText: (url: string) => readText(url),
    reuseVerifiedText: (url: string, bytes: Uint8Array) => readText(url, bytes),
    async seal() {
      sealed = true;
      await Promise.allSettled(pending.values());
      await fs.mkdir(snapshotDirectory, { recursive: true });
      await fs.writeFile(
        path.join(snapshotDirectory, "manifest.json"),
        JSON.stringify(
          { version: 1, resources: [...records.values()] },
          null,
          2,
        ) + "\n",
      );
    },
  });
}

// Archive identity and exact source-byte evidence.
const digest = (value: string | Uint8Array) => crypto.createHash("sha256").update(value).digest("hex");
export type BackupObject = {
  url: string;
  path: string;
  sha256: string;
  size: number;
  kind: "script" | "plugin";
  acquiredUrl?: string;
  provenance?: string;
  updatedAt?: string;
  author?: string;
  category?: string;
};
export function sourceKey(value: string): string {
  const url = new URL(value);
  url.hash = "";
  return url.href;
}
export function backupObject(
  url: string,
  bytes: Uint8Array,
  kind: BackupObject["kind"],
): BackupObject {
  const key = sourceKey(url),
    sha256 = digest(bytes);
  let name =
    path.posix
      .basename(new URL(key).pathname)
      .replace(/[^a-zA-Z0-9_.-]/g, "_") ||
    (kind === "script" ? "script.js" : "plugin.bin");
  if (kind === "script" && !/\.(?:js|mjs|cjs)$/.test(name)) name += ".js";
  return {
    url: key,
    // Modified: 2026-11-01 (chance). Keep the URL stable and update bytes in place; Git retains every previous revision.
    path: `Resource/Backup/${kind}/${digest(key)}/${name}`,
    sha256,
    size: bytes.byteLength,
    kind,
  };
}

// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript ingest layer; preserve source behavior.
// Modified: 2026-11-25 (chance). The registry controls whether source acquisition and conversion are paused.
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
  const host = new URL(source).hostname;
  return host === "kelee.one" || host.endsWith(".kelee.one");
}

// Modified: 2026-10-30 (chance). Classify opaque packages before text parsing;
// archive original bytes and provenance without guessing an encryption header.
export function identifyResource(
  bytes: Uint8Array,
  url: string,
): ResourceFormat {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return /\.lpxe$/i.test(new URL(url).pathname) ? "encrypted-loon" : "opaque";
  }
  if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(text)) return "html";
  if (/\.lpxe$/i.test(new URL(url).pathname)) return "encrypted-loon";
  if (text.includes("\0")) return "opaque";
  if (
    /^#!name\s*=\s*\S/m.test(text) &&
    /^\[(?:General|Rule|Rewrite|Script|Host|Mitm|Argument|IP Rewrite)\]\s*$/im.test(
      text,
    )
  )
    return "loon-text";
  return "text";
}
export async function archiveOpaque(
  root: string,
  id: string,
  url: string,
  bytes: Uint8Array,
  format: ResourceFormat,
): Promise<AcquisitionRecord> {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id))
    throw Error("Unsafe opaque source id");
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex"),
    relative = `Resource/Encrypted/Loon/${id}/${sha256}.${format === "encrypted-loon" ? "lpxe" : "bin"}`;
  const record = {
    url,
    sha256,
    size: bytes.byteLength,
    format,
    storage: relative,
  };
  const state = await readJson<Record<string, AcquisitionRecord>>(
    path.join(root, ".github/sources/opaque-state.json"),
    {},
  );
  state[id] = record;
  await commitFiles(
    root,
    new Map<string, string | Uint8Array>([
      [relative, bytes],
      [relative + ".json", JSON.stringify(record, null, 2) + "\n"],
      [
        ".github/sources/opaque-state.json",
        JSON.stringify(state, null, 2) + "\n",
      ],
    ]),
  );
  return record;
}

// Modified: 2026-10-30 (chance). Validate archive evidence before exempting an opaque entry from conversion.
export async function opaqueEntries(
  root: string,
): Promise<Record<string, AcquisitionRecord>> {
  const state = await readJson<Record<string, AcquisitionRecord>>(
    path.join(root, ".github/sources/opaque-state.json"),
    {},
  );
  for (const [id, record] of Object.entries(state)) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id) ||
      !["encrypted-loon", "opaque"].includes(record.format) ||
      !record.storage.startsWith("Resource/Encrypted/Loon/" + id + "/")
    )
      throw Error("Invalid opaque acquisition evidence: " + id);
    const bytes = await fs.readFile(safePath(root, record.storage));
    if (
      bytes.length !== record.size ||
      crypto.createHash("sha256").update(bytes).digest("hex") !== record.sha256
    )
      throw Error("Opaque archive checksum mismatch: " + id);
  }
  return state;
}
export async function clearOpaque(root: string, id: string) {
  const file = ".github/sources/opaque-state.json",
    state = await readJson<Record<string, AcquisitionRecord>>(
      path.join(root, file),
      {},
    );
  if (id in state) {
    delete state[id];
    await commitFiles(
      root,
      new Map([[file, JSON.stringify(state, null, 2) + "\n"]]),
    );
  }
}
