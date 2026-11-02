// Modified: 2026-11-01 (chance). One author-named adblock script serves QX,
// Surge and Loon; publish only after every declared HTTP context passes all hosts.
import crypto from "node:crypto";
import vm from "node:vm";
import ts from "typescript";
import { scriptCodecs } from "../emit/script-codecs.ts";
import { optionalScriptParameters } from "./script-parameters.ts";
import type { ArgumentSchema } from "./script-argument.ts";
import { specializeScript } from "./script-specialize.ts";
import {
  inspectScriptApis,
  planScriptApiConversion,
  type ApiProblem,
  type ScriptPlatform,
} from "./script-api.ts";
import { scriptApiRuntime } from "../emit/script-api-runtime.ts";
export type UniversalProfile = {
  phase: "request" | "response" | "echo";
  binary?: boolean;
  binaryKnown?: boolean;
  responseBody?: boolean;
  name?: string;
  argumentSchema?: ArgumentSchema;
};
export const universalTargets = ["qx", "surge", "loon"] as const;
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
  // Modified: 2026-11-02 (chance). Analyze and emit the same source-host specialization; raw archives remain exact.
  const specialization = specializeScript(source, from);
  source = specialization.source;
  const inventory = inspectScriptApis(source),
    features = inventory.paths;
  const excluded = features.filter((api) =>
    /^\$(?:config|surge|httpAPI|configuration)(?:\.|$)/.test(api),
  );
  const problem = (
    api: string,
    reason: string,
    solution: string,
  ): ApiProblem => ({ api, reason, solution });
  if (from === "egern" || excluded.length || !profiles.length)
    return {
      status: "excluded" as const,
      code: null,
      features,
      problems: [
        problem(
          excluded.join(", ") || "scope",
          "Only QX/Surge/Loon HTTP adblock scripts are in scope; configuration control, Egern and tasks remain native",
          "Keep the original script; do not add configuration-control shims",
        ),
      ],
      contexts: {},
    };
  const problems: ApiProblem[] = [],
    contexts: Record<string, any> = {};
  const usesName = features.some((p) => /^\$script\.name(?:\.|$)/.test(p));
  for (const role of ["request", "response"]) {
    const candidates = profiles.filter(
      (p) => (p.phase === "response" ? "response" : "request") === role,
    );
    if (!candidates.length) continue;
    const modes = [...new Set(candidates.map((p) => p.phase))];
    // Modified: 2026-11-02 (chance). Distinct binary flags are immaterial
    // only when the audited source cannot observe any input body or body mode.
    // Unknown aliases/computed accesses keep the profile conflict intact.
    const observesBinary =
      inventory.problems.length > 0 ||
      features.some((p) =>
        /^\$(?:request|response)(?:$|\.body(?:Bytes)?(?:\.|$))|^\$script(?:$|\.binaryBodyMode(?:\.|$))/.test(
          p,
        ),
      );
    const binary = [
      ...new Set(candidates.map((p) => observesBinary && Boolean(p.binary))),
    ];
    const names = [...new Set(candidates.map((p) => p.name).filter(Boolean))];
    const argumentSchemas = [
      ...new Set(
        candidates.map((p) => JSON.stringify(p.argumentSchema ?? null)),
      ),
    ];
    if (
      modes.length !== 1 ||
      binary.length !== 1 ||
      (observesBinary && candidates.some((p) => p.binaryKnown === false)) ||
      (features.some((p) => p.startsWith("$argument")) &&
        argumentSchemas.length !== 1) ||
      (usesName && (names.length !== 1 || candidates.some((p) => !p.name)))
    ) {
      problems.push(
        problem(
          "source-profile",
          "The same script has indistinguishable HTTP contexts with different echo/binary/observable source names",
          "Keep one shared file only after the declaration identity can be determined at runtime; never choose the last profile",
        ),
      );
      continue;
    }
    const profile = {
      phase: modes[0],
      binary: binary[0],
      responseBody: candidates.every((p) => p.responseBody === true),
      ...(argumentSchemas.length === 1 && candidates[0].argumentSchema
        ? { argumentSchema: candidates[0].argumentSchema }
        : {}),
      ...(usesName ? { name: names[0] } : {}),
    };
    contexts[role] = {};
    for (const to of universalTargets) {
      const plan = planScriptApiConversion(source, { from, to, ...profile });
      problems.push(
        ...plan.problems.map((p) => ({ ...p, reason: to + ": " + p.reason })),
      );
      contexts[role][to] = {
        from,
        to,
        ...profile,
        ...(plan.contract ?? {}),
        ...(plan.echoRequired ? { phase: "echo" } : {}),
      };
    }
  }
  if (problems.length)
    return {
      specialization: {
        folds: specialization.folds,
        branches: specialization.branches,
        reason: specialization.reason,
      },
      status: "blocked" as const,
      code: null,
      features,
      problems,
      contexts,
    };
  const identifiers = new Set<string>();
  const visit = (n: ts.Node) => {
    if (ts.isIdentifier(n)) identifiers.add(n.text);
    ts.forEachChild(n, visit);
  };
  visit(inventory.tree);
  // Modified: 2026-11-02 (chance). Generated lexical bindings must never
  // capture an author identifier, including free typeof probes.
  const fresh = (base: string) => {
    let name = base;
    while (identifiers.has(name)) name += "_";
    identifiers.add(name);
    return name;
  };
  const ctx = fresh("__wayxContext"),
    target = fresh("__wayxTarget"),
    host = fresh("__wayxHost"),
    contextTable = fresh("__wayxContexts"),
    role = fresh("__wayxRole"),
    config = fresh("__wayxConfig"),
    runBinding = fresh("__wayxRun"),
    codecBinding = fresh("__wayxCodecs");
  // Modified: 2026-11-02 (chance). Inject HTTP only when a proven callback
  // contract needs it; all hosts still execute one author-named shared program.
  const usesHttp = Object.values(contexts).some((role: any) =>
    Object.values(role).some((c: any) => c.httpCallback),
  );
  const usesTask = Object.values(contexts).some((role: any) =>
    Object.values(role).some((c: any) => c.httpTask),
  );
  const usesArgument = features.some((p) => p.startsWith("$argument"));
  const codecNames = [
    ...new Set(
      Object.values(contexts).flatMap((role: any) =>
        Object.values(role).flatMap((c: any) => c.portableCodecs ?? []),
      ),
    ),
  ] as string[];
  const parameterTail = optionalScriptParameters(fresh, {
    $httpClient: usesHttp,
    $task: usesTask,
    $argument: usesArgument,
    ...Object.fromEntries(codecNames.map((n) => [n, true])),
  });
  // The source business body occurs once; only generated bindings are renamed.
  const run = `function($request,$response,$done,$script,$persistentStore,$prefs,$notification,$notify,${ctx},setTimeout,setInterval${parameterTail}){\n${source}\n}`;
  const code = `(function(){
const ${target}=typeof $loon==='string'?'loon':typeof $task!=='undefined'&&typeof $task.fetch==='function'?'qx':typeof $environment!=='undefined'&&$environment['surge-version']?'surge':null;
if(!${target})throw new Error('Unsupported adblock script host');
const ${codecBinding}=${codecNames.length ? "(" + scriptCodecs + ")()" : "undefined"};
const ${host}={request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,script:typeof $script==='undefined'?undefined:$script,store:typeof $persistentStore==='undefined'?undefined:$persistentStore,prefs:typeof $prefs==='undefined'?undefined:$prefs,notify:typeof $notification==='undefined'?undefined:$notification,notifyQx:typeof $notify==='undefined'?undefined:$notify,http:typeof $httpClient==='undefined'?undefined:$httpClient,task:typeof $task==='undefined'?undefined:$task,argument:typeof $argument==='undefined'?undefined:$argument,codecs:${codecBinding}};
const ${contextTable}=${JSON.stringify(contexts)},${role}=${host}.response===undefined?'request':'response',${config}=${contextTable}[${role}]&&${contextTable}[${role}][${target}];
if(!${config})throw new Error('Unregistered adblock HTTP trigger');
const ${runBinding}=${run};
if(${target}===${JSON.stringify(from)}&&!${config}.httpTask)return ${runBinding}(${host}.request,${host}.response,${host}.done,${host}.script,${host}.store,${host}.prefs,${host}.notify,${host}.notifyQx,undefined,setTimeout,typeof setInterval==='undefined'?undefined:setInterval,${host}.http,${host}.task,${host}.argument,${codecBinding}&&${codecBinding}.TextEncoder,${codecBinding}&&${codecBinding}.TextDecoder,${codecBinding}&&${codecBinding}.atob,${codecBinding}&&${codecBinding}.btoa);
return (${scriptApiRuntime})(${config},${host},${runBinding});
})();\n`;
  try {
    new vm.Script(code);
  } catch (error: any) {
    return {
      status: "blocked" as const,
      code: null,
      features,
      problems: [
        problem(
          "syntax",
          error.message,
          "Repair source syntax before publishing the shared HTTP program",
        ),
      ],
      contexts,
    };
  }
  return {
    status: "universal" as const,
    specialization: {
      folds: specialization.folds,
      branches: specialization.branches,
      reason: specialization.reason,
    },
    code,
    features,
    problems: [] as ApiProblem[],
    contexts,
  };
}
