// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript domain layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / core

import type { ComparisonNode, RewriteCondition, RewriteDeclaration, RewriteDependencyRecord, RewriteValue, ScriptValue, StringNode } from "./contracts.ts";

// Modified: 2026-11-28 (chance). Describe source evaluation inputs, captures and regex values.
type SourceRegex = { type: "regex"; pattern?: string; flags?: string };
type CaptureValues = readonly (string | undefined)[];
type Captures = Map<string, CaptureValues>;
type SemanticHeaders = Record<string, unknown>;
interface SemanticMessage {
  method?: unknown;
  status?: unknown;
  statusCode?: unknown;
  headers?: SemanticHeaders;
  body?: unknown;
}
interface SemanticContext {
  url?: unknown;
  method?: unknown;
  request?: SemanticMessage;
  response?: SemanticMessage;
  arguments?: Record<string, unknown> | ReadonlyMap<string, unknown>;
}
type ConditionResult = { matched: boolean; captures: Captures };

// WayX target-neutral source Regex semantics
// Author: chance
// Category: Converter / Core / Semantic Regex
const SUPPORTED_FLAGS = /^[ims]*$/;
// Flags are suffix syntax, never characters inferred from the regex body.
// Escapes and character classes own their slashes; grammar punctuation following
// the closing delimiter belongs to the surrounding expression.
export function scanSourceRegexLiteral(text: string, start: number = 0) {
  text = String(text);
  if (text[start] !== "/")
    throw new SyntaxError("Expected regex opening delimiter");
  let escaped = false,
    inClass = false,
    close = -1;
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (c === "\\") {
      escaped = true;
      continue;
    }
    if (c === "[" && !inClass) {
      inClass = true;
      continue;
    }
    if (c === "]" && inClass) {
      inClass = false;
      continue;
    }
    if (c === "/" && !inClass) {
      close = i;
      break;
    }
  }
  if (close < 0) throw new SyntaxError("Unterminated regex");
  let end = close + 1;
  while (end < text.length && /[A-Za-z]/.test(text[end])) end++;
  if (end < text.length && !/[\s(),\[\].|&=~]/.test(text[end]))
    throw new SyntaxError("Invalid regex suffix boundary");
  const node = {
    type: "regex" as const,
    pattern: text.slice(start + 1, close),
    flags: text.slice(close + 1, end),
  };
  assertRegexNode(node);
  return { ...node, end };
}
function resolveConditionRegex(value: unknown): SourceRegex | null {
  if (value && typeof value === "object" && (value as SourceRegex).type === "regex")
    return value as SourceRegex;
  if (typeof value !== "string" || !value.startsWith("/")) return null;
  try {
    const regex = scanSourceRegexLiteral(value);
    return regex.end === value.length ? regex : null;
  } catch {
    return null;
  }
}
function assertRegexNode(node: SourceRegex) {
  if (!node || node.type !== "regex")
    throw new TypeError("Expected Loon semantic Regex node");
  const flags = String(node.flags || "");
  if (!SUPPORTED_FLAGS.test(flags))
    throw new Error("Unsupported Loon regex flag(s): " + flags);
  if (new Set(flags).size !== flags.length)
    throw new Error("Duplicate Loon regex flag(s): " + flags);
  return { source: String(node.pattern ?? ""), flags };
}
export function compileSourceRegex(node: SourceRegex) {
  const { source, flags } = assertRegexNode(node);
  return new RegExp(source, flags);
}
export function execSourceRegex(node: SourceRegex, value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  return compileSourceRegex(node).exec(value);
}

// WayX target-neutral Loon Rewrite condition reference evaluator
// Author: chance
// Category: Converter / Core / Condition Semantics
export class SemanticEvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemanticEvaluationError";
  }
}
function cloneCaptures(captures: Captures) {
  return new Map(captures);
}
function decodeHeaderName(value: string) {
  return String(value)
    .replace(/\\\\/g, "\\")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');
}
function headerVariable(name: string) {
  const match = String(name).match(
    /^(request|response)\.header\[(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)")\]$/,
  );
  if (!match) return null;
  return {
    phase: match[1],
    name: decodeHeaderName(match[2] ?? match[3] ?? ""),
  };
}
function lookupHeader(headers: unknown, name: string) {
  if (Array.isArray(headers)) {
    const item = (headers as { field: unknown; value?: unknown }[]).find(
      (x) =>
        String(x.field).toLowerCase() === String(name).toLowerCase(),
    );
    return item ? String(item.value ?? "") : null;
  }
  if (headers instanceof Map) {
    for (const [key, value] of headers) {
      if (String(key).toLowerCase() === String(name).toLowerCase())
        return value === undefined ? "" : String(value);
    }
    return null;
  }
  if (headers && typeof headers === "object") {
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === String(name).toLowerCase())
        return value === undefined ? "" : String(value);
    }
  }
  return null;
}
function argumentValue(context: SemanticContext, name: string) {
  const args = context.arguments;
  if (args instanceof Map) return args.has(name) ? args.get(name) : undefined;
  if (args && Object.prototype.hasOwnProperty.call(args, name))
    return (args as Record<string, unknown>)[name];
  return undefined;
}
function captureValue(captures: Captures, name: string) {
  const match = String(name).match(/^([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)$/);
  if (!match) return { found: false, value: undefined };
  const values = captures.get(match[1]);
  if (!values) return { found: true, value: undefined };
  return { found: true, value: values[Number(match[2])] };
}
export function resolveSemanticVariable(
  name: unknown,
  context: SemanticContext,
  captures: Captures = new Map(),
) {
  const key = String(name);
  if (key === "url") return context.url;
  if (key === "request.method")
    return context.request?.method ?? context.method;
  if (key === "response.status")
    return context.response?.status ?? context.response?.statusCode;
  const header = headerVariable(key);
  if (header) {
    const headers =
      header.phase === "request"
        ? context.request?.headers
        : context.response?.headers;
    return lookupHeader(headers, header.name);
  }
  const captured = captureValue(captures, key);
  if (captured.found) return captured.value;
  return argumentValue(context, key);
}
// Preserve the distinction between an escaped template and a template after
// an escaped backslash. The decoded value alone cannot represent both cases.
export function stringTemplateParts(node: RewriteValue | ScriptValue | undefined): [kind: "s" | "v", text: string][] {
  if (node?.type === "raw-string") return [["s", String(node.value)]];
  if (node?.type !== "string")
    throw new TypeError("Expected a string template");
  const raw = typeof node.raw === "string" && node.raw.startsWith('"');
  const text = raw ? node.raw.slice(1, -1) : String(node.value);
  const parts: [kind: "s" | "v", text: string][] = [];
  let literal = "";
  const flush = () => {
    if (literal) {
      parts.push(["s", literal]);
      literal = "";
    }
  };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\\" && i + 1 < text.length) {
      if (text.slice(i + 1, i + 3) === "${") {
        literal += "${";
        i += 2;
        continue;
      }
      if (raw) {
        const n: string = text[++i];
        literal +=
          (
            { n: "\n", r: "\r", t: "\t", '"': '"', "\\": "\\" } as Record<
              string,
              string
            >
          )[n] ?? "\\" + n;
        continue;
      }
    }
    if (text.slice(i, i + 2) === "${") {
      let j = i + 2,
        quote: string | null = null,
        escaped = false;
      for (; j < text.length; j++) {
        const c: string = text[j];
        if (quote) {
          if (escaped) escaped = false;
          else if (c === "\\") escaped = true;
          else if (c === quote) quote = null;
        } else if (c === "'") quote = c;
        else if (c === "}") break;
      }
      if (j === text.length)
        throw new SemanticEvaluationError("Unterminated string template");
      flush();
      parts.push(["v", text.slice(i + 2, j)]);
      i = j;
    } else literal += text[i];
  }
  flush();
  return parts;
}
function expandSemanticString(node: StringNode, context: SemanticContext, captures: Captures) {
  let text = "";
  for (const [kind, value] of stringTemplateParts(node)) {
    const v =
      kind === "s" ? value : resolveSemanticVariable(value, context, captures);
    if (v === undefined) return undefined;
    text += String(v);
  }
  return text;
}
function literalValue(node: RewriteValue, context: SemanticContext, captures: Captures) {
  if (!node) return undefined;
  switch (node.type) {
    case "variable":
      return resolveSemanticVariable(node.name, context, captures);
    case "string":
      return expandSemanticString(node, context, captures);
    case "raw-string":
    case "number":
    case "boolean":
    case "null":
      return node.value;
    case "regex":
      return node;
    default:
      throw new SemanticEvaluationError(
        "Unsupported condition value node: " + node.type,
      );
  }
}
function comparison(node: ComparisonNode, context: SemanticContext, captures: Captures): ConditionResult {
  const next = cloneCaptures(captures);
  const left = literalValue(node.left, context, next);
  if (node.operator === "==") {
    const right = literalValue(node.right, context, next);
    return { matched: Object.is(left, right), captures: next };
  }
  if (node.operator !== "~=") {
    throw new SemanticEvaluationError(
      "Unsupported condition operator: " + node.operator,
    );
  }
  const regex = resolveConditionRegex(
    literalValue(node.right, context, next),
  );
  if (!regex) return { matched: false, captures: next };
  let match: RegExpExecArray | null;
  try {
    match = execSourceRegex(regex, left);
  } catch {
    return { matched: false, captures: next };
  }
  if (!match) return { matched: false, captures: next };
  if (node.capture) {
    next.set(node.capture, Array.from(match));
  }
  return { matched: true, captures: next };
}
function evaluateNode(node: RewriteCondition, context: SemanticContext, captures: Captures): ConditionResult {
  if (!node) throw new SemanticEvaluationError("Missing condition node");
  if (node.type === "group")
    return evaluateNode(node.expression, context, captures);
  if (node.type === "comparison") return comparison(node, context, captures);
  if (node.type === "logical") {
    if (node.operator === "&&") {
      const left = evaluateNode(
        node.left,
        context,
        cloneCaptures(captures),
      );
      if (!left.matched)
        return { matched: false, captures: cloneCaptures(captures) };
      const right = evaluateNode(node.right, context, left.captures);
      if (!right.matched)
        return { matched: false, captures: cloneCaptures(captures) };
      return right;
    }
    if (node.operator === "||") {
      const left = evaluateNode(
        node.left,
        context,
        cloneCaptures(captures),
      );
      if (left.matched) return left;
      return evaluateNode(node.right, context, cloneCaptures(captures));
    }
    throw new SemanticEvaluationError(
      "Unsupported logical operator: " + (node as { operator: unknown }).operator,
    );
  }
  throw new SemanticEvaluationError("Unsupported condition node: " + (node as { type: unknown }).type);
}
export function evaluateCondition(
  condition: RewriteCondition,
  context: SemanticContext = {},
  initialCaptures: Record<string, CaptureValues> | Captures = {},
) {
  const captures =
    initialCaptures instanceof Map
      ? cloneCaptures(initialCaptures)
      : new Map(Object.entries(initialCaptures || {}));
  const result = evaluateNode(condition, context, captures);
  return {
    matched: result.matched,
    captures: Object.fromEntries(result.captures),
  };
}

// WayX equivalence-planning result contract
// Author: chance
// Category: Converter / Core / Equivalence Planning
export const EQUIVALENCE_KINDS = Object.freeze({
  NATIVE: "native-equivalent",
  GUARDED: "guarded-helper",
  DISPATCHER: "phase-dispatcher",
  UNSUPPORTED: "unsupported",
});
function object<T>(value: T, label: string) {
  if (!value || typeof value !== "object")
    throw new TypeError(label + " must be an object");
  return value;
}
export function nativeEquivalent({ target, output, proof }: { target?: string; output?: unknown; proof?: { exact?: boolean } } = {}) {
  object(proof, "native-equivalent proof");
  if (proof!.exact !== true)
    throw new Error("native-equivalent requires proof.exact=true");
  return { kind: EQUIVALENCE_KINDS.NATIVE, target, output, proof };
}
export function guardedHelper({
  target,
  prefilter,
  runtime,
  proof,
}: { target?: string; prefilter?: unknown; runtime?: unknown; proof?: { noFalseNegatives?: boolean; safeNoop?: boolean } } = {}) {
  object(proof, "guarded-helper proof");
  if (proof!.noFalseNegatives !== true) {
    throw new Error("guarded-helper requires proof.noFalseNegatives=true");
  }
  if (proof!.safeNoop !== true) {
    throw new Error("guarded-helper requires proof.safeNoop=true");
  }
  return { kind: EQUIVALENCE_KINDS.GUARDED, target, prefilter, runtime, proof };
}
export function phaseDispatcher({
  target,
  phase,
  rules,
  runtime,
  proof,
}: { target?: string; phase?: string; rules?: readonly unknown[]; runtime?: unknown; proof?: { preservesOrder?: boolean; safeNoop?: boolean } } = {}) {
  object(proof, "phase-dispatcher proof");
  if (proof!.preservesOrder !== true) {
    throw new Error("phase-dispatcher requires proof.preservesOrder=true");
  }
  if (proof!.safeNoop !== true) {
    throw new Error("phase-dispatcher requires proof.safeNoop=true");
  }
  if (!Array.isArray(rules) || rules.length === 0) {
    throw new Error("phase-dispatcher requires at least one source rule");
  }
  return {
    kind: EQUIVALENCE_KINDS.DISPATCHER,
    target,
    phase,
    rules,
    runtime,
    proof,
  };
}
export function unsupported(reason: unknown, details: Record<string, unknown> = {}) {
  const message = String(reason || "").trim();
  if (!message) throw new Error("unsupported requires a non-empty reason");
  return { kind: EQUIVALENCE_KINDS.UNSUPPORTED, reason: message, details };
}
function targetMatch(result: unknown, index: number) {
  if (typeof result === "boolean") return result;
  if (
    result &&
    typeof result === "object" &&
    typeof (result as { matched?: unknown }).matched === "boolean"
  ) {
    return (result as { matched: boolean }).matched;
  }
  throw new TypeError(
    "target matcher model case " +
      index +
      " must return boolean or {matched:boolean}",
  );
}
/**
 * Differential evidence for one source condition against one target matcher model.
 *
 * This is intentionally evidence, not a proof generator: finite contexts can
 * expose false positives/negatives, but cannot by themselves establish full
 * semantic equivalence.
 */
export function differentialConditionOracle({
  condition,
  target = "target",
  targetModel,
  contexts = [],
}: { condition?: RewriteCondition; target?: string; targetModel?: (context: SemanticContext) => unknown; contexts?: SemanticContext[] } = {}) {
  if (!condition || typeof condition !== "object") {
    throw new TypeError("differential oracle requires a condition AST");
  }
  if (typeof targetModel !== "function") {
    throw new TypeError("differential oracle requires a target matcher model");
  }
  if (!Array.isArray(contexts) || contexts.length === 0) {
    throw new Error("differential oracle requires at least one context");
  }
  const cases = contexts.map((context, index) => {
    const sourceMatched = Boolean(
      evaluateCondition(condition, context).matched,
    );
    const targetMatched = targetMatch(targetModel(context), index);
    let classification = "match";
    if (sourceMatched && !targetMatched) classification = "false-negative";
    else if (!sourceMatched && targetMatched) classification = "false-positive";
    return { index, sourceMatched, targetMatched, classification };
  });
  const falseNegatives = cases.filter(
    (item) => item.classification === "false-negative",
  );
  const falsePositives = cases.filter(
    (item) => item.classification === "false-positive",
  );
  return {
    target: String(target || "target"),
    caseCount: cases.length,
    observedExact: falseNegatives.length === 0 && falsePositives.length === 0,
    noFalseNegatives: falseNegatives.length === 0,
    noFalsePositives: falsePositives.length === 0,
    falseNegatives,
    falsePositives,
    cases,
  };
}
// Modified: 2026-11-03 (chance). Target-aware regex compilation replaces the unused recursive flag stripper.

// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Modified: 2026-10-26 (chance). Native flags follow target/field policy;
// literal URL host separators follow the user-authorized tightening below.
// Source AST and JavaScript helper regexes retain their original semantics.
export function normalizeRegexBodyForTarget(pattern: unknown) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other regex-body rewriting.
  return String(pattern ?? "");
}
// Modified: 2026-10-26 (chance). User requests literal domain separators
// in both targets. Only URL authority dots between host labels are tightened;
// preserve existing escapes, classes, wildcard operators and the entire path.
export function normalizeUrlRegexForTarget(pattern: unknown) {
  const source = normalizeRegexBodyForTarget(pattern);
  const prefix = source.match(
    /^(?:\(\?[imsx-]+\))?\^?http(?:s|\(s\)|\(\?:s\))?\??:(?:\\?\/){2}/,
  );
  if (!prefix) return source;
  let out = source.slice(0, prefix[0].length),
    classDepth = 0,
    quoted = false;
  for (let i = prefix[0].length; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      out += ch;
      if (ch === "\\" && source[i + 1] === "E") {
        out += "E";
        i++;
        quoted = false;
      }
      continue;
    }
    if (ch === "\\") {
      if (source[i + 1] === "Q") quoted = true;
      if (source[i + 1] === "/" && !classDepth) return out + source.slice(i);
      out += source.slice(i, i + 2);
      i++;
      continue;
    }
    if (ch === "/" && !classDepth) return out + source.slice(i);
    if (ch === "[") classDepth++;
    if (ch === "]" && classDepth) classDepth--;
    const separator =
      ch === "." &&
      !classDepth &&
      /[A-Za-z0-9_)\]]/.test(source[i - 1] || "") &&
      /[A-Za-z0-9_(\[]/.test(source[i + 1] || "");
    out += separator ? "\\." : ch;
  }
  return out;
}
// Shared target-regex syntax repair; domain planners retain source provenance.
export function repairTargetRegexSyntax(pattern: unknown) {
  const source = String(pattern ?? "");
  let value = "",
    escaped = false,
    classDepth = 0,
    quoted = false,
    changed = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      value += ch;
      if (ch === "\\" && source[i + 1] === "E") {
        value += "E";
        i++;
        quoted = false;
      }
      continue;
    }
    if (escaped) {
      value += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      value += ch;
      if (source[i + 1] === "Q") {
        value += "Q";
        i++;
        quoted = true;
      } else escaped = true;
      continue;
    }
    if (ch === "[") classDepth++;
    if (ch === "]" && classDepth) classDepth--;
    const interval =
      !classDepth && ch === "{"
        ? source.slice(i).match(/^\{(\d+),[ \t]+(\d+)\}/)
        : null;
    if (interval && Number(interval[1]) <= Number(interval[2])) {
      value += "{" + interval[1] + "," + interval[2] + "}";
      i += interval[0].length - 1;
      changed = true;
    } else value += ch;
  }
  return { pattern: value, changed };
}
// Preserve regex backslashes when quoting a comma-separated Surge field.
export function surgeRegexParameter(pattern: unknown) {
  const value = String(pattern ?? "");
  return /[,\s"']/.test(value) ? '"' + value.replace(/"/g, '\\"') + '"' : value;
}
export function parseSurgeParameters(body: string, context: string = "Surge"): Map<string, string> {
  const fields: string[] = [];
  let part = "",
    quote: string | null = null,
    escaped = false;
  for (const ch of body) {
    if (quote) {
      part += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      part += ch;
    } else if (ch === ",") {
      fields.push(part.trim());
      part = "";
    } else part += ch;
  }
  if (quote) throw new Error(context + ": unclosed parameter quote");
  fields.push(part.trim());
  const params = new Map<string, string>();
  for (const field of fields) {
    const match = field.match(/^([a-z][a-z0-9-]*)=(.+)$/i);
    if (!match || params.has(match[1].toLowerCase()))
      throw new Error(context + ": malformed/duplicate parameter: " + field);
    const raw = match[2].trim();
    let value = raw;
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      value = raw.slice(1, -1);
      if (raw[0] === '"') value = value.replace(/\\"/g, '"');
    }
    params.set(match[1].toLowerCase(), value);
  }
  return params;
}
// This checks configuration transport and portable regex syntax. It does not
// claim JavaScript and the clients' ICU engines have identical semantics.
const targetRegexInventory = new Map<string, string>();
export function targetRegexValidationInventory() {
  return [...targetRegexInventory].map(([pattern, label]) => ({
    pattern,
    label,
  }));
}
export function validateTargetRegex(
  pattern: unknown,
  label: string,
  { token = false }: { token?: boolean } = {},
) {
  const value = String(pattern ?? "");
  if (
    !value ||
    /[\r\n\0]/.test(value) ||
    /^(?:undefined|null|NaN)$/.test(value) ||
    /\$\{[^}]+\}/.test(value) ||
    (token && /\s/.test(value))
  ) {
    throw new Error(label + ": missing or malformed target regex: " + value);
  }
  // Modified: 2026-11-01 (chance). ICU extended mode owns comment/whitespace
  // parsing; JS/parenthesis heuristics cannot validate comments containing ().
  if (/\(\?[imsx-]*x[imsx-]*[:)]/.test(value)) {
    targetRegexInventory.set(value, label);
    return;
  }
  let escaped = false,
    classDepth = 0,
    nestedClass = false,
    depth = 0;
  const structural = value
    .replace(/\\Q[\s\S]*?(?:\\E|$)/g, "literal")
    .replace(/\(\?#[^)]*\)/g, "");
  for (const ch of structural) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === "[") {
      if (classDepth) nestedClass = true;
      classDepth++;
      continue;
    }
    if (classDepth) {
      if (ch === "]") classDepth--;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")" && --depth < 0)
      throw new Error(label + ": unbalanced target regex: " + value);
  }
  if (escaped || classDepth || depth)
    throw new Error(label + ": unbalanced target regex: " + value);
  // Leave dialect-specific constructs to the client engine, while still
  // enforcing the structural/transport checks above for every expression.
  targetRegexInventory.set(value, label);
  if (nestedClass || /\\[pPQN]|\(\?>|(?:[*+?]|\})\+|\(\?[imsx-]+:/.test(value))
    return;
  const portable = value
    .replace(/\(\?[imsx-]+\)/g, "")
    .replace(/\(\?#[^)]*\)/g, "");
  try {
    new RegExp(portable);
  } catch (error) {
    throw new Error(
      label + ": invalid target regex: " + value + " (" + error.message + ")",
    );
  }
}
// Modified: 2026-11-05 (chance). Preserve Loon ims in QX URL/Header/Body/Script
// just as in Surge; native QX input bypasses this compiler. Only Surge body
// needs compensation for its default multiline mode.
export const TARGET_REGEX_CAPABILITIES = Object.freeze(
  Object.fromEntries(
    ["qx", "surge", "generic"].map((target: string) => [
      target,
      Object.freeze(
        Object.fromEntries(
          ["url", "body", "header", "script"].map((field: string) => [
            field,
            Object.freeze({
              inlineFlags: ["qx", "surge"].includes(target)
                ? "verified"
                : "temporarily-disabled",
              flags: target === "surge" ? "imsx" : "ims",
              emitFlags:
                target === "surge"
                  ? "imsx"
                  : target === "qx"
                    ? "ims"
                    : "",
            }),
          ]),
        ),
      ),
    ]),
  ),
);
export function targetRegexCapability(target: string | number, subject: string | number) {
  return (
    TARGET_REGEX_CAPABILITIES[target]?.[subject] ??
    TARGET_REGEX_CAPABILITIES.generic.url
  );
}
export function compileRegexForTarget(
  regex: SourceRegex,
  { subject = "url", target = "generic", requireEquivalent = false }: { subject?: string; target?: string; requireEquivalent?: boolean } = {},
) {
  if (!regex || regex.type !== "regex")
    throw new TypeError("Expected Rewrite v2 regex AST node");
  const pattern =
    subject === "url" || subject === "script"
      ? normalizeUrlRegexForTarget(regex.pattern)
      : normalizeRegexBodyForTarget(regex.pattern);
  const flags = String(regex.flags || "");
  assertRegexNode(regex);
  const capability = targetRegexCapability(target, subject);
  const mappedFlags = [...capability.emitFlags]
    .filter((flag: string) => flags.includes(flag))
    .join("");
  const omittedFlags = [...flags]
    .filter((flag: string) => !mappedFlags.includes(flag))
    .join("");
  const compatibilityUnverified =
    Boolean(flags) && capability.inlineFlags !== "verified";
  if (requireEquivalent && (omittedFlags || compatibilityUnverified))
    return {
      ok: false as const,
      reason:
        target +
        " native " +
        subject +
        " regex cannot preserve source flags " +
        flags +
        " under the selected mapping policy",
      pattern,
      sourceFlags: flags,
    };
  // Modified: 2026-11-01 (chance). Disable Surge body default m when the
  // source did not enable it; an explicit inline source group can override it.
  const disableMultiline =
    target === "surge" && subject === "body" && !flags.includes("m");
  const prefix =
    mappedFlags || disableMultiline
      ? "(?" + mappedFlags + (disableMultiline ? "-m" : "") + ")"
      : "";
  const targetPattern = prefix + pattern;
  return {
    ok: true as const,
    pattern: targetPattern,
    sourceFlags: flags,
    mappedFlags,
    omittedFlags,
    compatibilityUnverified,
    capability,
    notes: [],
  };
}

// Quantumult X official capability registry used by WayX validation
// Author: chance
// Category: Converter / Quantumult X / Adblock Capability Gate
// WayX converts Loon ad-block plugins only. The target capability gate is
// intentionally limited to source-relevant Rule types, Rewrite actions and
// MITM hostname. Full-profile routing/configuration features are out of scope.
export const QX_WAYX_FILTER_TYPES = new Set([
  "host",
  "host-suffix",
  "host-keyword",
  "host-wildcard",
  "ip-cidr",
  "ip6-cidr",
  "geoip",
  "ip-asn",
  "user-agent",
]);
export const QX_WAYX_REWRITE_MATCHERS = new Set(["url", "url-and-header"]);
export const QX_WAYX_SCRIPT_ACTIONS = new Set([
  "script-request-header",
  "script-request-body",
  "script-response-header",
  "script-response-body",
  "script-echo-response",
  "script-analyze-echo-response",
]);
// QX owns repeat-request backoff for native URL reject (0–5 s response delay).
// Conversion and validation share these actions; do not emulate delay in JS.
export const QX_WAYX_REJECT_ACTIONS = new Set([
  "reject",
  "reject-200",
  "reject-img",
  "reject-dict",
  "reject-array",
]);
export const QX_WAYX_NATIVE_REWRITE_ACTIONS = new Set([
  ...QX_WAYX_REJECT_ACTIONS,
  "302",
  "307",
  "jsonjq-request-body",
  "jsonjq-response-body",
  "request-header",
  "response-header",
  "request-body",
  "response-body",
  "echo-response",
  ...QX_WAYX_SCRIPT_ACTIONS,
]);
export const QX_WAYX_SNIPPET_MITM_KEYS = new Set(["hostname"]);

// Surge official capability registry used by WayX validation
// Author: chance
// Category: Converter / Surge / Adblock Capability Gate
// WayX converts Loon ad-block plugins only. This registry deliberately tracks
// only source-relevant Rule types, Rewrite capabilities and MITM hostname.
export const SURGE_WAYX_RULE_TYPES = new Set([
  "DOMAIN",
  "DOMAIN-SUFFIX",
  "DOMAIN-KEYWORD",
  "DOMAIN-WILDCARD",
  "DOMAIN-SET",
  "IP-CIDR",
  "IP-CIDR6",
  "GEOIP",
  "IP-ASN",
  "USER-AGENT",
  "URL-REGEX",
  "PROCESS-NAME",
  "DEST-PORT",
  "SRC-PORT",
  "IN-PORT",
  "SRC-IP",
  "DEVICE-NAME",
  "MAC-ADDRESS",
  "PROTOCOL",
  "HOSTNAME-TYPE",
  "SUBNET",
  "CELLULAR-RADIO",
  "CELLULAR-CARRIER",
  "AND",
  "OR",
  "NOT",
  "SCRIPT",
  "RULE-SET",
]);
export const SURGE_WAYX_RULE_BUILTIN_POLICIES = new Set([
  "DIRECT",
  "REJECT",
  "REJECT-DROP",
  "REJECT-NO-DROP",
  "REJECT-TINYGIF",
  "CELLULAR",
  "CELLULAR-ONLY",
  "HYBRID",
  "NO-HYBRID",
]);
export const SURGE_WAYX_REWRITE_SECTIONS = new Set([
  "URL Rewrite",
  "Header Rewrite",
  "Body Rewrite",
  "Map Local",
  "Script",
]);
export const SURGE_WAYX_URL_REWRITE_TYPES = new Set([
  "header",
  "302",
  "307",
  "reject",
]);
export const SURGE_WAYX_HEADER_REWRITE_ACTIONS = new Set([
  "header-add",
  "header-del",
  "header-replace",
  "header-replace-regex",
]);
export const SURGE_WAYX_BODY_REWRITE_TYPES = new Set([
  "http-request",
  "http-response",
  "http-request-jq",
  "http-response-jq",
]);
export const SURGE_WAYX_MAP_LOCAL_DATA_TYPES = new Set([
  "file",
  "text",
  "tiny-gif",
  "base64",
]);
export const SURGE_WAYX_SCRIPT_TYPES = new Set([
  "http-request",
  "http-response",
  "cron",
  "event",
  "generic",
]);
export const SURGE_WAYX_MITM_KEYS = new Set(["hostname"]);
function targetRegexCompilerSource() {
  return compileSourceRegex.toString();
}
// 上游错误 / 转换失败案例：将 Loon 的 /pattern/flags 当作目标正则语法。
// JavaScript helpers preserve regex bodies and i/m/s via RegExp(source, flags).
// One policy covers literal and dynamic condition regexes in both targets.
export function conditionRuntimeSource() {
  return (
    "const SUPPORTED_FLAGS=/^[ims]*$/;\n" +
    [
      scanSourceRegexLiteral,
      resolveConditionRegex,
      assertRegexNode,
      execSourceRegex,
      SemanticEvaluationError,
      cloneCaptures,
      decodeHeaderName,
      headerVariable,
      lookupHeader,
      argumentValue,
      captureValue,
      resolveSemanticVariable,
      stringTemplateParts,
      expandSemanticString,
      literalValue,
      comparison,
      evaluateNode,
      evaluateCondition,
    ]
      .map((fn) => fn.toString())
      .join("\n") +
    "\n" +
    targetRegexCompilerSource()
  );
}
// Source action oracle for the Header/Body/JSON dispatcher subset. Path parsing
// is injected from the source grammar; target emitters use their own lowering.
export function evaluateRewriteActions(
  ast: RewriteDeclaration & { raw: string },
  context: SemanticContext,
  {
    parsePath,
    mockFiles,
    jsonReplaceSetsPath = false,
    jsonAddSetsPath = false,
  }: { parsePath?: (path: string) => (string | number)[]; mockFiles?: ReadonlyMap<string, RewriteDependencyRecord>; jsonReplaceSetsPath?: boolean; jsonAddSetsPath?: boolean } = {},
) {
  const state = structuredClone(context);
  const condition = evaluateCondition(ast.condition, state);
  if (!condition.matched) return { matched: false, state, errors: [] };
  const captures = new Map(Object.entries(condition.captures));
  const value = (node: RewriteValue): unknown => {
    if (node.type === "variable") {
      const resolved = resolveSemanticVariable(node.name, state, captures);
      if (resolved === undefined)
        throw new SemanticEvaluationError("missing action capture/variable");
      return resolved;
    }
    if (node.type !== "string") return (node as { value?: unknown }).value;
    const text = expandSemanticString(node, state, captures);
    if (text === undefined)
      throw new SemanticEvaluationError("missing action capture/variable");
    return text;
  };
  const stringValue = (node: RewriteValue) => {
    const v = value(node);
    if (typeof v !== "string")
      throw new SemanticEvaluationError("action operand must be String");
    return v;
  };
  const put = (object: object, key: PropertyKey, v: unknown) =>
    Object.defineProperty(object, key, {
      value: v,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  const errors: { action: string; reason: string }[] = [];
  for (const [actionIndex, action] of ast.actions.entries()) {
    const groups =
      action.args[0]?.type === "array"
        ? action.args[0].items.map((_, i) =>
            action.args.map((a) => (a as Extract<RewriteValue, { type: "array" }>).items[i]),
          )
        : [action.args];
    for (const args of groups)
      try {
        const phase = (state[ast.phase] ||= {});
        const operation = action.name.split(".").at(-1);
        if (action.name.includes(".header.")) {
          const headers = (phase.headers ||= {});
          const name: string = stringValue(args[0]);
          const keys = Object.keys(headers).filter(
            (k: string) => k.toLowerCase() === String(name).toLowerCase(),
          );
          if (operation === "set") {
            const replacement: string = stringValue(args[1]);
            for (const k of keys) delete headers[k];
            put(headers, keys[0] || name, replacement);
          } else if (operation === "del") {
            for (const k of keys) delete headers[k];
          } else if (operation === "replace") {
            const replacement: string = stringValue(args[2]);
            for (const k of keys)
              headers[k] = replaceSourceRegex(
                args[1] as SourceRegex,
                String(headers[k]),
                replacement,
              );
          } else
            throw new SemanticEvaluationError(
              "unsupported oracle header action: " + operation,
            );
        } else if (
          ast.phase === "request" &&
          ["request.body.mock", "request.body.mock_file"].includes(action.name)
        ) {
          const mime: Record<string, string> = {
            json: "application/json",
            text: "text/plain; charset=utf-8",
            css: "text/css; charset=utf-8",
            html: "text/html; charset=utf-8",
            javascript: "application/javascript; charset=utf-8",
            plain: "text/plain; charset=utf-8",
          };
          const type: string = stringValue(args[0]).toLowerCase();
          if (
            !Object.prototype.hasOwnProperty.call(mime, type) ||
            (args[2] && value(args[2]) !== false)
          )
            throw new SemanticEvaluationError(
              "oracle only supports text request mocks",
            );
          const files = mockFiles?.get(ast.raw);
          const dependency = files?.byAction
            ? Object.prototype.hasOwnProperty.call(files.byAction, actionIndex)
              ? files.byAction[actionIndex]
              : null
            : ast.actions.filter(
                  (a) => a.name === "request.body.mock_file",
                ).length === 1
              ? files
              : null;
          const body =
            operation === "mock_file"
              ? dependency?.bodyText
              : stringValue(args[1]);
          if (typeof body !== "string")
            throw new SemanticEvaluationError("missing text mock dependency");
          const headers = (phase.headers ||= {});
          const keys = Object.keys(headers).filter(
            (k: string) => k.toLowerCase() === "content-type",
          );
          for (const key of keys) delete headers[key];
          put(headers, keys[0] || "Content-Type", mime[type]);
          phase.body = body;
        } else if (action.name.includes(".body.") && operation === "replace") {
          phase.body = replaceSourceRegex(
            args[0] as SourceRegex,
            String(phase.body ?? ""),
            stringValue(args[1]),
          );
        } else if (
          action.name.includes(".json.") &&
          ["add", "delete", "replace"].includes(operation!)
        ) {
          const replacement =
            operation === "delete" ? undefined : value(args[1]);
          let json: unknown;
          try {
            json = JSON.parse(String(phase.body ?? ""));
          } catch {
            continue;
          }
          if (json === null || typeof json !== "object") continue;
          const path = parsePath!(stringValue(args[0]));
          let parent: Record<PropertyKey, unknown> | null = json as Record<PropertyKey, unknown>;
          for (let i = 0; i < path.length - 1; i++) {
            const key: string | number = path[i];
            if (parent == null || typeof parent !== "object") {
              parent = null;
              break;
            }
            if (
              !Object.prototype.hasOwnProperty.call(parent, key) ||
              ((operation === "add" ||
                (operation === "replace" && jsonReplaceSetsPath)) &&
                parent[key] == null)
            ) {
              if (
                operation !== "add" &&
                !(operation === "replace" && jsonReplaceSetsPath)
              ) {
                parent = null;
                break;
              }
              put(parent, key, typeof path[i + 1] === "number" ? [] : {});
            }
            parent = parent[key] as Record<PropertyKey, unknown> | null;
          }
          if (parent != null && typeof parent === "object") {
            const key = path.at(-1)!,
              current = Object.prototype.hasOwnProperty.call(parent, key)
                ? parent[key]
                : undefined;
            if (operation === "delete") {
              if (Array.isArray(parent) && typeof key === "number") {
                if (key < parent.length) parent.splice(key, 1);
              } else delete parent[key];
            } else if (
              operation === "add"
                ? jsonAddSetsPath || current == null
                : jsonReplaceSetsPath ||
                  Object.prototype.hasOwnProperty.call(parent, key)
            )
              put(parent, key, replacement);
          }
          phase.body = JSON.stringify(json);
        } else
          throw new SemanticEvaluationError(
            "unsupported oracle action: " + action.name,
          );
      } catch (error) {
        errors.push({ action: action.name, reason: error.message });
      }
  }
  return { matched: true, state, errors };
}
export function replaceSourceRegex(
  node: SourceRegex,
  text: string,
  replacement: unknown,
) {
  const match = compileSourceRegex(node).exec(text);
  if (!match) return text;
  const out = String(replacement).replace(
    /\$(\d+)/g,
    (_: string, index) => match[Number(index)] ?? "",
  );
  return (
    text.slice(0, match.index) + out + text.slice(match.index + match[0].length)
  );
}
export function regexReplacementRuntimeSource() {
  return (
    "const __wayxRegexReplace=(()=>{const SUPPORTED_FLAGS=/^[ims]*$/;" +
    [assertRegexNode, replaceSourceRegex]
      .map((fn) => fn.toString())
      .join("\n") +
    "\n" +
    targetRegexCompilerSource() +
    ';return (text,pattern,flags,replacement)=>replaceSourceRegex({type:"regex",pattern,flags},String(text),replacement);})();'
  );
}
