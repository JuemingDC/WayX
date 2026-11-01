// Modified: 2026-11-01 (chance). Generate API adapters from raw backups only when source platform, trigger and supported API domain are known; keep blocked originals visible in a report.
import crypto from "node:crypto";
import path from "node:path";
import { readOptional } from "../publish/transaction.ts";
import {
  planScriptApiConversion,
  type ScriptPlatform,
} from "../parser/script-api.ts";
import {
  scriptReferences,
  scriptReferencePhase,
  applyScriptBindings,
  type ScriptBinding,
} from "../parser/backup-references.ts";
import { parseScriptDeclaration, scriptIrTag } from "../parser/script.ts";
const digest = (value: string | Uint8Array) =>
  crypto.createHash("sha256").update(value).digest("hex");
const key = (value: string) => {
  const u = new URL(value);
  u.hash = "";
  return u.href;
};
export async function prepareScriptApiAdapters(
  root: string,
  { artifacts, catalog, index, changes, rawBase }: any,
) {
  const adapters = index.adapters ?? {},
    bindings: any = {},
    diagnostics: any[] = [],
    counts = { native: 0, adapted: 0, blocked: 0 };
  const known = new Map<string, any>();
  for (const entry of catalog)
    for (const file of [
      "Adblock/Quantumult X/" + entry.qx,
      "Adblock/Surge/" + entry.surge,
    ])
      known.set(file, entry);
  const artifactMap = new Map<string, any>(
    artifacts.map((a: any) => [a.relative, a]),
  );
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
  function original(value: string): string | null {
    const p = local(value);
    return p
      ? index.objects[p]?.kind === "script"
        ? index.objects[p].url
        : (adapters[p]?.sourceUrl ?? null)
      : value;
  }
  const profiles = new Map<string, any[]>();
  for (const entry of catalog) {
    const bytes = await readOptional(
      path.join(root, "Resource/Loon", entry.file),
    );
    if (!bytes) continue;
    for (const line of bytes.toString().split("\n")) {
      if (/^\s*(?:#|;|\/\/)/.test(line)) continue;
      try {
        const ir = parseScriptDeclaration(line);
        if (!ir?.script?.path) continue;
        const url = key(new URL(ir.script.path, entry.source).href),
          option = ir.options?.find((o: any) =>
            /^(?:binary_body_mode|binary-body-mode)$/.test(o.name),
          );
        const binary =
          option?.value?.value === true ||
          /^(?:true|1)$/.test(String(option?.value ?? ""));
        const profile = {
          phase: ["request", "response"].includes(ir.phase) ? ir.phase : "task",
          binary,
          name: scriptIrTag(ir),
        };
        const id = entry.source + "\0" + url;
        profiles.set(id, [...(profiles.get(id) ?? []), profile]);
      } catch {}
    }
  }
  for (const artifact of artifacts) {
    if (!/\.(?:snippet|sgmodule)$/.test(artifact.relative)) continue;
    const to: ScriptPlatform = artifact.relative.endsWith(".snippet")
      ? "qx"
      : "surge";
    const entry = known.get(artifact.relative),
      from: ScriptPlatform | null = entry
        ? "loon"
        : artifact.text.includes("# Managed by: WayX Native QX")
          ? "qx"
          : null;
    const plans: Record<string, ScriptBinding> = {};
    for (const ref of scriptReferences(artifact.text)) {
      if (!/^https?:\/\//.test(ref.value)) continue;
      const sourceUrl = original(ref.value);
      if (!sourceUrl) continue;
      const record = index.objects[index.latest[key(sourceUrl)]];
      if (record?.kind !== "script") continue;
      const raw =
        changes.get(record.path) ??
        (await readOptional(path.join(root, record.path)));
      if (!raw) throw Error("Missing raw API input: " + record.path);
      if (from === to) {
        counts.native++;
        continue;
      }
      if (!from) {
        counts.blocked++;
        diagnostics.push({
          artifact: artifact.relative,
          sourceUrl,
          status: "blocked",
          problems: [
            {
              api: "source-platform",
              reason:
                "Source runtime is not registered; API names alone do not prove it",
              solution:
                "Register the author source runtime instead of guessing from a target filename",
            },
          ],
        });
        continue;
      }
      const previousAdapterPath = local(ref.value),
        previousAdapter = previousAdapterPath
          ? adapters[previousAdapterPath]
          : null;
      if (previousAdapter) {
        const originalRef = key(sourceUrl) + new URL(ref.value).hash;
        (bindings[artifact.relative] ??= {})[originalRef] = index.bindings?.[
          artifact.relative
        ]?.[originalRef] ?? { path: previousAdapterPath };
      }
      const mode = scriptReferencePhase(artifact.text, ref);
      let profile: any = { phase: mode.phase, binary: mode.binary };
      if (entry) {
        // Modified: 2026-11-01 (chance). Repeated match conditions may share the exact same runtime profile; that is not an ambiguous API context.
        const choices = [
          ...new Map(
            (profiles.get(entry.source + "\0" + key(sourceUrl)) ?? []).map(
              (p) => [JSON.stringify(p), p],
            ),
          ).values(),
        ].filter(
          (p) =>
            p.phase === (mode.phase === "echo" ? "request" : mode.phase) ||
            mode.phase === "task",
        );
        if (choices.length !== 1) {
          counts.blocked++;
          diagnostics.push({
            artifact: artifact.relative,
            sourceUrl,
            status: "blocked",
            problems: [
              {
                api: "source-profile",
                reason:
                  "Script trigger/binary/name profile is missing or ambiguous",
                solution:
                  "Bind this script to one original Script v2 declaration before adapting",
              },
            ],
          });
          continue;
        }
        profile = choices[0];
      } else if (to === "surge") {
        const peer = artifact.relative
            .replace("/Surge/", "/Quantumult X/")
            .replace(/\.sgmodule$/, ".snippet"),
          modulePeer = peer.replace("/Quantumult X/", "/QuantumultX/");
        const qx: any = artifactMap.get(peer) ?? artifactMap.get(modulePeer);
        const choices = qx
          ? scriptReferences(qx.text)
              .filter(
                (r) => key(original(r.value) ?? r.value) === key(sourceUrl),
              )
              .map((r) => scriptReferencePhase(qx.text, r))
          : [];
        const phases = [...new Set(choices.map((p) => p.phase))];
        if (phases.length !== 1) {
          counts.blocked++;
          diagnostics.push({
            artifact: artifact.relative,
            sourceUrl,
            status: "blocked",
            problems: [
              {
                api: "QX script mode",
                reason: "No unique source QX trigger can be established",
                solution:
                  "Retain separate source declaration identities for scripts reused across phases",
              },
            ],
          });
          continue;
        }
        profile.phase = phases[0];
      }
      let text: string;
      try {
        text = new TextDecoder("utf8", { fatal: true }).decode(raw);
      } catch {
        counts.blocked++;
        diagnostics.push({
          artifact: artifact.relative,
          sourceUrl,
          status: "blocked",
          problems: [
            {
              api: "opaque-script",
              reason: "Binary/encrypted script is not parseable JavaScript",
              solution:
                "Keep original bytes and obtain an author-provided plaintext or native target build",
            },
          ],
        });
        continue;
      }
      const plan = planScriptApiConversion(text, {
        from,
        to,
        phase: profile.phase,
        name: profile.name,
        binary: profile.binary,
        responseBody: mode.body,
        sourceUrl,
      });
      diagnostics.push({
        artifact: artifact.relative,
        sourceUrl,
        from,
        to,
        phase: profile.phase,
        status: plan.status,
        features: plan.features,
        problems: plan.problems,
      });
      if (plan.status !== "adapted") {
        counts.blocked++;
        continue;
      }
      const binary = plan.features.some((p) =>
        /^\$(?:request|response)\.bodyBytes(?:\.|$)/.test(p),
      );
      if (binary && !mode.body) {
        counts.blocked++;
        diagnostics[diagnostics.length - 1].status = "blocked";
        diagnostics[diagnostics.length - 1].problems = [
          {
            api: "binary input",
            reason: "Source declaration does not wait for the body",
            solution:
              "Correct the source declaration before selecting binary-body mode",
          },
        ];
        continue;
      }
      const file =
        "Script/Api/" +
        from +
        "-to-" +
        to +
        "/" +
        digest(JSON.stringify([sourceUrl, profile, mode.body])) +
        ".js";
      changes.set(file, plan.code!);
      adapters[file] = {
        path: file,
        sourceUrl: key(sourceUrl),
        sourceSha256: record.sha256,
        sha256: digest(plan.code!),
        from,
        to,
        phase: profile.phase,
        features: plan.features,
      };
      plans[ref.value] = { path: file, binary, echo: plan.echoRequired };
      plans[rawBase + "/" + record.path + new URL(ref.value).hash] =
        plans[ref.value];
      const originalRef = key(sourceUrl) + new URL(ref.value).hash;
      (bindings[artifact.relative] ??= {})[originalRef] = {
        path: file,
        binary,
        echo: plan.echoRequired,
      };
      counts.adapted++;
    }
    if (Object.keys(plans).length) {
      const current = String(changes.get(artifact.relative) ?? artifact.text);
      changes.set(
        artifact.relative,
        applyScriptBindings(current, plans, rawBase),
      );
    }
  }
  index.adapters = adapters;
  index.bindings = bindings;
  const report = { version: 1, ...counts, diagnostics };
  changes.set(
    "Resource/Backup/script-api-status.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  return report;
}
