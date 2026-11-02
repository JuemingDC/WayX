// Modified: 2026-11-02 (chance). API inventory is descriptive. Publication is
// governed by syntax, HTTP declaration and runtime capability, not author dataflow.
import ts from "typescript";
import vm from "node:vm";
import {
  parseScriptApiIR,
  collectScriptApiReferences,
} from "./script-api-ir.ts";
import { emitScriptApiPlan } from "../emit/script-api-plan.ts";
import { emitScriptApiProgram } from "../emit/script-api-program.ts";
import type { ScriptClient } from "../domain/script-api.ts";
import type { ArgumentSchema } from "./script-argument.ts";
export type ScriptPlatform = ScriptClient;
export type ApiOptions = {
  from: ScriptPlatform;
  to: ScriptPlatform;
  phase: "request" | "response" | "echo" | "task" | "network" | "generic";
  name?: string;
  binary?: boolean;
  responseBody?: boolean;
  argumentSchema?: ArgumentSchema;
  sourceUrl?: string;
};
export type ApiProblem = { api: string; reason: string; solution: string };
export function inspectScriptApis(source: string) {
  const tree = ts.createSourceFile(
    "upstream.js",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  const compiler = ts.createProgram(
    ["upstream.js"],
    { allowJs: true, noLib: true, noResolve: true },
    {
      getSourceFile: (n) => (n === "upstream.js" ? tree : undefined),
      getDefaultLibFileName: () => "",
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: (n) => n === "upstream.js",
      readFile: () => undefined,
      getCanonicalFileName: (n) => n,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
    },
  );
  const checker = compiler.getTypeChecker(),
    contextAliases = new Map<ts.Symbol, string>();
  const refs = collectScriptApiReferences(tree, checker, contextAliases);
  const problems: ApiProblem[] = [];
  try {
    new vm.Script(source);
  } catch (e: any) {
    problems.push({
      api: "syntax",
      reason: e.message,
      solution: "Repair upstream classic JavaScript syntax",
    });
  }
  return {
    tree,
    checker,
    contextAliases,
    paths: [...new Set(refs.map((r) => r.api))].sort(),
    calls: refs
      .filter((r) => r.call && ts.isCallExpression(r.call))
      .map((r) => ({ api: r.api, node: r.call as ts.CallExpression })),
    problems,
  };
}
export function planScriptApiConversion(
  source: string,
  options: ApiOptions,
  inventory = inspectScriptApis(source),
  emit = true,
) {
  const problems = [...inventory.problems];
  if (
    !["loon", "qx"].includes(options.from) ||
    !["qx", "loon", "surge"].includes(options.to) ||
    !["request", "response", "echo"].includes(options.phase)
  )
    problems.push({
      api: "scope",
      reason:
        "Only registered Loon/QX HTTP adblock API conversion is supported",
      solution: "Keep other clients, tasks and configuration tools native",
    });
  const operationIR = parseScriptApiIR(
    inventory.tree,
    inventory.checker,
    inventory.contextAliases,
    options.from,
    options.to,
    options,
    problems,
  );
  const apiPlan = emitScriptApiPlan(operationIR);
  const contract = {
    apiPlan,
    runtimePolicyVersion: 2,
    ...(options.argumentSchema
      ? { argumentSchema: options.argumentSchema }
      : {}),
    omittedParameters:
      options.to === "qx" ? ["undocumented-qx-parameters"] : [],
  };
  const context = { ...options, ...contract };
  let code: string | null = null;
  if (!problems.length && emit) {
    code = emitScriptApiProgram(
      source,
      {
        [options.phase === "response" ? "response" : "request"]: {
          [options.to]: context,
        },
      },
      options.to,
    );
    try {
      new vm.Script(code);
    } catch (e: any) {
      problems.push({
        api: "syntax",
        reason: e.message,
        solution: "Repair runtime composition",
      });
      code = null;
    }
  }
  return {
    status: problems.length
      ? ("blocked" as const)
      : options.from === options.to
        ? ("native" as const)
        : ("adapted" as const),
    code,
    features: inventory.paths,
    problems,
    operationIR,
    contract,
  };
}
