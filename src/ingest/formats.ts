// Modified: 2026-10-30 (chance). Classify opaque packages before text parsing;
// archive original bytes and provenance without guessing an encryption header.
import { commitFiles, readJson } from "../publish/transaction.ts";
import path from "node:path";
import crypto from "node:crypto";
import type { ResourceFormat, AcquisitionRecord } from "../domain/contracts.ts";
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
    const bytes = await (
      await import("node:fs/promises")
    ).readFile(
      (await import("../publish/transaction.ts")).safePath(
        root,
        record.storage,
      ),
    );
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
