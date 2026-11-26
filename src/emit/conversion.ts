import { compactGeneratedPluginComments } from "../domain/output-comments.ts";
// Modified: 2026-11-03 (chance). Remove unused parser dependencies from the active conversion path.
import { repairScriptEchoDeclarations } from "../parser/backup-references.ts";
import { bindKnownBackups } from "../parser/backup-references.ts";
import { addAppIcon, type IconIndex } from "../domain/icons.ts";
import { disjointUrls } from "../domain/qx-header.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript emit layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / conversion
import crypto from "node:crypto";
import path from "node:path";
import { createResourceSnapshot } from "../ingest/resources.ts";
import type { SourceEntry, ConversionOutput, ConversionContext, ConversionStage, ConversionStageListener, ConversionTarget, ParsedPlugin, PreparedRewriteDeclaration, SourceScriptRecord, RewriteDependencyRecord, FetchOptions, SurgeArgumentTable, RewritePlan, RewriteLinePlan, RewritePlannerOptions, RewriteAst, SourceAction, LegacyRewriteIr, SourceSectionItem } from "../domain/contracts.ts";
import {
  surgeRegexParameter,
  normalizeUrlRegexForTarget,
} from "../domain/core.ts";
import { renderRewritePhaseDispatcher } from "./runtime.ts";
import {
  splitScriptPipelineSources,
  scriptIrTag,
  parseScriptDeclaration,
  isScriptV2,
  planQxScript,
  planSurgeScript,
  scriptOption,
  analyzePluginArgumentUsage,
  rewriteV2PluginArgumentRefs,
  surgeArgumentMetadata,
  surgeRewriteArgumentPayload,
} from "../parser/script.ts";
import { qxRule as canonicalQxRule, surgeModuleRule } from "../parser/rule.ts";
import {
  repairUpstreamJq,
  unquoteRewriteToken,
  isRewriteV2,
  selectRewritePipelineLayer,
  rewriteV2ToSource,
  validateRewriteV2Ast,
  classifyLegacyRewriteAction,
  isEmptyJsonJqIr,
  legacyRewriteToSemanticIr,
  rewriteV2AstToSemanticIr,
  inlineResolvedDependency,
  inlineResolvedLegacyJqPathIr,
  jqDependencySpecFromAction,
  legacyJqPathDependencySpecFromIr,
  planQxRewrite,
  planSurgeRewrite,
  quoteJq,
  rewriteReview,
  rewriteIssue,
  supportsRewritePhaseActions,
  planRewriteFeatureHelper,
  simpleUrlRewriteCondition,
  jsonPipelineToSafeNativeJq,
} from "../parser/rewrite.ts";
import {
  groupSourceSectionItems,
  cleanSourceComments,
  isSupportedSourceSection,
  parseLoonPlugin,
  materializeRewriteDependencies,
  materializeSourceScripts,
  fetchOriginalText,
  fetchOriginalBytes,
  prepareRewriteDeclarations,
  preparedRewriteAst,
} from "../parser/input.ts";
import {
  attachQxInlineNote,
  createQxOutputState,
  appendQxOutput,
  qxOutputDestination,
  qxRuleOutputDestination,
  qxRewriteOutputDestination,
  renderQxOutput,
  createSurgeOutputState,
  appendSurgeOutput,
  surgeOutputDestination,
  surgeRuleOutputDestination,
  surgeRewriteOutputDestination,
  renderSurgeOutput,
  validateQX,
  validateSurgeModule,
} from "../validation/output.ts";
import {
  parseConfigurationDeclaration,
  planConfiguration,
} from "../parser/configuration.ts";

// Pure Loon → Quantumult X / Surge conversion pipeline
// Author: chance
// Category: Converter / Pipeline
function splitPatternAction(line: string): [string, string] {
  const idx = line.search(/\s/);
  if (idx < 0) return [line.trim(), ""];
  return [
    line.slice(0, idx).trim(),
    line
      .slice(idx)
      .trim()
      .replace(/^\-\s+/, ""),
  ];
}
function splitRuleInlineComment(line: unknown) {
  const source = String(line ?? "").trim();
  const match = source.match(/^([\s\S]*?\S)\s+\/\/\s*(.+)$/);
  if (!match) return { line: source, comment: null };
  return {
    line: match[1].trim(),
    comment: "# " + match[2].trim(),
  };
}
function rewriteErrorResult(line: string, error: { message?: unknown; code?: string } | null | undefined): RewritePlan {
  const reason = String(error?.message || error).split("\n")[0];
  if (error instanceof SyntaxError)
    return rewriteIssue(line, "unknown-rewrite-v2-syntax", reason);
  if (
    error?.code === "WAYX_REWRITE_V2_ACTION_INVALID" &&
    /not present in the current official Loon Rewrite v2 registry/i.test(reason)
  ) {
    return rewriteIssue(line, "unknown-rewrite-v2-action", reason);
  }
  if (
    error?.code === "WAYX_REWRITE_V2_CONDITION_INVALID" &&
    /unsupported|unknown|must be a variable/i.test(reason)
  ) {
    return rewriteIssue(line, "unknown-rewrite-v2-condition", reason);
  }
  return rewriteReview(line, reason);
}
// Normalize file actions before both target planning and phase eligibility.
// A dependency is tied to its absolute source action index, never shared as
// the old single-action object across a multi-action declaration.
interface PlannerContext extends Omit<RewritePlannerOptions, "mockFiles" | "jqFiles" | "sourceUrl">, Pick<ConversionContext, "declarations" | "scriptMap" | "mockFiles" | "jqFiles" | "sourceUrl"> {
  upstreamRepairs: Map<string, { kind: string; original: string; sourceLine: string }>;
  id: string;
  generatedScripts: ConversionOutput["generatedScripts"];
  stamp: string;
  category: string;
  argumentIds: Set<string>;
  argumentTable: SurgeArgumentTable;
  rawBase: string;
  splitPipelineAction?: boolean;
  featureCompatibilityPhases?: Set<string>;
}
function correctedUpstreamJq(jq: unknown, line: string, ctx: PlannerContext) {
  const result = repairUpstreamJq(jq);
  if (result.changed)
    ctx.upstreamRepairs?.set(line + "\0" + result.original, {
      ...result,
      sourceLine: line,
    });
  return result;
}
function resolveRewriteJqDependencies(ast: RewriteAst, line: string, ctx: PlannerContext): RewriteAst {
  ast = selectRewritePipelineLayer(ast);
  const actions = ast.actions.map(
    (action, selectedIndex): SourceAction => {
      const index =
        ast.sourceActionIndices?.[selectedIndex] ?? selectedIndex;
      const spec: any = jqDependencySpecFromAction(action, {
        pluginSourceUrl: ctx.sourceUrl,
      });
      let resolved = action;
      if (spec) {
        const files = ctx.jqFiles?.get(line);
        if (files?.error && !files.byAction) throw new Error(files.error);
        const materialized = files?.byAction
          ? Object.prototype.hasOwnProperty.call(files.byAction, index)
            ? files.byAction[index]
            : null
          : (ast.sourceActionCount || ast.actions.length) === 1
            ? files
            : null;
        if (!materialized)
          throw new Error(
            "JQ dependency action " +
              index +
              " was not materialized during conversion",
          );
        if (materialized.error) throw new Error(materialized.error);
        if (
          typeof materialized.content !== "string" ||
          !materialized.content.trim()
        )
          throw new Error("JQ dependency resolved to empty content");
        resolved = inlineResolvedDependency(action, materialized.content, {
          pluginSourceUrl: ctx.sourceUrl,
        }).action;
      }
      const node = resolved.args?.[0];
      if (
        /^(?:request|response)\.json\.jq$/.test(resolved.name) &&
        ["string", "raw-string"].includes(node?.type)
      ) {
        const repairLine = ast.sourceActionCount
          ? rewriteV2ToSource({ ...ast, actions: [action] })
          : line;
        const repaired = correctedUpstreamJq((node as { value: string }).value, repairLine, ctx);
        if (repaired.changed)
          resolved = {
            ...resolved,
            args: [
              {
                type: "raw-string",
                value: repaired.jq,
                raw: "`" + repaired.jq.replace(/`/g, "``") + "`",
              },
              ...resolved.args.slice(1),
            ],
          };
      }
      return resolved;
    },
  );
  const result = { ...ast, actions };
  validateRewriteV2Ast(result);
  return result;
}
// Modified: 2026-11-20 (chance). Keep JSON actions within their source declaration.
function isJsonRewriteAction(action: SourceAction): boolean {
  return /^(?:request|response)\.json\.(?:add|delete|replace|jq|jq_file)$/.test(action.name);
}
function rewriteV2Action(line: string, target: ConversionTarget, ctx: PlannerContext): RewritePlan | null {
  if (!isRewriteV2(line)) return null;
  if (isScriptV2(line)) {
    const members = splitScriptPipelineSources(line);
    if (members.some((member: string) => /\bthen\s+(?:request|response)\.json\./.test(member)))
      return rewriteReview(line, "JSON/JQ and a source Script cannot be represented by one equivalent target rule");
    if (members.length > 1)
      return {
        section: "split",
        members: members.map((member) =>
          rewriteV2Action(member, target, {
            ...ctx,
            splitPipelineAction: true,
          })!,
        ),
      };
    try {
      const ir = parseScriptDeclaration(line)!,
        record = ctx.scriptMap?.get(ir.script.path);
      const plan: any = (target === "qx" ? planQxScript : planSurgeScript)(ir, {
        scriptUrl: record?.[target] || ir.script.path,
        sourceText: record?.source || "",
        name: sanitizeName(
          scriptIrTag(ir) ||
            "wayx_script_" +
              crypto
                .createHash("sha1")
                .update(ir.source)
                .digest("hex")
                .slice(0, 10),
        ),
        argumentIds: ctx.argumentIds,
        argumentTable: ctx.argumentTable,
      });
      if (!plan.ok) return rewriteReview(ir.source, plan.reason);
      if (plan.disabled || plan.omitted)
        return { section: "drop", reason: "script-disabled-or-omitted" };
      const notes: any = (plan.notes || []).map(
        (n: any) => "# [WayX] " + n,
      );
      return {
        section: target === "qx" ? plan.section || "rewrite" : "script",
        lines: [...notes, plan.line],
        line: plan.line,
      };
    } catch (error: any) {
      return rewriteErrorResult(line, error);
    }
  }
  let ast: RewriteAst;
  try {
    ast = preparedRewriteAst(ctx.declarations, line);
    if (ctx.splitPipelineAction && !ast.sourceActionCount)
      ast = { ...ast, sourceActionCount: 1, sourceActionIndices: [0] };
    validateRewriteV2Ast(ast);
  } catch (error: any) {
    return rewriteErrorResult(line, error);
  }
  const planner =
    target === "qx"
      ? planQxRewrite
      : target === "surge"
        ? planSurgeRewrite
        : null;
  if (!planner)
    return rewriteIssue(
      line,
      "unknown-rewrite-target",
      "unsupported Rewrite target planner: " + target,
    );
  const plan = (member: RewriteAst): RewritePlan => {
    const selectedLine = member === ast ? line : rewriteV2ToSource(member);
    try {
      const resolved = resolveRewriteJqDependencies(member, line, ctx);
      const sourceLine = ast.sourceActionCount
        ? rewriteV2ToSource(resolved)
        : line;
      const ir = rewriteV2AstToSemanticIr(resolved, {
        source: sourceLine,
      });
      if (isEmptyJsonJqIr(ir))
        return { section: "drop", reason: "empty-json-jq" };
      const refs: any = rewriteV2PluginArgumentRefs(
        resolved,
        ctx.argumentIds || [],
      ).all;
      if (!ast.sourceActionCount && resolved.actions.length > 1) {
        const helper = planRewriteFeatureHelper(resolved, target, {
          ...ctx,
          sourceLine,
          argumentRefs: refs,
        });
        if (helper?.ok) return helper;
        return {
          section: "comment",
          line:
            "# [WayX] OMITTED: action pipeline cannot be converted to a complex syntax script: " +
            (helper?.reason || "unsupported action combination") +
            "\n# Source declaration: " +
            sourceLine,
        };
      }
      const native =
        simpleUrlRewriteCondition(resolved).ok &&
        jsonPipelineToSafeNativeJq(resolved).ok;
      const mock = ctx.mockFiles?.get(line);
      const projectedMock = mock?.byAction
        ? mock.byAction[member.sourceActionIndices?.[0] ?? 0]
        : mock;
      const mockFiles = new Map(ctx.mockFiles || []);
      if (projectedMock) mockFiles.set(sourceLine, projectedMock);
      return planner(ir, {
        ...ctx,
        mockFiles,
        sourceLine,
        argumentRefs: refs,
        ...(ast.sourceActionCount
          ? { featureCompatibilityPhases: new Set(native ? [ast.phase] : []) }
          : {}),
      });
    } catch (error: any) {
      return rewriteReview(
        selectedLine,
        String(error?.message || error).split("\n")[0],
      );
    }
  };
  const hasJson = ast.actions.some(isJsonRewriteAction);
  if (!ast.sourceActionCount || ast.actions.every(isJsonRewriteAction)) return plan(ast);
  if (hasJson) {
    try {
      const resolved = resolveRewriteJqDependencies(ast, line, ctx);
      const helper = planRewriteFeatureHelper(resolved, target, {
        ...ctx,
        sourceLine: line,
        argumentRefs: rewriteV2PluginArgumentRefs(resolved, ctx.argumentIds || []).all,
      });
      return helper?.ok
        ? helper
        : rewriteReview(line, helper?.reason || "JSON/JQ pipeline requires one equivalent target rule");
    } catch (error: any) {
      return rewriteReview(line, String(error?.message || error).split("\n")[0]);
    }
  }
  const members: RewriteAst[] = [];
  for (let index = 0; index < ast.actions.length; index++) {
    const action = ast.actions[index];
    members.push({
      ...ast,
      actions: [action],
      sourceActionIndices: [ast.sourceActionIndices![index]],
    });
  }
  return {section: "split", members: members.map(plan)};
}
function planDisabledSurgeRewriteComments(comments: string[], ctx: PlannerContext) {
  const passthrough: string[] = [];
  const routed: { section: string; lines: string[] }[] = [];
  for (const raw of comments || []) {
    const trimmed = String(raw ?? "").trim();
    const match = trimmed.match(
      /^#\s*((?:request|response)\s+if\b[\s\S]+)$/,
    );
    if (!match || !isRewriteV2(match[1])) {
      passthrough.push(raw);
      continue;
    }
    const sourceLine = match[1].trim();
    const mapped = rewriteV2Action(sourceLine, "surge", {
      ...ctx,
      featureCompatibilityPhases: new Set(["request", "response"]),
    });
    if (!mapped || mapped.section === "comment") {
      passthrough.push(raw);
      continue;
    }
    if (mapped.section === "drop") continue;
    for (const member of mapped.members || [mapped]) {
      if (member.section === "drop") continue;
      const lines = member.lines || [member.line];
      routed.push({
        section: member.section,
        lines: [raw, ...lines.map((line) => "# " + line)],
      });
    }
  }
  return { passthrough, routed };
}
function prepareRewriteDispatchers(plugin: ParsedPlugin, target: ConversionTarget, ctx: PlannerContext): Map<number, RewritePlan> {
  const result = new Map<number, RewritePlan>();
  const items = groupSourceSectionItems(
    plugin.sections.get("Rewrite") || [],
  ).filter((x) => x.line) as (SourceSectionItem & { line: string })[];
  const candidates: { line: string; sourceIndex: number; ast: RewriteAst; mapped: RewriteLinePlan }[] = [];
  const scripts = [
    ...groupSourceSectionItems(plugin.sections.get("Script") || []),
    ...items.filter((x) => isScriptV2(x.line)),
  ].filter((x) => x.line) as (SourceSectionItem & { line: string })[];
  const legacy = items.some((x) => !isRewriteV2(x.line));
  // Keep native JSON/JQ declarations outside helper dispatchers. Original
  // Script/legacy owners also retain their existing phase contracts.
  const blockedV2 = new Set<string>();
  const jsonPhases = new Set<string>();
  for (const item of items)
    if (isRewriteV2(item.line) && !isScriptV2(item.line))
      try {
        const ast = resolveRewriteJqDependencies(
          preparedRewriteAst(ctx.declarations, item.line),
          item.line,
          ctx,
        );
        if (ast.actions.some(isJsonRewriteAction)) jsonPhases.add(ast.phase);
        const nativeJson =
          (ast.actions.length > 1 ||
            ast.actions[0]?.args.some(
              (arg) => arg.type === "array",
            )) &&
          simpleUrlRewriteCondition(ast).ok &&
          jsonPipelineToSafeNativeJq(ast).ok;
        if (
          ast.sourceActionCount ||
          nativeJson ||
          ast.actions.every(
            (a) => a.name === ast.phase + ".json.jq",
          ) ||
          !supportsRewritePhaseActions(ast, target)
        )
          blockedV2.add(ast.phase);
      } catch {
        /* Invalid declarations keep the ordinary diagnostic. */
      }
  ctx.featureCompatibilityPhases = new Set(
    ["request", "response"].filter(
      (phase) =>
        legacy ||
        blockedV2.has(phase) ||
        scripts.some((x) => {
          try {
            const ir: any = parseScriptDeclaration(x.line);
            return (
              ir?.phase === phase &&
              (target === "qx" ||
                !(scriptOption(ir, "enable")?.value === false))
            );
          } catch {
            return false;
          }
        }),
    ),
  );
  for (const item of items) {
    if (!isRewriteV2(item.line) || isScriptV2(item.line) || item.pipelineMember)
      continue;
    try {
      const ast = resolveRewriteJqDependencies(
        preparedRewriteAst(ctx.declarations, item.line),
        item.line,
        ctx,
      );
      validateRewriteV2Ast(ast);
      if (ast.actions.some(isJsonRewriteAction)) continue;
      const mapped = rewriteV2Action(item.line, target, ctx)!;
      if (mapped.section === "split") continue;
      if (mapped.section !== "comment" && mapped.section !== "drop")
        candidates.push({
          line: item.line,
          sourceIndex: item.sourceIndex,
          ast,
          mapped,
        });
    } catch {
      /* The ordinary planner preserves the parse diagnostic. */
    }
  }
  for (const phase of ["request", "response"]) {
    if (jsonPhases.has(phase)) continue;
    const group = candidates.filter(
      (x) => x.ast.phase === phase,
    );
    // A broad guarded helper must share one phase owner even when only one
    // source entry matches this phase. Include native mutations in its order.
    const helper = group.some((x) =>
      /script-(?:request|response)-(?:header|body)|type=http-/.test(
        x.mapped.line || "",
      ),
    );
    if (!helper) continue;
    const external = ctx.featureCompatibilityPhases.has(phase);
    // Loon disables the same-phase author Script when a Body Rewrite matches.
    // A narrow owner can preserve that relation without executing remote code.
    const bodyMatchers = group.map((item) =>
      simpleUrlRewriteCondition(item.ast, { target }),
    );
    const bodyOwner =
      external &&
      !legacy &&
      !blockedV2.has(phase) &&
      group.length > 0 &&
      bodyMatchers.every(
        (matcher: any): any => matcher.ok && !matcher.regex.flags,
      ) &&
      new Set(bodyMatchers.map((matcher: any): any => matcher.pattern)).size ===
        1 &&
      group.some((item) =>
        item.ast.actions.some((action) =>
          new RegExp(
            "^" + phase + "\\.(?:body\\.(?:replace|mock|mock_file)|json\\.)",
          ).test(action.name),
        ),
      );
    try {
      if ((external && !bodyOwner) || legacy)
        throw new Error(
          "phase dispatcher cannot compose original remote Script or legacy Rewrite contracts; original URLs are preserved",
        );
      if (group.length === 1 && !bodyOwner) continue;
      if (
        group.some((x) => !supportsRewritePhaseActions(x.ast, target))
      )
        throw new Error(
          "phase dispatcher cannot compose native JQ/echo/URL/binary actions without a verified runtime adapter",
        );
      const refs: string[] = [
        ...new Set(
          group.flatMap(
            (x) =>
              rewriteV2PluginArgumentRefs(x.ast, ctx.argumentIds || []).all,
          ),
        ),
      ];
      if (target === "qx" && refs.length)
        throw new Error(
          "phase dispatcher argument transport is not verified: " +
            refs.join(", "),
        );
      const payload: { ok: boolean; value?: string | null; reason?: string } = refs.length
        ? surgeRewriteArgumentPayload(refs, ctx.argumentTable)
        : { ok: true, value: null };
      if (!payload.ok) throw new Error(payload.reason);
      const plan: any = renderRewritePhaseDispatcher(
        group.map((x) => x.ast),
        {
          target,
          stamp: ctx.stamp,
          category: ctx.category,
          argumentTable: refs.length ? ctx.argumentTable : null,
          mockFiles: ctx.mockFiles,
          jqFiles: ctx.jqFiles,
        },
      );
      if (bodyOwner) plan.pattern = bodyMatchers[0].pattern;
      const key = crypto
        .createHash("sha1")
        .update(target + "\0" + group.map((x) => x.line).join("\n"))
        .digest("hex")
        .slice(0, 10);
      const filename = "phase_" + target + "_" + phase + "_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      const url = ctx.rawBase + "/Script/" + ctx.id + "/" + filename;
      const mapped: RewritePlan =
        target === "qx"
          ? {
              section: "rewrite",
              line: plan.pattern + " url " + plan.qxAction + " " + url,
            }
          : {
              section: "script",
              line:
                "wayx_phase_" +
                phase +
                "_" +
                key +
                " = type=" +
                plan.surgeType +
                ",pattern=" +
                surgeRegexParameter(plan.pattern) +
                ",script-path=" +
                url +
                (plan.requiresBody ? ",requires-body=true" : "") +
                (plan.fullHeaderMode ? ",full-header-mode=true" : "") +
                (payload.value ? ",argument=" + payload.value : ""),
            };
      group.forEach((item, index) =>
        result.set(
          item.sourceIndex,
          index === 0
            ? mapped
            : { section: "drop", reason: "phase-dispatcher-member" },
        ),
      );
    } catch (error: any) {
      for (const item of group) {
        // Preserve historical native contracts. A simple source URL prefilter
        // stays on the compatibility path; compound guards need a phase owner.
        if (
          /script-(?:request|response)-(?:header|body)|type=http-/.test(
            item.mapped.line || "",
          )
        ) {
          const ast = item.ast;
          // Modified: 2026-11-01 (chance). Preserve flags in retained Surge prefilters.
          const narrow: any = simpleUrlRewriteCondition(ast, { target });
          if (narrow.ok) {
            const pattern: any = narrow.pattern;
            const line: any =
              target === "qx"
                ? item.mapped.line!.replace(
                    /^(?:\^https\?:\/\/|\^) url /,
                    () => pattern + " url ",
                  )
                : item.mapped.line!.replace(
                    /pattern=(?:\^https\?:\/\/|\^),/,
                    () => "pattern=" + surgeRegexParameter(pattern) + ",",
                  );
            result.set(item.sourceIndex, {
              ...item.mapped,
              line:
                "# [WayX] COMPATIBILITY LIMITATION: " +
                error.message +
                "; retained source URL prefilter is not a source-flag equivalence proof.\n" +
                line,
            });
          } else
            result.set(
              item.sourceIndex,
              ast.actions.length > 1 && !ast.sourceActionCount
                ? {
                    section: "comment",
                    line:
                      "# [WayX] OMITTED: action pipeline cannot use a safe phase script: " +
                      error.message +
                      "\n# Source declaration: " +
                      item.line,
                  }
                : rewriteReview(item.line, error.message),
            );
        }
      }
    }
    // Discard replaced candidate helpers, keeping only artifacts referenced by
    // the final plan. The normal output builder handles other declarations.
    for (const item of group)
      if (
        result.has(item.sourceIndex) &&
        !(result.get(item.sourceIndex)!.line || "").includes(
          item.mapped.line?.split("/").pop()!,
        )
      ) {
        for (const [filename] of ctx.generatedScripts)
          if ((item.mapped.line || "").includes("/" + filename))
            ctx.generatedScripts.delete(filename);
      }
  }
  return result;
}
function sanitizeName(value: string | null | undefined): string {
  return (
    (value || "script")
      .replace(/[=,\r\n]/g, "_")
      .trim()
      .slice(0, 64) || "script"
  );
}
function anchoredUrlPrefix(pattern: string): string {
  // Alternation can bypass the prefix. Only compare mandatory literals.
  if (pattern.includes("|")) return "";
  const match = pattern.match(/^(?:\(\?i\))?\^((?:[a-zA-Z0-9_:/%=-]|\\[/.?+*(){}\[\]$^])+)(.*)$/);
  if (!match) return "";
  const prefix = match[1].replace(/\\(.)/g, "$1").toLowerCase();
  return /^[?*{]/.test(match[2]) ? prefix.slice(0, -1) : prefix;
}

type QxJqGroup = {
  index: number;
  pattern: string;
  prefix: string;
  note: string;
  rule: string;
  programs: string[];
};

function disjointQxJqUrls(a: string, b: string): boolean {
  const left = a.replace(/^\(\?i\)/, "");
  const right = b.replace(/^\(\?i\)/, "");
  // The prefix scanner supports optional schemes. Leave regex quoting,
  // nested character sets and inline mode changes to the client.
  const opaque = /\\Q|\[.*\[|\(\?(?!:)/;
  return !opaque.test(left) && !opaque.test(right) &&
    disjointUrls(left.toLowerCase(), right.toLowerCase());
}

// Group only generated QX rules after resolving each source dependency.
// A potentially overlapping rewrite is a barrier to moving a jq program.
function mergeQxJqRewrites(lines: string[], barriers: ReadonlySet<number>): string[] {
  const output: string[] = [];
  const pending = new Map<string, QxJqGroup>();
  const groups: QxJqGroup[] = [];
  for (const [index, line] of lines.entries()) {
    if (barriers.has(index)) pending.clear();
    const [, note = "", rule = line] = line.match(/^(\{#.*?#\}\s+)(.*)$/) ?? [];
    if (!rule.trim() || /^\s*[#;]/.test(rule)) {
      // Diagnostics carry a source declaration which did not produce a
      // rule. Keep its source position as a barrier, unlike author comments.
      if (/(?:^|\n)# Source declaration:/.test(rule)) pending.clear();
      output.push(line);
      continue;
    }
    const candidate = rule.match(/^(\S+ url jsonjq-(?:request|response)-body) '(.+)'$/);
    // Module declarations must stay at the top level, and stream/process
    // builtins can observe the difference between one invocation and two.
    const standalone = candidate && (
      /^\s*(?:module|import|include)\s*["{]/.test(candidate[2]) ||
      /(?<![\w.$])(?:input|inputs|input_filename|input_line_number|halt|halt_error)\b/.test(candidate[2])
    );
    const jq = standalone ? null : candidate;
    const key = jq?.[1];
    const pattern = rule.split(/\s/, 1)[0];
    const prefix = anchoredUrlPrefix(pattern);
    for (const [other, group] of pending) {
      if (other !== key && (!prefix || !group.prefix ||
          prefix.startsWith(group.prefix) || group.prefix.startsWith(prefix)) &&
          !disjointQxJqUrls(pattern, group.pattern))
        pending.delete(other);
    }
    const group = key ? pending.get(key) : undefined;
    if (jq && group) {
      group.programs.push(jq[2]);
      if (note) output.push("# " + note.trim().slice(2, -2).trim());
      continue;
    }
    if (jq) {
      const next = { index: output.length, pattern, prefix, note, rule: jq[1], programs: [jq[2]] };
      pending.set(jq[1], next);
      groups.push(next);
    }
    output.push(line);
  }
  for (const group of groups) {
    if (group.programs.length > 1)
      output[group.index] = group.note + group.rule + " '" +
        group.programs.map(program => "(" + program + ")").join(" | ") + "'";
  }
  return output;
}

interface ConversionOptions {
  parsed?: ParsedPlugin | null;
  scriptMap?: Map<string, SourceScriptRecord>;
  stamp?: string;
  mockFiles?: Map<string, RewriteDependencyRecord>;
  jqFiles?: Map<string, RewriteDependencyRecord>;
  rawBase?: string;
  declarations?: Map<string, PreparedRewriteDeclaration> | null;
  icons?: IconIndex | null;
}
export function convertPlugin(
  entry: SourceEntry,
  source: string,
  {
    parsed = null,
    scriptMap = new Map(),
    stamp,
    mockFiles = new Map(),
    jqFiles = new Map(),
    rawBase = "",
    declarations = null,
    icons = null,
  }: ConversionOptions = {},
): ConversionOutput {
  if (!stamp) throw new Error("convertPlugin requires a conversion stamp");
  const plugin = parsed ?? parseLoonPlugin(source);
  // Modified: 2026-10-25 (chance). Both targets consume one prepared source IR.
  declarations = new Map(declarations ?? prepareRewriteDeclarations(plugin));
  const sourceHeader = plugin.header;
  const qx = createQxOutputState();
  const qxJqBarriers = new Set<number>();
  const sg = createSurgeOutputState();
  for (const [sectionName, sectionLines] of plugin.sections) {
    if (isSupportedSourceSection(sectionName)) continue;
    const active: any = groupSourceSectionItems(sectionLines)
      .filter((item: any): any => item.line)
      .map((item: any): any => item.line);
    if (!active.length) continue;
    const reason =
      "# [WayX] ISSUE REQUIRED [unknown-source-section]: unsupported Loon source section [" +
      sectionName +
      "] is outside the current ad-block conversion grammar";
    for (const line of active) {
      appendQxOutput(qx, "notes", reason, "# Source declaration: " + line);
      appendSurgeOutput(sg, "notes", reason, "# Source declaration: " + line);
    }
  }
  const argumentAnalysis: any = analyzePluginArgumentUsage({
    argumentLines: plugin.sections.get("Argument") || [],
    rewriteLines: plugin.sections.get("Rewrite") || [],
    scriptLines: plugin.sections.get("Script") || [],
    ruleLines: plugin.sections.get("Rule") || [],
  });
  const argumentIds = new Set<string>(argumentAnalysis.declaredIds);
  const surgeArgumentPlan = surgeArgumentMetadata(
    plugin.sections.get("Argument") || [],
    {
      proxyPolicyBinding: argumentAnalysis.policyBindings.length > 0,
    },
  );
  const surgeArgumentTable = surgeArgumentPlan.table;
  const surgeProxyPolicyPlaceholder: any =
    surgeArgumentPlan.policyBinding?.placeholder || null;
  let surgeNeedsLineRequirement = false;
  const upstreamRepairs = new Map<string, { kind: string; original: string; sourceLine: string }>();
  const qctx: PlannerContext = {
    declarations,
    upstreamRepairs,
    scriptMap,
    id: entry.id,
    generatedScripts: qx.generatedScripts,
    sourceUrl: entry.source,
    stamp,
    category: entry.category,
    mockFiles,
    jqFiles,
    argumentIds,
    argumentTable: surgeArgumentTable,
    rawBase,
  };
  const sctx: PlannerContext = {
    declarations,
    upstreamRepairs,
    scriptMap,
    id: entry.id,
    generatedScripts: sg.generatedScripts,
    sourceUrl: entry.source,
    stamp,
    category: entry.category,
    mockFiles,
    jqFiles,
    argumentIds,
    argumentTable: surgeArgumentTable,
    rawBase,
  };
  if (argumentAnalysis.undeclaredRefs.length) {
    const refs = [
      ...new Set(
        argumentAnalysis.undeclaredRefs.map((ref: any): any => ref.id),
      ),
    ]
      .sort()
      .join(", ");
    appendQxOutput(
      qx,
      "notes",
      `# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`,
    );
    appendSurgeOutput(
      sg,
      "notes",
      `# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference(s): ${refs}`,
    );
  }
  if (argumentAnalysis.policyBindings.length) {
    appendQxOutput(
      qx,
      "notes",
      "# [WayX] Policy binding: source PROXY is preserved as literal QX policy name PROXY; a matching target policy must exist.",
    );
  }
  const generalSectionLines: any = plugin.sections.get("General") || [];
  for (const item of groupSourceSectionItems(generalSectionLines)) {
    const comments: any = cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx, "notes").push(...comments);
      surgeOutputDestination(sg, "general").push(...comments);
      continue;
    }
    const ir = parseConfigurationDeclaration(item.line, {
      section: "General",
    });
    const qr = planConfiguration(ir, "qx");
    const sr = planConfiguration(ir, "surge");
    appendQxOutput(qx, qr.section, ...comments, qr.line);
    appendSurgeOutput(sg, sr.section, ...comments, sr.line);
  }
  const ruleSectionLines: any = plugin.sections.get("Rule") || [];
  for (const item of groupSourceSectionItems(ruleSectionLines)) {
    if (!item.line) {
      const comments: any = cleanSourceComments(item.comments);
      qxOutputDestination(qx, "filter").push(...comments);
      surgeOutputDestination(sg, "rule").push(...comments);
      continue;
    }
    const inline: any = splitRuleInlineComment(item.line);
    const effectiveItem: any = inline.comment
      ? {
          ...item,
          line: inline.line,
          comments: [...item.comments, inline.comment],
        }
      : item;
    const comments: any = cleanSourceComments(effectiveItem.comments);
    const [misplacedPattern, misplacedAction] = splitPatternAction(inline.line);
    const misplacedOperation: any = misplacedAction
      ? classifyLegacyRewriteAction(misplacedAction)
      : null;
    if (misplacedOperation && misplacedOperation.kind !== "unknown") {
      const misplacedIr: any = legacyRewriteToSemanticIr(
        misplacedPattern,
        misplacedAction,
      );
      const qr: any = planQxRewrite(misplacedIr, {
        ...qctx,
        sourceLine: inline.line,
      });
      const sr: any = planSurgeRewrite(misplacedIr, {
        ...sctx,
        sourceLine: inline.line,
      });
      qxRewriteOutputDestination(qx, qr.section).push(
        ...comments,
        ...(qr.lines || [qr.line!]),
      );
      surgeRewriteOutputDestination(sg, sr.section).push(
        ...comments,
        ...(sr.lines || [sr.line!]),
      );
      continue;
    }
    if (
      !inline.line.includes(",") &&
      /^(?:\*\.)?(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/i.test(inline.line)
    ) {
      const note =
        "# [WayX] Known source limitation: bare hostname is not a documented Loon Rule declaration, so no target policy is inferred.";
      qxOutputDestination(qx, "filter").push(
        ...comments,
        note,
        "# Source declaration: " + inline.line,
      );
      surgeOutputDestination(sg, "rule").push(
        ...comments,
        note,
        "# Source declaration: " + inline.line,
      );
      continue;
    }
    const qr: any = canonicalQxRule(inline.line);
    const qxRendered: any = attachQxInlineNote({
      sectionLines: ruleSectionLines,
      item: effectiveItem,
      sectionKind: "rule",
      lines: [qr.line],
      eligible: qr.kind === "filter" || qr.kind === "rewrite",
    });
    const qxRuleDest: any = qxRuleOutputDestination(qx, qr.kind);
    if (qr.kind === "filter" || qr.kind === "rewrite")
      qxRuleDest.push(...qxRendered.comments, ...qxRendered.lines);
    else qxRuleDest.push(...comments, qr.line);
    const sr: any = surgeModuleRule(inline.line, {
      proxyPolicyPlaceholder: surgeProxyPolicyPlaceholder,
      matchingEnhancements: true,
    });
    surgeRuleOutputDestination(sg, sr.section).push(...comments, ...sr.lines);
  }
  const qxDispatchers = prepareRewriteDispatchers(plugin, "qx", qctx);
  const surgeDispatchers = prepareRewriteDispatchers(
    plugin,
    "surge",
    sctx,
  );
  const rewriteSectionLines: any = plugin.sections.get("Rewrite") || [];
  for (const item of groupSourceSectionItems(rewriteSectionLines)) {
    const comments: any = cleanSourceComments(item.comments);
    const surgeCommentPlan: any = planDisabledSurgeRewriteComments(
      item.comments,
      sctx,
    );
    const surgeComments: any = cleanSourceComments(
      surgeCommentPlan.passthrough,
    );
    for (const routed of surgeCommentPlan.routed) {
      (
        surgeOutputDestination(sg, routed.section) ||
        surgeOutputDestination(sg, "notes")
      ).push(...routed.lines);
    }
    if (!item.line) continue;
    let qr =
      qxDispatchers.get(item.sourceIndex) ||
      rewriteV2Action(
        item.line,
        "qx",
        item.pipelineMember ? { ...qctx, splitPipelineAction: true } : qctx,
      );
    let sr =
      surgeDispatchers.get(item.sourceIndex) ||
      rewriteV2Action(
        item.line,
        "surge",
        item.pipelineMember ? { ...sctx, splitPipelineAction: true } : sctx,
      );
    if (!qr || !sr) {
      const [pattern, action] = splitPatternAction(item.line);
      let ir: LegacyRewriteIr = declarations.get(item.line)?.ir
        ? structuredClone(declarations.get(item.line)!.ir!)
        : legacyRewriteToSemanticIr(pattern, action);
      if (isEmptyJsonJqIr(ir)) {
        qr = { section: "drop", reason: "empty-json-jq" };
        sr = { section: "drop", reason: "empty-json-jq" };
      }
      const jqSpec: any = legacyJqPathDependencySpecFromIr(ir, {
        pluginSourceUrl: entry.source,
      });
      if (jqSpec) {
        const materialized = jqFiles.get(item.line);
        if (!materialized || materialized.error) {
          const reason =
            materialized?.error ||
            "JQ dependency was not materialized during conversion";
          if (!qr) qr = rewriteReview(item.line, reason);
          if (!sr) sr = rewriteReview(item.line, reason);
        } else {
          ir = inlineResolvedLegacyJqPathIr(ir, materialized.content).ir;
        }
      }
      const operation = ir.operations?.[0];
      if (
        ir.operations?.length === 1 &&
        operation.kind === "json" &&
        operation.operation === "jq" &&
        !qr &&
        !sr
      ) {
        const repaired = correctedUpstreamJq(
          unquoteRewriteToken(operation.rest),
          item.line,
          qctx,
        );
        if (repaired.changed)
          ir = {
            ...ir,
            operations: [
              {
                ...operation,
                rest: repaired.jq,
                raw:
                  (operation.phase || ir.phase) +
                  "-body-json-jq " +
                  repaired.jq,
              },
            ],
            sourcePayload: {
              ...ir.sourcePayload,
              action:
                (operation.phase || ir.phase) + "-body-json-jq " + repaired.jq,
            },
          };
      }
      if (!qr) qr = planQxRewrite(ir, { ...qctx, sourceLine: item.line });
      if (!sr) sr = planSurgeRewrite(ir, { ...sctx, sourceLine: item.line });
    }
    const qmembers = qr.members || [qr],
      smembers = sr.members || [sr];
    for (const [index, qr] of qmembers.entries()) {
      const qdest: any = qxRewriteOutputDestination(qx, qr.section);
      if (qr.section === "comment") qxJqBarriers.add(qx.rewrite.length);
      if (qr.section === "drop") {
        qdest.push(...(index === 0 ? comments : []));
      } else if (qr.section === "rewrite") {
        const qxRendered: any = attachQxInlineNote({
          sectionLines: rewriteSectionLines,
          item: index === 0 ? item : { ...item, comments: [] },
          sectionKind: "rewrite",
          lines: qr.lines || [qr.line!],
          eligible: qr.qxInlineNoteEligible !== false,
        });
        qdest.push(...qxRendered.comments, ...qxRendered.lines);
      } else {
        qdest.push(
          ...(index === 0 ? comments : []),
          ...(qr.lines || [qr.line!]),
        );
      }
    }
    for (const [index, sr] of smembers.entries()) {
      const sdest: any = surgeRewriteOutputDestination(sg, sr.section);
      if (sr.section === "drop")
        sdest.push(...(index === 0 ? surgeComments : []));
      else
        sdest.push(
          ...(index === 0 ? surgeComments : []),
          ...(sr.lines || [sr.line!]),
        );
    }
  }
  const scriptSectionLines: any = plugin.sections.get("Script") || [];
  let scriptIndex = 0;
  for (const item of groupSourceSectionItems(scriptSectionLines)) {
    const comments: any = cleanSourceComments(item.comments);
    if (!item.line) continue;
    if (isRewriteV2(item.line) && (!isScriptV2(item.line) || item.atomicJsonPipeline)) {
      for (const target of ["qx", "surge"] as ConversionTarget[]) {
        const ctx = target === "qx" ? qctx : sctx;
        const result = rewriteV2Action(
          item.line,
          target,
          item.pipelineMember ? { ...ctx, splitPipelineAction: true } : ctx,
        );
        for (const member of result?.members || [result]) {
          if (!member) continue;
          if (target === "qx" && member.section === "comment")
            qxJqBarriers.add(qx.rewrite.length);
          const dest: any =
            target === "qx"
              ? qxRewriteOutputDestination(qx, member.section)
              : surgeRewriteOutputDestination(sg, member.section);
          dest.push(
            ...comments,
            ...(member.lines || [member.line]).filter(Boolean),
          );
        }
      }
      continue;
    }
    let ir: any;
    const sourceSyntax = isScriptV2(item.line) ? "v2" : "legacy";
    try {
      ir = parseScriptDeclaration(item.line);
      if (!ir) {
        const note: any =
          "# [WayX] ISSUE REQUIRED [unknown-script-declaration]: unsupported source Script declaration is outside the registered grammar";
        appendQxOutput(
          qx,
          "notes",
          ...comments,
          note,
          `# Source declaration: ${item.line}`,
        );
        appendSurgeOutput(
          sg,
          "notes",
          ...comments,
          note,
          `# Source declaration: ${item.line}`,
        );
        continue;
      }
    } catch (error: any) {
      const reason = String(error?.message || error).split("\n")[0];
      const note = `# [WayX] ISSUE REQUIRED [unknown-script-v2-syntax]: source declaration parse failed: ${reason}`;
      appendQxOutput(
        qx,
        "notes",
        ...comments,
        note,
        `# Source declaration: ${item.line}`,
      );
      appendSurgeOutput(
        sg,
        "notes",
        ...comments,
        note,
        `# Source declaration: ${item.line}`,
      );
      continue;
    }
    scriptIndex++;
    const mapped: any = scriptMap.get(ir.script.path);
    const sourceText: any = mapped?.source || "";
    const qxUrl: any = mapped?.qx || ir.script.path;
    const surgeUrl: any = mapped?.surge || ir.script.path;
    const qxPlan: any = planQxScript(ir, {
      scriptUrl: qxUrl,
      sourceText,
      argumentIds,
      argumentTable: surgeArgumentTable,
    });
    const qxScriptDest: any = qxOutputDestination(
      qx,
      qxPlan.ok && qxPlan.section ? qxPlan.section : "rewrite",
    );
    if (!qxPlan.ok) {
      qxScriptDest.push(...comments);
      if (sourceSyntax === "legacy" && scriptIrTag(ir))
        qxScriptDest.push(`# ${scriptIrTag(ir)}`);
      qxScriptDest.push(
        `# [WayX] ${sourceSyntax === "v2" ? "SCRIPT V2" : "SCRIPT"} REVIEW REQUIRED: ${qxPlan.reason}`,
      );
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.omitted) {
      qxScriptDest.push(...comments);
      for (const note of qxPlan.notes || [])
        qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(
        `# [WayX] Known Quantumult X target limitation: ${qxPlan.reason}`,
      );
      qxScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (qxPlan.disabled) {
      qxScriptDest.push(...comments);
      if (sourceSyntax === "legacy" && scriptIrTag(ir))
        qxScriptDest.push(`# ${scriptIrTag(ir)}`);
      qxScriptDest.push(
        `# [WayX] Script disabled by source ${sourceSyntax === "v2" ? "option" : "declaration"}: ${item.line}`,
      );
    } else if (qxPlan.section === "task") {
      qxScriptDest.push(...comments);
      for (const note of qxPlan.notes || [])
        qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(qxPlan.line);
    } else {
      const qxRendered: any = attachQxInlineNote({
        sectionLines: scriptSectionLines,
        item,
        sectionKind: "script",
        lines: [qxPlan.line],
      });
      qxScriptDest.push(...qxRendered.comments);
      if (qxPlan.tag) qxScriptDest.push(`# ${qxPlan.tag}`);
      for (const note of qxPlan.notes || [])
        qxScriptDest.push(`# [WayX] ${note}`);
      qxScriptDest.push(...qxRendered.lines);
    }
    const sourceTag: any = scriptIrTag(ir);
    const name: any = sanitizeName(
      sourceTag || `${entry.id}_${String(scriptIndex).padStart(2, "0")}`,
    );
    const surgePlan: any = planSurgeScript(ir, {
      scriptUrl: surgeUrl,
      name,
      argumentIds,
      argumentTable: surgeArgumentTable,
    });
    const surgeScriptDest: any = surgeOutputDestination(sg, "script");
    surgeScriptDest.push(...comments);
    if (!surgePlan.ok) {
      surgeScriptDest.push(
        `# [WayX] ${sourceSyntax === "v2" ? "SCRIPT V2" : "SCRIPT"} REVIEW REQUIRED: ${surgePlan.reason}`,
      );
      surgeScriptDest.push(`# Source declaration: ${item.line}`);
    } else if (surgePlan.disabled) {
      surgeScriptDest.push(
        `# [WayX] Script disabled by source ${sourceSyntax === "v2" ? "option" : "declaration"}: ${item.line}`,
      );
    } else {
      if (surgePlan.usesLineRequirement) surgeNeedsLineRequirement = true;
      surgeScriptDest.push(surgePlan.line);
    }
  }
  const mitmLines: any = [...plugin.sections]
    .filter(([name]: any) => name === "MitM" || name === "MITM")
    .flatMap(([, lines]: any): any => lines);
  for (const item of groupSourceSectionItems(mitmLines)) {
    const comments: any = cleanSourceComments(item.comments);
    if (!item.line) {
      qxOutputDestination(qx, "mitm").push(...comments);
      surgeOutputDestination(sg, "mitm").push(...comments);
      continue;
    }
    const ir = parseConfigurationDeclaration(item.line);
    const qPlan = planConfiguration(ir, "qx");
    const sPlan = planConfiguration(ir, "surge");
    qxOutputDestination(qx, "mitm").push(...comments, qPlan.line);
    surgeOutputDestination(sg, "mitm").push(...comments, sPlan.line);
  }
  for (const repair of upstreamRepairs.values()) {
    const notes = [
      "# [WayX] 上游错误 / UPSTREAM ERROR CORRECTED [" +
        repair.kind +
        "]: inserted missing whitespace; original failed jq compilation, corrected program compiled successfully.",
      "# Original upstream jq: " + repair.original.replace(/\r?\n/g, " "),
      "# Source declaration: " + repair.sourceLine,
    ];
    appendQxOutput(qx, "notes", ...notes);
    appendSurgeOutput(sg, "notes", ...notes);
  }
  // Modified: 2026-11-14 (chance). Emit native inline JQ only; no standalone
  // jq outputs or misleading file-link metadata. Keep author comments/icons.
  return {
    qx: compactGeneratedPluginComments(
      addAppIcon(
        renderQxOutput({
          state: { ...qx, rewrite: mergeQxJqRewrites(qx.rewrite, qxJqBarriers) },
          headerLines: sourceHeader,
          entry,
          stamp,
        }),
        icons,
        [entry.id],
      ).text,
      source,
    ),
    surge: compactGeneratedPluginComments(
      addAppIcon(
        renderSurgeOutput({
          state: sg,
          headerLines: sourceHeader,
          entry,
          stamp,
          argumentMetadata: surgeArgumentPlan.lines,
          needsLineRequirement: surgeNeedsLineRequirement,
        }),
        icons,
        [entry.id],
      ).text,
      source,
    ),
    generatedScripts: new Map([...qx.generatedScripts, ...sg.generatedScripts]),
  };
}

// Shared workflow-facing conversion execution primitives.
// Author: chance
// Category: Converter / Execution / Validation
function notify(onStage: ConversionStageListener | null, stage: ConversionStage) {
  if (typeof onStage === "function") onStage(stage);
}
// Modified: 2026-10-25 (chance). Acquisition prepares a source-bound context;
// conversion consumes it synchronously and never performs network I/O.
interface MaterializeOptions {
  fetchText?: (url: string) => Promise<string>;
  fetchBytes?: (url: string, options: FetchOptions) => Promise<Uint8Array>;
  resources?: ReturnType<typeof createResourceSnapshot> | null;
}
export async function materializeConversionContext(
  entry: SourceEntry,
  source: string,
  {
    fetchText = fetchOriginalText,
    fetchBytes = fetchOriginalBytes,
    resources = null,
  }: MaterializeOptions = {},
): Promise<ConversionContext> {
  const snapshot =
    resources ??
    createResourceSnapshot({
      directory: path.join(
        process.cwd(),
        ".github/monitor/.runtime/resources",
        crypto.randomUUID(),
      ),
      fetchText: fetchText === fetchOriginalText ? null : fetchText,
      fetchBytes,
    });
  const parsed = parseLoonPlugin(source);
  const declarations = prepareRewriteDeclarations(parsed);
  const reads = {
    fetchText: snapshot.fetchText,
    fetchBytes: snapshot.fetchBytes,
    cachedBytes: snapshot.cachedBytes,
    declarations,
  };
  try {
    const [{ mockFiles, jqFiles }, scriptMap] = await Promise.all([
      materializeRewriteDependencies(entry, parsed, reads),
      materializeSourceScripts(source, entry.source, {
        parsed,
        fetchText: snapshot.fetchText,
      }),
    ]);
    return {
      parsed,
      declarations,
      scriptMap,
      mockFiles,
      jqFiles,
      sourceUrl: entry.source,
      sourceDigest: crypto.createHash("sha256").update(source).digest("hex"),
    };
  } finally {
    if (!resources) await snapshot.seal();
  }
}
export async function materializeConversionRunContext(
  entry: SourceEntry,
  source: string,
  { onStage = null, ...options }: MaterializeOptions & { onStage?: ConversionStageListener | null } = {},
): Promise<ConversionContext> {
  if (typeof onStage === "function") onStage("materialize-context");
  return await materializeConversionContext(entry, source, options);
}
interface RunConversionOptions {
  stamp?: string;
  rawBase?: string;
  onStage?: ConversionStageListener | null;
  icons?: IconIndex | null;
  backupIndex?: { bindings?: Record<string, Record<string, { path: string }>>; objects?: Record<string, { kind: string; path: string }>; latest?: Record<string, string> } | null;
}
export function convertPluginWithContext(
  entry: SourceEntry,
  source: string,
  context: ConversionContext,
  {
    stamp = "",
    rawBase = "",
    onStage = null,
    icons = null,
    backupIndex = null,
  }: RunConversionOptions = {},
): ConversionOutput {
  if (!context || typeof context !== "object") {
    throw new TypeError(
      "convertPluginWithContext requires a materialized conversion context",
    );
  }
  if (
    context.sourceDigest &&
    (context.sourceUrl !== entry.source ||
      context.sourceDigest !==
        crypto.createHash("sha256").update(source).digest("hex"))
  ) {
    throw new Error("Prepared conversion context does not match source");
  }
  notify(onStage, "convert");
  const out = convertPlugin(entry, source, {
    icons,
    parsed: context.parsed,
    declarations: context.declarations,
    scriptMap: context.scriptMap,
    stamp,
    mockFiles: context.mockFiles,
    jqFiles: context.jqFiles,
    rawBase,
  });
  // Modified: 2026-11-01 (chance). Bind verified established backup paths at emission; the shared backup pass handles newly discovered URLs.
  if (backupIndex)
    for (const target of ["qx", "surge"] as ConversionTarget[])
      out[target] = bindKnownBackups(
        out[target],
        backupIndex,
        rawBase,
        target === "qx"
          ? "Adblock/Quantumult X/" + entry.qx
          : "Adblock/Surge/" + entry.surge,
      );
  return out;
}
export function validateConvertedPlugin(
  entry: Pick<SourceEntry, "id">,
  out: ConversionOutput,
  { surgeValidationOptions = undefined, onStage = null }: { surgeValidationOptions?: { uniqueScripts?: boolean; adblockScope?: boolean }; onStage?: ConversionStageListener | null } = {},
): ConversionOutput {
  if (!out || typeof out !== "object") {
    throw new TypeError("validateConvertedPlugin requires converted output");
  }
  notify(onStage, "validate-qx");
  validateQX(out.qx, entry);
  notify(onStage, "validate-surge");
  if (surgeValidationOptions === undefined)
    validateSurgeModule(out.surge, entry);
  else validateSurgeModule(out.surge, entry);
  return out;
}
// Modified: 2026-10-29 (chance). Native QX -> Surge lowering preserves source
// policies/programs and original Script URLs; unsupported semantics stay diagnosed.
export function convertNativeQxToSurge(
  text: string,
  { id = "native_qx" }: { id?: string } = {},
): { surge: string; diagnostics: { source: string; reason: string }[] } {
  // Modified: 2026-11-02 (chance). Apply the authorized remote-script echo repair for standalone native conversion too.
  text = repairScriptEchoDeclarations(String(text)).text;
  validateQX(text, { id });
  const name = text.match(/^# Name: (.*)$/m)?.[1] || id;
  const sections: Record<string, string[]> = {
      Rule: [],
      "URL Rewrite": [],
      "Map Local": [],
      "Body Rewrite": [],
      "Header Rewrite": [],
      Script: [],
      MITM: [],
    },
    diagnostics: { source: string; reason: string }[] = [];
  const issue = (line: string, reason: string) => {
    diagnostics.push({ source: line, reason });
    sections.Rule.push(
      "# [WayX] REVIEW REQUIRED: " + reason,
      "# Source declaration: " + line,
    );
  };
  const types: Record<string, string> = {
    host: "DOMAIN",
    "host-suffix": "DOMAIN-SUFFIX",
    "host-keyword": "DOMAIN-KEYWORD",
    "host-wildcard": "DOMAIN-WILDCARD",
    "ip-cidr": "IP-CIDR",
    "ip6-cidr": "IP-CIDR6",
    "ip-asn": "IP-ASN",
    geoip: "GEOIP",
    "user-agent": "USER-AGENT",
  };
  // Modified: 2026-10-30 (chance). Preserve icon links in declaration comments.
  const iconMetadata: string[] = [];
  let scriptIndex = 0;
  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line) continue;
    // Modified: 2026-11-01 (chance). Preserve native author comments when lowering the separately checked QX input.
    if (/^(?:#|;|\/\/)/.test(line)) {
      if (/^# Icon(?: Collection)?:/.test(line)) {
        iconMetadata.push(raw);
        continue;
      }
      if (!/^# \[(?:filter_local|rewrite_local|mitm)\]$/.test(line))
        sections.Rule.push(line);
      continue;
    }
    if (/^hostname\s*=/.test(line)) {
      sections.MITM.push(
        line.replace(/^hostname\s*=\s*/, "hostname = %APPEND% "),
      );
      continue;
    }
    const rule: any = line.match(/^([^,]+),\s*([^,]+),\s*([^,]+)(.*)$/);
    if (rule && types[rule[1].toLowerCase()]) {
      const plan: any = surgeModuleRule(
        types[rule[1].toLowerCase()] + "," + rule[2] + "," + rule[3] + rule[4],
        { preMatching: false, proxyPolicyPlaceholder: "{{{PROXY}}}" },
      );
      if (plan.kind === "comment") {
        issue(line, "No verified routing equivalent");
        continue;
      }
      sections[plan.section === "map" ? "Map Local" : "Rule"].push(
        ...plan.lines,
      );
      continue;
    }
    // Modified: 2026-10-26 (chance). Direct native-QX conversion shares
    // the same host-separator policy as merged QX and Loon outputs.
    line = line.replace(/^(\S+)/, normalizeUrlRegexForTarget);
    if (/\surl-and-header\s/.test(line)) {
      issue(
        line,
        "URL-and-header conjunction retained for review; dropping the header condition would broaden matching",
      );
      continue;
    }
    const match: any = line.match(/^(\S+)\s+url\s+(.+)$/);
    if (!match) {
      issue(line, "Unrecognized QX declaration");
      continue;
    }
    const [, pattern, action] = match;
    // User-authorized QX reject -> Surge reject; QX dynamic delay is not preserved.
    if (action === "reject") {
      sections["URL Rewrite"].push(pattern + " _ reject");
      continue;
    }
    // Modified: 2026-11-01 (chance). QX reject-img returns HTTP 200/1px GIF; use the existing Surge inline mock semantics, not a rejecting policy.
    if (action === "reject-img") {
      sections["Map Local"].push(
        pattern + " data-type=tiny-gif status-code=200",
      );
      continue;
    }
    if (["reject-200", "reject-dict", "reject-array"].includes(action)) {
      const body =
        action === "reject-dict" ? "{}" : action === "reject-array" ? "[]" : "";
      sections["Map Local"].push(
        pattern +
          " data-type=text data=" +
          JSON.stringify(body) +
          " status-code=200" +
          (body ? ' header="Content-Type:application/json"' : ""),
      );
      continue;
    }
    const redirect: any = action.match(/^(302|307)\s+(\S+)$/);
    if (redirect) {
      sections["URL Rewrite"].push(
        pattern + " " + redirect[2] + " " + redirect[1],
      );
      continue;
    }
    const jq: any = action.match(/^jsonjq-(request|response)-body\s+'(.*)'$/);
    if (jq) {
      sections["Body Rewrite"].push(
        "http-" + jq[1] + "-jq " + pattern + " " + quoteJq(jq[2]),
      );
      continue;
    }
    const body: any = action.match(
      /^(request|response)-body\s+(.+?)\s+\1-body\s+(.*)$/,
    );
    if (body) {
      sections["Body Rewrite"].push(
        // Modified: 2026-11-01 (chance). Split at the repeated QX action delimiter; quote whole Surge tokens so spaces, quotes and backslashes stay literal.
        "http-" +
          body[1] +
          " " +
          pattern +
          " " +
          (/\s|["\\]/.test(body[2]) ? JSON.stringify(body[2]) : body[2]) +
          " " +
          (/\s|["\\]/.test(body[3]) || !body[3]
            ? JSON.stringify(body[3])
            : body[3]),
      );
      continue;
    }
    // Modified: 2026-10-25 (chance). Lower a CRLF-bounded, single-field
    // replacement only; never treat a whole-header regex as a value regex.
    const headerAction: any = action.match(
      /^(request|response)-header\s+(\S+)\s+\1-header\s+(.*)$/,
    );
    if (headerAction) {
      const field: any = headerAction[2].match(
        /^\(\\r\\n\)([A-Za-z0-9-]+):\.\+\(\\r\\n\)$/,
      );
      const replacement: any =
        field && headerAction[3].match(/^\$1([A-Za-z0-9-]+): ([^\r\n$]*)\$2$/);
      if (
        field &&
        replacement &&
        field[1] === replacement[1] &&
        !/^(?:Content-Length|Transfer-Encoding)$/i.test(field[1])
      ) {
        sections["Header Rewrite"].push(
          "http-" +
            headerAction[1] +
            " " +
            pattern +
            " header-replace " +
            field[1] +
            " " +
            replacement[2],
        );
        continue;
      }
      issue(
        line,
        "Whole-header replacement is outside the supported CRLF-bounded single-field form",
      );
      continue;
    }
    const script: any = action.match(
      /^script-((?:request|response)-(?:body|header)|(?:analyze-)?echo-response)\s+(https?:\/\/\S+)$/,
    );
    if (script) {
      // Modified: 2026-10-29 (chance). User requires original native Script
      // declarations for echo too, keeping original author URLs without API scans.
      // QX analyze-echo waits for the request body; ordinary echo does not.
      const modes: Record<string, [string, boolean]> = {
        "request-header": ["request", false],
        "request-body": ["request", true],
        "response-header": ["response", false],
        "response-body": ["response", true],
        "echo-response": ["request", false],
        "analyze-echo-response": ["request", true],
      };
      const [phase, requiresBody] = modes[script[1]];
      sections.Script.push(
        id +
          "_" +
          ++scriptIndex +
          " = type=http-" +
          phase +
          ",pattern=" +
          surgeRegexParameter(pattern) +
          ",script-path=" +
          surgeRegexParameter(script[2]) +
          ",requires-body=" +
          requiresBody,
      );
      continue;
    }
    issue(
      line,
      "No verified equivalent for QX action: " + action.split(/\s/)[0],
    );
  }
  const header = [
    ...(sections.Rule.some((line: any): any => line.includes("{{{PROXY}}}"))
      ? [
          "#!arguments=PROXY:PROXY",
          "#!arguments-desc=PROXY:Upstream proxy policy group",
        ]
      : []),
    "#!name=" + name,
    ...iconMetadata,
    "#!desc=Native QX conversion" +
      (diagnostics.length
        ? " · " + diagnostics.length + " declarations require review"
        : ""),
    "#!category=WayX",
    "#!requirement=CORE_VERSION>=20",
    "# Native QX review count: " + diagnostics.length,
  ];
  const out =
    header.join("\n") +
    "\n\n" +
    Object.entries(sections)
      .filter(([, lines]: any): any => lines.length)
      .map(
        ([section, lines]: any) =>
          "[" + section + "]\n" + lines.join("\n"),
      )
      .join("\n\n") +
    "\n";
  validateSurgeModule(out, { id });
  return { surge: out, diagnostics };
}
