// Modified: 2026-11-02 (chance). Prove notification options per source contract;
// target QX omits undocumented optional parameters without evaluating them twice.
import ts from "typescript";
import { constantString } from "./script-bindings.ts";
export function notificationContract(
  args: readonly ts.Expression[],
  checker: ts.TypeChecker,
  from: string,
  to: string,
) {
  if (args.some(ts.isSpreadElement))
    return { ok: false, omitted: [] as string[] };
  if (args.length <= 3) return { ok: true, omitted: [] as string[] };
  if (to === "qx")
    return {
      ok: true,
      omitted: args.slice(3).map((_, i) => `notification.argument${i + 4}`),
    };
  if (!["surge", "loon"].includes(to))
    return { ok: false, omitted: [] as string[] };
  if (args.length > (from === "loon" ? 5 : 4))
    return { ok: false, omitted: [] as string[] };
  if (args[4] && (!ts.isNumericLiteral(args[4]) || Number(args[4].text) !== 0))
    return { ok: false, omitted: [] as string[] };
  const option = args[3];
  if (from === "loon" && constantString(option, checker) !== null)
    return { ok: true, omitted: [] as string[] };
  if (!ts.isObjectLiteralExpression(option))
    return { ok: false, omitted: [] as string[] };
  const keys = new Set<string>();
  let ok = true;
  for (const p of option.properties) {
    if (
      !ts.isPropertyAssignment(p) ||
      !(ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)) ||
      keys.has(p.name.text)
    ) {
      ok = false;
      continue;
    }
    keys.add(p.name.text);
    if (
      from === "loon"
        ? !["openUrl", "mediaUrl"].includes(p.name.text)
        : from === "surge"
          ? !["url", "action", "media-url"].includes(p.name.text)
          : true
    )
      ok = false;
    if (
      p.name.text === "action" &&
      constantString(p.initializer, checker) !== "open-url"
    )
      ok = false;
  }
  if (from === "surge" && keys.has("action") && !keys.has("url")) ok = false;
  return { ok, omitted: [] as string[] };
}
