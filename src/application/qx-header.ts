import { surgeRegexParameter, normalizeUrlRegexForTarget } from "../domain/core.ts";
// Modified: 2026-11-03 (chance). Lower isolated native-QX conjunctions after backup/API binding, within the existing publication transaction.
import crypto from "node:crypto";
import {
  disjointUrls,
  parseQxHeaderPredicate,
  headerPredicateRuntime,
  headerArgumentPrefix,
} from "../domain/qx-header.ts";

const orderedRejectActions = new Set(["reject", "reject-200", "reject-dict", "reject-array"]);

function tryOrderedRejectGroup(first: any, rows: any[], text: string, rawBase: string): any {
  const component = new Set<any>([first]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const row of rows) {
      if (component.has(row)) continue;
      if ([...component].some((member) => !disjointUrls(member.url, row.url))) {
        component.add(row);
        expanded = true;
        if (component.size > 12) return null;
      }
    }
  }
  const members = rows.filter((row) => component.has(row));
  if (members.length < 2 || members.some((row) => !orderedRejectActions.has(row.action))) return null;
  const plans = members.map((row) => ({
    url: normalizeUrlRegexForTarget(row.url),
    predicate: row.header ? parseQxHeaderPredicate(row.header) : null,
    action: row.action,
  }));
  if (plans.some((p, i) => (members[i].header && !p.predicate) ||
      !/^\^https?:/.test(p.url) || /\(\?[imsx-]/.test(p.url) || /\\[1-9]/.test(p.url)))
    return null;
  try { for (const plan of plans) new RegExp(plan.url); } catch { return null; }

  const hash = crypto.createHash("sha256")
    .update(members.map((row) => row.line).join("\n")).digest("hex").slice(0, 10);
  if (text.includes("wayx_qx_header_" + hash + " = type=http-request,"))
    return { members, already: true };
  const lines = text.split("\n"), used = new Set<number>(), removed: number[] = [];
  for (const row of members) {
    let at = -1;
    if (row.header) {
      const source = "# Source declaration: " + normalizeUrlRegexForTarget(row.url) +
        " " + row.header + " url-and-header " + row.action;
      at = lines.findIndex((line, i) =>
        !used.has(i) && line === source && i > 0 && !used.has(i - 1) &&
        lines[i - 1].includes("URL-and-header conjunction retained for review"));
      if (at < 1) return null;
      used.add(at - 1);
      removed.push(at - 1);
    } else {
      const url = normalizeUrlRegexForTarget(row.url);
      const body = row.action === "reject-dict" ? "{}" :
        row.action === "reject-array" ? "[]" : "";
      const section = row.action === "reject" ? "URL Rewrite" : "Map Local";
      const native = row.action === "reject" ? url + " _ reject" :
        url + " data-type=text data=" + JSON.stringify(body) +
        " status-code=200" +
        (body ? ' header="Content-Type:application/json"' : "");
      const start = lines.indexOf("[" + section + "]");
      if (start < 0) return null;
      const end = lines.findIndex((line, i) => i > start && /^\[[^\]]+\]$/.test(line));
      at = lines.findIndex((line, i) =>
        i > start && (end < 0 || i < end) && !used.has(i) && line === native);
      if (at < 0) return null;
    }
    used.add(at);
    removed.push(at);
  }
  for (const at of removed.sort((a, b) => b - a)) lines.splice(at, 1);
  const file = "Script/Generated/header_" + hash + ".js";
  const pattern = "(?:" + plans.map((p) => "(?:" + p.url + ")").join("|") + ")";
  const code = [
    "// chance · 2026-11-03 · Adblock / QX ordered rewrite compatibility",
    "(function(){",
    "const matchHeader=" + headerPredicateRuntime + ";",
    "const rows=" + JSON.stringify(plans) + ";",
    "for(const row of rows){",
    "if(!new RegExp(row.url).test($request.url))continue;",
    "if(row.predicate&&!matchHeader(row.predicate,$request))continue;",
    "if(row.action==='reject')return $done({response:{status:404,headers:{},body:''}});",
    "const body=row.action==='reject-dict'?'{}':row.action==='reject-array'?'[]':'';",
    "return $done({response:{status:200,headers:body?{'Content-Type':'application/json'}:{},body}});",
    "}",
    "$done({});",
    "})();",
    "",
  ].join("\n");
  return {
    members, file, code, text: lines.join("\n"),
    declaration: "wayx_qx_header_" + hash + " = type=http-request,pattern=" +
      surgeRegexParameter(pattern) + ",script-path=" + rawBase + "/" + file +
      ",requires-body=false,full-header-mode=true",
  };
}


/** Authorized URL-only fallback for identical QX URL/action with distinct headers. */
function tryMergeIdenticalUrlActions(row: any, rows: any[], text: string): any {
  if (!row.header || !orderedRejectActions.has(row.action)) return null;
  const members = rows.filter((item) => item.url === row.url);
  if (
    members.length < 2 ||
    members.some((item) => !item.header || item.action !== row.action) ||
    new Set(members.map((item) => item.header)).size < 2
  ) return null;
  const url = normalizeUrlRegexForTarget(row.url);
  const body = row.action === "reject-dict" ? "{}" :
    row.action === "reject-array" ? "[]" : "";
  const section = row.action === "reject" ? "URL Rewrite" : "Map Local";
  const native = row.action === "reject" ? url + " _ reject" :
    url + " data-type=text data=" + JSON.stringify(body) +
    " status-code=200" +
    (body ? ' header="Content-Type:application/json"' : "");
  const lines = text.split("\n");
  const remove: number[] = [];
  const seen = new Set<number>();
  for (const member of members) {
    const source = "# Source declaration: " + url +
      " " + member.header + " url-and-header " + member.action;
    const at = lines.findIndex((line, index) => !seen.has(index) && line === source);
    if (at < 1) return null;
    seen.add(at);
    if (lines[at - 1].includes("URL-and-header conjunction retained for review"))
      remove.push(at - 1);
  }
  if (!remove.length && lines.includes(native))
    return { members, already: true };
  if (remove.length !== members.length) return null;
  for (const index of remove.sort((a, b) => b - a)) lines.splice(index, 1);
  if (!lines.includes(native)) {
    let sectionAt = lines.indexOf("[" + section + "]");
    if (sectionAt < 0) {
      lines.push("", "[" + section + "]");
      sectionAt = lines.length - 1;
    }
    lines.splice(
      sectionAt + 1, 0,
      "# [WayX] COMPATIBILITY EXCEPTION: identical URL/action merged without Header",
      native,
    );
  }
  return { members, text: lines.join("\n") };
}

// A fixed host narrows the safe script trigger. Other known matches on that
// same host must retain the existing ordered-dispatch review boundary.
function literalRequestHost(pattern: string): string | null {
  const normalized = normalizeUrlRegexForTarget(pattern)
    .replace(/\\\//g, "/")
    .replace(/\\\./g, ".");
  return /^\^https?:\/\/([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)\//.exec(normalized)?.[1]?.toLowerCase() ?? null;
}
function standaloneGuardedReject(row: any, rows: any[], overlaps: any[]): boolean {
  const host = literalRequestHost(row.url);
  return Boolean(
    host &&
    row.header &&
    orderedRejectActions.has(row.action) &&
    rows.every((item) => item === row || item.url !== row.url) &&
    overlaps.every((item) => literalRequestHost(item.url) !== host)
  );
}

export function prepareQxHeaderRewrites({
  artifacts,
  changes,
  index,
  rawBase,
}: any) {
  const report: any[] = [];
  const current = (a: any) => String(changes.get(a.relative) ?? a.text);
  for (const target of artifacts) {
    if (!target.relative.startsWith("Adblock/Surge/")) continue;
    const source = artifacts.find(
      (a: any) =>
        a.relative ===
        target.relative
          .replace("Adblock/Surge/", "Adblock/Quantumult X/")
          .replace(/\.sgmodule$/, ".snippet"),
    );
    if (!source || !source.text.includes("# Managed by: WayX Native QX"))
      continue;
    const rows = current(source)
      .split(/\r?\n/)
      .filter((l: string) => !/^\s*(?:#|;|\/\/)/.test(l))
      .map((l: string) => {
        const m = l.match(/^(\S+)\s+(?:(.+?)\s+url-and-header|url)\s+(.+)$/);
        return m ? { line: l, url: m[1], header: m[2], action: m[3] } : null;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);
    let text = current(target);
    const rejects: any[] = [],
      declarations: string[] = [];
    const processed = new Set<any>();
    for (const row of rows.filter((r: any) => r.header)) {
      if (processed.has(row)) continue;
      const merged = tryMergeIdenticalUrlActions(row, rows, text);
      if (merged) {
        for (const member of merged.members) processed.add(member);
        if (!merged.already) {
          text = merged.text;
          for (const member of merged.members) {
            report.push({
              artifact: target.relative,
              source: member.line,
              status: "converted",
              mode: "authorized-url-only-merge",
            });
          }
        }
        continue;
      }
      const predicate = parseQxHeaderPredicate(row.header);
      let reason = !predicate
        ? "Unsupported whole-header serialization predicate"
        : "";
      const overlaps = rows.filter(
        (r) => r !== row && !disjointUrls(row.url, r.url),
      );
      // Request-phase dispatch is safe only for closed, bounded mock/reject groups.
      if (!reason && overlaps.length > 0) {
        const ordered = tryOrderedRejectGroup(row, rows, text, rawBase);
        if (ordered) {
          if (ordered.already) {
            for (const member of ordered.members) if (member.header) processed.add(member);
            continue;
          }
          text = ordered.text;
          changes.set(ordered.file, ordered.code);
          declarations.push(ordered.declaration);
          for (const member of ordered.members) if (member.header) {
            processed.add(member);
            report.push({ artifact: target.relative, source: member.line, status: "converted" });
          }
          continue;
        }
        if (!standaloneGuardedReject(row, rows, overlaps))
          reason = "Potential rewrite overlap requires ordered dispatch";
      }
      const script = row.action.match(
        /^script-response-(body|header)\s+(\S+)$/,
      );
      if (
        !reason &&
        !["reject", "reject-dict", "reject-array", "reject-200"].includes(
          row.action,
        ) &&
        !script
      )
        reason = "Unsupported conditional action";
      if (!reason && script) {
        const file = script[2].startsWith(rawBase + "/")
          ? decodeURI(script[2].slice(rawBase.length + 1))
          : "";
        if (index.adapters?.[file]?.from !== "qx" || !changes.has(file))
          reason =
            "Conditional script requires a freshly built shared QX API adapter";
      }
      if (reason) {
        report.push({
          artifact: target.relative,
          source: row.line,
          status: "review",
          reason,
          overlapCount: overlaps.length,
          overlapExamples: overlaps.slice(0, 8).map((r) => r.line),
        });
        continue;
      }
      const lines = text.split("\n");
      const prefix =
        "# Source declaration: " +
        row.url +
        " " +
        row.header +
        " url-and-header " +
        row.action.split(/\s/)[0];
      const at = lines.findIndex(
        (line: string) => line === prefix || line.startsWith(prefix + " "),
      );
      if (
        at < 1 ||
        !lines[at - 1].includes(
          "URL-and-header conjunction retained for review",
        )
      )
        continue;
      lines.splice(at - 1, 2);
      text = lines.join("\n");
      const name =
        "wayx_qx_header_" +
        crypto.createHash("sha256").update(row.line).digest("hex").slice(0, 10);
      if (script) {
        const argument =
          headerArgumentPrefix + encodeURIComponent(JSON.stringify(predicate));
        declarations.push(
          `${name} = type=http-response,pattern=${surgeRegexParameter(row.url)},script-path=${script[2]},requires-body=${script[1] === "body"},argument=${argument}`,
        );
      } else rejects.push({ url: row.url, predicate, action: row.action });
      report.push({
        artifact: target.relative,
        source: row.line,
        status: "converted",
      });
    }
    for (const row of rejects) {
      // URL selection remains in Surge's ICU engine; JavaScript only evaluates the verified header predicate.
      const code = `(function(){if(!(${headerPredicateRuntime})(${JSON.stringify(row.predicate)},$request))return $done({});const action=${JSON.stringify(row.action)};if(action==='reject')return $done({response:{status:404,headers:{},body:''}});const body=action==='reject-dict'?'{}':action==='reject-array'?'[]':'';return $done({response:{status:200,headers:body?{'Content-Type':'application/json'}:{},body}});})();\n`;
      const hash = crypto
        .createHash("sha256")
        .update(code)
        .digest("hex")
        .slice(0, 10);
      const file = `Script/Generated/header_${hash}.js`;
      changes.set(file, code);
      const name = crypto
        .createHash("sha256")
        .update(row.url + code)
        .digest("hex")
        .slice(0, 10);
      declarations.push(
        `wayx_qx_header_${name} = type=http-request,pattern=${surgeRegexParameter(row.url)},script-path=${rawBase}/${file},requires-body=false,full-header-mode=true`,
      );
    }
    if (declarations.length) {
      if (/^\[Script\]$/m.test(text))
        text = text.replace(
          /^\[Script\]$/m,
          "[Script]\n" + declarations.join("\n"),
        );
      else text += "\n[Script]\n" + declarations.join("\n") + "\n";
    }
    if (declarations.length || text !== current(target)) {
      // Native URL-only merges also need publication without a generated Script.
      text = text.replace(
        /^# Native QX review count: \d+$/m,
        "# Native QX review count: " +
          (text.match(/^# \[WayX\] REVIEW REQUIRED:/gm) ?? []).length,
      );
      const pending = (text.match(/^# \\[WayX\\] REVIEW REQUIRED:/gm) ?? []).length;
      if (pending === 0)
        text = text.replace(
          /^(#!desc=Native QX conversion) · \\d+ declarations require review$/m,
          "$1",
        );
      else
        text = text.replace(
          /^(#!desc=Native QX conversion)(?: · \\d+ declarations require review)?$/m,
          "$1 · " + pending + " declarations require review",
        );
      changes.set(target.relative, text);
    }
  }
  return report;
}
