import type { ScriptSemanticIr, ScriptV2Ast, LegacyScriptAst, LegacyScriptIr, V2ScriptIr, ScriptPhase, ScriptTrigger, ScriptValue, ScriptArgument, ScriptOption, RewriteCondition, VariableNode, StringNode, Phase } from "../domain/contracts.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript parser layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Modified: 2026-10-26 (chance). Normalize literal URL host dots in target fields only.
// Category: Converter / script
import { splitTopLevelCsv } from "./rule.ts";
import {
  parseRewriteV2,
  selectRewritePipelineLayer,
  conditionToSource,
  valueToSource,
  isRewriteV2,
  simpleUrlRewriteCondition,
} from "./rewrite.ts";
import {
  scanSourceRegexLiteral,
  normalizeUrlRegexForTarget,
  surgeRegexParameter,
  stringTemplateParts,
} from "../domain/core.ts";

// Loon [Argument] parser and Surge module parameter conversion
// Author: chance
// Category: Converter / Argument / Surge Module
function unquote(s: any) {
  const v = String(s ?? "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    return v.slice(1, -1);
  return v;
}
export function parseLoonArguments(lines: any = []): any {
  const args: any = [];
  for (const raw of lines) {
    const line = String(raw).trim();
    if (!line || /^[#;\/]/.test(line)) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const id = line.slice(0, eq).trim();
    const tokens: any = splitTopLevelCsv(line.slice(eq + 1));
    const kind: any = (tokens.shift() || "").trim().toLowerCase();
    const values: string[] = [];
    const options: any = {};
    for (const token of tokens) {
      const m: any = token.match(/^([A-Za-z_][\w-]*)\s*=\s*(.*)$/s);
      if (m) options[m[1].toLowerCase()] = unquote(m[2]);
      else values.push(unquote(token));
    }
    const valueType =
      kind === "switch"
        ? "boolean"
        : String(options.type || "").toLowerCase() === "number"
          ? "number"
          : "string";
    const hasDefault = values.length > 0 || kind === "switch";
    args.push({
      id,
      kind,
      values,
      hasDefault,
      defaultValue: values[0] ?? (kind === "switch" ? "false" : undefined),
      valueType,
      tag: options.tag || id,
      desc: options.desc || "",
      options,
      raw: line,
    });
  }
  return args;
}
function surgeArgumentName(id: any) {
  const raw = String(id || "");
  const safe = raw.replace(/[^A-Za-z0-9_]/g, "_");
  if (!safe || !/^[A-Za-z_]/.test(safe)) return "_" + safe;
  return safe;
}
function metadataDefaultValue(value: any, id: any) {
  const text = String(value ?? "");
  if (/[\r\n,]/.test(text)) {
    throw new Error(
      `Surge #!arguments default for ${id} contains an unsupported comma/newline delimiter`,
    );
  }
  return text;
}
export function buildSurgeArgumentTable(argumentLines: any = []): any {
  const declarations: any = parseLoonArguments(argumentLines);
  const usedNames: any = new Map();
  const entries: any = [];
  for (const declaration of declarations) {
    const surgeName: any = surgeArgumentName(declaration.id);
    const previous: any = usedNames.get(surgeName);
    if (previous && previous !== declaration.id) {
      throw new Error(
        `Surge argument name collision after normalization: ${previous}, ${declaration.id} -> ${surgeName}`,
      );
    }
    usedNames.set(surgeName, declaration.id);
    entries.push({
      ...declaration,
      surgeName,
      placeholder: `{{{${surgeName}}}}`,
    });
  }
  return {
    entries,
    byId: new Map(entries.map((entry: any): any => [entry.id, entry])),
  };
}
export function surgeArgumentMetadata(
  argumentLines: any = [],
  { proxyPolicyBinding = false }: any = {},
): any {
  const table: any = buildSurgeArgumentTable(argumentLines);
  const args: any = table.entries.map((entry: any): any => {
    if (!entry.hasDefault) return entry.surgeName;
    return `${entry.surgeName}:${metadataDefaultValue(entry.defaultValue, entry.id)}`;
  });
  const descriptions: any = table.entries.map((entry: any) => {
    const pieces: any = [entry.tag || entry.id];
    if (entry.kind === "select" && entry.values.length) {
      pieces.push("options=" + entry.values.join("|"));
    } else if (entry.kind === "switch") {
      pieces.push("true/false");
    }
    if (entry.desc) pieces.push(entry.desc);
    return `${entry.surgeName}: ${pieces.join(" — ")}`;
  });
  let policyBinding: any = null;
  if (proxyPolicyBinding) {
    const usedNames: any = new Set(
      table.entries.map((entry: any): any => entry.surgeName),
    );
    let surgeName = "wayx_proxy_policy";
    let suffix = 2;
    while (usedNames.has(surgeName))
      surgeName = `wayx_proxy_policy_${suffix++}`;
    // Bind a Rule policy through the official Module parameter mechanism,
    // default DIRECT, and let the user replace it with a proxy policy/group
    // without defining [Proxy] or [Proxy Group] inside the module.
    args.push(`${surgeName}:DIRECT`);
    descriptions.push(
      `${surgeName}: Loon PROXY policy binding — default DIRECT; set to the desired Surge proxy policy or policy group`,
    );
    policyBinding = {
      surgeName,
      placeholder: `{{{${surgeName}}}}`,
      defaultValue: "DIRECT",
    };
  }
  if (!args.length) return { table, lines: [], policyBinding };
  const lines = ["#!arguments=" + args.join(",")];
  if (descriptions.length)
    lines.push("#!arguments-desc=" + descriptions.join("\\n"));
  return { table, lines, policyBinding };
}
export function surgeArgumentPlaceholder(id: any, table: any): any {
  return table?.byId?.get(String(id))?.placeholder || null;
}
export function parseLegacyLoonPluginObjectRefs(source: any): any {
  const raw = String(source || "").trim();
  if (!raw) return null;
  const bracket = raw.match(/^\[([\s\S]*)\]$/);
  if (bracket) {
    const refs: any = [...bracket[1].matchAll(/\{([A-Za-z_][\w-]*)\}/g)].map(
      (match: any): any => match[1],
    );
    return refs.length ? refs : null;
  }
  const compact = raw.match(
    /^\{([A-Za-z_][\w-]*(?:\s*,\s*[A-Za-z_][\w-]*)*)\}$/,
  );
  if (compact)
    return compact[1].split(",").map((value: string) => value.trim());
  return null;
}
// 上游错误 / 转换失败案例：PluginObject is a nonempty, unique list of
// plugin identifiers, not arbitrary JS data or runtime/capture variables.
function validatePluginObjectRefs(refs: any) {
  if (!refs.length) throw new Error("plugin object argument cannot be empty");
  const seen: any = new Set();
  for (const id of refs) {
    if (
      typeof id !== "string" ||
      !/^[A-Za-z_][\w-]*$/.test(id) ||
      isBuiltInRuntimeVariable(id)
    )
      throw new Error(
        "plugin object argument requires plugin parameter identifiers: " + id,
      );
    if (seen.has(id))
      throw new Error("duplicate plugin object parameter: " + id);
    seen.add(id);
  }
}
function scriptObjectBindings(
  ast: any,
  { argumentIds = null, argumentTable = null }: any = {},
): any {
  const refs: any =
    ast.sourceSyntax === "legacy"
      ? parseLegacyLoonPluginObjectRefs(ast.argument)
      : ast.script?.argument?.type === "plugin-object"
        ? ast.script.argument.items.map((item: any): any => item.name)
        : null;
  if (refs === null) return { ok: true };
  try {
    validatePluginObjectRefs(refs);
  } catch (error: any) {
    return unsupported(error.message);
  }
  const declared: any =
    argumentIds ?? (argumentTable ? new Set(argumentTable.byId.keys()) : null);
  if (declared !== null) {
    const ids: any = declared instanceof Set ? declared : new Set(declared);
    const missing: any = refs.filter((id: any) => !ids.has(id));
    if (missing.length)
      return unsupported(
        "undeclared plugin [Argument] object reference(s): " +
          missing.join(", "),
      );
  }
  return { ok: true };
}
export function surgePluginObjectArgument(refs: any = [], table: any): any {
  try {
    validatePluginObjectRefs(refs);
  } catch (error: any) {
    return { ok: false, reason: error.message };
  }
  const fields: string[] = [];
  for (const id of refs) {
    const entry: any = table?.byId?.get(String(id));
    if (!entry)
      return { ok: false, reason: `undeclared Loon [Argument]: ${id}` };
    if (!entry.hasDefault) {
      return {
        ok: false,
        reason: `Loon [Argument] ${id} has no default; PluginObject missing-value null cannot be represented losslessly by Surge module substitution`,
      };
    }
    const key = JSON.stringify(entry.id);
    const placeholder: any = entry.placeholder;
    if (entry.valueType === "string") {
      fields.push(`${key}:${JSON.stringify(placeholder)}`);
    } else if (entry.valueType === "number" || entry.valueType === "boolean") {
      fields.push(`${key}:${placeholder}`);
    } else {
      return {
        ok: false,
        reason: `unsupported Loon [Argument] value type for ${id}: ${entry.valueType}`,
      };
    }
  }
  const jsonTemplate = "{" + fields.join(",") + "}";
  return { ok: true, value: JSON.stringify(jsonTemplate) };
}
export function surgeRewriteArgumentPayload(refs: any = [], table: any) {
  const unique: any = [...new Set(refs.map(String))];
  const fields: string[] = [];
  for (const id of unique) {
    const entry: any = table?.byId?.get(id);
    if (!entry)
      return { ok: false, reason: `undeclared Loon [Argument]: ${id}` };
    const key = JSON.stringify(entry.id);
    if (entry.valueType === "string") {
      fields.push(`${key}:${JSON.stringify(entry.placeholder)}`);
    } else if (entry.valueType === "number" || entry.valueType === "boolean") {
      fields.push(`${key}:${entry.placeholder}`);
    } else {
      return {
        ok: false,
        reason: `unsupported Loon [Argument] value type for ${id}: ${entry.valueType}`,
      };
    }
  }
  const template = "{" + fields.join(",") + "}";
  return { ok: true, value: JSON.stringify(template) };
}
export function surgeDynamicOptionValue(id: any, table: any): any {
  const entry: any = table?.byId?.get(String(id));
  if (!entry || !entry.hasDefault) return null;
  return entry.placeholder;
}
export function surgeEnableRequirement(id: any, table: any): any {
  const entry: any = table?.byId?.get(String(id));
  if (!entry || entry.valueType !== "boolean") return null;
  return `#!REQUIREMENT "'${entry.placeholder}'=='true'"`;
}

// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Script / Domain
// WayX Loon Script v2 parser / AST
// Author: chance
// Category: Converter / Script v2
function fail(source: string, message: string): never {
  const error = new SyntaxError(message + "\n" + source) as SyntaxError & { code: string };
  error.code = "WAYX_SCRIPT_V2_PARSE";
  throw error;
}
function decodeQuoted(raw: string): string {
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch {
      let out = "";
      for (let i = 1; i < raw.length - 1; i++) {
        const ch = raw[i];
        if (ch !== "\\") {
          out += ch;
          continue;
        }
        const next = raw[++i];
        if (next === "n") out += "\n";
        else if (next === "r") out += "\r";
        else if (next === "t") out += "\t";
        else if (next === '"' || next === "\\") out += next;
        else out += "\\" + next;
      }
      return out;
    }
  }
  if (raw.startsWith("'")) return raw.slice(1, -1);
  throw new Error("not quoted");
}
function scanState<T>(source: string, callback: (index: number) => T | undefined): T | undefined {
  let quote: string | null = null,
    raw = false,
    escape = false,
    variableDepth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === "`") {
        if (source[i + 1] === "`") {
          i++;
          continue;
        }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (variableDepth) {
      if (ch === "{") variableDepth++;
      else if (ch === "}") variableDepth--;
      continue;
    }
    if (ch === "$" && source[i + 1] === "{") {
      variableDepth = 1;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "`") {
      raw = true;
      continue;
    }
    if (ch === "/") {
      i = scanSourceRegexLiteral(source, i).end - 1;
      continue;
    }
    const stop = callback(i);
    if (stop !== undefined) return stop;
  }
  return undefined;
}
function findThenScript(source: string) {
  return scanState(source, (i) => {
    const rest = source.slice(i);
    const match = rest.match(/^\s+then\s+script\s*\(/);
    if (match)
      return {
        index: i,
        callOpen: i + match[0].lastIndexOf("("),
        matched: match[0],
      };
  });
}
function findClosingParen(source: string, openIndex: number): number {
  let depth = 1,
    quote: string | null = null,
    raw = false,
    escape = false,
    variableDepth = 0;
  for (let i = openIndex + 1; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === "`") {
        if (source[i + 1] === "`") {
          i++;
          continue;
        }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (variableDepth) {
      if (ch === "{") variableDepth++;
      else if (ch === "}") variableDepth--;
      continue;
    }
    if (ch === "$" && source[i + 1] === "{") {
      variableDepth = 1;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "`") {
      raw = true;
      continue;
    }
    if (ch === "(") depth++;
    else if (ch === ")" && --depth === 0) return i;
  }
  return -1;
}
function scriptSplitTopLevelCsv(source: string): string[] {
  const out: string[] = [];
  let start = 0,
    quote: string | null = null,
    raw = false,
    escape = false;
  let paren = 0,
    brace = 0,
    bracket = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (raw) {
      if (ch === "`") {
        if (source[i + 1] === "`") {
          i++;
          continue;
        }
        raw = false;
      }
      continue;
    }
    if (quote) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "`") {
      raw = true;
      continue;
    }
    if (ch === "(") paren++;
    else if (ch === ")") paren--;
    else if (ch === "{") brace++;
    else if (ch === "}") brace--;
    else if (ch === "[") bracket++;
    else if (ch === "]") bracket--;
    else if (ch === "," && !paren && !brace && !bracket) {
      out.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}
function parseValue(source: unknown): ScriptValue {
  const raw = String(source).trim();
  if (!raw) throw new Error("empty value");
  const variable = raw.match(/^\$\{([^}]+)\}$/);
  if (variable) return { type: "variable", name: variable[1], raw };
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return { type: "string", value: decodeQuoted(raw), raw };
  }
  if (raw.startsWith("`") && raw.endsWith("`")) {
    return {
      type: "raw-string",
      value: raw.slice(1, -1).replace(/``/g, "`"),
      raw,
    };
  }
  if (/^(true|false)$/.test(raw))
    return { type: "boolean", value: raw === "true", raw };
  if (raw === "null") return { type: "null", value: null, raw };
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))
    return { type: "number", value: Number(raw), raw };
  if (raw.startsWith("{") && raw.endsWith("}")) {
    const inner = raw.slice(1, -1).trim();
    const items = inner
      ? scriptSplitTopLevelCsv(inner).map(parseValue)
      : [];
    if (items.some((item) => item.type !== "variable")) {
      throw new Error(
        "plugin object argument may only contain plugin parameter variables",
      );
    }
    validatePluginObjectRefs((items as VariableNode[]).map((item) => item.name));
    return { type: "plugin-object", items, raw } as ScriptValue;
  }
  throw new Error("unsupported Script v2 value: " + raw);
}
const OPTION_FIELDS: Readonly<Record<string, string[]>> = Object.freeze({
  enable: ["boolean", "variable"],
  tag: ["string", "raw-string"],
  img_url: ["string", "raw-string"],
  timeout: ["number", "variable"],
  debug: ["boolean", "variable"],
  requires_body: ["boolean"],
  binary_body_mode: ["boolean"],
});
// 上游错误 / 转换失败案例：String type alone does not prove a fixed
// field. Preserve lexical template identity and decode escaped literals once.
function fixedScriptString(
  node: ScriptValue | null | undefined,
  label: string,
  { nonempty = false }: { nonempty?: boolean } = {},
): string {
  if (!node || !["string", "raw-string"].includes(node.type))
    throw new Error(label + " must be a fixed string");
  const parts: any = stringTemplateParts(node);
  if (parts.some(([kind]: any) => kind === "v"))
    throw new Error(label + " does not accept variables or string templates");
  const value: any = parts.map(([, text]: any): any => text).join("");
  if (nonempty && !value)
    throw new Error(label + " must be a fixed non-empty string");
  return value;
}
function validateOptions(options: ScriptOption<ScriptValue>[], phase: ScriptPhase) {
  const seen = new Set<string>();
  for (const option of options) {
    if (seen.has(option.name))
      throw new Error("duplicate Script v2 option: " + option.name);
    seen.add(option.name);
    const allowed = OPTION_FIELDS[option.name];
    if (!allowed) throw new Error("unknown Script v2 option: " + option.name);
    if (!allowed.includes(option.value.type))
      throw new Error(
        option.name + ": invalid value type " + option.value.type,
      );
    if (["tag", "img_url"].includes(option.name))
      (option.value as StringNode).value = fixedScriptString(option.value, option.name);
    if (
      option.name === "timeout" &&
      option.value.type === "number" &&
      (!Number.isFinite(option.value.value) || option.value.value <= 0)
    ) {
      throw new Error("timeout must be a finite positive number");
    }
  }
  if (
    !["request", "response"].includes(phase) &&
    options.some((x) =>
      ["requires_body", "binary_body_mode"].includes(x.name),
    )
  ) {
    throw new Error(
      "requires_body/binary_body_mode only apply to HTTP request/response scripts",
    );
  }
}
// Shared lexical splitting preserves regex alternation, raw/JQ strings and options.
export function splitScriptPipelineSources(source: unknown, {preserveJsonPipelines = false}: {preserveJsonPipelines?: boolean} = {}) {
  const text = String(source ?? "").trim();
  const found = scanState(text, (i) =>
    /^\s+then\s+/.test(text.slice(i))
      ? { index: i, length: text.slice(i).match(/^\s+then\s+/)![0].length }
      : undefined,
  );
  if (!found) return [text];
  const tail = text.slice(found.index + found.length),
    segments: string[] = [];
  let depth = 0,
    start = 0;
  scanState(tail, (i) => {
    if (tail[i] === "(" || tail[i] === "[") depth++;
    else if (tail[i] === ")" || tail[i] === "]") depth--;
    else if (
      tail[i] === "|" &&
      tail[i + 1] !== "|" &&
      tail[i - 1] !== "|" &&
      depth === 0
    ) {
      segments.push(tail.slice(start, i).trim());
      start = i + 1;
    }
  });
  segments.push(tail.slice(start).trim());
  if (segments.some((part) => !part))
    throw new Error("Empty action in source pipeline");
  // Modified: 2026-11-15 (chance). Keep consecutive JSON/JQ actions together
  // when projecting a mixed Script declaration for target conversion.
  const groups: string[] = [];
  let previousJson = false;
  for (const part of segments) {
    const json = /^(?:request|response)\.json\.(?:add|delete|replace|jq|jq_file)\s*\(/.test(part);
    if (preserveJsonPipelines && json && previousJson)
      groups[groups.length - 1] += " | " + part;
    else groups.push(part);
    previousJson = json;
  }
  return groups.map(
    (part: string) => text.slice(0, found.index) + " then " + part,
  );
}
export function selectScriptPipelineSource(source: unknown): string {
  const members = splitScriptPipelineSources(source);
  return (
    members.find((member) => /\bthen\s+script\s*\(/.test(member)) ||
    String(source ?? "").trim()
  );
}
export function isScriptV2(source: unknown) {
  const text = String(source ?? "").trim();
  if (
    !/^(?:(?:request|response)\s+if\b|cron\s+|network-changed\b|generic\b)/.test(
      text,
    ) ||
    !/\bscript\s*\(/.test(text)
  )
    return false;
  try {
    return Boolean(findThenScript(selectScriptPipelineSource(text)));
  } catch {
    return /\bthen\s+script\s*\(/.test(text);
  }
}
export function parseScriptV2(source: unknown): ScriptV2Ast {
  const raw = selectScriptPipelineSource(source);
  const found = findThenScript(raw);
  if (!found) fail(raw, 'Expected "then script(...)"');
  const triggerText = raw.slice(0, found.index).trim();
  let phase: ScriptPhase;
  let conditionAst: RewriteCondition | null = null;
  let trigger: ScriptTrigger | null = null;
  const http = triggerText.match(/^(request|response)\s+if\s+([\s\S]+)$/);
  if (http) {
    phase = http[1] as Phase;
    const conditionText = http[2].trim();
    if (!conditionText) fail(raw, "Missing Script v2 condition");
    conditionAst = parseRewriteV2(
      phase + " if " + conditionText + " then reject(200)",
    ).condition;
  } else if (/^cron\s+/.test(triggerText)) {
    phase = "cron";
    let expression: ScriptValue;
    try {
      expression = parseValue(triggerText.replace(/^cron\s+/, ""));
    } catch (error: any) {
      fail(raw, "Invalid Cron Script expression: " + error.message);
    }
    if (!["string", "raw-string", "variable"].includes(expression.type)) {
      fail(
        raw,
        "Cron Script expression must be a String/raw String or plugin variable",
      );
    }
    trigger = { type: "cron", expression, raw: triggerText };
  } else if (triggerText === "network-changed") {
    phase = "network-changed";
    trigger = { type: "event", name: "network-changed", raw: triggerText };
  } else if (triggerText === "generic") {
    phase = "generic";
    trigger = { type: "generic", raw: triggerText };
  } else {
    fail(raw, "Unsupported Script v2 trigger");
  }
  const close = findClosingParen(raw, found.callOpen);
  if (close < 0) fail(raw, "Unterminated script(...) call");
  const callArgs = scriptSplitTopLevelCsv(
    raw.slice(found.callOpen + 1, close),
  );
  if (callArgs.length < 1 || callArgs.length > 2)
    fail(raw, "script(...) expects path and optional argument");
  const pathValue = parseValue(callArgs[0]) as StringNode;
  try {
    pathValue.value = fixedScriptString(pathValue, "script path", {
      nonempty: true,
    });
  } catch (error: any) {
    fail(raw, error.message);
  }
  const argument = callArgs[1] ? parseValue(callArgs[1]) : null;
  if (
    argument &&
    !["string", "raw-string", "plugin-object"].includes(argument.type)
  ) {
    fail(raw, "script argument must be a String/raw String or plugin object");
  }
  const tail = raw.slice(close + 1).trim();
  const options: ScriptOption<ScriptValue>[] = [];
  if (tail) {
    if (!/^with\s+/.test(tail))
      fail(raw, "Unexpected content after script(...)");
    const optionText = tail.replace(/^with\s+/, "");
    for (const token of scriptSplitTopLevelCsv(optionText)) {
      const eq = token.indexOf("=");
      if (eq < 1) fail(raw, "Invalid Script v2 option: " + token);
      const name = token.slice(0, eq).trim();
      const value = parseValue(token.slice(eq + 1));
      options.push({ type: "option", name, value, raw: token });
    }
  }
  try {
    validateOptions(options, phase);
  } catch (error: any) {
    fail(raw, error.message);
  }
  return {
    type: "script",
    syntax: "loon-script-v2",
    phase,
    condition: conditionAst,
    trigger,
    script: { path: pathValue.value, pathNode: pathValue, argument },
    options,
    raw,
  } as ScriptV2Ast;
}
export function scriptOption(ast: Pick<ScriptV2Ast | V2ScriptIr, "options"> | null | undefined, name: string): ScriptValue | null {
  return (
    ast?.options?.find((option) => option.name === name)?.value ??
    null
  );
}
export function scriptOptionBoolean(
  ast: Pick<ScriptV2Ast | V2ScriptIr, "options"> | null | undefined,
  name: string,
  fallback: boolean = false,
): boolean {
  const value = scriptOption(ast, name);
  return value?.type === "boolean" ? value.value : fallback;
}
export function scriptV2ArgumentRefs(ast: Pick<ScriptV2Ast | V2ScriptIr, "script"> | null | undefined): string[] {
  const arg = ast?.script?.argument;
  if (!arg) return [];
  if (arg.type === "plugin-object")
    return arg.items.map((item) => item.name);
  return [];
}
export function scriptV2DynamicOptionRefs(ast: Pick<ScriptV2Ast | V2ScriptIr, "options"> | null | undefined): { option: string; id: string }[] {
  const out: { option: string; id: string }[] = [];
  for (const option of ast?.options || []) {
    if (option.value?.type === "variable")
      out.push({ option: option.name, id: option.value.name });
  }
  return out;
}
export function scriptV2ToSource(ast: any) {
  if (!ast || ast.type !== "script")
    throw new TypeError("Expected Script v2 AST");
  const args: any = [
    ast.script.pathNode
      ? valueToSource(ast.script.pathNode)
      : JSON.stringify(ast.script.path).replace(/\$\{/g, "\\${"),
  ];
  const argument: any = ast.script.argument;
  if (argument) {
    if (argument.type === "plugin-object")
      args.push("{" + argument.items.map(valueToSource).join(", ") + "}");
    else args.push(valueToSource(argument));
  }
  const withPart = ast.options.length
    ? " with " +
      ast.options
        .map(
          (option: any) => option.name + "=" + valueToSource(option.value),
        )
        .join(", ")
    : "";
  let triggerSource: any;
  if (ast.phase === "request" || ast.phase === "response") {
    triggerSource = ast.phase + " if " + conditionToSource(ast.condition);
  } else if (ast.phase === "cron") {
    triggerSource = "cron " + valueToSource(ast.trigger?.expression);
  } else if (ast.phase === "network-changed") {
    triggerSource = "network-changed";
  } else if (ast.phase === "generic") {
    triggerSource = "generic";
  } else {
    throw new Error("Unsupported Script v2 phase: " + ast.phase);
  }
  return triggerSource + " then script(" + args.join(", ") + ")" + withPart;
}
export {
  scriptSplitTopLevelCsv as splitScriptV2Csv,
  parseValue as parseScriptV2Value,
  OPTION_FIELDS as SCRIPT_V2_OPTION_FIELDS,
};
// Loon Legacy Script parser
// Author: chance
// Category: Converter / Script / Source Parsing
export const LOON_LEGACY_SCRIPT_OPTION_NAMES = new Set([
  "script-path",
  "tag",
  "requires-body",
  "binary-body-mode",
  "timeout",
  "max-size",
  "argument",
  "enable",
  "enabled",
  "debug",
]);
export function parseLegacyScriptLine(source: unknown): LegacyScriptAst | null {
  const raw = String(source ?? "").trim();
  const match = raw.match(
    /^(http-request|http-response)\s+(\S+)\s+(.+)$/i,
  );
  if (!match) return null;
  const type = match[1].toLowerCase();
  const phase = type.replace(/^http-/, "") as Phase;
  const pattern = match[2];
  const rest = match[3];
  const options = new Map<string, string>();
  const optionList: ScriptOption<string>[] = [];
  for (const token of scriptSplitTopLevelCsv(rest)) {
    const eq = token.indexOf("=");
    if (eq < 1) return null;
    const name = token.slice(0, eq).trim().toLowerCase();
    const value = token.slice(eq + 1).trim();
    if (
      !LOON_LEGACY_SCRIPT_OPTION_NAMES.has(name) ||
      options.has(name) ||
      !value
    )
      return null;
    options.set(name, value);
    optionList.push({ type: "option", name, value, raw: token });
  }
  const scriptPath = options.get("script-path") || null;
  const tag = options.get("tag") || null;
  const requiresBody = /^(?:true|1)$/i.test(
    options.get("requires-body") || "",
  );
  const binary = /^(?:true|1)$/i.test(
    options.get("binary-body-mode") || "",
  );
  const timeout = options.get("timeout") || null;
  const maxSize = options.get("max-size") || null;
  const argument = options.get("argument") || null;
  const enable = options.get("enable") ?? options.get("enabled") ?? null;
  const debug = options.get("debug") ?? null;
  return {
    type: "script",
    syntax: "loon-script-legacy",
    phase,
    httpType: type,
    pattern,
    script: { path: scriptPath },
    options: optionList,
    optionMap: options,
    tag,
    requiresBody,
    binaryBodyMode: binary,
    timeout,
    maxSize,
    argument,
    enable,
    debug,
    raw,
  };
}
// Target-neutral Script Semantic IR
// Author: chance
// Category: Converter / Script / Semantic IR
function freezeOptions<T>(options: ScriptOption<T>[]): readonly Readonly<ScriptOption<T>>[] {
  return Object.freeze(
    (options || []).map((item) => Object.freeze({ ...item })),
  );
}
type ScriptIrInput = { source: string; scriptPath: string | null } & (
  | { sourceSyntax: "legacy"; phase: Phase; condition?: undefined; trigger?: undefined; pattern: string; argument: string | null; options: ScriptOption<string>[]; sourcePayload: LegacyScriptAst }
  | { sourceSyntax: "v2"; phase: ScriptPhase; condition: RewriteCondition | null; trigger: ScriptTrigger | null; pattern?: undefined; argument: ScriptArgument | null; options: ScriptOption<ScriptValue>[]; sourcePayload: ScriptV2Ast }
);
function baseIr({
  sourceSyntax,
  source,
  phase,
  condition,
  trigger,
  pattern,
  scriptPath,
  argument,
  options,
  sourcePayload,
}: ScriptIrInput): ScriptSemanticIr {
  return Object.freeze({
    type: "script-semantic-ir",
    sourceSyntax,
    source: String(source || sourcePayload?.raw || ""),
    phase,
    condition:
      condition ||
      (pattern ? { type: "url-regex", pattern: String(pattern) } : null),
    trigger: trigger || null,
    pattern: pattern || null,
    script: Object.freeze({
      path: String(scriptPath || ""),
      argument: argument ?? null,
    }),
    argument: argument ?? null,
    options: freezeOptions<string | ScriptValue>(options),
    sourcePayload,
  }) as ScriptSemanticIr;
}
export function legacyScriptToSemanticIr(
  parsed: LegacyScriptAst,
  { source = parsed?.raw || "" }: { source?: string } = {},
): LegacyScriptIr {
  if (!parsed || parsed.syntax !== "loon-script-legacy")
    throw new TypeError("Expected parsed Legacy Script declaration");
  return baseIr({
    sourceSyntax: "legacy",
    source,
    phase: parsed.phase,
    pattern: parsed.pattern,
    scriptPath: parsed.script?.path,
    argument: parsed.argument,
    options: parsed.options,
    sourcePayload: parsed,
  }) as LegacyScriptIr;
}
export function scriptV2AstToSemanticIr(
  ast: ScriptV2Ast,
  { source = ast?.raw || "" }: { source?: string } = {},
): V2ScriptIr {
  if (!ast || ast.type !== "script" || ast.syntax !== "loon-script-v2")
    throw new TypeError("Expected Script v2 AST");
  return baseIr({
    sourceSyntax: "v2",
    source,
    phase: ast.phase,
    condition: ast.condition,
    trigger: ast.trigger || null,
    scriptPath: ast.script?.path,
    argument: ast.script?.argument || null,
    options: ast.options,
    sourcePayload: ast,
  }) as V2ScriptIr;
}
export function scriptIrSourcePath(ir: ScriptSemanticIr): string {
  if (!ir || ir.type !== "script-semantic-ir")
    throw new TypeError("Expected Script Semantic IR");
  return ir.script.path;
}
// Unified source entry point; provenance is retained but never needed by planners.
export function parseScriptDeclaration(source: string): ScriptSemanticIr | null {
  if (isScriptV2(source))
    return scriptV2AstToSemanticIr(parseScriptV2(source), { source });
  const parsed = parseLegacyScriptLine(source);
  return parsed?.script?.path
    ? legacyScriptToSemanticIr(parsed, { source })
    : null;
}
export function scriptIrTag(ir: ScriptSemanticIr | null | undefined): string | undefined {
  const tag = ir?.options?.find(
    (option) => option.name === "tag",
  )?.value;
  return ir?.sourceSyntax === "legacy" ? tag as string | undefined : (tag as StringNode | undefined)?.value;
}
export function legacyScriptIrDeclaration(ir: ScriptSemanticIr) {
  if (ir?.type !== "script-semantic-ir" || ir.sourceSyntax !== "legacy")
    throw new TypeError("Expected Legacy Script Semantic IR");
  const options = new Map(
    ir.options.map((option) => [option.name, option.value] as const),
  );
  return {
    phase: ir.phase,
    httpType: "http-" + ir.phase,
    pattern: ir.condition?.pattern ?? ir.pattern,
    script: ir.script,
    tag: scriptIrTag(ir),
    requiresBody: /^(?:true|1)$/i.test(options.get("requires-body") || ""),
    binaryBodyMode: /^(?:true|1)$/i.test(options.get("binary-body-mode") || ""),
    maxSize: options.get("max-size") ?? null,
    timeout: options.get("timeout") ?? null,
    enable: options.get("enable") ?? options.get("enabled") ?? null,
    debug: options.get("debug") ?? null,
    argument: ir.argument,
  };
}

// WayX Loon plugin [Argument] usage analysis
// Author: chance
// Category: Converter / Argument / Semantic Analysis
function activeLines(lines: any = []): any {
  return lines
    .map((raw: any) => String(raw ?? "").trim())
    .filter(
      (line: any): any =>
        line &&
        !line.startsWith("#") &&
        !line.startsWith(";") &&
        !line.startsWith("//"),
    );
}
function collectVariableNames(node: any, out: any = new Set()): any {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVariableNames(item, out);
    return out;
  }
  if (node.type === "variable" && typeof node.name === "string")
    out.add(node.name);
  if (node.type === "string")
    for (const [kind, name] of stringTemplateParts(node))
      if (kind === "v") out.add(name);
  for (const [key, value] of Object.entries(node)) {
    if (key === "raw") continue;
    collectVariableNames(value, out);
  }
  return out;
}
function isBuiltInRuntimeVariable(name: any) {
  const value = String(name || "");
  return (
    value === "url" ||
    value.startsWith("request.") ||
    value.startsWith("response.")
  );
}
function declaredRefs(node: any, declaredIds: any): any {
  const declared: any =
    declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  return [...collectVariableNames(node)]
    .filter(
      (name: any): any => declared.has(name) && !isBuiltInRuntimeVariable(name),
    )
    .sort();
}
function pluginObjectRefs(ast: any): any {
  return scriptV2ArgumentRefs(ast);
}
function addUse(usage: any, id: any, use: any) {
  if (!usage.has(id)) usage.set(id, []);
  const list: any = usage.get(id);
  const key = JSON.stringify([
    use.section,
    use.kind,
    use.option || "",
    use.line || "",
  ]);
  if (
    !list.some(
      (item: any) =>
        JSON.stringify([
          item.section,
          item.kind,
          item.option || "",
          item.line || "",
        ]) === key,
    )
  ) {
    list.push(use);
  }
}
function boundaryValue(line: any, key: string) {
  const re = new RegExp(
    "(?:^|,)\\s*" +
      key +
      "\\s*=\\s*([\\s\\S]*?)(?=,\\s*[A-Za-z][A-Za-z0-9_-]*\\s*=|$)",
    "i",
  );
  return (String(line).match(re) || [])[1]?.trim() || "";
}
function legacyRefs(value: string): any {
  const refs: any = new Set();
  const source = String(value || "");
  for (const match of source.matchAll(/\$?\{([A-Za-z_][\w-]*)\}/g))
    refs.add(match[1]);
  return [...refs];
}
export function rewriteV2PluginArgumentRefs(
  ast: any,
  declaredIds: any = [],
): any {
  const declared: any =
    declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  const conditionRefs: any = declaredRefs(ast?.condition, declared);
  const actionRefs: any = declaredRefs(ast?.actions, declared);
  return {
    conditionRefs,
    actionRefs,
    all: [...new Set([...conditionRefs, ...actionRefs])].sort(),
  };
}
export function scriptV2PluginArgumentUsage(
  ast: any,
  declaredIds: any = [],
): any {
  const declared: any =
    declaredIds instanceof Set ? declaredIds : new Set(declaredIds || []);
  const conditionRefs: any = declaredRefs(ast?.condition, declared);
  const triggerRefs: any = declaredRefs(ast?.trigger, declared);
  const objectRefs: any = pluginObjectRefs(ast);
  const dynamicOptions: any = scriptV2DynamicOptionRefs(ast);
  const undeclaredObjectRefs: any = objectRefs.filter(
    (id: any) => !declared.has(id),
  );
  const undeclaredOptionRefs: any = dynamicOptions.filter(
    (ref: any) => !declared.has(ref.id),
  );
  const undeclaredTriggerRefs: any = [...collectVariableNames(ast?.trigger)]
    .filter(
      (id: any) => !declared.has(id) && !isBuiltInRuntimeVariable(id),
    )
    .sort();
  return {
    conditionRefs,
    triggerRefs,
    objectRefs,
    dynamicOptions,
    undeclaredObjectRefs,
    undeclaredOptionRefs,
    undeclaredTriggerRefs,
    all: [
      ...new Set([
        ...conditionRefs,
        ...triggerRefs,
        ...objectRefs.filter((id: any): any => declared.has(id)),
        ...dynamicOptions
          .filter((ref: any): any => declared.has(ref.id))
          .map((ref: any): any => ref.id),
      ]),
    ].sort(),
  };
}
export function analyzePluginArgumentUsage({
  argumentLines = [],
  rewriteLines = [],
  scriptLines = [],
  ruleLines = [],
}: any = {}): any {
  const declarations: any = parseLoonArguments(argumentLines);
  const declaredIds: any = new Set(declarations.map((arg: any): any => arg.id));
  const usage: any = new Map(declarations.map((arg: any): any => [arg.id, []]));
  const undeclaredRefs: any = [];
  const parseErrors: any = [];
  for (const line of activeLines(rewriteLines)) {
    if (!isRewriteV2(line) || isScriptV2(line)) continue;
    try {
      const ast: any = selectRewritePipelineLayer(parseRewriteV2(line));
      const refs: any = rewriteV2PluginArgumentRefs(ast, declaredIds);
      for (const id of refs.conditionRefs)
        addUse(usage, id, { section: "Rewrite", kind: "condition", line });
      for (const id of refs.actionRefs)
        addUse(usage, id, { section: "Rewrite", kind: "action", line });
    } catch (error: any) {
      parseErrors.push({
        section: "Rewrite",
        line,
        error: String(error?.message || error).split("\n")[0],
      });
    }
  }
  for (const line of [
    ...activeLines(scriptLines),
    ...activeLines(rewriteLines).filter(isScriptV2),
  ]) {
    if (isScriptV2(line)) {
      try {
        const ast: any = parseScriptV2(line);
        const refs: any = scriptV2PluginArgumentUsage(ast, declaredIds);
        for (const id of refs.conditionRefs)
          addUse(usage, id, { section: "Script", kind: "condition", line });
        for (const id of refs.triggerRefs)
          addUse(usage, id, { section: "Script", kind: "trigger", line });
        for (const id of refs.undeclaredTriggerRefs)
          undeclaredRefs.push({ section: "Script", kind: "trigger", id, line });
        for (const id of refs.objectRefs) {
          if (declaredIds.has(id))
            addUse(usage, id, {
              section: "Script",
              kind: "argument-object",
              line,
            });
          else
            undeclaredRefs.push({
              section: "Script",
              kind: "argument-object",
              id,
              line,
            });
        }
        for (const ref of refs.dynamicOptions) {
          if (declaredIds.has(ref.id))
            addUse(usage, ref.id, {
              section: "Script",
              kind: "dynamic-option",
              option: ref.option,
              line,
            });
          else
            undeclaredRefs.push({
              section: "Script",
              kind: "dynamic-option",
              option: ref.option,
              id: ref.id,
              line,
            });
        }
      } catch (error: any) {
        parseErrors.push({
          section: "Script",
          line,
          error: String(error?.message || error).split("\n")[0],
        });
      }
      continue;
    }
    const argument = boundaryValue(line, "argument");
    for (const id of legacyRefs(argument)) {
      if (declaredIds.has(id))
        addUse(usage, id, { section: "Script", kind: "argument-object", line });
      else
        undeclaredRefs.push({
          section: "Script",
          kind: "argument-object",
          id,
          line,
        });
    }
    const enable = boundaryValue(line, "enable");
    for (const id of legacyRefs(enable)) {
      if (declaredIds.has(id))
        addUse(usage, id, {
          section: "Script",
          kind: "dynamic-option",
          option: "enable",
          line,
        });
      else
        undeclaredRefs.push({
          section: "Script",
          kind: "dynamic-option",
          option: "enable",
          id,
          line,
        });
    }
  }
  const policyBindings: any = activeLines(ruleLines)
    .filter((line: any) => /(?:^|,)\s*PROXY\s*(?:,|$)/i.test(line))
    .map((line: any): any => ({ policy: "PROXY", line }));
  return {
    declarations,
    arguments: declarations.map((arg: any): any => ({
      ...arg,
      uses: usage.get(arg.id) || [],
      used: (usage.get(arg.id) || []).length > 0,
    })),
    declaredIds: [...declaredIds],
    undeclaredRefs,
    parseErrors,
    policyBindings,
  };
}

// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Script / Target Adapters
// WayX generic remote-script declaration conversion
// Author: chance
// Category: Converter / Script
//
// Script action selection is based only on declaration semantics and inspected
// source behavior. Script URL, plugin id, author and repository never select an
// action.
export function scriptBehaviorSignals(sourceText: string = "") {
  const source = String(sourceText || "");
  return {
    sourceAvailable: Boolean(source.trim()),
    readsRequestBody: /\$request\.(?:body|bodyBytes)\b/.test(source),
    readsResponseBody: /\$response\.(?:body|bodyBytes)\b/.test(source),
    returnsHttpResponse:
      /\$done\s*\(\s*\{[\s\S]{0,800}\b(?:status|statusCode)\s*:/.test(source) ||
      /\$done\s*\(\s*\{[\s\S]{0,800}\bresponse\s*:\s*\{/.test(source),
  };
}
export function selectQxScriptAction({
  phase,
  requiresBody = false,
  sourceText = "",
}: any) {
  const p = String(phase)
    .toLowerCase()
    .replace(/^http-/, "");
  if (!["request", "response"].includes(p))
    throw new Error(`Unsupported QX HTTP script phase: ${phase}`);
  const signals = scriptBehaviorSignals(sourceText);
  // The Loon declaration phase is authoritative for native QX Script mapping.
  // QX's official sample and KOP-XIAO's resource parser both map
  // request/response + requires-body directly to the corresponding
  // script-request/response-header/body action. Whole-file source inspection
  // is only allowed to strengthen body-dependency detection; it must not
  // switch a declared request script into the echo-response family because
  // multi-platform helpers can contain inactive Surge/Loon response branches.
  const needsBody = Boolean(
    requiresBody ||
      (p === "request" ? signals.readsRequestBody : signals.readsResponseBody),
  );
  return {
    action: "script-" + p + (needsBody ? "-body" : "-header"),
    reason:
      p +
      "-phase declaration " +
      (needsBody
        ? "reads/requires " + p + " body"
        : "does not require " + p + " body"),
    override: false,
    signals,
  };
}
// WayX behavior-first Loon Script v2 target planning
// Author: chance
// Category: Converter / Script v2 / Target Mapping
function unsupported(reason: any): any {
  return { ok: false, reason };
}
function scriptUrlCondition(ast: any, target: string = "generic"): any {
  return simpleUrlRewriteCondition(
    { type: "rewrite", condition: ast.condition },
    { target },
  );
}
function fixedOption(ast: any, name: string): any {
  const value: any = scriptOption(ast, name);
  if (!value) return null;
  if (["string", "raw-string", "number", "boolean"].includes(value.type))
    return value.value;
  return null;
}
function argumentDefault(id: any, table: any): any {
  const entry: any = table?.byId?.get(String(id));
  return entry?.hasDefault ? entry.defaultValue : undefined;
}
// Modified: 2026-11-17 (chance). Carry Loon arguments through QX's official
// remote-script fragment transport; preserve original fragments and typed defaults.
export function qxScriptArgumentUrl(scriptUrl: any, argument: any, table: any, notes: any, legacy: boolean = false): any {
  if (argument === null || argument === undefined || argument === "") return scriptUrl;
  let value: any;
  const refs: any = legacy ? parseLegacyLoonPluginObjectRefs(argument)
    : argument.type === "plugin-object" ? argument.items.map((item: any) => item.name) : null;
  if (refs) {
    if (refs.some((id: any) => !table?.byId?.get(id)?.hasDefault)) {
      notes.push("Source Script argument ignored: PluginObject has no declared default for Quantumult X fragment transport.");
      return scriptUrl;
    }
    const fields: any = [];
    for (const id of refs) {
      const entry: any = table.byId.get(id), raw: any = entry.defaultValue;
      let decoded: any = raw;
      if (entry.valueType === "number") {
        if (!String(raw).trim() || !Number.isFinite(Number(raw))) {
          notes.push("Source Script argument ignored: invalid numeric PluginObject default.");
          return scriptUrl;
        }
        decoded = Number(raw);
      } else if (entry.valueType === "boolean") {
        if (!["true", "false"].includes(String(raw))) {
          notes.push("Source Script argument ignored: invalid boolean PluginObject default.");
          return scriptUrl;
        }
        decoded = String(raw) === "true";
      }
      fields.push([id, decoded]);
    }
    value = Object.fromEntries(fields);
    notes.push("Quantumult X PluginObject uses declared defaults; source-client saved settings are not synchronized.");
  } else if (legacy) {
    const raw = String(argument);
    value = /^["']/.test(raw) ? decodeQuoted(raw) : raw;
  } else {
    if (!["string", "raw-string"].includes(argument.type) ||
        (argument.type === "string" && stringTemplateParts(argument).some((part: any) => part[0] === "v"))) {
      notes.push("Source Script argument ignored: dynamic String transport has no verified Quantumult X binding.");
      return scriptUrl;
    }
    value = argument.value;
  }
  if (!/^https?:\/\//i.test(scriptUrl)) {
    notes.push("Source Script argument ignored: official Quantumult X fragment transport requires a remote HTTP(S) script.");
    return scriptUrl;
  }
  const url = new URL(scriptUrl);
  if (url.hash.slice(1).split("&").some((part) => part.split("=")[0] === "_wayx_argument")) {
    notes.push("Source Script argument ignored: reserved Quantumult X fragment key collision.");
    return scriptUrl;
  }
  const payload = encodeURIComponent(JSON.stringify({value}));
  notes.push("Source Script argument transported through Quantumult X URL fragment _wayx_argument.");
  return scriptUrl + (scriptUrl.includes("#") ? (scriptUrl.endsWith("#") ? "" : "&") : "#") + "_wayx_argument=" + payload;
}
function noteQxForcedEnable(ast: any, notes: any) {
  const enable: any = scriptOption(ast, "enable");
  if (enable?.type === "variable" || enable?.value === false)
    notes.push(
      "Source enable forced to enabled for Quantumult X by user conversion policy; source default/off switch is not carried over.",
    );
}
// 上游错误 / 转换失败案例：Cron bindings must be effective String
// parameters before a target emits, disables or omits the task.
function dynamicScriptCronBinding(ast: any, argumentTable: any): any {
  const node: any = ast.phase === "cron" ? ast.trigger?.expression : null;
  if (node?.type !== "variable") return { ok: true };
  const entry: any = argumentTable?.byId?.get(node.name);
  if (!entry)
    return unsupported(
      "undeclared plugin [Argument] reference for Cron: " + node.name,
    );
  if (entry.valueType !== "string")
    return unsupported(
      "invalid plugin [Argument] type for Cron: " +
        node.name +
        " (" +
        entry.valueType +
        ")",
    );
  if (
    !entry.hasDefault ||
    entry.defaultValue == null ||
    String(entry.defaultValue).trim() === ""
  )
    return unsupported(
      "missing plugin [Argument] default for Cron: " +
        node.name +
        "; Cron requires an effective value and has no option fallback",
    );
  if (![5, 6].includes(String(entry.defaultValue).trim().split(/\s+/).length))
    return unsupported(
      "invalid plugin [Argument] default for Cron: " +
        node.name +
        "; expected a 5- or 6-field expression",
    );
  return { ok: true };
}
function qxCronExpression(ast: any, argumentTable: any, notes: any): any {
  const node: any = ast.trigger?.expression;
  if (!node) return unsupported("Cron Script is missing its expression");
  if (node.type === "string" || node.type === "raw-string")
    return { ok: true, value: String(node.value) };
  if (node.type === "variable") {
    const value: any = argumentDefault(node.name, argumentTable);
    if (value === undefined || value === null || String(value).trim() === "") {
      return unsupported(
        "dynamic Cron expression has no plugin default for Quantumult X: " +
          node.name,
      );
    }
    notes.push(
      "Source dynamic Cron expression=" +
        node.name +
        " is fixed to its plugin default for Quantumult X.",
    );
    return { ok: true, value: String(value).trim() };
  }
  return unsupported("unsupported Cron expression type for Quantumult X");
}
function qxTaskOptions(ast: any, notes: any): any {
  const parts: string[] = [];
  const tag: any = fixedOption(ast, "tag");
  const img: any = fixedOption(ast, "img_url");
  if (tag !== null && String(tag)) parts.push("tag=" + String(tag));
  if (img !== null && String(img)) {
    if (/^https?:\/\//i.test(String(img))) parts.push("img-url=" + String(img));
    else
      notes.push(
        "Source img_url=" +
          String(img) +
          " omitted because Quantumult X task img-url is documented as an image URL, not an SF Symbol name.",
      );
  }
  noteQxForcedEnable(ast, notes);
  parts.push("enabled=true");
  return parts;
}
function qxNonHttpScriptV2Plan(
  ast: any,
  { scriptUrl, argumentTable = null }: any = {},
): any {
  const notes: string[] = [];
  scriptUrl = qxScriptArgumentUrl(scriptUrl, ast.script.argument, argumentTable, notes);
  const timeout: any = scriptOption(ast, "timeout");
  if (timeout)
    notes.push("Source Script timeout ignored for Quantumult X task syntax.");
  const debug: any = scriptOption(ast, "debug");
  if (
    debug?.type === "variable" ||
    (debug?.type === "boolean" && debug.value === true)
  ) {
    notes.push(
      "Source Script debug is not a Quantumult X task field and was omitted.",
    );
  }
  let prefix: any;
  if (ast.phase === "cron") {
    const cron: any = qxCronExpression(ast, argumentTable, notes);
    if (!cron.ok) return cron;
    const fields: any = cron.value.trim().split(/\s+/);
    if (![5, 6].includes(fields.length)) {
      return unsupported(
        "Quantumult X task cron requires a 5- or 6-field expression",
      );
    }
    prefix = cron.value.trim();
  } else if (ast.phase === "network-changed") {
    prefix = "event-network";
  } else if (ast.phase === "generic") {
    prefix = "event-interaction";
  } else {
    return unsupported(
      "unsupported non-HTTP Script v2 phase for Quantumult X: " + ast.phase,
    );
  }
  const options: any = qxTaskOptions(ast, notes);
  return {
    ok: true,
    strategy: "native-task",
    section: "task",
    line:
      prefix +
      " " +
      scriptUrl +
      (options.length ? ", " + options.join(", ") : ""),
    tag: fixedOption(ast, "tag"),
    notes,
  };
}
function validateScriptV2Bindings(
  ast: any,
  { argumentIds, argumentTable, target }: any,
): any {
  if (!ast || !["script", "script-semantic-ir"].includes(ast.type))
    return unsupported("expected Script v2 AST");
  const cron: any = dynamicScriptCronBinding(ast, argumentTable);
  if (!cron.ok) return cron;
  const objects: any = scriptObjectBindings(ast, {
    argumentIds,
    argumentTable,
  });
  if (!objects.ok) return objects;
  return dynamicScriptOptionBindings(ast, { argumentTable, target });
}
export function qxScriptV2Plan(
  ast: any,
  {
    scriptUrl = ast?.script?.path,
    sourceText = "",
    argumentIds = null,
    argumentTable = null,
  }: any = {},
): any {
  const bindings: any = validateScriptV2Bindings(ast, {
    argumentIds,
    argumentTable,
    target: "qx",
  });
  if (!bindings.ok) return bindings;
  if (!["request", "response"].includes(ast.phase)) {
    return qxNonHttpScriptV2Plan(ast, { scriptUrl, argumentTable });
  }
  // Modified: 2026-11-20 (chance). Only emit HTTPS URLs or local script paths.
  const path = String(scriptUrl ?? "");
  const remote = /^https:\/\/[^/?#]+(?:[/?#]|$)/i.test(path);
  const local = /^(?:[\w.@-]+\/)*[\w.@-]+\.js$/i.test(path) &&
    !path.split("/").some(part => part === "." || part === "..");
  if (/[\s"'<>\\\x00-\x1f\x7f]/.test(path) || (!remote && !local))
    return unsupported("Quantumult X HTTP Script requires an HTTPS URL or a local script path");
  // QX official Rewrite Script declarations do not expose Loon's enable,
  // timeout, debug or binary_body_mode fields. Target planning therefore
  // omits those fields instead of emitting invented QX syntax. Keep
  // requires_body separate: it alone selects the QX header/body action family.
  const timeout: any = scriptOption(ast, "timeout");
  const debug: any = scriptOption(ast, "debug");
  const binaryBodyMode: any = scriptOptionBoolean(
    ast,
    "binary_body_mode",
    false,
  );
  if (argumentIds !== null) {
    const usage: any = scriptV2PluginArgumentUsage(ast, argumentIds);
    if (usage.conditionRefs.length) {
      return unsupported(
        "plugin [Argument] condition cannot be represented by the Quantumult X rewrite declaration: " +
          usage.conditionRefs.join(", "),
      );
    }
  }
  // Modified: 2026-11-05 (chance). QX Script v2 matchers preserve Loon URL flags.
  const condition: any = scriptUrlCondition(ast, "qx");
  if (!condition.ok) return condition;
  const notes: any = [...(condition.notes || [])];
  noteQxForcedEnable(ast, notes);
  scriptUrl = qxScriptArgumentUrl(scriptUrl, ast.script.argument, argumentTable, notes);
  const omittedOptions: string[] = [];
  if (binaryBodyMode) omittedOptions.push("binary_body_mode=true");
  if (timeout) omittedOptions.push("timeout");
  if (debug?.type === "variable" || (debug?.type === "boolean" && debug.value)) {
    omittedOptions.push("debug");
  }
  if (omittedOptions.length) {
    notes.push("QX Script V2 omitted unsupported options: " + omittedOptions.join(", "));
  }
  const action: any = selectQxScriptAction({
    phase: ast.phase,
    requiresBody: scriptOptionBoolean(ast, "requires_body", false),
    scriptUrl,
    sourceText,
  });
  if (!action.action) {
    return unsupported(action.reason);
  }
  return {
    ok: true,
    strategy: "native-declaration",
    section: "rewrite",
    pattern: condition.pattern,
    action: action.action,
    line: condition.pattern + " url " + action.action + " " + scriptUrl,
    tag: fixedOption(ast, "tag"),
    binaryBodyMode,
    notes,
  };
}
function surgeTriggerParams(ast: any, argumentTable: any): any {
  if (ast.phase === "request" || ast.phase === "response") return null;
  if (ast.phase === "generic") return { ok: true, params: ["type=generic"] };
  if (ast.phase === "network-changed")
    return { ok: true, params: ["type=event", "event-name=network-changed"] };
  if (ast.phase === "cron") {
    const node: any = ast.trigger?.expression;
    if (!node) return unsupported("Cron Script is missing its expression");
    let expression: any;
    if (node.type === "string" || node.type === "raw-string") {
      expression = String(node.value);
    } else if (node.type === "variable") {
      const placeholder: any = surgeDynamicOptionValue(
        node.name,
        argumentTable,
      );
      if (!placeholder)
        return unsupported(
          "dynamic Cron expression references undeclared Surge module argument: " +
            node.name,
        );
      expression = placeholder;
    } else {
      return unsupported("unsupported Cron expression type for Surge");
    }
    return {
      ok: true,
      params: ["type=cron", "cronexp=" + JSON.stringify(expression)],
    };
  }
  return unsupported("unsupported Script v2 phase for Surge: " + ast.phase);
}
// 上游错误 / 转换失败案例：a declared parameter is not necessarily
// valid for every Script option. Validate source bindings before lowering or
// omitting a target field; never coerce the parameter's $argument type.
function dynamicScriptOptionBindings(
  ast: any,
  { argumentTable, target }: any,
): any {
  for (const option of ast.options || []) {
    const name: any = option.name === "enabled" ? "enable" : option.name;
    if (!["enable", "debug", "timeout"].includes(name)) continue;
    if (target === "qx") continue; // QX omits timeout/debug and uses the force-enable policy.
    const value: any = option.value;
    const id: any =
      value?.type === "variable"
        ? value.name
        : typeof value === "string"
          ? value.match(/^\$?\{([A-Za-z_][\w-]*)\}$/)?.[1]
          : null;
    if (!id) continue;
    const entry: any = argumentTable?.byId?.get(id);
    if (!entry)
      return unsupported(
        "undeclared plugin [Argument] reference for " + name + ": " + id,
      );
    const allowed =
      name === "timeout" ? ["number", "string"] : ["boolean"];
    if (!allowed.includes(entry.valueType))
      return unsupported(
        "invalid plugin [Argument] type for " +
          name +
          ": " +
          id +
          " (" +
          entry.valueType +
          ")",
      );
    if (entry.hasDefault) {
      const text = String(entry.defaultValue);
      const valid =
        name === "timeout"
          ? /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(text) &&
            Number.isFinite(Number(text)) &&
            Number(text) > 0
          : ["true", "false"].includes(text);
      if (!valid)
        return unsupported(
          "invalid plugin [Argument] default for " + name + ": " + id,
        );
    } else if (target === "surge") {
      return unsupported(
        "missing plugin [Argument] default for " +
          name +
          ": " +
          id +
          "; dynamic option fallback has no verified Surge parameter transport",
      );
    }
  }
  return { ok: true };
}
export function surgeScriptV2Plan(
  ast: any,
  {
    scriptUrl = ast?.script?.path,
    name = "script",
    argumentIds = null,
    argumentTable = null,
  }: any = {},
): any {
  const bindings: any = validateScriptV2Bindings(ast, {
    argumentIds,
    argumentTable,
    target: "surge",
  });
  if (!bindings.ok) return bindings;
  if (argumentIds !== null) {
    const usage: any = scriptV2PluginArgumentUsage(ast, argumentIds);
    const undeclared: any = [
      ...usage.undeclaredObjectRefs,
      ...usage.undeclaredOptionRefs.map((ref: any): any => ref.id),
      ...usage.undeclaredTriggerRefs,
    ];
    if (undeclared.length) {
      return unsupported(
        "undeclared plugin [Argument] reference(s): " +
          [...new Set(undeclared)].sort().join(", "),
      );
    }
    if (usage.conditionRefs.length) {
      return unsupported(
        "plugin [Argument] condition has no verified Surge Script declaration equivalent: " +
          usage.conditionRefs.join(", "),
      );
    }
  }
  const enable: any = scriptOption(ast, "enable");
  if (enable?.type === "boolean" && enable.value === false) {
    return { ok: true, disabled: true, reason: "Loon Script v2 enable=false" };
  }
  let requirementPrefix: any = null;
  if (enable?.type === "variable") {
    requirementPrefix = surgeEnableRequirement(enable.name, argumentTable);
    if (!requirementPrefix) {
      return unsupported(
        "dynamic enable references an undeclared or unsupported Surge module argument: " +
          enable.name,
      );
    }
  }
  let params: any;
  let notes: any = [];
  if (ast.phase === "request" || ast.phase === "response") {
    const condition: any = scriptUrlCondition(ast, "surge");
    if (!condition.ok) return condition;
    notes = condition.notes || [];
    params = [
      "type=http-" + ast.phase,
      "pattern=" + surgeRegexParameter(condition.pattern),
    ];
  } else {
    const trigger: any = surgeTriggerParams(ast, argumentTable);
    if (!trigger.ok) return trigger;
    params = [...trigger.params];
  }
  params.push("script-path=" + scriptUrl);
  if (scriptOptionBoolean(ast, "requires_body", false)) {
    params.push("requires-body=true");
  }
  if (scriptOptionBoolean(ast, "binary_body_mode", false))
    params.push("binary-body-mode=true");
  const timeout: any = scriptOption(ast, "timeout");
  if (timeout?.type === "number") params.push("timeout=" + timeout.value);
  else if (timeout?.type === "variable") {
    const placeholder: any = surgeDynamicOptionValue(
      timeout.name,
      argumentTable,
    );
    if (!placeholder)
      return unsupported(
        "dynamic timeout references undeclared Surge module argument: " +
          timeout.name,
      );
    params.push("timeout=" + placeholder);
  }
  const argument: any = ast.script.argument;
  if (argument?.type === "string" || argument?.type === "raw-string") {
    params.push("argument=" + JSON.stringify(argument.value));
  } else if (argument?.type === "plugin-object") {
    const encoded: any = surgePluginObjectArgument(
      argument.items.map((item: any): any => item.name),
      argumentTable,
    );
    if (encoded.ok) params.push("argument=" + encoded.value);
    else
      notes.push(
        "Source Script argument omitted for Surge by user conversion policy: " +
          encoded.reason,
      );
  } else if (argument) {
    return unsupported("unsupported Loon Script v2 argument form");
  }
  const debug: any = scriptOption(ast, "debug");
  if (debug?.type === "boolean" && debug.value) params.push("debug=true");
  else if (debug?.type === "variable") {
    const placeholder: any = surgeDynamicOptionValue(debug.name, argumentTable);
    if (!placeholder)
      return unsupported(
        "dynamic debug references undeclared Surge module argument: " +
          debug.name,
      );
    params.push("debug=" + placeholder);
  }
  return {
    ok: true,
    strategy: "native-declaration",
    section: "script",
    line:
      (requirementPrefix ? requirementPrefix + " " : "") +
      name +
      " = " +
      params.join(","),
    tag: fixedOption(ast, "tag"),
    notes,
    usesLineRequirement: Boolean(requirementPrefix),
  };
}
export function scriptV2DeclarationGaps(ast: any): any {
  return {
    argumentRefs: scriptV2ArgumentRefs(ast),
    dynamicOptions: scriptV2DynamicOptionRefs(ast),
    hasArgument: Boolean(ast?.script?.argument),
  };
}
// Backward-compatible export name for callers that only inspect needs.
export const scriptV2BridgeNeeds = scriptV2DeclarationGaps;
// Quantumult X Source Script target planner
// Author: chance
// Category: Converter / Script / Quantumult X
export function planQxScript(ir: any, ctx: any = {}): any {
  if (!ir || ir.type !== "script-semantic-ir")
    throw new TypeError("Expected Script Semantic IR");
  let scriptUrl: any = ctx.scriptUrl || ir.script.path;
  if (ir.sourceSyntax === "v2") {
    return qxScriptV2Plan(ir, {
      scriptUrl,
      sourceText: ctx.sourceText || "",
      argumentIds: ctx.argumentIds ?? null,
      argumentTable: ctx.argumentTable || null,
    });
  }
  if (ir.sourceSyntax !== "legacy") {
    return unsupported("unsupported Script source syntax: " + ir.sourceSyntax);
  }
  const objects: any = scriptObjectBindings(ir, ctx);
  if (!objects.ok) return objects;
  const bindings: any = dynamicScriptOptionBindings(ir, {
    argumentTable: ctx.argumentTable,
    target: "qx",
  });
  if (!bindings.ok) return bindings;
  const sc: any = legacyScriptIrDeclaration(ir);
  if (!sc?.script?.path)
    return unsupported("Legacy Script declaration is missing script-path");
  const targetPattern: any = normalizeUrlRegexForTarget(sc.pattern);
  const enableFixed = sc.enable
    ? String(sc.enable).trim().toLowerCase()
    : "";
  const enableDynamic =
    Boolean(sc.enable) && !["true", "false", "1", "0"].includes(enableFixed);
  const debugFixed = sc.debug ? String(sc.debug).trim().toLowerCase() : "";
  const debugEnabled =
    Boolean(sc.debug) && !["false", "0"].includes(debugFixed);
  const notes: string[] = [];
  scriptUrl = qxScriptArgumentUrl(scriptUrl, sc.argument, ctx.argumentTable, notes, true);
  if (enableDynamic) {
    notes.push(
      "Source enable forced to enabled for Quantumult X by user conversion policy; source default/off switch is not carried over.",
    );
  }
  if (sc.timeout) {
    notes.push("Source Script timeout ignored for Quantumult X.");
  }
  if (sc.binaryBodyMode) {
    notes.push(
      "Source binary-body-mode=true ignored for Quantumult X declaration syntax; the runtime adapts binary data via bodyBytes.",
    );
  }
  if (debugEnabled) {
    notes.push(
      "Source Script debug is not a Quantumult X Rewrite Script field and was omitted.",
    );
  }
  if (enableFixed === "false" || enableFixed === "0") {
    notes.push(
      "Source enable forced to enabled for Quantumult X by user conversion policy; source default/off switch is not carried over.",
    );
  }
  const action: any = selectQxScriptAction({
    phase: sc.httpType,
    requiresBody: sc.requiresBody,
    sourceText: ctx.sourceText || "",
  });
  if (!action.action) return unsupported(action.reason);
  return {
    ok: true,
    strategy: "native-declaration",
    section: "rewrite",
    pattern: targetPattern,
    action: action.action,
    line: targetPattern + " url " + action.action + " " + scriptUrl,
    tag: sc.tag,
    notes,
  };
}
// Surge Source Script target planner
// Author: chance
// Category: Converter / Script / Surge
export function planSurgeScript(ir: any, ctx: any = {}): any {
  if (!ir || ir.type !== "script-semantic-ir")
    throw new TypeError("Expected Script Semantic IR");
  const scriptUrl: any = ctx.scriptUrl || ir.script.path;
  if (ir.sourceSyntax === "v2") {
    return surgeScriptV2Plan(ir, {
      scriptUrl,
      name: ctx.name || "script",
      argumentIds: ctx.argumentIds ?? null,
      argumentTable: ctx.argumentTable || null,
    });
  }
  if (ir.sourceSyntax !== "legacy") {
    return unsupported("unsupported Script source syntax: " + ir.sourceSyntax);
  }
  const objects: any = scriptObjectBindings(ir, ctx);
  if (!objects.ok) return objects;
  const bindings: any = dynamicScriptOptionBindings(ir, {
    argumentTable: ctx.argumentTable,
    target: "surge",
  });
  if (!bindings.ok) return bindings;
  const sc: any = legacyScriptIrDeclaration(ir);
  if (!sc?.script?.path)
    return unsupported("Legacy Script declaration is missing script-path");
  const targetPattern: any = normalizeUrlRegexForTarget(sc.pattern);
  const enableFixed = sc.enable
    ? String(sc.enable).trim().toLowerCase()
    : "";
  const enableDynamic =
    Boolean(sc.enable) && !["true", "false", "1", "0"].includes(enableFixed);
  if (enableFixed === "false" || enableFixed === "0") {
    return {
      ok: true,
      disabled: true,
      reason: "Loon Legacy Script enable=false",
    };
  }
  let requirementPrefix = "";
  if (enableDynamic) {
    const ref = String(sc.enable).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
    const requirement: any = ref
      ? surgeEnableRequirement(ref[1], ctx.argumentTable)
      : null;
    if (!requirement) {
      return unsupported(
        "dynamic source enable cannot be mapped to a declared Surge module boolean argument.",
      );
    }
    requirementPrefix = requirement + " ";
  }
  const notes: string[] = [];
  const params = [
    "type=" + sc.httpType,
    "pattern=" + surgeRegexParameter(targetPattern),
    "script-path=" + scriptUrl,
  ];
  if (sc.requiresBody) {
    params.push("requires-body=true");
    if (sc.maxSize) params.push("max-size=" + sc.maxSize);
  }
  if (sc.binaryBodyMode) params.push("binary-body-mode=true");
  if (sc.timeout) {
    const timeoutRef = String(sc.timeout).match(
      /^\$?\{([A-Za-z_][\w-]*)\}$/,
    );
    if (timeoutRef) {
      const placeholder: any = surgeDynamicOptionValue(
        timeoutRef[1],
        ctx.argumentTable,
      );
      if (!placeholder)
        return unsupported(
          "dynamic timeout references an undeclared Surge module argument.",
        );
      params.push("timeout=" + placeholder);
    } else {
      params.push("timeout=" + sc.timeout);
    }
  }
  if (sc.argument) {
    const refs: any = parseLegacyLoonPluginObjectRefs(sc.argument);
    if (refs) {
      const encoded: any = surgePluginObjectArgument(refs, ctx.argumentTable);
      if (encoded.ok) params.push("argument=" + encoded.value);
      else
        notes.push(
          "Source Script argument omitted for Surge by user conversion policy: " +
            encoded.reason,
        );
    } else {
      params.push("argument=" + sc.argument);
    }
  }
  if (sc.debug) {
    const ref = String(sc.debug).match(/^\$?\{([A-Za-z_][\w-]*)\}$/);
    if (ref)
      params.push(
        "debug=" + surgeDynamicOptionValue(ref[1], ctx.argumentTable),
      );
    else if (/^(true|1)$/i.test(String(sc.debug))) params.push("debug=true");
  }
  return {
    ok: true,
    strategy: "native-declaration",
    section: "script",
    line: requirementPrefix + (ctx.name || "script") + " = " + params.join(","),
    notes,
    usesLineRequirement: Boolean(requirementPrefix),
  };
}
