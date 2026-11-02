import { scriptRuntimePolicyVersion } from "../domain/script-api.ts";
import { collectScriptApiReferences } from "../parser/script-api-ir.ts";
import { inspectScriptApis } from "../parser/script-api.ts";
// Modified: 2026-11-02 (chance). Publish concrete semantic plans separately
// from author JS, with one stable source-URL sidecar and integrity manifest.
import { scriptApiDefinitions } from "../domain/script-api.ts";
// Modified: 2026-11-02 (chance). Persist source-specific supported hosts and the authorized conversion directions.
import {
  scriptTargetsForSource,
  scriptConversionDirections,
} from "../parser/universal-script.ts";
// Modified: 2026-11-02 (chance). Refresh API mapping and source-level priority evidence with each production report.
import {
  scriptApiMapping,
  scriptConversionPriorities,
} from "../parser/script-api-mapping.ts";
// Modified: 2026-11-02 (chance). Report static module evidence and analysis categories per source without executing archived author code.
const scriptProblemCategory = (api: string, _reason?: string) =>
  api === "syntax"
    ? "source-invalid"
    : api === "source-profile"
      ? "declaration-unresolved"
      : "api-capability";
import { scriptCapabilityBoundaries } from "../parser/script-boundaries.ts";
// Modified: 2026-11-01 (chance). Adblock-only publication groups by original URL,
// emits one source-named three-client program and rebinds every proven context.
import crypto from "node:crypto";
import path from "node:path";
import { readOptional } from "../publish/transaction.ts";
import {
  planUniversalAdblockScript,
  universalScriptPath,
  type UniversalProfile,
} from "../parser/universal-script.ts";
import type { ScriptPlatform } from "../parser/script-api.ts";
import {
  scriptReferences,
  scriptReferencePhase,
  applyScriptBindings,
  type ScriptBinding,
} from "../parser/backup-references.ts";
import { splitTopLevelCsv } from "../parser/rule.ts";
import { parseLoonPlugin } from "../parser/input.ts";
import {
  buildSurgeArgumentTable,
  parseLegacyLoonPluginObjectRefs,
  parseScriptDeclaration,
  scriptIrTag,
} from "../parser/script.ts";
const digest = (v: string | Uint8Array) =>
  crypto.createHash("sha256").update(v).digest("hex");
const key = (v: string) => {
  const u = new URL(v);
  u.hash = "";
  return u.href;
};
export async function prepareScriptApiAdapters(
  root: string,
  { artifacts, catalog, index, changes, rawBase }: any,
) {
  const adapters = index.adapters ?? {},
    bindings: any = structuredClone(index.bindings ?? {}),
    diagnostics: any[] = [],
    counts = { adapted: 0, blocked: 0, excluded: 0, universal: 0 };
  const apiPlans: Record<
    string,
    { path: string; sha256: string; sourceSha256: string }
  > = {};
  const priorApiPlans = index.apiPlans ?? {};
  const known = new Map<string, any>();
  for (const entry of catalog)
    for (const file of [
      "Adblock/Quantumult X/" + entry.qx,
      "Adblock/Surge/" + entry.surge,
    ])
      known.set(file, entry);
  function local(value: string): string | null {
    for (const base of [
      rawBase,
      "https://raw.githubusercontent.com/JuemingDC/WayX/main",
    ])
      if (value.startsWith(base + "/"))
        return decodeURIComponent(
          new URL(value).pathname.slice(new URL(base).pathname.length + 1),
        );
    return null;
  }
  const original = (value: string) => {
    const p = local(value);
    return p
      ? index.objects[p]?.kind === "script"
        ? index.objects[p].url
        : (adapters[p]?.sourceUrl ?? null)
      : value;
  };
  const sourceProfiles = new Map<string, UniversalProfile[]>();
  for (const entry of catalog) {
    const bytes = await readOptional(
      path.join(root, "Resource/Loon", entry.file),
    );
    if (!bytes) continue;
    // Modified: 2026-11-02 (chance). Carry the same source schema already used
    // by Surge's JSON argument payload; never infer saved values or defaults.
    const table = buildSurgeArgumentTable(
      parseLoonPlugin(bytes.toString()).sections.get("Argument") ?? [],
    );
    for (const line of bytes.toString().split("\n")) {
      if (/^\s*(?:#|;|\/\/)/.test(line)) continue;
      try {
        const ir = parseScriptDeclaration(line);
        if (!ir?.script?.path || !["request", "response"].includes(ir.phase))
          continue;
        const url = key(new URL(ir.script.path, entry.source).href),
          option = ir.options?.find((o: any) =>
            /^(?:binary_body_mode|binary-body-mode)$/.test(o.name),
          );
        const binaryKnown =
          !option ||
          typeof option.value?.value === "boolean" ||
          /^(?:true|false|0|1)$/.test(String(option.value ?? ""));
        const binary =
          option?.value?.value === true ||
          /^(?:true|1)$/.test(String(option?.value ?? ""));
        const argument: any = ir.script.argument;
        const refs =
          ir.sourceSyntax === "legacy"
            ? parseLegacyLoonPluginObjectRefs(argument)
            : argument?.type === "plugin-object"
              ? argument.items.map((item: any) => item.name)
              : null;
        let argumentSchema: any;
        if (refs) {
          if (
            refs.length &&
            refs.every((id: string) => {
              const entry = table.byId.get(id);
              return (
                entry?.hasDefault &&
                (entry.valueType !== "string" ||
                  (entry.kind === "select" &&
                    entry.values.length &&
                    entry.values.every((v: string) =>
                      /^[a-zA-Z0-9_. -]*$/.test(v),
                    )))
              );
            })
          )
            argumentSchema = {
              kind: "object",
              enumValues: Object.fromEntries(
                refs
                  .filter(
                    (id: string) => table.byId.get(id).valueType === "string",
                  )
                  .map((id: string) => [id, table.byId.get(id).values]),
              ),
              fields: Object.fromEntries(
                refs.map((id: string) => [id, table.byId.get(id).valueType]),
              ),
            };
        } else if (
          argument &&
          (ir.sourceSyntax === "legacy" ||
            ["string", "raw-string"].includes(argument.type))
        )
          argumentSchema = { kind: "string" };
        // Modified: 2026-11-02 (chance). Preserve original Loon body-read
        // provenance; runtime body conversion follows the original declaration.
        const bodyOption = ir.options?.find((o: any) =>
          /^(?:requires_body|requires-body)$/.test(o.name),
        );
        const responseBody =
          bodyOption?.value?.value === true ||
          /^(?:true|1)$/.test(String(bodyOption?.value ?? ""));
        const p = {
          phase: ir.phase,
          responseBody,
          binary,
          binaryKnown,
          name: scriptIrTag(ir),
          ...(argumentSchema ? { argumentSchema } : {}),
        };
        const id = entry.source + "\0" + url;
        sourceProfiles.set(id, [...(sourceProfiles.get(id) ?? []), p]);
      } catch {}
    }
  }
  const groups = new Map<string, any>();
  for (const artifact of artifacts) {
    // Module/configuration utilities remain byte-backed native scripts, outside this task.
    if (
      !artifact.relative.startsWith("Adblock/") ||
      !/\.(?:snippet|sgmodule)$/.test(artifact.relative)
    )
      continue;
    const entry = known.get(artifact.relative),
      from: ScriptPlatform | null = entry
        ? "loon"
        : artifact.text.includes("# Managed by: WayX Native QX")
          ? "qx"
          : null;
    const to = artifact.relative.endsWith(".snippet") ? "qx" : "surge";
    for (const ref of scriptReferences(artifact.text)) {
      if (!/^https?:\/\//.test(ref.value)) continue;
      const sourceUrl = original(ref.value);
      if (!sourceUrl) continue;
      const url = key(sourceUrl),
        record = index.objects[index.latest[url]];
      if (record?.kind !== "script") continue;
      const mode = scriptReferencePhase(artifact.text, ref);
      if (mode.phase === "task") {
        counts.excluded++;
        diagnostics.push({
          artifact: artifact.relative,
          sourceUrl: url,
          to,
          status: "excluded",
          features: [],
          problems: [
            {
              api: "scope",
              reason: "Only HTTP adblock scripts are in scope",
              solution: "Retain native task scripts",
            },
          ],
        });
        continue;
      }
      const group = groups.get(url) ?? {
        sourceUrl: url,
        record,
        from: new Set(),
        profiles: [],
        refs: [],
      };
      if (from) group.from.add(from);
      const declared = entry
        ? (sourceProfiles.get(entry.source + "\0" + url) ?? [])
        : [];
      // Names are retained only when observable; a URL reused by different tags is
      // not inherently ambiguous. Runtime selects request/response without URL forks.
      if (declared.length) group.profiles.push(...declared);
      else if (from === "qx" && to === "qx")
        group.profiles.push({
          phase: mode.phase,
          binary: false,
          responseBody: mode.body,
        });
      group.refs.push({ artifact, ref, to, mode });
      groups.set(url, group);
    }
  }
  const plans = new Map<string, Record<string, ScriptBinding>>();
  for (const group of groups.values()) {
    const { sourceUrl, record } = group;
    const raw =
      changes.get(record.path) ??
      (await readOptional(path.join(root, record.path)));
    if (!raw) throw Error("Missing raw API input: " + record.path);
    let result: any;
    const sourceText = new TextDecoder("utf8", { fatal: false }).decode(raw);

    if (group.from.size !== 1 || !group.profiles.length)
      result = {
        status: "blocked",
        features: [],
        problems: [
          {
            api: "source-profile",
            reason: "No unique source platform and HTTP declaration profile",
            solution:
              "Register the source runtime and original adblock HTTP declaration",
          },
        ],
      };
    else {
      try {
        result = planUniversalAdblockScript(
          new TextDecoder("utf8", { fatal: true }).decode(raw),
          [...group.from][0] as ScriptPlatform,
          group.profiles,
        );
      } catch (e: any) {
        result = {
          status: "blocked",
          features: [],
          problems: [
            {
              api: "opaque-script",
              reason: e.message,
              solution:
                "Obtain valid plaintext JavaScript; preserve the exact backup",
            },
          ],
        };
      }
    }
    if (
      result.status === "universal" &&
      group.refs.some(
        (r: any) =>
          !result.contexts[
            r.mode.phase === "response" ? "response" : "request"
          ],
      )
    )
      result = {
        ...result,
        status: "blocked",
        code: null,
        problems: [
          {
            api: "source-profile",
            reason:
              "A published HTTP trigger has no matching original source context",
            solution:
              "Restore the original trigger binding before sharing the script",
          },
        ],
      };
    const rawInventory = inspectScriptApis(sourceText);
    const syntax = collectScriptApiReferences(
      rawInventory.tree,
      rawInventory.checker,
      rawInventory.contextAliases,
    ).map((reference) => {
      const start = reference.node.getStart(rawInventory.tree),
        position = rawInventory.tree.getLineAndCharacterOfPosition(start);
      return {
        api: reference.api,
        access: reference.access,
        start,
        end: reference.node.end,
        line: position.line + 1,
        column: position.character + 1,
        members: reference.members,
      };
    });
    const apiPlanPath =
      "Resource/Backup/script-api/" + digest(sourceUrl) + ".json";
    const apiPlanText =
      JSON.stringify(
        {
          version: 1,
          sourceUrl,
          sourceSha256: record.sha256,
          sourceClients: [...group.from],
          sourceSyntax: {
            view: "decoded archived UTF-8 input",
            sha256: digest(sourceText),
            operations: syntax,
            diagnostics: rawInventory.problems,
          },
          runtimePolicyVersion: scriptRuntimePolicyVersion,
          sourceView:
            "unmodified author source; API inventory offsets are UTF-16, not byte offsets",
          plans: result.operationPlans ?? {},
          diagnostics: result.problems,
        },
        null,
        2,
      ) + "\n";
    changes.set(apiPlanPath, apiPlanText);
    apiPlans[sourceUrl] = {
      path: apiPlanPath,
      sha256: digest(apiPlanText),
      sourceSha256: record.sha256,
    };
    const file = universalScriptPath(sourceUrl),
      prior = adapters[file];
    if (prior && prior.sourceUrl !== sourceUrl)
      throw Error("Universal script URL identity collision: " + file);
    if (result.status === "universal") {
      changes.set(file, result.code);
      adapters[file] = {
        path: file,
        sourceUrl,
        sourceSha256: record.sha256,
        sha256: digest(result.code),
        from: [...group.from][0],
        directionPolicyVersion: 1,
        targets: scriptTargetsForSource([...group.from][0] as ScriptPlatform),
        conversionTargets: scriptTargetsForSource(
          [...group.from][0] as ScriptPlatform,
        ).filter((target) => target !== [...group.from][0]),
        contexts: result.contexts,
        features: result.features,
        runtimePolicyVersion: scriptRuntimePolicyVersion,
      };
      counts.universal++;
    }
    for (const { artifact, ref, to, mode } of group.refs) {
      const sourceRef = sourceUrl + new URL(ref.value).hash;
      const previous = index.bindings?.[artifact.relative]?.[sourceRef];
      let binding: ScriptBinding | undefined;
      if (result.status === "universal") {
        const binary = result.features.some((p: string) =>
          /^\$(?:request|response)\.bodyBytes(?:\.|$)/.test(p),
        );
        const context =
          result.contexts[mode.phase === "response" ? "response" : "request"];
        if (context) {
          binding = {
            path: file,
            binary: binary || Boolean(context[to]?.binary),
            echo: to === "qx" && context.qx.phase === "echo",
          };
          counts.adapted++;
        }
      } else {
        counts[result.status === "excluded" ? "excluded" : "blocked"]++;
        // Incompatible updates retain an earlier verified universal program. During
        // migration, preserve an already working legacy adapter rather than regress it.
        if (prior)
          binding = previous?.path === file ? previous : { path: file };
        else if (previous && adapters[previous.path]) binding = previous;
      }
      diagnostics.push({
        artifact: artifact.relative,
        sourceUrl,
        from: [...group.from],
        to,
        status: result.status,
        features: result.features,
        problems: result.problems.map((p: any) => ({
          ...p,
          category:
            result.status === "excluded"
              ? "out-of-scope"
              : scriptProblemCategory(p.api, p.reason),
        })),

        // Modified: 2026-11-02 (chance). QX omissions are informational metadata,
        // never parameter errors or extra declarations in the author script.
        ...(result.contexts
          ? {
              omittedParameters: [
                ...new Set(
                  Object.values(result.contexts).flatMap((role: any) => [
                    ...(role.qx?.httpIgnoredOptions ?? []),
                    ...(role.qx?.omittedParameters ?? []),
                  ]),
                ),
              ],
            }
          : {}),

        ...(binding
          ? { path: binding.path, retained: result.status !== "universal" }
          : {}),
      });
      if (binding) {
        const artifactPlans = plans.get(artifact.relative) ?? {};
        artifactPlans[ref.value] = binding;
        artifactPlans[rawBase + "/" + record.path + new URL(ref.value).hash] =
          binding;
        plans.set(artifact.relative, artifactPlans);
        (bindings[artifact.relative] ??= {})[sourceRef] = binding;
      }
    }
  }
  for (const artifact of artifacts) {
    const values = plans.get(artifact.relative);
    if (!values) continue;
    changes.set(
      artifact.relative,
      applyScriptBindings(
        String(changes.get(artifact.relative) ?? artifact.text),
        values,
        rawBase,
      ),
    );
  }
  // Modified: 2026-11-02 (chance). Retirement is performed once after all
  // outputs are rebound, with dependencies across every Script file included.
  for (const [url, entry] of Object.entries<any>(priorApiPlans))
    if (
      !apiPlans[url] &&
      entry.path === "Resource/Backup/script-api/" + digest(url) + ".json"
    )
      changes.set(entry.path, null);
  index.apiPlans = apiPlans;
  index.adapters = adapters;
  index.bindings = bindings;
  const report = {
    version: 3,
    runtimePolicyVersion: scriptRuntimePolicyVersion,
    validationMode: "api-runtime-compatibility",
    scope: "adblock-http",
    targets: ["qx", "surge"],
    nativeSourceHosts: ["loon", "qx"],
    conversionDirections: scriptConversionDirections,
    // Modified: 2026-11-02 (chance). Include the audited capability domains and exact upstream comparison revision.
    capabilities: scriptCapabilityBoundaries,
    apiMapping: scriptApiMapping,
    apiDefinitions: scriptApiDefinitions,
    apiPlans,
    conversionPriorities: scriptConversionPriorities(diagnostics),
    ...counts,
    // Modified: 2026-11-02 (chance). Early excluded/profile records receive the
    // same category metadata as fully planned references; none are left untyped.
    diagnostics: diagnostics.map((d) => ({
      ...d,
      problems: d.problems.map((p: any) => ({
        ...p,
        category:
          d.status === "excluded"
            ? "out-of-scope"
            : scriptProblemCategory(p.api, p.reason),
      })),
    })),
  };
  changes.set(
    "Resource/Backup/script-api-status.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  return report;
}
