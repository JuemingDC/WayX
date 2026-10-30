// Modified: 2026-10-30 (chance). One TypeScript transport and Surge UA for all
// sources, bounded streamed bytes, transient retries and sealed disk snapshots.
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { FetchOptions } from "../domain/contracts.ts";
const settings = JSON.parse(
  readFileSync(new URL("../../config/fetch.json", import.meta.url), "utf8"),
) as {
  userAgent: string;
  timeoutMs: number;
  attempts: number;
  textMaxBytes: number;
  binaryMaxBytes: number;
};
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
});
export const ORIGINAL_FETCH_PROFILES = Object.freeze({
  default: profile,
  kelee: profile,
  rucu6: profile,
});
export function selectOriginalFetchProfile(value: string) {
  assertHttpUrl(value);
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
export async function requestOriginal(
  url: string,
  options: FetchOptions = {},
): Promise<{
  bytes: Buffer;
  status: number;
  headers: Headers;
  finalUrl: string;
}> {
  const source = assertHttpUrl(url),
    maxBytes = options.maxBytes ?? FETCH_LIMITS.binary,
    timeoutMs = options.timeoutMs ?? settings.timeoutMs;
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
      const headers = new Headers(options.headers);
      headers.set("User-Agent", WAYX_FETCH_UA);
      if (options.accept || !headers.has("Accept"))
        headers.set("Accept", options.accept ?? "*/*");
      const res = await fetch(source, {
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
      if (attempt >= settings.attempts - 1 || !isTransientFetchError(failure))
        throw failure;
      await new Promise((r) => setTimeout(r, 250 * 2 ** attempt));
    } finally {
      clearTimeout(timer);
    }
  }
}
export async function fetchOriginalBytes(
  url: string,
  options: number | FetchOptions = 20000,
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
export async function fetchOriginalText(
  url: string,
  options: number | FetchOptions = 20000,
): Promise<string> {
  const opts = typeof options === "number" ? { timeoutMs: options } : options;
  const bytes = await fetchOriginalBytes(url, {
    ...opts,
    maxBytes: opts.maxBytes ?? FETCH_LIMITS.text,
  });
  const text = new TextDecoder("utf-8", { fatal: true })
    .decode(bytes)
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "");
  if (!text.trim()) throw Error("empty response from original source " + url);
  return text;
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
export function createResourceSnapshot({
  directory,
  fetchBytes = fetchOriginalBytes,
  fetchText = null,
}: any = {}) {
  if (!directory) throw TypeError("Resource snapshot requires a run directory");
  const pending = new Map<string, Promise<any>>(),
    records = new Map<string, any>();
  let sealed = false;
  async function read(url: string, kind: "text" | "binary"): Promise<Buffer> {
    const original = assertHttpUrl(url),
      key = JSON.stringify([original, profile]),
      limit = FETCH_LIMITS[kind];
    if (!pending.has(key)) {
      if (sealed) throw Error("Resource snapshot is sealed: " + original);
      pending.set(
        key,
        (async () => {
          try {
            const bytes =
              kind === "text" && fetchText
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
            await fs.mkdir(directory, { recursive: true });
            const file = path.join(
              directory,
              crypto.createHash("sha256").update(key).digest("hex") + ".bin",
            );
            await fs.writeFile(file, bytes);
            const record = {
              url: original,
              profile: profile.id,
              sha256,
              size: bytes.length,
              storage: path.basename(file),
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
    const record = await pending.get(key);
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
  return Object.freeze({
    fetchBytes: (url: string) => read(url, "binary"),
    fetchText: async (url: string) => {
      const text = new TextDecoder("utf-8", { fatal: true })
        .decode(await read(url, "text"))
        .replace(/\r\n?/g, "\n")
        .replace(/^\uFEFF/, "");
      if (!text.trim())
        throw Error("empty response from original source " + url);
      return text;
    },
    async seal() {
      sealed = true;
      await Promise.allSettled(pending.values());
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(
        path.join(directory, "manifest.json"),
        JSON.stringify(
          { version: 1, resources: [...records.values()] },
          null,
          2,
        ) + "\n",
      );
    },
  });
}
