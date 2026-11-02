// Modified: 2026-11-02 (chance). Lower the semantic API plan to the single
// runtime kernel's host layouts; source AST checks never invent target syntax.
import {
  scriptHostLayouts,
  omitScriptNotificationOptions,
  scriptHttpMethods,
  type ScriptApiIR,
} from "../domain/script-api.ts";
export function emitScriptApiPlan(ir: ScriptApiIR) {
  return {
    version: 1,
    omitNotificationOptions: omitScriptNotificationOptions(
      ir.sourceClient,
      ir.targetClient,
    ),
    qxHttp: structuredClone(scriptHostLayouts.qx.http),
    methods: scriptHttpMethods.map((method) => method.toLowerCase()),
    source: structuredClone(scriptHostLayouts[ir.sourceClient]),
    target: structuredClone(scriptHostLayouts[ir.targetClient]),
  };
}
