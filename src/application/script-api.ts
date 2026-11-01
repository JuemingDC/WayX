// Modified: 2026-11-02 (chance). Report static module evidence and analysis categories per source without executing archived author code.
import {
  inspectEmbeddedWasm,
  scriptProblemCategory,
} from "../parser/script-wasm.ts";
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
import { parseScriptDeclaration, scriptIrTag } from "../parser/script.ts";
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
        const binary =
          option?.value?.value === true ||
          /^(?:true|1)$/.test(String(option?.value ?? ""));
        const p = { phase: ir.phase, binary, name: scriptIrTag(ir) };
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
        group.profiles.push({ phase: mode.phase, binary: false });
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
    const wasmEvidence = inspectEmbeddedWasm(sourceText);
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
      result.features.some((p: string) =>
        /^\$(?:request|response)\.bodyBytes(?:\.|$)/.test(p),
      ) &&
      group.refs.some((r: any) => !r.mode.body)
    ) {
      result = {
        ...result,
        status: "blocked",
        code: null,
        problems: [
          {
            api: "binary input",
            reason: "A source declaration does not wait for its byte body",
            solution:
              "Correct the source declaration; do not add binary mode to a header-only trigger",
          },
        ],
      };
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
        targets: ["qx", "surge", "loon"],
        contexts: result.contexts,
        features: result.features,
        specialization: result.specialization,
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
              : scriptProblemCategory(p.api),
        })),
        ...(result.specialization
          ? { specialization: result.specialization }
          : {}),
        ...(wasmEvidence ? { wasm: wasmEvidence } : {}),
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
  // Retire directional files only after every active declaration stopped using
  // them. Raw source archives and their stable URLs are never removed here.
  const used = new Set<string>();
  for (const artifact of artifacts)
    for (const ref of scriptReferences(
      String(changes.get(artifact.relative) ?? artifact.text),
    )) {
      const p = local(ref.value);
      if (p) used.add(p);
    }
  for (const file of Object.keys(adapters))
    if (file.startsWith("Script/Api/") && !used.has(file)) {
      changes.set(file, null);
      delete adapters[file];
    }
  for (const values of Object.values<any>(bindings))
    for (const [url, binding] of Object.entries<any>(values))
      if (binding.path?.startsWith("Script/Api/") && !adapters[binding.path])
        delete values[url];
  index.adapters = adapters;
  index.bindings = bindings;
  const report = {
    version: 2,
    scope: "adblock-http",
    targets: ["qx", "surge", "loon"],
    // Modified: 2026-11-02 (chance). Include the audited capability domains and exact upstream comparison revision.
    capabilities: scriptCapabilityBoundaries,
    ...counts,
    diagnostics,
  };
  changes.set(
    "Resource/Backup/script-api-status.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  return report;
}
