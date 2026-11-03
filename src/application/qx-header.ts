import { surgeRegexParameter } from "../domain/core.ts";
// Modified: 2026-11-03 (chance). Lower isolated native-QX conjunctions after backup/API binding, within the existing publication transaction.
import crypto from "node:crypto";
import {
  disjointUrls,
  parseQxHeaderPredicate,
  headerPredicateRuntime,
  headerArgumentPrefix,
} from "../domain/qx-header.ts";
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
    for (const row of rows.filter((r: any) => r.header)) {
      const predicate = parseQxHeaderPredicate(row.header);
      let reason = !predicate
        ? "Unsupported whole-header serialization predicate"
        : "";
      const overlaps = rows.filter(
        (r) => r !== row && !disjointUrls(row.url, r.url),
      );
      // Do not let a new script's URL-only trigger shadow a later independent action.
      if (!reason && overlaps.length > 0)
        reason = "Potential rewrite overlap requires ordered dispatch";
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
      // Modified: 2026-11-03 (chance). Refresh the README-facing count after resolving declarations.
      text = text.replace(
        /^# Native QX review count: \d+$/m,
        "# Native QX review count: " +
          (text.match(/^# \[WayX\] REVIEW REQUIRED:/gm) ?? []).length,
      );
      changes.set(target.relative, text);
    }
  }
  return report;
}
