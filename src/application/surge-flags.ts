// Modified: 2026-11-01 (chance). Apply the authorized Surge flag policy to frozen
// snapshots without fetching/unpausing sources or regenerating other behavior.
import path from "node:path";
import {
  compileRegexForTarget,
  parseSurgeParameters,
  surgeRegexParameter,
} from "../domain/core.ts";
import { parseRewriteV2 } from "../parser/rewrite.ts";
import { parseScriptDeclaration } from "../parser/script.ts";
import { keleePaused, isKeleeSource } from "../ingest/source-pause.ts";
import { readOptional, commitFiles } from "../publish/transaction.ts";
import { validateSurgeModule } from "../validation/output.ts";

export function restoreFrozenSurgeFlags(source: string, target: string) {
  const urls = new Map<string, Set<string>>(),
    bodies = new Map<string, Set<string>>(),
    headers = new Map<string, Set<string>>();
  const unresolved: string[] = [];
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    const values = map.get(key) ?? new Set<string>();
    values.add(value);
    map.set(key, values);
  };
  const resolve = (map: Map<string, Set<string>>, key: string) => {
    const values = map.get(key);
    if (!values) return null;
    if (values.size !== 1) {
      unresolved.push(key);
      return null;
    }
    return [...values][0];
  };
  // Include unflagged candidates too: identical bodies with different flags must
  // never be resolved by whichever source declaration happened to appear last.
  for (const line of source.split(/\r?\n/)) {
    if (/^\s*(?:#|;|\/\/)/.test(line)) continue;
    let ast: any;
    try {
      ast =
        /^(?:request|response) if /.test(line.trim()) &&
        !/then script\(/.test(line)
          ? parseRewriteV2(line.trim())
          : parseScriptDeclaration(line.trim());
    } catch {
      continue;
    }
    if (!ast?.condition) continue;
    const matchers: any[] = [];
    function visit(node: any) {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "comparison" &&
        node.left?.name === "url" &&
        node.operator === "~=" &&
        node.right?.type === "regex"
      )
        matchers.push(node.right);
      for (const value of Object.values(node))
        if (value && typeof value === "object") {
          if (Array.isArray(value)) value.forEach(visit);
          else visit(value);
        }
    }
    visit(ast.condition);
    for (const regex of matchers) {
      const old = compileRegexForTarget(regex).pattern;
      const restored = compileRegexForTarget(regex, {
        target: "surge",
      }).pattern;
      add(urls, old, restored);
      add(urls, restored, restored);
      for (const action of ast.actions ?? []) {
        const array = action.args.find((a: any) => a.type === "array");
        const rows = array
          ? array.items.map((_: any, i: number) =>
              action.args.map((a: any) =>
                a.type === "array" ? a.items[i] : a,
              ),
            )
          : [action.args];
        for (const args of rows) {
          const body = /^(request|response)\.body\.replace$/.exec(action.name);
          const header = /^(request|response)\.header\.replace$/.exec(
            action.name,
          );
          const rx = body ? args[0] : header ? args[1] : null;
          if (rx?.type !== "regex") continue;
          const mapped = compileRegexForTarget(rx, {
            target: "surge",
            subject: body ? "body" : "header",
          }).pattern;
          const prefix =
            (body?.[1] ?? header?.[1]) +
            "\0" +
            old +
            "\0" +
            (header ? args[0]?.value + "\0" : "");
          const map = body ? bodies : headers;
          add(map, prefix + rx.pattern, mapped);
          add(map, prefix + mapped, mapped);
          const restoredPrefix = prefix.replace(old + "\0", restored + "\0");
          add(map, restoredPrefix + rx.pattern, mapped);
          add(map, restoredPrefix + mapped, mapped);
        }
      }
    }
  }
  let section = "",
    changed = 0;
  const original = target.split("\n");
  const lines = original.map((line) => {
    const sectionName = line.match(/^\[([^\]]+)\]$/);
    if (sectionName) {
      section = sectionName[1];
      return line;
    }
    if (!line || /^\s*(?:#|;|\/\/)/.test(line)) return line;
    let out = line;
    if (["URL Rewrite", "Map Local"].includes(section)) {
      out = line.replace(/^(\S+)/, (token) => resolve(urls, token) ?? token);
    } else if (["Body Rewrite", "Header Rewrite"].includes(section)) {
      const parts = line.split(" "),
        oldUrl = parts[1];
      const phase = /^http-(request|response)(?:-jq)?$/.exec(parts[0])?.[1];
      parts[1] = resolve(urls, oldUrl) ?? oldUrl;
      if (
        section === "Body Rewrite" &&
        !parts[0].endsWith("-jq") &&
        parts.length === 4
      )
        parts[2] =
          resolve(bodies, phase + "\0" + oldUrl + "\0" + parts[2]) ?? parts[2];
      if (section === "Header Rewrite" && parts[2] === "header-replace-regex")
        parts[4] =
          resolve(
            headers,
            phase + "\0" + oldUrl + "\0" + parts[3] + "\0" + parts[4],
          ) ?? parts[4];
      out = parts.join(" ");
    } else if (section === "Script") {
      const equals = line.indexOf(" = ");
      if (equals >= 0) {
        const params = parseSurgeParameters(line.slice(equals + 3));
        const pattern = params.get("pattern");
        const replacement = pattern && resolve(urls, pattern);
        if (replacement && replacement !== pattern)
          out =
            line.slice(0, equals + 3) +
            line
              .slice(equals + 3)
              .replace(
                /(^|,)(\s*pattern=)("(?:\\.|[^"\\])*"|'[^']*'|[^,]+)/,
                (_all, comma, key) =>
                  comma + key + surgeRegexParameter(replacement),
              );
      }
    }
    if (out !== line) changed++;
    return out;
  });
  // Remove only the obsolete flag-omission note whose following rule was fixed.
  const text = lines
    .filter(
      (line, i) =>
        !(
          line.startsWith(
            "# [WayX] COMPATIBILITY LIMITATION: native URL matcher temporarily omits Loon flags ",
          ) && lines[i + 1] !== original[i + 1]
        ),
    )
    .join("\n");
  return { text, changed, unresolved: [...new Set(unresolved)] };
}

export async function refreshFrozenSurgeFlags(root: string, catalog: any[]) {
  if (!(await keleePaused(root))) return;
  const changes = new Map<string, string>(),
    reports: any[] = [];
  for (const entry of catalog.filter((e) => isKeleeSource(e.source))) {
    const file = "Adblock/Surge/" + entry.surge;
    const source = await readOptional(
      path.join(root, "Resource/Loon", entry.file),
    );
    const target = await readOptional(path.join(root, file));
    if (!source || !target) continue;
    const result = restoreFrozenSurgeFlags(
      source.toString(),
      target.toString(),
    );
    if (result.changed) {
      validateSurgeModule(result.text, entry);
      changes.set(file, result.text);
    }
    reports.push({
      file,
      changed: result.changed,
      unresolved: result.unresolved,
    });
  }
  changes.set(
    ".github/monitor/.runtime/surge-flags.json",
    JSON.stringify({ version: 1, reports }, null, 2) + "\n",
  );
  await commitFiles(root, changes);
  console.log(
    "Frozen Surge flag restoration: " +
      reports.reduce((n, r) => n + r.changed, 0) +
      " fields; " +
      reports.filter((r) => r.unresolved.length).length +
      " ambiguous artifacts",
  );
}
