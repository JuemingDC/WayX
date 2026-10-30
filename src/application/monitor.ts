// Modified: 2026-10-30 (chance). Monitored sources share the bounded Surge
// transport; mirror changes and baselines commit as a single source transaction.
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { Parser } from "htmlparser2";
import { requestOriginal } from "../ingest/resources.ts";
import { keleePaused } from "../ingest/source-pause.ts";
import {
  readJson,
  readOptional,
  safePath,
  commitFiles,
} from "../publish/transaction.ts";
const sha = (bytes: Uint8Array) =>
  crypto.createHash("sha256").update(bytes).digest("hex");
export function normalizeDocument(bytes: Uint8Array, mode: string): Buffer {
  if (mode === "raw") return Buffer.from(bytes);
  if (mode !== "html_text") throw Error("Unknown normalize mode: " + mode);
  const skip = new Set(["script", "style", "noscript", "svg", "template"]),
    parts: string[] = [];
  let depth = 0,
    text = "";
  const flush = () => {
    const value = text.replace(/\s+/g, " ").trim();
    if (value) parts.push(value);
    text = "";
  };
  const p = new Parser(
    {
      onopentag(name) {
        flush();
        if (skip.has(name)) depth++;
      },
      onclosetag(name) {
        flush();
        if (skip.has(name) && depth) depth--;
      },
      ontext(value) {
        if (!depth) text += value;
      },
    },
    { decodeEntities: true },
  );
  p.end(Buffer.from(bytes).toString("utf8"));
  flush();
  return Buffer.from(parts.join("\n").trim() + "\n");
}
// Modified: 2026-10-30 (chance). Preserve Python fnmatch's cross-directory
// wildcards and bracket classes when porting monitored repository selectors.
export function selected(file: string, globs: string[]): boolean {
  const escape = (value: string) =>
    value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  return (
    !globs.length ||
    globs.some((glob) => {
      let re = "";
      for (let i = 0; i < glob.length; i++) {
        const c = glob[i];
        if (c === "*") {
          re += ".*";
          continue;
        }
        if (c === "?") {
          re += ".";
          continue;
        }
        if (c === "[") {
          let j = i + 1;
          if (glob[j] === "!") j++;
          if (glob[j] === "]") j++;
          while (j < glob.length && glob[j] !== "]") j++;
          if (j < glob.length) {
            let body = glob.slice(i + 1, j),
              negative = body.startsWith("!");
            if (negative) body = body.slice(1);
            body = body
              .replace(/\\/g, "\\\\")
              .replace(/\]/g, "\\]")
              .replace(/^\^/, "\\^");
            const group = "[" + (negative ? "^" : "") + body + "]";
            try {
              new RegExp(group);
              re += group;
              i = j;
              continue;
            } catch {}
          }
        }
        re += escape(c);
      }
      return new RegExp("^(?:" + re + ")$", "s").test(file);
    })
  );
}
export async function setOutput(name: string, value: string) {
  if (process.env.GITHUB_OUTPUT)
    await fs.appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}
export async function monitorSource(
  root: string,
  src: any,
  previous: any,
  settings: any,
  request = requestOriginal,
): Promise<{
  changed: boolean;
  stateChanged: boolean;
  message: string;
  state: any;
  changes: Map<string, Uint8Array | null>;
}> {
  const changes = new Map<string, Uint8Array | null>(),
    timeoutMs = (settings.timeout_seconds ?? 25) * 1000,
    base = path.relative(
      root,
      safePath(
        root,
        (settings.mirror_root ?? ".github/monitor/upstream") +
          "/" +
          (src.save_as ?? src.id),
      ),
    ),
    stamp = new Date().toISOString();
  if (src.kind === "http") {
    const file = safePath(root, base),
      mirror = await readOptional(file),
      cached = previous.url === src.url && previous.sha256,
      valid = Boolean(mirror && cached && sha(mirror) === previous.sha256),
      headers: Record<string, string> = { "Accept-Encoding": "identity" };
    if (valid && previous.etag) headers["If-None-Match"] = previous.etag;
    if (valid && previous.last_modified)
      headers["If-Modified-Since"] = previous.last_modified;
    let raw: Buffer, responseHeaders: Headers;
    if (src.cached_feed) {
      const feed = await readJson<any>(safePath(root, src.cached_feed), {});
      if (
        feed.source !== src.url ||
        typeof feed.text !== "string" ||
        !feed.text
      )
        throw Error(
          "Current discovery feed unavailable or URL does not match: " + src.id,
        );
      raw = Buffer.from(feed.text);
      responseHeaders = new Headers();
    } else {
      const result = await request(src.url, {
        headers,
        timeoutMs,
        maxBytes: 128 * 1024 * 1024,
        allowStatuses: [304],
      });
      if (result.status === 304) {
        if (!valid) throw Error("HTTP 304 without a valid cached mirror");
        return {
          changed: false,
          stateChanged: false,
          message: "304 Not Modified",
          state: previous,
          changes,
        };
      }
      if (result.status !== 200)
        throw Error("HTTP " + result.status + ": " + src.url);
      raw = result.bytes;
      responseHeaders = result.headers;
    }
    const data = normalizeDocument(raw, src.normalize ?? "raw"),
      digest = sha(data),
      old = cached ? previous.sha256 : null,
      newState = {
        kind: "http",
        url: src.url,
        sha256: digest,
        etag: responseHeaders.get("etag"),
        last_modified: responseHeaders.get("last-modified"),
        checked_at: stamp,
      },
      changed = old !== null && old !== digest,
      stateChanged =
        old !== digest ||
        !valid ||
        previous.etag !== newState.etag ||
        previous.last_modified !== newState.last_modified;
    if (!valid || old !== digest) changes.set(base, data);
    return {
      changed,
      stateChanged,
      message:
        old === null
          ? "baseline created"
          : changed
            ? "content changed"
            : "content hash unchanged" + (!valid ? "; mirror repaired" : ""),
      state: newState,
      changes,
    };
  }
  if (src.kind !== "github_repo")
    throw Error("Unsupported source kind: " + src.kind);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN)
    headers.Authorization = "Bearer " + process.env.GITHUB_TOKEN;
  const json = async (url: string) =>
    JSON.parse(
      (
        await request(url, { headers, timeoutMs, maxBytes: 32 * 1024 * 1024 })
      ).bytes.toString(),
    );
  const ref = src.ref ?? "HEAD",
    commit = await json(
      `https://api.github.com/repos/${src.repo}/commits/${encodeURIComponent(ref)}`,
    ),
    head = commit.sha;
  if (!/^[a-f0-9]{40}$/.test(head))
    throw Error("Invalid monitored GitHub commit");
  const old =
      previous.repo === src.repo && previous.ref === ref
        ? previous.remote_sha
        : null,
    newState = {
      kind: "github_repo",
      repo: src.repo,
      ref,
      remote_sha: head,
      checked_at: stamp,
    };
  if (!old)
    return {
      changed: false,
      stateChanged: true,
      message: "baseline commit recorded",
      state: newState,
      changes,
    };
  if (old === head)
    return {
      changed: false,
      stateChanged: false,
      message: "HEAD unchanged",
      state: previous,
      changes,
    };
  const compare = await json(
    `https://api.github.com/repos/${src.repo}/compare/${old}...${head}`,
  );
  if (!Array.isArray(compare.files) || compare.files.length >= 300)
    throw Error("Incomplete GitHub comparison file list; baseline retained");
  if (compare.status !== "ahead")
    throw Error(
      "GitHub history is not a forward comparison; baseline retained",
    );
  let matched = 0;
  for (const item of compare.files) {
    const file = item.filename ?? "",
      prior = item.status === "renamed" ? item.previous_filename : null,
      currentSelected =
        Boolean(file) && selected(file, src.include_globs ?? []),
      previousSelected =
        Boolean(prior) && selected(prior, src.include_globs ?? []);
    if (!currentSelected && !previousSelected) continue;
    matched++;
    if (src.sync_changed_files === false) continue;
    if (previousSelected)
      changes.set(
        path.relative(root, safePath(root, base + "/" + prior)),
        null,
      );
    if (!currentSelected) continue;
    const target = path.relative(root, safePath(root, base + "/" + file));
    if (item.status === "removed") {
      changes.set(target, null);
      continue;
    }
    if (!item.raw_url)
      throw Error("Missing raw URL for monitored file: " + file);
    const result = await request(item.raw_url, {
      timeoutMs,
      maxBytes: 128 * 1024 * 1024,
    });
    if (result.status !== 200)
      throw Error(
        "HTTP " + result.status + " downloading monitored file: " + file,
      );
    changes.set(target, result.bytes);
  }
  return {
    changed: matched > 0,
    stateChanged: true,
    message: matched
      ? `repository changed; ${matched} monitored file(s) affected`
      : "repository changed; no monitored file matched",
    state: newState,
    changes,
  };
}
export async function runMonitor(root = process.cwd()) {
  let runtime = ".github/monitor/.runtime",
    statePath = ".github/monitor/state.json",
    results: any[] = [],
    failures: any[] = [],
    state: any = { version: 1, sources: {} };
  try {
    const cfg = await readJson<any>(
        path.join(root, ".github/monitor/sources.json"),
      ),
      settings = cfg.settings ?? {};
    runtime = settings.runtime_root ?? runtime;
    statePath = settings.state_file ?? statePath;
    safePath(root, runtime);
    safePath(root, statePath);
    if (
      !Array.isArray(cfg.sources) ||
      !cfg.sources.length ||
      cfg.sources.some((s: any) => typeof s?.id !== "string" || !s.id) ||
      new Set(cfg.sources.map((s: any) => s.id)).size !== cfg.sources.length
    )
      throw Error("Monitor source IDs must be nonempty and unique");
    state = await readJson<any>(path.join(root, statePath), state);
    state.sources ??= {};
    if (
      !state.sources ||
      typeof state.sources !== "object" ||
      Array.isArray(state.sources)
    )
      throw Error("Monitor state sources must be an object");
    const paused = await keleePaused(root);
    for (const src of cfg.sources) {
      if (paused && src.id === "kelee-plugin-directory") continue;
      let stage = "fetch-and-mirror";
      try {
        const result = await monitorSource(
          root,
          src,
          state.sources[src.id] ?? {},
          {
            ...settings,
            mirror_root: settings.mirror_root ?? ".github/monitor/upstream",
          },
        );
        if (result.stateChanged) {
          stage = "write-state";
          const candidate = structuredClone(state);
          candidate.sources[src.id] = result.state;
          const changes = new Map<string, string | Uint8Array | null>(
            result.changes,
          );
          changes.set(statePath, JSON.stringify(candidate, null, 2) + "\n");
          await commitFiles(root, changes);
          state = candidate;
        }
        results.push({
          source: src,
          changed: result.changed,
          succeeded: true,
          message: result.message,
        });
      } catch (error: any) {
        const reason = `${error.name}: ${error.message}`;
        failures.push({
          source: src,
          stage,
          errorType: error.name,
          reason,
          rollbackSucceeded: error.rollbackSucceeded !== false,
        });
        results.push({
          source: src,
          changed: false,
          succeeded: false,
          message: reason,
        });
      }
    }
  } catch (error: any) {
    const source = {
        id: "monitor-configuration",
        url: ".github/monitor/sources.json",
      },
      reason = `${error.name}: ${error.message}`;
    failures.push({
      source,
      stage: "configuration",
      errorType: error.name,
      reason,
      rollbackSucceeded: true,
    });
    results.push({ source, changed: false, succeeded: false, message: reason });
  }
  const summary = runtime + "/upstream_changes.md",
    lines = [
      "# WayX monitored upstream changes",
      "",
      `- Checked at: \`${new Date().toISOString()}\``,
      "",
      "Every source result belongs to this run. Failed monitoring blocks publication; documentation changes require review.",
      "",
      ...results.map(
        (r) =>
          `- ${r.source.id}: ${r.succeeded ? "OK" : "FAILED"}; changed=${r.changed}; ${r.message}`,
      ),
      "",
    ];
  await commitFiles(
    root,
    new Map([
      [summary, lines.join("\n")],
      [
        runtime + "/monitor-result.json",
        JSON.stringify(
          { version: 1, complete: !failures.length, results, failures },
          null,
          2,
        ) + "\n",
      ],
    ]),
  );
  await setOutput("has_change", String(results.some((r) => r.changed)));
  await setOutput("change_summary", summary);
  await setOutput("complete", String(!failures.length));
  await setOutput("has_failures", String(Boolean(failures.length)));
  if (failures.length)
    throw Error(`Monitoring failed for ${failures.length} source(s)`);
  return { results, failures };
}
