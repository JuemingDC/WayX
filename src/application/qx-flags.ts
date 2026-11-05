// Modified: 2026-11-05 (chance). Restore only known regex fields in retained
// Loon→QX artifacts, without reacquiring paused sources or touching native QX.
import path from "node:path";
import { compileRegexForTarget } from "../domain/core.ts";
import {
  parseRewriteV2,
  planQxRewrite,
  rewriteV2AstToSemanticIr,
} from "../parser/rewrite.ts";
import { parseScriptDeclaration } from "../parser/script.ts";
import { keleePaused, isKeleeSource } from "../ingest/source-pause.ts";
import { readOptional, commitFiles } from "../publish/transaction.ts";
import { validateQX } from "../validation/output.ts";

export function restoreFrozenQxFlags(source: string, target: string) {
  const urls = new Map<string, Set<string>>(),
    fields = new Map<string, Set<string>>();
  const unresolved = new Set<string>();
  const add = (map: Map<string, Set<string>>, key: string, value: string) => {
    const values = map.get(key) ?? new Set<string>();
    values.add(value);
    map.set(key, values);
  };
  const resolve = (map: Map<string, Set<string>>, key: string) => {
    const values = map.get(key);
    if (!values) return null;
    if (values.size !== 1) {
      unresolved.add(key);
      return null;
    }
    return [...values][0];
  };
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
    const visit = (node: any) => {
      if (!node || typeof node !== "object") return;
      if (
        node.type === "comparison" &&
        node.left?.name === "url" &&
        node.operator === "~=" &&
        node.right?.type === "regex"
      ) {
        const old = compileRegexForTarget(node.right).pattern;
        const restored = compileRegexForTarget(node.right, {
          target: "qx",
        }).pattern;
        add(urls, old, restored);
        add(urls, restored, restored);
      }
      for (const value of Object.values(node))
        if (Array.isArray(value)) value.forEach(visit);
        else visit(value);
    };
    visit(ast.condition);
    for (const action of ast.actions ?? []) {
      if (!/^(request|response)\.(body|header)\.replace$/.test(action.name))
        continue;
      // Reuse the planner on isolated ASTs to identify old/new search tokens;
      // never regenerate a retained artifact or its script references.
      const one = { ...ast, actions: [action] },
        old = structuredClone(one);
      const priorPolicy = (node: any, inCondition = false) => {
        if (!node || typeof node !== "object") return;
        if (node.type === "regex")
          node.flags = inCondition
            ? ""
            : String(node.flags || "").replace(/i/g, "");
        for (const [key, value] of Object.entries(node))
          if (Array.isArray(value))
            value.forEach((v) => priorPolicy(v, inCondition));
          else priorPolicy(value, inCondition || key === "condition");
      };
      priorPolicy(old);
      try {
        const before = planQxRewrite(
          rewriteV2AstToSemanticIr(old, { source: line }),
        );
        const after = planQxRewrite(
          rewriteV2AstToSemanticIr(one, { source: line }),
        );
        const oldLines = before.lines ?? [before.line],
          newLines = after.lines ?? [after.line];
        if (oldLines.length !== newLines.length) continue;
        for (let i = 0; i < oldLines.length; i++) {
          const a = oldLines[i]?.split(" "),
            b = newLines[i]?.split(" ");
          if (
            !a ||
            !b ||
            a[1] !== "url" ||
            b[1] !== "url" ||
            !/^(request|response)-(body|header)$/.test(a[2]) ||
            a[2] !== b[2]
          )
            continue;
          for (const url of [a[0], b[0]]) {
            add(fields, url + "\0" + a[2] + "\0" + a[3], b[3]);
            add(fields, url + "\0" + a[2] + "\0" + b[3], b[3]);
          }
        }
      } catch {
        /* A helper/review boundary is not a native regex field. */
      }
    }
  }
  let changed = 0;
  const original = target.split("\n"),
    lines = original.map((line) => {
      if (/^\s*(?:#|;|\/\/)/.test(line)) return line;
      const match = line.match(/^(\S+)(\s+.*\surl-and-header\s|\s+url\s)(.*)$/);
      if (!match) return line;
      const url = resolve(urls, match[1]) ?? match[1];
      const rest = match[3].replace(
        /^((?:request|response)-(?:body|header)) (\S+)/,
        (_all, action, pattern) =>
          action +
          " " +
          (resolve(fields, match[1] + "\0" + action + "\0" + pattern) ??
            pattern),
      );
      const out = url + match[2] + rest;
      if (out !== line) changed++;
      return out;
    });
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
  return { text, changed, unresolved: [...unresolved] };
}

export async function refreshFrozenQxFlags(root: string, catalog: any[]) {
  if (!(await keleePaused(root))) return;
  const changes = new Map<string, string>(),
    reports: any[] = [];
  for (const entry of catalog.filter((e) => isKeleeSource(e.source))) {
    const file = "Adblock/Quantumult X/" + entry.qx;
    const source = await readOptional(
      path.join(root, "Resource/Loon", entry.file),
    );
    const target = await readOptional(path.join(root, file));
    if (!source || !target) continue;
    const result = restoreFrozenQxFlags(source.toString(), target.toString());
    if (result.changed) {
      validateQX(result.text, entry);
      changes.set(file, result.text);
    }
    reports.push({
      file,
      changed: result.changed,
      unresolved: result.unresolved,
    });
  }
  changes.set(
    ".github/monitor/.runtime/qx-flags.json",
    JSON.stringify({ version: 1, reports }, null, 2) + "\n",
  );
  await commitFiles(root, changes);
  console.log(
    "Frozen QX flag restoration: " +
      reports.reduce((n, r) => n + r.changed, 0) +
      " rules; " +
      reports.filter((r) => r.unresolved.length).length +
      " ambiguous artifacts",
  );
}
