// Modified: 2026-11-02 (chance). Source declaration selects an API adapter;
// author syntax/dataflow no longer forms the compatibility publication gate.
import crypto from "node:crypto";
import vm from "node:vm";
import type { ArgumentSchema } from "./script-argument.ts";
import {
  inspectScriptApis,
  planScriptApiConversion,
  type ScriptPlatform,
  type ApiProblem,
} from "./script-api.ts";
import { emitScriptApiProgram } from "../emit/script-api-program.ts";
export type UniversalProfile = {
  phase: "request" | "response" | "echo";
  binary?: boolean;
  binaryKnown?: boolean;
  responseBody?: boolean;
  name?: string;
  argumentSchema?: ArgumentSchema;
};
// Modified: 2026-11-02 (chance). Production conversions are directional;
// the source's native host is retained only to run the same source-named file.
export const scriptConversionDirections = [
  { from: "loon", to: "qx" },
  { from: "loon", to: "surge" },
  { from: "qx", to: "surge" },
] as const;
export function scriptTargetsForSource(
  from: ScriptPlatform,
): ("qx" | "surge" | "loon")[] {
  return from === "loon"
    ? ["qx", "surge", "loon"]
    : from === "qx"
      ? ["qx", "surge"]
      : [];
}
export function universalScriptPath(url: string) {
  const u = new URL(url);
  u.hash = "";
  let original = u.pathname.split("/").filter(Boolean).at(-1) ?? "script.js";
  try {
    original = decodeURIComponent(original);
  } catch {}
  const name = original.replace(/[^\p{L}\p{N}_.-]/gu, "_") || "script.js";
  const host = u.hostname.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return (
    "Script/Adblock/" +
    host +
    "-" +
    crypto.createHash("sha256").update(u.href).digest("hex").slice(0, 12) +
    "/" +
    name
  );
}
export function planUniversalAdblockScript(
  source: string,
  from: ScriptPlatform,
  profiles: UniversalProfile[],
) {
  const inventory = inspectScriptApis(source),
    features = inventory.paths;
  const contexts: Record<string, any> = {},
    operationPlans: Record<string, any> = {};
  const problems: ApiProblem[] = [...inventory.problems];
  if (!["qx", "loon"].includes(from) || !profiles.length)
    return {
      status: "excluded" as const,
      code: null,
      features,
      problems: [
        {
          api: "scope",
          reason: "Only Loon/QX HTTP adblock declarations are converted",
          solution: "Keep other modules and clients native",
        },
      ],
      contexts,
      operationPlans,
    };
  for (const role of ["request", "response"]) {
    const candidates = profiles.filter(
      (p) => (p.phase === "response" ? "response" : "request") === role,
    );
    if (!candidates.length) continue;
    const signatures = [
      ...new Set(
        candidates.map((p) =>
          JSON.stringify({
            phase: p.phase,
            binary: !!p.binary,
          }),
        ),
      ),
    ];
    if (
      signatures.length !== 1 ||
      candidates.some((p) => p.binaryKnown === false)
    ) {
      problems.push({
        api: "source-profile",
        reason: "The same URL has ambiguous HTTP declaration context",
        solution:
          "Register distinguishable phase/binary/name/argument metadata",
      });
      continue;
    }
    const names = [...new Set(candidates.map((p) => p.name).filter(Boolean))];
    const schemas = [
      ...new Set(
        candidates.map((p) => JSON.stringify(p.argumentSchema ?? null)),
      ),
    ];
    const profile = {
      ...candidates[0],
      name: names.length === 1 ? names[0] : undefined,
      argumentSchema:
        schemas.length === 1 ? candidates[0].argumentSchema : undefined,
      responseBody: candidates.every((p) => p.responseBody === true),
    };
    contexts[role] = {};
    operationPlans[role] = {};
    for (const to of scriptTargetsForSource(from)) {
      const plan = planScriptApiConversion(
        source,
        { ...profile, from, to },
        inventory,
        false,
      );
      operationPlans[role][to] = plan.operationIR;
      contexts[role][to] = { ...profile, from, to, ...plan.contract };
      problems.push(...plan.problems);
    }
  }
  if (problems.length)
    return {
      status: "blocked" as const,
      code: null,
      features,
      problems,
      contexts,
      operationPlans,
    };
  const code = emitScriptApiProgram(source, contexts);
  try {
    new vm.Script(code);
  } catch (e: any) {
    return {
      status: "blocked" as const,
      code: null,
      features,
      problems: [
        {
          api: "syntax",
          reason: e.message,
          solution: "Repair classic JS composition",
        },
      ],
      contexts,
      operationPlans,
    };
  }
  return {
    status: "universal" as const,
    code,
    features,
    problems,
    contexts,
    operationPlans,
    runtimePolicyVersion: 2,
  };
}
