// Modified: 2026-11-02 (chance). Prove notification options per source contract;
// target QX omits undocumented optional parameters without evaluating them twice.
import ts from "typescript";
import {
  scriptHostLayouts,
  omitScriptNotificationOptions,
  type ScriptClient,
} from "../domain/script-api.ts";
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
  // Modified: 2026-11-02 (chance). Source QX has the same documented
  // three-text-field policy on every destination, including its native branch.
  if (omitScriptNotificationOptions(from as ScriptClient, to as ScriptClient))
    return {
      ok: true,
      omitted: args.slice(3).map((_, i) => `notification.argument${i + 4}`),
    };
  if (!["surge", "loon"].includes(to))
    return { ok: false, omitted: [] as string[] };
  const notification = scriptHostLayouts[from as ScriptClient].notification;
  if (args.length > (notification.delay ? 5 : 4))
    return { ok: false, omitted: [] as string[] };
  if (args[4] && (!ts.isNumericLiteral(args[4]) || Number(args[4].text) !== 0))
    return { ok: false, omitted: [] as string[] };
  const option = args[3];
  if (notification.stringLink && constantString(option, checker) !== null)
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
      ![notification.open, notification.media, notification.action]
        .filter(Boolean)
        .includes(p.name.text)
    )
      ok = false;
    if (
      p.name.text === notification.action &&
      constantString(p.initializer, checker) !== notification.openAction
    )
      ok = false;
  }
  if (
    notification.action &&
    keys.has(notification.action) &&
    (!notification.open || !keys.has(notification.open))
  )
    ok = false;
  return { ok, omitted: [] as string[] };
}
