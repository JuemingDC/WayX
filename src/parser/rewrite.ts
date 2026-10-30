import type { RewriteAst, RewriteSemanticIr } from "../domain/contracts.ts";
// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript parser layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Modified: 2026-10-26 (chance). Normalize literal URL host dots in target fields only.
// Category: Converter / rewrite
import {
  scanSourceRegexLiteral,
  normalizeRegexBodyForTarget,
  normalizeUrlRegexForTarget,
  surgeRegexParameter,
  compileRegexForTarget,
  conditionRuntimeSource,
  compileSourceRegex,
  stringTemplateParts,
} from "../domain/core.ts";
import {
  renderQxHeaderScript,
  renderQxInlineMockScript,
  renderSurgeRequestMockScript,
  renderQxMockFileScript,
  renderQxRejectScript,
  headerOpsForMock,
  renderMixedRewriteScript,
  renderSingleJsonMutationScript,
  renderSingleRewriteMutationScript,
} from "../emit/runtime.ts";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { surgeRewriteArgumentPayload } from "./script.ts";

// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Rewrite / Domain
// WayX Loon Rewrite v2 tokenizer/parser/AST
// Author: chance
// Category: Converter / Rewrite v2
const BT: any = String.fromCharCode(96),
  PUN: any = "(),[].|";
function fail(s: any, i: any, m: any): any {
  throw new SyntaxError(
    m +
      " at column " +
      (i + 1) +
      "\n" +
      s +
      "\n" +
      " ".repeat(Math.max(0, i)) +
      "^",
  );
}
function dq(r: any): any {
  let o: any = "";
  for (let i: any = 1; i < r.length - 1; i++) {
    let c: any = r[i];
    if (c !== "\\") {
      o += c;
      continue;
    }
    let n: any = r[++i];
    o +=
      n === "n"
        ? "\n"
        : n === "r"
          ? "\r"
          : n === "t"
            ? "\t"
            : n === '"'
              ? '"'
              : n === "\\"
                ? "\\"
                : "\\" + n;
  }
  return o;
}
export function tokenizeRewriteV2(source: any): any {
  const s: any = String(source ?? ""),
    a: any = [];
  let i: any = 0;
  const add: any = (
    type: any,
    raw: any,
    value: any = raw,
    start: any = i,
    end: any = i + raw.length,
  ): any => a.push({ type, raw, value, start, end });
  while (i < s.length) {
    let c: any = s[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    let st: any = i,
      t: any = s.slice(i, i + 2);
    if (["&&", "||", "==", "~="].includes(t)) {
      add("operator", t, t, st, i + 2);
      i += 2;
      continue;
    }
    if (PUN.includes(c)) {
      add("punct", c, c, st, ++i);
      continue;
    }
    if (c === "$" && s[i + 1] === "{") {
      i += 2;
      let d: any = 1,
        q: any = null,
        e: any = false;
      while (i < s.length && d) {
        c = s[i];
        if (q) {
          if (e) e = false;
          else if (c === "\\") e = true;
          else if (c === q) q = null;
          i++;
          continue;
        }
        if (c === "'") {
          q = c;
          i++;
          continue;
        }
        if (c === "{") d++;
        else if (c === "}") d--;
        i++;
      }
      if (d) fail(s, st, "Unterminated variable");
      let r: any = s.slice(st, i);
      add("variable", r, r.slice(2, -1), st, i);
      continue;
    }
    if (c === '"') {
      i++;
      let e: any = false,
        ok: any = false;
      while (i < s.length) {
        c = s[i++];
        if (e) {
          e = false;
          continue;
        }
        if (c === "\\") {
          e = true;
          continue;
        }
        if (c === '"') {
          ok = true;
          break;
        }
      }
      if (!ok) fail(s, st, "Unterminated string");
      let r: any = s.slice(st, i);
      add("string", r, dq(r), st, i);
      continue;
    }
    if (c === BT) {
      i++;
      let ok: any = false;
      while (i < s.length) {
        if (s[i] !== BT) {
          i++;
          continue;
        }
        if (s[i + 1] === BT) {
          i += 2;
          continue;
        }
        i++;
        ok = true;
        break;
      }
      if (!ok) fail(s, st, "Unterminated raw string");
      let r: any = s.slice(st, i);
      add(
        "raw-string",
        r,
        r
          .slice(1, -1)
          .split(BT + BT)
          .join(BT),
        st,
        i,
      );
      continue;
    }
    if (c === "/") {
      let regex: any;
      try {
        regex = scanSourceRegexLiteral(s, st);
      } catch (error: any) {
        fail(s, st, error.message);
      }
      i = regex.end;
      add(
        "regex",
        s.slice(st, i),
        { pattern: regex.pattern, flags: regex.flags },
        st,
        i,
      );
      continue;
    }
    let n: any = s
      .slice(i)
      .match(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (n) {
      let r: any = n[0];
      i += r.length;
      add("number", r, Number(r), st, i);
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      i++;
      while (i < s.length && /[A-Za-z0-9_-]/.test(s[i])) i++;
      let r: any = s.slice(st, i);
      add("identifier", r, r, st, i);
      continue;
    }
    fail(s, i, "Unexpected character " + JSON.stringify(c));
  }
  a.push({ type: "eof", raw: "", value: null, start: s.length, end: s.length });
  return a;
}
class Parser {
  s: string;
  t: any[];
  i: number;
  constructor(s: any) {
    this.s = String(s ?? "");
    this.t = tokenizeRewriteV2(this.s);
    this.i = 0;
  }
  p(n: any = 0): any {
    return this.t[Math.min(this.i + n, this.t.length - 1)];
  }
  is(t: any, v: any, n: any = 0): any {
    let x: any = this.p(n);
    return x.type === t && (v === undefined || x.value === v);
  }
  kw(v: any): any {
    return this.is("identifier", v);
  }
  next(): any {
    return this.t[this.i++];
  }
  need(t: any, v: any, m: any = undefined): any {
    let x: any = this.p();
    if (!this.is(t, v))
      fail(
        this.s,
        x.start,
        m || "Expected " + (v ?? t) + ", got " + (x.raw || x.type),
      );
    return this.next();
  }
  parse(): any {
    let q: any = this.need(
        "identifier",
        undefined,
        "Expected request or response",
      ),
      phase: any = q.value.toLowerCase();
    if (!["request", "response"].includes(phase))
      fail(this.s, q.start, "Unsupported rewrite phase " + q.raw);
    this.need("identifier", "if");
    let condition: any = this.or();
    this.need("identifier", "then");
    let actions: any = this.pipe();
    this.need("eof", undefined, "Unexpected trailing token");
    return {
      type: "rewrite",
      syntax: "loon-rewrite-v2",
      phase,
      condition,
      actions,
      raw: this.s,
    };
  }
  or(): any {
    let l: any = this.and();
    while (this.is("operator", "||")) {
      this.next();
      l = { type: "logical", operator: "||", left: l, right: this.and() };
    }
    return l;
  }
  and(): any {
    let l: any = this.primary();
    while (this.is("operator", "&&")) {
      this.next();
      l = { type: "logical", operator: "&&", left: l, right: this.primary() };
    }
    return l;
  }
  primary(): any {
    if (this.is("punct", "(")) {
      this.next();
      let e: any = this.or();
      this.need("punct", ")", "Expected closing condition parenthesis");
      return { type: "group", expression: e };
    }
    return this.cmp();
  }
  cmp(): any {
    let left: any = this.val(false),
      o: any = this.need("operator", undefined, "Expected == or ~="),
      right: any = this.val(false),
      capture: any = null;
    if (!["==", "~="].includes(o.value))
      fail(this.s, o.start, "Unsupported comparison " + o.raw);
    if (this.kw("as")) {
      if (o.value !== "~=")
        fail(this.s, this.p().start, "as capture is only valid after ~=");
      this.next();
      capture = this.need(
        "identifier",
        undefined,
        "Expected capture name",
      ).value;
    }
    return { type: "comparison", operator: o.value, left, right, capture };
  }
  pipe(): any {
    let a: any = [this.action()];
    while (this.is("punct", "|")) {
      this.next();
      a.push(this.action());
    }
    return a;
  }
  action(): any {
    let n: any = [
      this.need("identifier", undefined, "Expected action name").value,
    ];
    while (this.is("punct", ".")) {
      this.next();
      n.push(
        this.need("identifier", undefined, "Expected action name after dot")
          .value,
      );
    }
    let args: any = [];
    if (this.is("punct", "(")) {
      this.next();
      if (!this.is("punct", ")"))
        for (;;) {
          args.push(this.val(true));
          if (!this.is("punct", ",")) break;
          this.next();
        }
      this.need("punct", ")", "Expected closing action parenthesis");
    }
    return { type: "action", name: n.join("."), args };
  }
  val(arr: any): any {
    let x: any = this.p();
    if (arr && this.is("punct", "[")) return this.array();
    if (x.type === "variable") {
      this.next();
      return { type: "variable", name: x.value, raw: x.raw };
    }
    if (["string", "raw-string"].includes(x.type)) {
      this.next();
      return { type: x.type, value: x.value, raw: x.raw };
    }
    if (x.type === "regex") {
      this.next();
      return {
        type: "regex",
        pattern: x.value.pattern,
        flags: x.value.flags,
        raw: x.raw,
      };
    }
    if (x.type === "number") {
      this.next();
      return { type: "number", value: x.value, raw: x.raw };
    }
    if (x.type === "identifier" && ["true", "false"].includes(x.value)) {
      this.next();
      return { type: "boolean", value: x.value === "true", raw: x.raw };
    }
    if (x.type === "identifier" && x.value === "null") {
      this.next();
      return { type: "null", value: null, raw: x.raw };
    }
    fail(this.s, x.start, "Expected value, got " + (x.raw || x.type));
  }
  array(): any {
    this.need("punct", "[");
    let items: any = [];
    if (!this.is("punct", "]"))
      for (;;) {
        if (this.is("punct", "["))
          fail(this.s, this.p().start, "Nested arrays are not supported");
        items.push(this.val(false));
        if (!this.is("punct", ",")) break;
        this.next();
      }
    this.need("punct", "]", "Expected closing array bracket");
    return { type: "array", items };
  }
}
export function parseRewriteV2(s: string): RewriteAst {
  return new Parser(s).parse();
}
// Preserve every action with its original dependency index for separate output.
export function selectRewritePipelineLayer(ast: any): any {
  if (ast.sourceActionIndices) return ast;
  if (ast.actions.length < 2) return ast;
  return {
    ...ast,
    sourceActionIndices: ast.actions.map((_: any, index: any): any => index),
    sourceActionCount: ast.actions.length,
  };
}
export function isRewriteV2(s: any): any {
  return /^\s*(?:request|response)\s+if\b/.test(String(s ?? ""));
}
export function valueToSource(n: any): any {
  if (n.type === "array")
    return "[" + n.items.map(valueToSource).join(", ") + "]";
  if (n.raw != null) return n.raw;
  throw new TypeError("Unsupported value " + n.type);
}
function prec(n: any): any {
  return n.type === "logical"
    ? n.operator === "||"
      ? 1
      : 2
    : n.type === "group"
      ? 4
      : 3;
}
export function conditionToSource(n: any, p: any = 0): any {
  if (n.type === "comparison")
    return (
      valueToSource(n.left) +
      " " +
      n.operator +
      " " +
      valueToSource(n.right) +
      (n.capture ? " as " + n.capture : "")
    );
  if (n.type === "group") return "(" + conditionToSource(n.expression) + ")";
  if (n.type === "logical") {
    let q: any = prec(n),
      b: any =
        conditionToSource(n.left, q) +
        " " +
        n.operator +
        " " +
        conditionToSource(n.right, q);
    return q < p ? "(" + b + ")" : b;
  }
  throw new TypeError("Unsupported condition " + n.type);
}
export function actionToSource(n: any): any {
  if (n.type !== "action") throw new TypeError("Unsupported action " + n.type);
  return n.args.length
    ? n.name + "(" + n.args.map(valueToSource).join(", ") + ")"
    : n.name;
}
export function rewriteV2ToSource(a: any): any {
  if (!a || a.type !== "rewrite")
    throw new TypeError("Expected Rewrite v2 AST");
  return (
    a.phase +
    " if " +
    conditionToSource(a.condition) +
    " then " +
    a.actions.map(actionToSource).join(" | ")
  );
}
export function findRewriteComparisons(
  n: any,
  p: any = (): any => true,
  o: any = [],
): any {
  if (!n) return o;
  if (n.type === "comparison") {
    if (p(n)) o.push(n);
    return o;
  }
  if (n.type === "group") return findRewriteComparisons(n.expression, p, o);
  if (n.type === "logical") {
    findRewriteComparisons(n.left, p, o);
    findRewriteComparisons(n.right, p, o);
  }
  return o;
}
// Target-neutral Rewrite Semantic IR
// Author: chance
// Category: Converter / Rewrite / Semantic IR
const LEGACY_REJECT_VARIANTS: any = new Map([
  [
    "reject",
    {
      variant: "generic",
      status: null,
      surgeSection: "url",
      surgeArguments: "_ reject",
    },
  ],
  [
    "reject-200",
    {
      variant: "empty",
      status: 200,
      surgeSection: "map",
      surgeArguments: 'data-type=text data="" status-code=200',
    },
  ],
  [
    "reject-img",
    {
      variant: "image",
      status: 200,
      surgeSection: "map",
      surgeArguments: "data-type=tiny-gif status-code=200",
    },
  ],
  [
    "reject-dict",
    {
      variant: "dict",
      status: 200,
      surgeSection: "map",
      surgeArguments:
        'data-type=text data="{}" status-code=200 header="Content-Type:application/json"',
    },
  ],
  [
    "reject-array",
    {
      variant: "array",
      status: 200,
      surgeSection: "map",
      surgeArguments:
        'data-type=text data="[]" status-code=200 header="Content-Type:application/json"',
    },
  ],
  [
    "reject-video",
    {
      variant: "video",
      status: null,
      surgeSection: null,
      surgeArguments: null,
    },
  ],
]);
function rewriteSourceTokens(input: any): any {
  const out: any = [];
  let cur: any = "",
    quote: any = null,
    esc: any = false;
  for (const ch of String(input ?? "")) {
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === "\\" && quote) {
      cur += ch;
      esc = true;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
export function unquoteRewriteToken(token: any): any {
  const t: any = String(token ?? "");
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}
export const LOON_LEGACY_MOCK_OPTION_NAMES: any = new Set([
  "data-type",
  "data",
  "status-code",
  "data-path",
  "mock-data-is-base64",
]);
function legacyMockOptionNames(rest: any): any {
  const source: any = String(rest ?? "");
  const out: any = [];
  let quote: any = null,
    esc: any = false;
  for (let i: any = 0; i < source.length; ) {
    const ch: any = source[i];
    if (quote) {
      if (esc) {
        esc = false;
        i++;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        i++;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      i++;
      continue;
    }
    if (i === 0 || /\s/.test(source[i - 1])) {
      const match: any = source.slice(i).match(/^([A-Za-z][A-Za-z0-9-]*)=/);
      if (match) {
        out.push(match[1].toLowerCase());
        i += match[0].length;
        continue;
      }
    }
    i++;
  }
  return [...new Set(out)];
}
function parseLegacyMockData(rest: any): any {
  const source: any = String(rest || "");
  const quotedStart: any = source.search(/\bdata="/i);
  if (quotedStart >= 0) {
    const valueStart: any = source.indexOf('"', quotedStart) + 1;
    const tail: any = source.slice(valueStart);
    const marker: any = tail.match(
      /"\s+(?=(?:status-code|data-path|mock-data-is-base64)=)/i,
    );
    const end: any = marker
      ? valueStart + marker.index
      : source.lastIndexOf('"');
    if (end >= valueStart) {
      return source
        .slice(valueStart, end)
        .replace(/\\"/g, '"')
        .replace(/\\n/g, "\n")
        .replace(/\\\\/g, "\\");
    }
  }
  const unquoted: any = source.match(/\bdata=([^\s]+)/i);
  return unquoted ? unquoted[1] : null;
}
function parseLegacyMock(rest: any): any {
  const type: any =
    (String(rest).match(/\bdata-type=([^\s]+)/i) || [])[1] || "text";
  const status: any = Number(
    (String(rest).match(/\bstatus-code=(\d+)/i) || [])[1] || 200,
  );
  const dataPath: any =
    (String(rest).match(/\bdata-path=([^\s]+)/i) || [])[1] || null;
  const base64: any = /\bmock-data-is-base64=(?:true|1)\b/i.test(String(rest));
  return { type, status, data: parseLegacyMockData(rest), dataPath, base64 };
}
export function classifyLegacyRewriteAction(action: any): any {
  const raw: any = String(action ?? "").trim();
  const lower: any = raw.toLowerCase();
  if (LEGACY_REJECT_VARIANTS.has(lower)) {
    const semantic: any = LEGACY_REJECT_VARIANTS.get(lower);
    return {
      kind: "reject",
      action: lower,
      variant: semantic.variant,
      status: semantic.status,
      raw,
    };
  }
  let match: any = raw.match(/^(302|307)\s+(.+)$/i);
  if (match) {
    return {
      kind: "redirect",
      status: Number(match[1]),
      target: match[2],
      redirectMode: "absolute-location",
      raw,
    };
  }
  match = raw.match(/^header\s+(.+)$/i);
  if (match) {
    return {
      kind: "url-rewrite",
      target: match[1],
      rewriteMode: "transparent-replace",
      raw,
    };
  }
  match = raw.match(
    /^(response-)?header-(add|del|replace|replace-regex)\s+(.+)$/i,
  );
  if (match) {
    return {
      kind: "header",
      phase: match[1] ? "response" : "request",
      operation: match[2].toLowerCase(),
      rest: match[3],
      raw,
    };
  }
  match = raw.match(/^(request|response)-body-replace-regex\s+(.+)$/i);
  if (match) {
    return {
      kind: "body-regex",
      phase: match[1].toLowerCase(),
      operation: "replace",
      rest: match[2],
      raw,
    };
  }
  match = raw.match(
    /^(request|response)-body-json-(add|replace|del|jq)\s+(.+)$/i,
  );
  if (match) {
    return {
      kind: "json",
      phase: match[1].toLowerCase(),
      operation: match[2].toLowerCase(),
      rest: match[3],
      raw,
    };
  }
  match = raw.match(/^mock-(request|response)-body\s+(.+)$/i);
  if (match) {
    const optionNames: any = legacyMockOptionNames(match[2]);
    const unknownOptions: any = optionNames.filter(
      (name: any): any => !LOON_LEGACY_MOCK_OPTION_NAMES.has(name),
    );
    if (unknownOptions.length) {
      return {
        kind: "unknown",
        raw,
        reason: "unknown legacy mock option(s): " + unknownOptions.join(","),
      };
    }
    return {
      kind: "mock",
      phase: match[1].toLowerCase(),
      operation: "inline",
      optionNames,
      mock: parseLegacyMock(match[2]),
      raw,
    };
  }
  return { kind: "unknown", raw };
}
export function isDiscardedLegacyJqPathIr(ir: any): any {
  if (!ir || ir.type !== "rewrite-semantic-ir" || ir.sourceSyntax !== "legacy")
    return false;
  if (!Array.isArray(ir.operations) || ir.operations.length !== 1) return false;
  const op: any = ir.operations[0];
  return (
    op?.kind === "json" &&
    op?.operation === "jq" &&
    /^jq-path\s*=/i.test(String(op?.rest || "").trim())
  );
}
export function isEmptyJsonJqIr(ir: any): any {
  if (!ir || ir.type !== "rewrite-semantic-ir") return false;
  if (!Array.isArray(ir.operations) || ir.operations.length !== 1) return false;
  const op: any = ir.operations[0];
  if (op?.kind !== "json" || op?.operation !== "jq") return false;
  if (ir.sourceSyntax === "legacy") {
    const raw: any = String(op?.rest ?? "")
      .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "")
      .trim();
    if (!raw) return true;
    return unquoteRewriteToken(raw).trim() === "";
  }
  if (ir.sourceSyntax === "v2") {
    const node: any = op?.sourceAction?.args?.[0];
    return Boolean(
      node &&
        ["string", "raw-string"].includes(node.type) &&
        String(node.value ?? "").trim() === "",
    );
  }
  return false;
}
export function isEmptyLegacyJsonJqIr(ir: any): any {
  return ir?.sourceSyntax === "legacy" && isEmptyJsonJqIr(ir);
}
export function legacyRewriteToSemanticIr(pattern: any, action: any): any {
  const sourcePattern: any = String(pattern ?? "").trim();
  const sourceAction: any = String(action ?? "").trim();
  const op: any = classifyLegacyRewriteAction(sourceAction);
  return {
    type: "rewrite-semantic-ir",
    sourceSyntax: "legacy",
    source: sourcePattern + (sourceAction ? " " + sourceAction : ""),
    phase:
      op.phase ||
      (op.kind === "redirect" ||
      op.kind === "url-rewrite" ||
      op.kind === "reject"
        ? "request"
        : null),
    condition: {
      type: "url-regex",
      pattern: sourcePattern,
    },
    operations: [op],
    pipeline: false,
    sourcePayload: {
      pattern: sourcePattern,
      action: sourceAction,
    },
  };
}
function scalarValue(node: any): any {
  if (!node) return null;
  if (Object.hasOwn(node, "value")) return node.value;
  return null;
}
function classifyRewriteV2Action(action: any, phase: any): any {
  const name: any = String(action?.name || "");
  if (/^reject(?:_|$)/.test(name)) {
    const variant: any =
      LEGACY_REJECT_VARIANTS.get(name.replace("_", "-"))?.variant ?? "generic";
    return {
      kind: "reject",
      actionName: name,
      variant,
      status: scalarValue(action?.args?.[0]),
      sourceAction: action,
    };
  }
  if (name === "redirect") {
    return {
      kind: "redirect",
      actionName: name,
      status: scalarValue(action?.args?.[0]),
      targetNode: action?.args?.[1] || null,
      redirectMode: "matched-range-template",
      sourceAction: action,
    };
  }
  const header: any = name.match(
    /^(request|response)\.header\.(add|set|del|replace)$/,
  );
  if (header) {
    return {
      kind: "header",
      phase: header[1],
      operation: header[2],
      actionName: name,
      sourceAction: action,
    };
  }
  const body: any = name.match(/^(request|response)\.body\.replace$/);
  if (body) {
    return {
      kind: "body-regex",
      phase: body[1],
      operation: "replace",
      actionName: name,
      sourceAction: action,
    };
  }
  const json: any = name.match(
    /^(request|response)\.json\.(add|delete|replace|jq|jq_file)$/,
  );
  if (json) {
    return {
      kind: "json",
      phase: json[1],
      operation: json[2],
      actionName: name,
      sourceAction: action,
    };
  }
  const mock: any = name.match(/^(request|response)\.body\.(mock|mock_file)$/);
  if (mock) {
    return {
      kind: "mock",
      phase: mock[1],
      operation: mock[2] === "mock_file" ? "file" : "inline",
      actionName: name,
      sourceAction: action,
    };
  }
  return {
    kind: "action",
    phase,
    actionName: name,
    sourceAction: action,
  };
}
export function rewriteV2AstToSemanticIr(
  ast: RewriteAst,
  { source = "" }: { source?: string } = {},
): RewriteSemanticIr {
  if (!ast || ast.type !== "rewrite")
    throw new TypeError("Expected Rewrite v2 AST");
  const operations: any = (ast.actions || []).map((action: any): any =>
    classifyRewriteV2Action(action, ast.phase),
  );
  return {
    type: "rewrite-semantic-ir",
    sourceSyntax: "v2",
    source: String(source || ""),
    phase: ast.phase || null,
    condition: ast.condition || null,
    operations,
    pipeline: operations.length > 1,
    sourcePayload: { ast },
  };
}
export function singleRewriteOperation(ir: any): any {
  return ir?.operations?.length === 1 ? ir.operations[0] : null;
}
export function rewriteOperationKinds(ir: any): any {
  return (ir?.operations || []).map((op: any): any => op.kind);
}
export function isRewriteOperation(
  ir: any,
  kind: any,
  { phase = null, operation = null, actionName = null }: any = {},
): any {
  const op: any = singleRewriteOperation(ir);
  if (!op || op.kind !== kind) return false;
  if (phase !== null && op.phase !== phase) return false;
  if (operation !== null && op.operation !== operation) return false;
  if (actionName !== null && op.actionName !== actionName) return false;
  return true;
}
export function legacyRewriteTokens(text: any): any {
  return rewriteSourceTokens(text).map(unquoteRewriteToken);
}
// WayX Loon Rewrite v2 official action registry
// Author: chance
// Category: Converter / Rewrite v2 / Action Registry
const defs: any = [
  ["url.replace", 1, 1, false],
  ["redirect", 2, 2, false],
  ["reject", 1, 2, false],
  ["reject_img", 1, 1, false],
  ["reject_dict", 1, 1, false],
  ["reject_array", 1, 1, false],
  ["reject_video", 1, 1, false],
  ["request.header.add", 2, 2, true],
  ["request.header.set", 2, 2, true],
  ["request.header.del", 1, 1, true],
  ["request.header.replace", 3, 3, true],
  ["response.header.add", 2, 2, true],
  ["response.header.set", 2, 2, true],
  ["response.header.del", 1, 1, true],
  ["response.header.replace", 3, 3, true],
  ["request.body.replace", 2, 2, true],
  ["response.body.replace", 2, 2, true],
  ["request.json.add", 2, 2, true],
  ["request.json.delete", 1, 1, true],
  ["request.json.replace", 2, 2, true],
  ["request.json.jq", 1, 1, false],
  ["request.json.jq_file", 1, 1, false],
  ["response.json.add", 2, 2, true],
  ["response.json.delete", 1, 1, true],
  ["response.json.replace", 2, 2, true],
  ["response.json.jq", 1, 1, false],
  ["response.json.jq_file", 1, 1, false],
  ["request.body.mock", 2, 3, false],
  ["request.body.mock_file", 2, 3, false],
  ["response.body.mock", 2, 4, false],
  ["response.body.mock_file", 2, 4, false],
];
export const LOON_REWRITE_V2_ACTIONS: any = new Map(
  defs.map(([name, minArgs, maxArgs, bulk]: any): any => [
    name,
    Object.freeze({ name, minArgs, maxArgs, bulk }),
  ]),
);
export function getRewriteV2ActionDefinition(name: any): any {
  return LOON_REWRITE_V2_ACTIONS.get(String(name ?? "")) || null;
}
function actionError(action: any, message: any): any {
  const error: any = new Error(action.name + ": " + message);
  error.code = "WAYX_REWRITE_V2_ACTION_INVALID";
  error.action = action.name;
  return error;
}
export function validateRewriteV2Action(action: any): any {
  if (!action || action.type !== "action")
    throw new TypeError("Expected Rewrite v2 action AST node");
  const def: any = getRewriteV2ActionDefinition(action.name);
  if (!def)
    throw actionError(
      action,
      "action is not present in the current official Loon Rewrite v2 registry",
    );
  const count: any = action.args.length;
  if (count < def.minArgs || count > def.maxArgs) {
    const expected: any =
      def.minArgs === def.maxArgs
        ? String(def.minArgs)
        : def.minArgs + ".." + def.maxArgs;
    throw actionError(
      action,
      "expected " + expected + " argument(s), got " + count,
    );
  }
  const arrays: any = action.args.filter(
    (arg: any): any => arg.type === "array",
  );
  if (arrays.length) {
    if (!def.bulk)
      throw actionError(
        action,
        "array parameters are not documented for this action",
      );
    if (arrays.length !== action.args.length)
      throw actionError(action, "bulk form must use arrays for every argument");
    const lengths: any = new Set(
      arrays.map((arg: any): any => arg.items.length),
    );
    if (arrays.some((arg: any): any => arg.items.length === 0))
      throw actionError(action, "bulk arrays must not be empty");
    if (lengths.size !== 1)
      throw actionError(action, "bulk arrays must have equal lengths");
  }
  return def;
}
function conditionError(message: any): any {
  const error: any = new Error(message);
  error.code = "WAYX_REWRITE_V2_CONDITION_INVALID";
  return error;
}
function validateCondition(node: any, phase: any): any {
  if (!node) throw conditionError("missing Rewrite v2 condition");
  if (node.type === "group") return validateCondition(node.expression, phase);
  if (node.type === "logical") {
    validateCondition(node.left, phase);
    validateCondition(node.right, phase);
    return;
  }
  if (node.type !== "comparison" || node.left?.type !== "variable")
    throw conditionError("condition left side must be a variable");
  const name: any = node.left.name;
  const header: any = /^(request|response)\.header\[['"].+['"]\]$/.test(name);
  const known: any =
    name === "url" ||
    name === "request.method" ||
    name === "response.status" ||
    header;
  // Other variables may be declared plugin [Argument] references. Their
  // declaration/type is validated by the argument-usage planner before any
  // executable target rule is emitted, so keep them in the AST here.
  if (!known) return;
  if (
    phase === "request" &&
    (name === "response.status" || name.startsWith("response.header["))
  )
    throw conditionError(
      "request phase cannot reference response data: " + name,
    );
  if (node.operator === "~=") {
    if (!["regex", "variable"].includes(node.right?.type))
      throw conditionError("~= requires a Regex right-hand value");
    return;
  }
  if (node.operator !== "==")
    throw conditionError("unsupported condition operator: " + node.operator);
  if (
    name === "response.status" &&
    node.right?.type !== "number" &&
    node.right?.type !== "variable"
  )
    throw conditionError(
      "response.status equality requires Number or typed variable",
    );
  if (
    name === "request.method" &&
    !["string", "raw-string", "variable"].includes(node.right?.type)
  )
    throw conditionError(
      "request.method equality requires String or typed variable",
    );
  if (
    name === "url" &&
    !["string", "raw-string", "variable"].includes(node.right?.type)
  )
    throw conditionError("url equality requires String or typed variable");
  if (
    header &&
    !["string", "raw-string", "null", "variable"].includes(node.right?.type)
  )
    throw conditionError(
      "header equality requires String, null, or String variable",
    );
}
export function validateRewriteV2Ast(ast: any): any {
  if (!ast || ast.type !== "rewrite")
    throw new TypeError("Expected Rewrite v2 AST root");
  const validateRegexes: any = (node: any): any => {
    if (!node || typeof node !== "object") return;
    if (node.type === "regex") compileSourceRegex(node);
    const names: any =
      node.type === "variable"
        ? [node.name]
        : node.type === "string"
          ? stringTemplateParts(node)
              .filter((p: any): any => p[0] === "v")
              .map((p: any): any => p[1])
          : [];
    if (
      ast.phase === "request" &&
      names.some(
        (name: any): any =>
          name === "response.status" || name.startsWith("response.header["),
      )
    )
      throw conditionError("request phase cannot reference response data");
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(validateRegexes);
      else if (value && typeof value === "object") validateRegexes(value);
    }
  };
  validateRegexes(ast);
  validateCondition(ast.condition, ast.phase);
  return ast.actions.map(validateRewriteV2Action);
}
// Target adapters lower semantic fields, never provenance AST/source strings.
export function rewriteIrDeclaration(ir: any): any {
  if (ir?.type !== "rewrite-semantic-ir" || ir.sourceSyntax !== "v2")
    throw new TypeError("Expected Rewrite v2 Semantic IR");
  return {
    type: "rewrite",
    phase: ir.phase,
    condition: ir.condition,
    actions: ir.operations.map((operation: any): any => operation.sourceAction),
    raw: ir.source,
  };
}

// JQ syntax and lowering helpers (integrated domain section)
// 转换器失败案例：BaiduTranslate delete retained __wayx_before/try/type guards.
// Generated native jq now uses bare expressions; author guards remain source text.
// jqlang is authoritative for all generated JSON/JQ expressions.
// Author: chance
// Category: Converter / JQ
export function parseJsonKeyPath(pathText: any): any {
  const text: any = String(pathText ?? "");
  if (!text) throw new Error("JSON key path must not be empty");
  const parts: any = [];
  let i: any = 0;
  const decodeSingleQuoted: any = (value: any): any => {
    let out: any = "";
    for (let j: any = 1; j < value.length - 1; j++) {
      const ch: any = value[j];
      if (ch !== "\\") {
        out += ch;
        continue;
      }
      if (j + 1 >= value.length - 1) {
        out += "\\";
        continue;
      }
      const next: any = value[++j];
      if (next === "'" || next === "\\") out += next;
      else if (next === "n") out += "\n";
      else if (next === "r") out += "\r";
      else if (next === "t") out += "\t";
      else out += "\\" + next;
    }
    return out;
  };
  while (i < text.length) {
    if (text[i] === ".") {
      i++;
      continue;
    }
    if (text[i] === "[") {
      const rest: any = text.slice(i);
      const numeric: any = rest.match(/^\[(\d+)\]/);
      if (numeric) {
        parts.push(Number(numeric[1]));
        i += numeric[0].length;
        continue;
      }
      const quoted: any = rest.match(
        /^\[((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\]/,
      );
      if (!quoted)
        throw new Error("unsupported JSON key-path bracket syntax: " + text);
      let value: any;
      if (quoted[1].startsWith('"')) {
        try {
          value = JSON.parse(quoted[1]);
        } catch {
          throw new Error("invalid quoted JSON key-path segment: " + text);
        }
      } else {
        value = decodeSingleQuoted(quoted[1]);
      }
      parts.push(value);
      i += quoted[0].length;
      continue;
    }
    const bare: any = text.slice(i).match(/^[^.[\]]+/);
    if (!bare) throw new Error("invalid JSON key path: " + text);
    parts.push(bare[0]);
    i += bare[0].length;
  }
  if (!parts.length) throw new Error("JSON key path must not be empty");
  return parts;
}
function validateParts(parts: any): any {
  if (
    !Array.isArray(parts) ||
    !parts.length ||
    parts.some(
      (part: any): any => typeof part !== "string" && !Number.isInteger(part),
    )
  ) {
    throw new Error(
      "JQ path must be a non-empty array of string/integer segments",
    );
  }
  return parts;
}
// Modified: 2026-10-28 (chance). Compact independent object deletions;
// preserve sequential batch semantics with reduce for numeric/overlapping paths.
export function planFixedPathDeleteJq(
  paths: any,
  { sourceForm = "key-path" }: any = {},
): any {
  if (!Array.isArray(paths) || !paths.length)
    throw new Error("delete path list must contain nonempty parsed paths");
  if (!["key-path", "path-arrays"].includes(sourceForm))
    throw new Error("unknown deletion source representation");
  const parts: any = paths.map((item: any): any =>
    validateParts(Array.isArray(item) ? item : item?.parts),
  );
  const prefix: any = (a: any, b: any): any =>
    a.length < b.length && a.every((part: any, i: any): any => part === b[i]);
  const independent: any =
    parts.every((path: any): any =>
      path.every((part: any): any => typeof part === "string"),
    ) &&
    !parts.some((path: any, i: any): any =>
      parts.some(
        (other: any, j: any): any =>
          i !== j && (prefix(path, other) || prefix(other, path)),
      ),
    );
  if (independent) {
    const selectors: any = parts.map(
      (path: any): any =>
        "." +
        path
          .map((key: any, i: any): any =>
            /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)
              ? (i ? "." : "") + key
              : "[" + JSON.stringify(key) + "]",
          )
          .join(""),
    );
    return {
      form: "del",
      reason: "independent-object-paths",
      sourceForm,
      execution: "sequential",
      jq: "del(" + selectors.join(",") + ")",
    };
  }
  return {
    form: parts.length === 1 ? "delpaths" : "reduce",
    reason: "ordered-path-deletion",
    sourceForm,
    execution: "sequential",
    jq:
      parts.length === 1
        ? "delpaths(" + JSON.stringify(parts) + ")"
        : "reduce " + JSON.stringify(parts) + "[] as $p (.;delpaths([$p]))",
  };
}
export function renderFixedPathDeleteJq(
  paths: any,
  options: any = undefined,
): any {
  return planFixedPathDeleteJq(paths, options).jq;
}
// Integrated policy entry point retained from concurrent test-branch refactor.
export function renderFixedJsonMutationJq(operation: any, entries: any): any {
  if (!Array.isArray(entries) || !entries.length)
    throw new Error(operation + " entries must not be empty");
  if (operation === "delete") return renderFixedPathDeleteJq(entries);
  if (operation === "add")
    return entries
      .map((entry: any): any => renderFixedPathAddJq(entry.parts, entry.value))
      .join(" | ");
  if (operation === "replace")
    return entries
      .map((entry: any): any =>
        renderFixedPathReplaceJq(entry.parts, entry.value),
      )
      .join(" | ");
  throw new Error("unsupported fixed JSON mutation: " + operation);
}
export function stripJqComments(expr: any): any {
  const input: any = String(expr);
  let out: any = "",
    quote: any = null,
    esc: any = false,
    comment: any = false;
  for (const ch of input) {
    if (comment) {
      if (ch === "\n" || ch === "\r") {
        comment = false;
        out += " ";
      }
      continue;
    }
    if (quote) {
      out += ch;
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === "#") {
      comment = true;
      continue;
    }
    out += ch;
  }
  return out;
}
// 上游错误：jq keyword whitespace lost after an identity selector.
// Failed case: KuGou / Issue #162 / `else .end;` -> `else . end;`.
// Valid field `.end` and quoted/comment text are never rewritten. Empty stdin
// compiles the program without evaluating the author's filter on any JSON.
const upstreamJqRepairCache: any = new Map();
export function repairUpstreamJq(expr: any): any {
  const original: any = String(expr);
  if (upstreamJqRepairCache.has(original))
    return upstreamJqRepairCache.get(original);
  let masked: any = "",
    quoted: any = false,
    escaped: any = false,
    comment: any = false;
  for (let i: any = 0; i < original.length; i++) {
    const ch: any = original[i];
    if (comment) {
      masked += ch === "\n" ? "\n" : " ";
      if (ch === "\n") comment = false;
      continue;
    }
    if (quoted) {
      masked += " ";
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') quoted = false;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      masked += " ";
      continue;
    }
    if (ch === "#") {
      comment = true;
      masked += " ";
      continue;
    }
    masked += ch;
  }
  const matches: any = [
    ...masked.matchAll(/\belse\s*\.end\b(?=\s*(?:[;|)\],}]|$))/g),
  ];
  let result: any = { jq: original, changed: false };
  if (matches.length) {
    const compile: any = (program: any): any => {
      const checked: any = spawnSync("jq", [program], {
        input: "",
        encoding: "utf8",
        timeout: 5000,
        maxBuffer: 1024 * 1024,
      });
      if (checked.error || checked.signal || ![0, 3].includes(checked.status))
        throw new Error(
          "jq compiler unavailable or failed: " +
            String(checked.error?.message || checked.stderr || checked.signal),
        );
      return checked;
    };
    const before: any = compile(original);
    if (
      before.status === 3 &&
      /syntax error|unterminated/i.test(before.stderr)
    ) {
      let candidate: any = original;
      for (const match of matches.reverse()) {
        const offset: any = match.index + match[0].lastIndexOf(".end") + 1;
        candidate = candidate.slice(0, offset) + " " + candidate.slice(offset);
      }
      const after: any = compile(candidate);
      if (after.status === 0)
        result = {
          jq: candidate,
          changed: true,
          kind: "jq-identity-end-whitespace",
          original,
          diagnostic:
            before.stderr
              .split("\n")
              .find((line: any): any => line.startsWith("jq: error:")) ||
            "jq compile error",
        };
    }
  }
  if (upstreamJqRepairCache.size >= 512) upstreamJqRepairCache.clear();
  upstreamJqRepairCache.set(original, result);
  return result;
}
export function minifyJq(expr: any): any {
  const input: any = String(expr).trim();
  let out: any = "",
    quote: any = null,
    esc: any = false,
    pending: any = false;
  const noSpaceBefore: any = new Set([")", "]", ",", "|", "="]),
    noSpaceAfter: any = new Set(["(", "[", ",", "|", "="]);
  for (const ch of input) {
    if (quote) {
      out += ch;
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      if (pending && out && !noSpaceAfter.has(out.at(-1))) out += " ";
      pending = false;
      quote = ch;
      out += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      pending = true;
      continue;
    }
    if (pending) {
      const prev: any = out.at(-1);
      if (prev && !noSpaceAfter.has(prev) && !noSpaceBefore.has(ch)) out += " ";
      pending = false;
    }
    if (noSpaceBefore.has(ch) && out.endsWith(" ")) out = out.slice(0, -1);
    out += ch;
  }
  return out.trim();
}
export function minifyJqFile(expr: any): any {
  return minifyJq(stripJqComments(expr));
}
export function normalizeJqForSingleQuotedConfig(expr: any): any {
  const jq: any = String(expr);
  let out: any = "",
    inString: any = false,
    esc: any = false;
  for (const ch of jq) {
    if (inString) {
      if (esc) {
        out += ch;
        esc = false;
        continue;
      }
      if (ch === "\\") {
        out += ch;
        esc = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === "'") {
        out += "\\u0027";
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "'") {
      throw new Error(
        "JQ contains a single quote outside a JSON string; target quoting is not proven safe",
      );
    }
    out += ch;
  }
  if (inString || esc)
    throw new Error("JQ contains an unterminated JSON string");
  return out;
}
export function quoteJq(expr: any): any {
  return `'${normalizeJqForSingleQuotedConfig(expr)}'`;
}

// WayX Loon Rewrite v2 file-dependency resolver
// Author: chance
// Category: Converter / Dependency / Rewrite v2
const FILE_ACTIONS: any = Object.freeze({
  "request.json.jq_file": {
    inlineName: "request.json.jq",
    pathIndex: 0,
    kind: "jq",
  },
  "response.json.jq_file": {
    inlineName: "response.json.jq",
    pathIndex: 0,
    kind: "jq",
  },
  "request.body.mock_file": { pathIndex: 1, kind: "mock" },
  "response.body.mock_file": { pathIndex: 1, kind: "mock" },
});
const TEXT_MOCK_TYPES: any = new Set([
  "json",
  "text",
  "css",
  "html",
  "javascript",
  "plain",
]);
function stringValue(node: any): any {
  if (!node || !["string", "raw-string"].includes(node.type)) return null;
  return String(node.value);
}
function boolValue(node: any, fallback: any = false): any {
  if (!node) return fallback;
  return node.type === "boolean" ? node.value : fallback;
}
function numberValue(node: any, fallback: any): any {
  if (!node) return fallback;
  return node.type === "number" && Number.isFinite(node.value)
    ? node.value
    : fallback;
}
function dependencyLocation(
  ref: any,
  actionName: any,
  pluginSourceUrl: any = "",
): any {
  const value: any = String(ref ?? "").trim();
  if (!value)
    throw new Error(
      `${actionName}: file dependency must be a fixed non-empty string`,
    );
  let url: any = null;
  let scope: any = "plugin-resource";
  try {
    const absolute: any = new URL(value);
    if (!/^https?:$/.test(absolute.protocol))
      throw new Error("unsupported protocol");
    url = absolute.href;
    scope = "remote";
  } catch {
    if (!pluginSourceUrl) {
      return {
        ref: value,
        scope,
        url: null,
        resolvable: false,
        reason: "relative plugin resource requires the plugin source URL",
      };
    }
    const base: any = new URL(pluginSourceUrl);
    if (!/^https?:$/.test(base.protocol))
      throw new Error(`${actionName}: plugin source URL must be HTTP(S)`);
    url = new URL(value, base).href;
  }
  return { ref: value, scope, url, resolvable: true };
}
function legacyJqPathRef(value: any): any {
  const text: any = String(value ?? "").trim();
  const match: any = text.match(/^jq-path\s*=\s*(.+)$/i);
  if (!match) return null;
  let ref: any = match[1].trim();
  if (
    (ref.startsWith('"') && ref.endsWith('"')) ||
    (ref.startsWith("'") && ref.endsWith("'"))
  ) {
    ref = ref.slice(1, -1);
  }
  return ref.trim() || null;
}
export function dependencySpecFromAction(
  action: any,
  { pluginSourceUrl = "" }: any = {},
): any {
  const def: any = FILE_ACTIONS[action?.name];
  if (!def) return null;
  const path: any = action.args?.[def.pathIndex];
  if (!["string", "raw-string"].includes(path?.type))
    throw new Error(
      `${action.name}: file dependency must be a fixed non-empty string`,
    );
  const parts: any = stringTemplateParts(path);
  if (parts.some((p: any): any => p[0] === "v"))
    throw new Error(
      `${action.name}: dynamic file dependency paths are not materialized`,
    );
  const ref: any = parts.map((p: any): any => p[1]).join("");
  if (!ref)
    throw new Error(
      `${action.name}: file dependency must be a fixed non-empty string`,
    );
  const location: any = dependencyLocation(ref, action.name, pluginSourceUrl);
  if (!location.resolvable) {
    return { action: action.name, kind: def.kind, ...location };
  }
  const spec: any = { action: action.name, kind: def.kind, ...location };
  if (def.kind === "jq") spec.inlineName = def.inlineName;
  if (def.kind === "mock") {
    const contentType: any = stringValue(action.args?.[0])?.toLowerCase() || "";
    const base64Index: any = action.name === "request.body.mock_file" ? 2 : 3;
    const isBase64: any = boolValue(action.args?.[base64Index], false);
    spec.contentType = contentType;
    spec.base64 = isBase64;
    spec.phase = action.name.startsWith("request.") ? "request" : "response";
    spec.status =
      spec.phase === "response" ? numberValue(action.args?.[2], 200) : null;
    spec.binary = !TEXT_MOCK_TYPES.has(contentType);
  }
  return spec;
}
export function jqDependencySpecFromAction(
  action: any,
  { pluginSourceUrl = "" }: any = {},
): any {
  const official: any = dependencySpecFromAction(action, { pluginSourceUrl });
  if (official?.kind === "jq")
    return { ...official, pathIndex: FILE_ACTIONS[action.name].pathIndex };
  if (!/^(?:request|response)\.json\.jq$/.test(action?.name || "")) return null;
  const ref: any = legacyJqPathRef(stringValue(action.args?.[0]));
  if (!ref) return null;
  const location: any = dependencyLocation(ref, action.name, pluginSourceUrl);
  return {
    action: action.name,
    kind: "jq",
    inlineName: action.name,
    pathIndex: 0,
    legacyAlias: true,
    ...location,
  };
}
export function legacyJqPathDependencySpecFromIr(
  ir: any,
  { pluginSourceUrl = "" }: any = {},
): any {
  if (!ir || ir.type !== "rewrite-semantic-ir" || ir.sourceSyntax !== "legacy")
    return null;
  if (!Array.isArray(ir.operations) || ir.operations.length !== 1) return null;
  const op: any = ir.operations[0];
  if (op?.kind !== "json" || op?.operation !== "jq") return null;
  const ref: any = legacyJqPathRef(op.rest);
  if (!ref) return null;
  const actionName: any =
    (op.phase || ir.phase || "response") + ".body.json.jq";
  const location: any = dependencyLocation(ref, actionName, pluginSourceUrl);
  return {
    action: actionName,
    kind: "jq",
    inlineName: null,
    pathIndex: null,
    legacyAlias: true,
    ...location,
  };
}
export function inlineResolvedLegacyJqPathIr(ir: any, content: any): any {
  const spec: any = legacyJqPathDependencySpecFromIr(ir);
  if (!spec) return { ir, changed: false, dependency: null };
  const jq: any = String(content ?? "").trim();
  if (!jq) throw new Error("legacy jq-path dependency resolved to empty JQ");
  const phase: any = ir.operations[0].phase || ir.phase || "response";
  const operation: any = {
    ...ir.operations[0],
    rest: jq,
    raw: phase + "-body-json-jq " + jq,
  };
  const sourcePayload: any = {
    ...ir.sourcePayload,
    action: phase + "-body-json-jq " + jq,
  };
  return {
    ir: { ...ir, operations: [operation], sourcePayload },
    changed: true,
    dependency: spec,
  };
}
export function inlineResolvedDependency(
  action: any,
  content: any,
  { pluginSourceUrl = "" }: any = {},
): any {
  const spec: any =
    jqDependencySpecFromAction(action, { pluginSourceUrl }) ||
    dependencySpecFromAction(action, { pluginSourceUrl });
  if (!spec) return { action, changed: false, dependency: null };
  if (!spec.resolvable) throw new Error(`${action.name}: ${spec.reason}`);
  if (spec.kind === "mock") {
    throw new Error(
      `${action.name}: mock_file must be converted through a generated target script, not inlined into Rewrite v2`,
    );
  }
  const next: any = {
    ...action,
    name: spec.inlineName,
    args: action.args.map((arg: any): any => ({ ...arg })),
  };
  const pathIndex: any = spec.pathIndex ?? FILE_ACTIONS[action.name].pathIndex;
  next.args[pathIndex] = {
    type: "raw-string",
    value: String(content),
    raw: "`" + String(content).replace(/`/g, "``") + "`",
  };
  return { action: next, changed: true, dependency: spec };
}
export function qxMockPlanFromAction(
  action: any,
  { pluginSourceUrl = "" }: any = {},
): any {
  const spec: any = dependencySpecFromAction(action, { pluginSourceUrl });
  if (!spec || spec.kind !== "mock") return null;
  if (!spec.resolvable) throw new Error(`${action.name}: ${spec.reason}`);
  return {
    phase: spec.phase,
    qxAction:
      spec.phase === "response"
        ? "script-echo-response"
        : "script-request-body",
    url: spec.url,
    contentType: spec.contentType,
    status: spec.status,
    base64: spec.base64,
    binary: spec.binary,
    sourceAction: action.name,
  };
}
export function listRewriteV2Dependencies(ast: any, options: any = {}): any {
  if (!ast || ast.type !== "rewrite")
    throw new TypeError("Expected Rewrite v2 AST");
  return ast.actions
    .map(
      (action: any): any =>
        jqDependencySpecFromAction(action, options) ||
        dependencySpecFromAction(action, options),
    )
    .filter(Boolean);
}
export { FILE_ACTIONS, TEXT_MOCK_TYPES };

// WayX Loon feature collection / source capability registry
// Author: chance
// Category: Converter / Rewrite v2
const families: any = Object.freeze([
  {
    id: "header-pipeline",
    test: (a: any): any =>
      /^(request|response)\.header\.(add|set|del|replace)$/.test(a.name),
  },
  {
    id: "body-pipeline",
    test: (a: any): any => /^(request|response)\.body\.replace$/.test(a.name),
  },
  {
    id: "json-pipeline",
    test: (a: any): any =>
      /^(request|response)\.json\.(add|delete|replace)$/.test(a.name),
  },
  {
    id: "jq-pipeline",
    test: (a: any): any =>
      /^(request|response)\.json\.(?:jq|jq_file)$/.test(a.name),
  },
  {
    id: "mock-pipeline",
    test: (a: any): any =>
      /^(request|response)\.body\.(?:mock|mock_file)$/.test(a.name),
  },
  {
    id: "url-control-pipeline",
    test: (a: any): any => a.name === "url.replace",
  },
  {
    id: "synthetic-response-pipeline",
    test: (a: any): any =>
      /^(?:redirect|reject|reject_img|reject_dict|reject_array|reject_video)$/.test(
        a.name,
      ),
  },
]);
export function classifyComplexRewrite(ast: any): any {
  validateRewriteV2Ast(ast);
  const matched: any = ast.actions.map(
    (action: any): any =>
      families.find((f: any): any => f.test(action))?.id || null,
  );
  if (matched.some((x: any): any => x === null))
    return { ok: false, reason: "unregistered complex action family" };
  return {
    ok: true,
    families: [...new Set(matched)],
    phase: ast.phase,
    features: rewriteFeatureProfile(ast),
  };
}
// Features belong to the source expression, never to an upstream plugin ID.
// Native adapters retain the fixed subset; semantic features share one helper
// compiler for scalar, batch and multi-action declarations.
function rewriteFeatureProfile(ast: any): any {
  const features: any = new Set();
  const visit: any = (node: any): any => {
    if (!node || typeof node !== "object") return;
    if (node.type === "regex" && node.flags) features.add("regex-flags");
    if (
      node.type === "comparison" &&
      node.operator === "~=" &&
      node.right?.type === "variable"
    )
      features.add("dynamic-regex");
    if (node.type === "comparison" && node.capture)
      features.add("condition-captures");
    if (node.type === "logical") features.add("condition-" + node.operator);
    if (node.type === "array") features.add("batch-arguments");
    if (node.type === "variable") features.add("runtime-values");
    if (node.type === "string") {
      if (stringTemplateParts(node).some((p: any): any => p[0] === "v"))
        features.add("string-templates");
      if (/\\\$\{|\$0|\$&|\$\$/.test(node.raw || node.value))
        features.add("special-characters");
    }
    for (const [key, value] of Object.entries(node))
      if (key !== "raw") {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
  };
  visit(ast);
  if (ast.actions.some(isTextRequestMockAction))
    features.add("request-text-mock");
  if (ast.actions.some((a: any): any => fixedJqOperations(a) !== null))
    features.add("fixed-jq-mutations");
  if (
    ast.actions.some(
      (a: any): any =>
        /\.json\.(?:add|replace)$/.test(a.name) &&
        scalarItems(a.args[1]).some((v: any): any => v?.type === "raw-string"),
    )
  )
    features.add("raw-json-value");
  if (ast.actions.length > 1) features.add("action-order");
  const mutations: any = ast.actions.every(
    (a: any): any =>
      new RegExp(
        "^" +
          ast.phase +
          "\\.(?:header\\.(?:add|set|del|replace)|body\\.replace|json\\.(?:add|delete|replace))$",
      ).test(a.name) ||
      (ast.phase === "request" &&
        /^request\.body\.mock(?:_file)?$/.test(a.name)) ||
      fixedJqOperations(a) !== null,
  );
  const needsHelper: any =
    (ast.actions.some((a: any): any => fixedJqOperations(a) !== null) &&
      (ast.actions.length > 1 ||
        ast.condition?.type !== "comparison" ||
        ast.condition.left?.name !== "url" ||
        ast.condition.operator !== "~=")) ||
    ast.actions.some(isTextRequestMockAction) ||
    [
      "dynamic-regex",
      "string-templates",
      "special-characters",
      "raw-json-value",
    ].some((f: any): any => features.has(f)) ||
    ast.actions.some((a: any): any =>
      JSON.stringify(a.args).includes('"type":"variable"'),
    );
  return { kinds: [...features].sort(), mutations, needsHelper };
}
// Bounded inline JQ compiler. Never evaluate source text as JavaScript or
// approximate arbitrary JQ streams, dynamic filters, or array selector semantics.
// This internal API deliberately stays outside the public index facade.
export function fixedJqOperations(action: any): any {
  if (!/^(request|response)\.json\.jq$/.test(action?.name || "")) return null;
  let text: any;
  try {
    const parts: any = stringTemplateParts(action.args[0]);
    if (parts.some((p: any): any => p[0] !== "s")) return null;
    text = parts.map((p: any): any => p[1]).join("");
  } catch {
    return null;
  }
  if (typeof text !== "string" || !text.trim()) return null;
  const pieces: any = [];
  let start: any = 0,
    quoted: any = false,
    escaped: any = false,
    depth: any = 0;
  for (let i: any = 0; i < text.length; i++) {
    const c: any = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
      continue;
    }
    if (c === '"') quoted = true;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if (c === "|" && depth === 0) {
      pieces.push(text.slice(start, i).trim());
      start = i + 1;
    }
    if (depth < 0) return null;
  }
  if (quoted || depth !== 0) return null;
  pieces.push(text.slice(start).trim());
  const identifier: any = "[A-Za-z_][A-Za-z_0-9]*";
  const bracket: any = String.raw`\[\s*"(?:[^"\\]|\\.)*"\s*\]`;
  const pathPattern: any =
    "\\.(?:" +
    identifier +
    "|" +
    bracket +
    ")(?:\\." +
    identifier +
    "|" +
    bracket +
    ")*";
  const pathKeys: any = (path: any): any => {
    const tokens: any = path
      .slice(1)
      .match(new RegExp(identifier + "|" + bracket, "g"));
    return tokens.map((token: any): any =>
      token.startsWith("[") ? JSON.parse(token.slice(1, -1).trim()) : token,
    );
  };
  const ops: any = [];
  for (const part of pieces) {
    if (part === ".") {
      ops.push({ kind: "identity" });
      continue;
    }
    const assignment: any = part.match(
      new RegExp("^(" + pathPattern + ")\\s*=\\s*([\\s\\S]+)$"),
    );
    const deletion: any = part.match(
      new RegExp(
        "^del\\(\\s*(" +
          pathPattern +
          "(?:\\s*,\\s*" +
          pathPattern +
          ")*)\\s*\\)$",
      ),
    );
    const m: any = assignment || deletion;
    if (!m) return null;
    try {
      if (deletion) {
        const paths: any = m[1]
          .match(new RegExp(pathPattern, "g"))
          .map(pathKeys);
        if (paths.length > 1) {
          ops.push({ kind: "delete-many", paths });
          continue;
        }
      }
      const path: any = pathKeys(m[1]);
      const address: any = path.length === 1 ? { key: path[0] } : { path };
      if (deletion) ops.push({ kind: "delete", ...address });
      else {
        const value: any = JSON.parse(m[2]);
        // JSON.parse silently rounds huge numeric literals. Keep them native.
        const safe: any = (v: any): any =>
          typeof v === "number"
            ? Number.isFinite(v) &&
              (!Number.isInteger(v) || Number.isSafeInteger(v))
            : v && typeof v === "object"
              ? Object.values(v).every(safe)
              : true;
        if (!safe(value)) return null;
        ops.push({ kind: "set", ...address, value });
      }
    } catch {
      return null;
    }
  }
  return ops;
}
// Shared phase eligibility: only text request mocks enter the synchronous
// mutation runtime. Binary/encoded bodies retain their existing adapters.
export function isTextRequestMockAction(action: any): any {
  if (!/^request\.body\.mock(?:_file)?$/.test(action?.name || "")) return false;
  const type: any = action.args[0];
  if (!["string", "raw-string"].includes(type?.type)) return false;
  const parts: any = stringTemplateParts(type);
  if (parts.some((p: any): any => p[0] === "v")) return false;
  if (
    !["json", "text", "css", "html", "javascript", "plain"].includes(
      parts
        .map((p: any): any => p[1])
        .join("")
        .toLowerCase(),
    )
  )
    return false;
  return (
    !action.args[2] ||
    (action.args[2].type === "boolean" && action.args[2].value === false)
  );
}
export function supportsRewritePhaseActions(ast: any, target: any): any {
  const mutations: any = new RegExp(
    "^" +
      ast.phase +
      "\\.(?:header\\.(?:" +
      (target === "surge" ? "add|" : "") +
      "set|del|replace)|body\\.replace|json\\.(?:add|delete|replace))$",
  );
  return ast.actions.every(
    (action: any): any =>
      mutations.test(action.name) ||
      fixedJqOperations(action) !== null ||
      (ast.phase === "request" && isTextRequestMockAction(action)),
  );
}
// Native JQ is a target capability, not a reason to introduce an HTTP Script.
// Multiple known single-output JQ actions can also stay in one native rule;
// filters run in source order using native jq error propagation.
function nativeJqPriorityPlan(ast: any, target: any): any {
  if (!ast.actions.every((a: any): any => a.name === ast.phase + ".json.jq"))
    return null;
  try {
    const filters: any = ast.actions.map((action: any): any => {
      const parts: any = stringTemplateParts(action.args[0]);
      if (parts.some((p: any): any => p[0] !== "s"))
        throw new Error("native JQ requires fixed source expression");
      return parts.map((p: any): any => p[1]).join("");
    });
    if (
      ast.actions.length > 1 &&
      ast.actions.some((a: any): any => fixedJqOperations(a) === null)
    )
      throw new Error(
        "native multi-action JQ requires proven single-output filters",
      );
    const jq: any =
      filters.length === 1
        ? filters[0]
        : filters.map((filter: any): any => "(" + filter + ")").join(" | ");
    const nativeAst: any = {
      ...ast,
      actions: [
        {
          ...ast.actions[0],
          args: [
            {
              type: "raw-string",
              value: jq,
              raw: "`" + jq.replace(/`/g, "``") + "`",
            },
          ],
        },
      ],
    };
    if (target === "qx") {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) return unsupported(matcher.reason);
      return qxDirectRewritePlan(nativeAst, { matcher });
    }
    return surgeDirectRewritePlan(nativeAst);
  } catch (error: any) {
    return unsupported(String(error?.message || error));
  }
}
function nativeJsonPriorityPlan(ast: any, target: any): any {
  if (
    ast.actions.length === 1 &&
    !ast.actions[0].args.some((arg: any): any => arg.type === "array")
  )
    return null;
  if (
    !ast.actions.every((action: any): any =>
      new RegExp("^" + ast.phase + "\\.json\\.(?:add|delete|replace)$").test(
        action.name,
      ),
    )
  )
    return null;
  // Fixed JSON batches use the same native matcher compatibility contract as JQ.
  const matcher: any = simpleUrlRewriteCondition(ast);
  if (!matcher.ok) return null;
  const mapped: any = jsonPipelineToSafeNativeJq(ast);
  if (!mapped.ok) return null;
  const note: any = ast.condition?.right?.flags
    ? "# [WayX] COMPATIBILITY LIMITATION: native URL matcher temporarily omits Loon flags " +
      ast.condition.right.flags +
      "; user-authorized compatibility downgrade; matching semantics may differ.\n"
    : "";
  const mapping: any = REWRITE_MUTATION_MAPPINGS[ast.actions[0].name];
  const line: any =
    target === "qx"
      ? matcher.pattern + " url " + mapping.qx + " " + quoteJq(mapped.jq)
      : mapping.surge + " " + matcher.pattern + " " + quoteJq(mapped.jq);
  return {
    section: target === "qx" ? "rewrite" : "body",
    line,
    ...(note ? { lines: [note.trim(), line] } : {}),
  };
}
export function planRewriteFeatureHelper(ast: any, target: any, ctx: any): any {
  if (!rewriteFeatureProfile(ast).mutations) return null;
  // QX object headers cannot preserve duplicates. Its historical native add
  // path remains governed by the existing compatibility/comment policy.
  if (
    target === "qx" &&
    ast.actions.some((a: any): any => a.name.endsWith(".header.add"))
  )
    return null;
  if (!ctx.generatedScripts)
    return {
      ok: false,
      terminal: true,
      reason: "semantic feature helper requires a generated-script context",
    };
  try {
    const jqCombination: any = ast.actions.some((a: any): any =>
      a.name.endsWith(".json.jq"),
    );
    const jqMatcher: any = jqCombination
      ? simpleUrlRewriteCondition(ast)
      : null;
    const narrowJq: any =
      jqCombination &&
      jqMatcher.ok &&
      !rewriteFeatureProfile(ast).kinds.some((k: any): any =>
        ["regex-flags", "dynamic-regex"].includes(k),
      );
    const options: any = {
      target,
      stamp: ctx.stamp,
      category: ctx.category,
      sourceLine: ctx.sourceLine,
      argumentTable: ctx.argumentTable,
      mockMaterialized: ctx.mockFiles?.get(ctx.sourceLine),
      jqMaterialized: ctx.jqFiles?.get(ctx.sourceLine),
    };
    const plan: any =
      ast.actions.length === 1
        ? renderSingleRewriteMutationScript(ast, options)
        : renderMixedRewriteScript(ast, options);
    const refs: any = ctx.argumentRefs || [];
    if (target === "qx" && refs.length)
      throw new Error("Quantumult X plugin argument transport is not verified");
    const payload: any =
      target === "surge" && refs.length
        ? surgeRewriteArgumentPayload(refs, ctx.argumentTable)
        : { ok: true, value: null };
    if (!payload.ok) throw new Error(payload.reason);
    const key: any = crypto
      .createHash("sha1")
      .update("features\0" + target + "\0" + (ctx.sourceLine || ast.raw))
      .digest("hex")
      .slice(0, 10);
    const filename: any = "features_" + target + "_" + key + ".js";
    const url: any =
      (target === "qx" ? qxRewriteRawBase(ctx) : surgeRewriteRawBase(ctx)) +
      "/Script/" +
      ctx.id +
      "/" +
      filename;
    if (narrowJq) plan.pattern = jqMatcher.pattern;
    const prefix: any = narrowJq
      ? jqMatcher.pattern + " url "
      : qxRewriteMatcherPlan(ast).prefix;
    const line: any =
      target === "qx"
        ? prefix + plan.qxAction + " " + url
        : "wayx_features_" +
          key +
          " = type=" +
          plan.surgeType +
          ",pattern=" +
          surgeRegexParameter(plan.pattern) +
          ",script-path=" +
          url +
          (plan.requiresBody ? ",requires-body=true,max-size=-1" : "") +
          (plan.fullHeaderMode ? ",full-header-mode=true" : "") +
          (payload.value ? ",argument=" + payload.value : "");
    ctx.generatedScripts.set(filename, plan.script);
    return {
      ok: true,
      handler: "source-feature-collection",
      section: target === "qx" ? "rewrite" : "script",
      line,
    };
  } catch (error: any) {
    return {
      ok: false,
      terminal: true,
      reason: String(error.message || error),
    };
  }
}
export const COMPLEX_REWRITE_FAMILIES: any = families.map(
  (x: any): any => x.id,
);
export function complexConditionKinds(node: any, out: any = []): any {
  if (!node) return out;
  if (node.type === "group") return complexConditionKinds(node.expression, out);
  if (node.type === "logical") {
    out.push(node.operator);
    complexConditionKinds(node.left, out);
    complexConditionKinds(node.right, out);
    return out;
  }
  if (node.type === "comparison") {
    out.push(node.operator);
    out.push(node.left?.name || "unknown");
    return out;
  }
  out.push("unsupported");
  return out;
}
export function compileComplexCondition(
  node: any,
  target: any,
  { argumentTable = null, sharedRuntime = false }: any = {},
): any {
  for (const c of findRewriteComparisons(node, (): any => true)) {
    for (const value of [c.left, c.right]) {
      const names: any =
        value?.type === "variable"
          ? [value.name]
          : value?.type === "string"
            ? stringTemplateParts(value)
                .filter((p: any): any => p[0] === "v")
                .map((p: any): any => p[1])
            : [];
      for (const name of names) {
        if (
          ["url", "request.method", "response.status"].includes(name) ||
          /^(request|response)\.header\[/.test(name) ||
          argumentTable?.byId?.has(name)
        )
          continue;
        throw new Error("unsupported complex condition variable: " + name);
      }
    }
  }
  // The same evaluator serves the oracle and both runtime adapters. Captures
  // are committed only from the successful branch, including AND/OR rollback.
  return (
    "(()=>{" +
    (sharedRuntime ? "" : conditionRuntimeSource()) +
    "\nconst result=evaluateCondition(" +
    JSON.stringify(node) +
    ',{url:$request.url,request:$request,response:typeof $response!=="undefined"?$response:{},arguments:' +
    (argumentTable ? "__wayxArgs" : "{}") +
    "});Object.assign(__wayxCaptures,result.captures);return result.matched;})()"
  );
}

// WayX Loon feature collection / compatibility handler registry
// Author: chance
// Category: Converter / Rewrite v2 / Complex Routing
const handlers: any = [];
export function registerComplexRewriteHandler(definition: any): any {
  if (
    !definition ||
    !definition.id ||
    typeof definition.match !== "function" ||
    typeof definition.plan !== "function"
  ) {
    throw new TypeError("Invalid complex Rewrite handler");
  }
  if (handlers.some((item: any): any => item.id === definition.id))
    throw new Error("Duplicate complex Rewrite handler: " + definition.id);
  handlers.push(Object.freeze({ ...definition }));
}
export function planComplexRewrite(
  ast: any,
  target: any,
  context: any = {},
): any {
  if (!Array.isArray(ast?.actions) || !ast.actions.length) {
    return {
      ok: false,
      reason: "Rewrite feature helper requires source actions",
    };
  }
  const classified: any = classifyComplexRewrite(ast);
  if (!classified.ok) {
    return {
      ok: false,
      terminal: true,
      reason:
        "known source actions are outside the currently implemented generic complex action families: " +
        classified.reason,
      classified,
    };
  }
  if (["qx", "surge"].includes(target)) {
    const featurePlan: any = planRewriteFeatureHelper(ast, target, context);
    if (featurePlan) return featurePlan;
  }
  for (const handler of handlers) {
    if (!handler.targets.includes(target)) continue;
    if (!handler.match(ast, classified, context)) continue;
    const result: any = handler.plan(ast, target, context);
    if (result?.ok) return { ...result, handler: handler.id };
    if (result?.terminal) return { ...result, handler: handler.id };
  }
  return {
    ok: false,
    terminal: true,
    reason:
      "no verified generic complex Rewrite handler matched families: " +
      classified.families.join(","),
    classified,
  };
}
export function listComplexRewriteHandlers(): any {
  return handlers.map(({ id, targets }: any): any => ({
    id,
    targets: [...targets],
  }));
}

// WayX deterministic Safe Tier analyzer for Loon Rewrite v2
// Author: chance
// Category: Converter / Rewrite v2 / Safe Tier
function safeRewriteReview(reason: any, ast: any = null): any {
  return { matched: true, safe: false, reason, ast };
}
export function analyzeSimpleUrlRegexCondition(condition: any): any {
  if (!condition || condition.type !== "comparison")
    return { ok: false, reason: "condition is compound or grouped" };
  if (condition.operator !== "~=")
    return { ok: false, reason: "condition is not a URL regex match" };
  if (condition.left?.type !== "variable" || condition.left.name !== "url")
    return { ok: false, reason: "left operand is not ${url}" };
  if (condition.right?.type !== "regex")
    return { ok: false, reason: "right operand is not a literal regex" };
  if (condition.capture)
    return { ok: false, reason: "as capture requires semantic review" };
  return compileRegexForTarget(condition.right);
}
function safeRejectAction(action: any): any {
  if (
    !["reject", "reject_img", "reject_dict", "reject_array"].includes(
      action?.name,
    )
  ) {
    return {
      ok: false,
      reason: "action is outside the deterministic reject subset",
    };
  }
  if (action.args.length !== 1)
    return {
      ok: false,
      reason: "reject with custom body requires semantic review",
    };
  const status: any = action.args[0];
  if (
    status?.type !== "number" ||
    !Number.isInteger(status.value) ||
    status.value < 100 ||
    status.value > 599
  ) {
    return {
      ok: false,
      reason: "reject status must be an integer in Loon 100...599",
    };
  }
  const mapped: any = qxPrimitiveForRewriteV2Action(action);
  if (!mapped)
    return {
      ok: false,
      reason:
        action.name === "reject"
          ? "reject status has no direct QX primitive"
          : "structured/image reject status has no direct QX primitive",
    };
  return {
    ok: true,
    action: mapped,
    sourceAction: action.name,
    status: status.value,
  };
}
export function analyzeSafeRewriteV2(line: any): any {
  if (!isRewriteV2(line))
    return { matched: false, safe: false, reason: "not Rewrite v2" };
  let ast: any;
  try {
    ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
  } catch (error: any) {
    return safeRewriteReview(
      `Rewrite v2 parse/action validation failed: ${String(error?.message || error).split("\n")[0]}`,
    );
  }
  if (ast.actions.length !== 1)
    return safeRewriteReview("action pipeline remains Review Tier", ast);
  const condition: any = analyzeSimpleUrlRegexCondition(ast.condition);
  if (!condition.ok) return safeRewriteReview(condition.reason, ast);
  const action: any = safeRejectAction(ast.actions[0]);
  if (!action.ok) return safeRewriteReview(action.reason, ast);
  return {
    matched: true,
    safe: true,
    ast,
    phase: ast.phase,
    pattern: condition.pattern,
    action: action.action,
    sourceAction: action.sourceAction,
    status: action.status,
  };
}

// WayX behavior-first Rewrite v2 semantic mapper
// Author: chance
// Category: Converter / Rewrite v2 / Semantic Mapping
function unsupported(reason: any, extra: any = {}): any {
  return { ok: false, reason, ...extra };
}
function stringNode(node: any): any {
  if (!node || !["string", "raw-string"].includes(node.type)) return null;
  return String(node.value);
}
function scalarItems(node: any): any {
  return node?.type === "array" ? node.items : [node];
}
function urlComparisonRegex(c: any): any {
  if (
    c?.type !== "comparison" ||
    c.left?.type !== "variable" ||
    c.left.name !== "url"
  )
    return null;
  if (c.operator === "~=" && c.right?.type === "regex")
    return { regex: c.right, capture: c.capture || null };
  if (c.operator !== "==" || !["string", "raw-string"].includes(c.right?.type))
    return null;
  const parts: any = stringTemplateParts(c.right);
  if (parts.some(([kind]: any): any => kind !== "s")) return null;
  const value: any = parts.map(([, part]: any): any => part).join("");
  const pattern: any =
    "^" +
    regexEscape(value).replace(
      /\s/g,
      (ch: any): any => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
    ) +
    "$";
  return { regex: { type: "regex", pattern, flags: "" }, capture: null };
}
export function simpleUrlRewriteCondition(
  ast: any,
  { target = "generic" }: any = {},
): any {
  if (!ast || ast.type !== "rewrite")
    return unsupported("expected Rewrite v2 AST");
  const c: any = unwrap(ast.condition);
  const match: any = urlComparisonRegex(c);
  if (!match)
    return unsupported("condition is not a single fixed URL comparison");
  // URL matcher bodies are source regex bodies after the Loon literal wrapper
  // has been removed by the parser. Do not compile/canonicalize them here.
  const compiled: any = compileRegexForTarget(match.regex);
  if (!compiled.ok) return compiled;
  return { ...compiled, regex: match.regex, capture: match.capture };
}
function parseKeyPath(path: any): any {
  return parseJsonKeyPath(path);
}
// WayX jq path grammar: direct selectors for add; never a shared
// Shared path segments retain key types; bracket keys retain root identity.
export function jqPathSelector(parts: any): any {
  validateParts(parts);
  return parts.reduce(
    (out: any, part: any): any =>
      typeof part === "number"
        ? out + "[" + part + "]"
        : /^[A-Za-z_][A-Za-z0-9_]*$/.test(part)
          ? out + (out === "." ? "" : ".") + part
          : out + "[" + JSON.stringify(part) + "]",
    ".",
  );
}
function pathSelector(path: any): any {
  return jqPathSelector(parseKeyPath(path));
}
export function renderFixedPathAddJq(parts: any, value: any): any {
  validateParts(parts);
  return "setpath(" + JSON.stringify(parts) + "; " + value + ")";
}
function anyToJq(node: any): any {
  if (!node) throw new Error("missing JSON value");
  if (node.type === "string") {
    const parts: any = stringTemplateParts(node);
    if (parts.some((p: any): any => p[0] === "v"))
      throw new Error("JSON template requires a semantic feature helper");
    return JSON.stringify(parts.map((p: any): any => p[1]).join(""));
  }
  if (node.type === "raw-string") {
    try {
      return JSON.stringify(JSON.parse(node.value));
    } catch {
      return JSON.stringify(node.value);
    }
  }
  if (node.type === "number" || node.type === "boolean")
    return JSON.stringify(node.value);
  if (node.type === "null") return "null";
  if (node.type === "variable")
    throw new Error(
      "plugin/capture variable JSON value requires a target runtime bridge",
    );
  throw new Error("unsupported JSON value node: " + node.type);
}
function qxQuote(value: any): any {
  return quoteJq(value);
}
export function renderFixedPathReplaceJq(parts: any, value: any): any {
  validateParts(parts);
  return "setpath(" + JSON.stringify(parts) + "; " + value + ")";
}
export function jsonActionToJq(action: any): any {
  const name: any = action?.name || "";
  if (!/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(name)) {
    return unsupported(
      "JSON action is outside add/delete/replace direct subset",
    );
  }
  if (name.endsWith(".delete")) {
    const nodes: any = scalarItems(action.args[0]);
    const paths: any = nodes.map((node: any): any => {
      const value: any = stringNode(node);
      if (value === null)
        throw new Error(name + ": key path must be a fixed string");
      const parts: any = parseKeyPath(value);
      return {
        parts,
        literal: JSON.stringify(parts),
        selector: pathSelector(value),
      };
    });
    return { ok: true, jq: renderFixedPathDeleteJq(paths) };
  }
  const paths: any = scalarItems(action.args[0]);
  const values: any = scalarItems(action.args[1]);
  if (paths.length !== values.length)
    throw new Error(name + ": batch argument lengths differ");
  const ops: any = paths.map((node: any, index: any): any => {
    const key: any = stringNode(node);
    if (key === null)
      throw new Error(name + ": key path must be a fixed string");
    const parts: any = parseKeyPath(key);
    const value: any = anyToJq(values[index]);
    if (name.endsWith(".add")) {
      return renderFixedPathAddJq(parts, value);
    }
    return renderFixedPathReplaceJq(parseKeyPath(key), value);
  });
  return { ok: true, jq: ops.join(" | ") };
}
function fixedObjectKeyPath(node: any, actionName: any): any {
  if (!["string", "raw-string"].includes(node?.type))
    throw new Error(actionName + ": key path must be a fixed string");
  const pieces: any = stringTemplateParts(node);
  if (pieces.some((piece: any): any => piece[0] !== "s"))
    throw new Error(
      actionName + ": dynamic key path requires runtime transport",
    );
  const parts: any = parseKeyPath(
    pieces.map((piece: any): any => piece[1]).join(""),
  );
  // Numeric String keys and length can mutate arrays through JS properties.
  // Their source behavior needs an array-aware lowering, even without [n].
  return parts.every(
    (part: any): any =>
      typeof part === "string" &&
      part !== "length" &&
      !/^(?:0|[1-9]\d*)$/.test(part),
  )
    ? parts
    : null;
}
function fixedObjectJsonOps(action: any): any {
  const name: any = action?.name || "";
  if (!/^(?:request|response)\.json\.(?:add|delete|replace)$/.test(name)) {
    return unsupported(
      "JSON pipeline action is outside add/delete/replace subset",
    );
  }
  const paths: any = scalarItems(action.args[0]);
  const values: any = name.endsWith(".delete")
    ? null
    : scalarItems(action.args[1]);
  if (values && paths.length !== values.length) {
    return unsupported(name + ": batch argument lengths differ");
  }
  const operation: any = name.split(".").at(-1);
  const entries: any = [];
  for (let index: any = 0; index < paths.length; index++) {
    let key: any;
    try {
      key = fixedObjectKeyPath(paths[index], name);
    } catch (error: any) {
      return unsupported(String(error?.message || error));
    }
    if (key === null)
      return unsupported(
        name +
          ": native multi-action JQ currently requires fixed object key paths",
      );
    if (operation === "delete") {
      entries.push({ parts: key });
      continue;
    }
    try {
      entries.push({ parts: key, value: anyToJq(values[index]) });
    } catch (error: any) {
      return unsupported(String(error?.message || error));
    }
  }
  const ops: any = [renderFixedJsonMutationJq(operation, entries)];
  return { ok: true, ops };
}
export function jsonPipelineToSafeNativeJq(ast: any): any {
  validateRewriteV2Ast(ast);
  if (!Array.isArray(ast?.actions) || ast.actions.length < 1) {
    return unsupported("native JSON pipeline requires at least one action");
  }
  if (!["request", "response"].includes(ast.phase)) {
    return unsupported("native JSON pipeline requires request/response phase");
  }
  if (
    ast.actions.some(
      (action: any): any =>
        !new RegExp("^" + ast.phase + "\\.json\\.(?:add|delete|replace)$").test(
          action.name,
        ),
    )
  ) {
    return unsupported(
      "native JSON pipeline requires same-phase add/delete/replace actions only",
    );
  }
  const ops: any = [];
  for (const action of ast.actions) {
    const mapped: any = fixedObjectJsonOps(action);
    if (!mapped.ok) return mapped;
    ops.push(...mapped.ops);
  }
  return { ok: true, jq: ops.join(" | ") };
}
export function qxDirectRewritePlan(
  ast: any,
  { matcher = null }: any = {},
): any {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1)
    return unsupported("QX direct mapping requires exactly one action");
  let condition: any;
  if (matcher) {
    if (matcher.exact !== true || !matcher.prefix) {
      return unsupported(
        "QX direct native action requires an exact matcher plan",
      );
    }
    condition = {
      ok: true,
      pattern: matcher.urlPattern,
      prefix: matcher.prefix,
      notes: [],
    };
  } else {
    condition = simpleUrlRewriteCondition(ast);
    if (!condition.ok) return condition;
    condition = { ...condition, prefix: condition.pattern + " url " };
  }
  const action: any = ast.actions[0];
  if (action.name === "redirect") {
    const status: any = action.args[0];
    if (
      ast.phase !== "request" ||
      status?.type !== "number" ||
      ![302, 307].includes(status.value)
    ) {
      return unsupported(
        "QX native redirect requires request phase and status 302 or 307",
      );
    }
    const urlConditions: any = findRewriteComparisons(
      ast.condition,
      (c: any): any => Boolean(urlComparisonRegex(c)),
    );
    if (urlConditions.length !== 1)
      return unsupported(
        "QX native redirect requires one URL regex capture scope",
      );
    try {
      const replacement: any = loonTemplateToNativeUrl(
        action.args[1],
        urlConditions[0].capture,
        null,
        "Quantumult X",
      );
      return {
        ok: true,
        strategy: "direct",
        section: "rewrite",
        pattern: condition.pattern,
        line: condition.prefix + status.value + " " + replacement,
        notes: condition.notes,
      };
    } catch (error: any) {
      return unsupported(String(error.message || error));
    }
  }
  const primitive: any = qxPrimitiveForRewriteV2Action(action);
  if (primitive && /^(?:reject-|reject$)/.test(primitive)) {
    return {
      ok: true,
      strategy: "direct",
      section: "rewrite",
      pattern: condition.pattern,
      line: condition.prefix + primitive,
      notes: condition.notes,
    };
  }
  if (action.name === "request.json.jq" || action.name === "response.json.jq") {
    const jq: any = stringNode(action.args[0]);
    if (jq === null)
      return unsupported(action.name + ": inline JQ must be a fixed string");
    const token: any = primitive;
    return {
      ok: true,
      strategy: "direct",
      section: "rewrite",
      pattern: condition.pattern,
      line: condition.prefix + token + " " + qxQuote(jq),
      notes: condition.notes,
    };
  }
  if (
    /^(?:request|response)\.json\.(?:add|delete|replace)$/.test(action.name)
  ) {
    const mapped: any = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token: any = primitive;
    return {
      ok: true,
      strategy: "direct",
      section: "rewrite",
      pattern: condition.pattern,
      line: condition.prefix + token + " " + qxQuote(mapped.jq),
      notes: condition.notes,
    };
  }
  if (
    action.name === "request.body.replace" ||
    action.name === "response.body.replace"
  ) {
    if (action.args.some((node: any): any => node.type === "array")) {
      const members: any = expandBulkAction(action).map((args: any): any =>
        qxDirectRewritePlan(
          { ...ast, actions: [{ ...action, args }] },
          { matcher },
        ),
      );
      if (members.some((plan: any): any => !plan.ok))
        return members.find((plan: any): any => !plan.ok);
      const lines: any = members.flatMap(
        (plan: any): any => plan.lines || [plan.line],
      );
      return { ...members[0], line: lines[0], lines };
    }
    const regex: any = action.args[0];
    const replacement: any = stringNode(action.args[1]);
    if (regex?.type !== "regex" || replacement === null)
      return unsupported(action.name + ": invalid body replacement arguments");
    // Modified: 2026-10-26 (chance). Apply QX-only Header/Body m/s policy.
    const bodyRegex: any = compileRegexForTarget(regex, {
      subject: "body",
      target: "qx",
    });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement))
      return unsupported(
        "QX direct body replacement with literal whitespace requires script fallback",
      );
    const token: any = primitive;
    return {
      ok: true,
      strategy: "direct",
      section: "rewrite",
      pattern: condition.pattern,
      line:
        condition.prefix +
        token +
        " " +
        bodyRegex.pattern +
        " " +
        token +
        " " +
        replacement,
      notes: [...condition.notes, ...bodyRegex.notes],
    };
  }
  return unsupported(
    "action requires generated script or target-specific mapping",
  );
}
function surgeQuoteJq(jq: any): any {
  return quoteJq(jq);
}
export function surgeDirectRewritePlan(ast: any): any {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1)
    return unsupported("Surge direct mapping requires exactly one action");
  const condition: any = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action: any = ast.actions[0];
  if (action.name === "request.json.jq" || action.name === "response.json.jq") {
    const jq: any = stringNode(action.args[0]);
    if (jq === null)
      return unsupported(action.name + ": inline JQ must be a fixed string");
    const token: any = REWRITE_MUTATION_MAPPINGS[action.name].surge;
    return {
      ok: true,
      strategy: "direct",
      section: "body",
      pattern: condition.pattern,
      line: token + " " + condition.pattern + " " + surgeQuoteJq(jq),
      notes: condition.notes,
    };
  }
  if (
    /^(?:request|response)\.json\.(?:add|delete|replace)$/.test(action.name)
  ) {
    const mapped: any = jsonActionToJq(action);
    if (!mapped.ok) return mapped;
    const token: any = REWRITE_MUTATION_MAPPINGS[action.name].surge;
    return {
      ok: true,
      strategy: "direct",
      section: "body",
      pattern: condition.pattern,
      line: token + " " + condition.pattern + " " + surgeQuoteJq(mapped.jq),
      notes: condition.notes,
    };
  }
  if (
    action.name === "request.body.replace" ||
    action.name === "response.body.replace"
  ) {
    if (action.args.some((node: any): any => node.type === "array")) {
      const members: any = expandBulkAction(action).map((args: any): any =>
        surgeDirectRewritePlan({ ...ast, actions: [{ ...action, args }] }),
      );
      if (members.some((plan: any): any => !plan.ok))
        return members.find((plan: any): any => !plan.ok);
      const lines: any = members.flatMap(
        (plan: any): any => plan.lines || [plan.line],
      );
      return { ...members[0], line: lines[0], lines };
    }
    const regex: any = action.args[0];
    const replacement: any = stringNode(action.args[1]);
    if (regex?.type !== "regex" || replacement === null)
      return unsupported(action.name + ": invalid body replacement arguments");
    // Modified: 2026-10-26 (chance). Keep Surge flag mapping independently disabled.
    const bodyRegex: any = compileRegexForTarget(regex, {
      subject: "body",
      target: "surge",
    });
    if (!bodyRegex.ok) return unsupported(bodyRegex.reason);
    if (/\s/.test(bodyRegex.pattern) || /[\r\n]/.test(replacement))
      return unsupported(
        "Surge direct body replacement with literal whitespace requires script fallback",
      );
    const token: any = REWRITE_MUTATION_MAPPINGS[action.name].surge;
    return {
      ok: true,
      strategy: "direct",
      section: "body",
      pattern: condition.pattern,
      line:
        token +
        " " +
        condition.pattern +
        " " +
        bodyRegex.pattern +
        " " +
        replacement,
      notes: [...condition.notes, ...bodyRegex.notes],
    };
  }
  return unsupported(
    "action requires generated script or target-specific mapping",
  );
}
function loonTemplateToNativeUrl(
  node: any,
  capture: any,
  argumentTable: any = null,
  target: any = "Surge",
): any {
  return stringTemplateParts(node)
    .map(([kind, value]: any): any => {
      if (kind === "s") {
        // Native URL Rewrite has no documented literal-dollar escape. Never
        // reinterpret raw/escaped Loon text as a target capture or placeholder.
        if (/[$\\\s]/.test(value))
          throw new Error(
            "URL replacement literal cannot be represented safely in native " +
              target +
              " URL Rewrite",
          );
        return value;
      }
      const ref: any = value.match(/^([A-Za-z_][A-Za-z0-9_-]*)\.(\d+)$/);
      if (ref) {
        if (!capture || ref[1] !== capture)
          throw new Error("URL replacement contains a non-URL capture");
        if (Number(ref[2]) === 0)
          throw new Error(
            target +
              " URL Rewrite does not document a complete-match $0 replacement",
          );
        return "$" + Number(ref[2]);
      }
      const entry: any = argumentTable?.byId?.get(value);
      if (!entry)
        throw new Error(
          "URL replacement contains an unsupported variable: " + value,
        );
      return entry.placeholder;
    })
    .join("");
}
export function surgeRedirectRewritePlan(
  ast: any,
  { argumentTable = null }: any = {},
): any {
  validateRewriteV2Ast(ast);
  if (
    ast.actions.length !== 1 ||
    !["redirect", "url.replace"].includes(ast.actions[0].name)
  ) {
    return unsupported(
      "Surge URL Rewrite mapping requires one redirect/url.replace action",
    );
  }
  const condition: any = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action: any = ast.actions[0];
  if (action.name === "redirect") {
    const status: any = action.args[0];
    const target: any = stringNode(action.args[1]);
    if (status?.type !== "number" || ![302, 307].includes(status.value))
      return unsupported("redirect status must be 302 or 307");
    if (target === null)
      return unsupported("redirect target must be a fixed string");
    try {
      const replacement: any = loonTemplateToNativeUrl(
        action.args[1],
        condition.capture,
        argumentTable,
      );
      return {
        ok: true,
        strategy: "direct",
        section: "url",
        pattern: condition.pattern,
        line: condition.pattern + " " + replacement + " " + status.value,
        notes: condition.notes,
      };
    } catch (error: any) {
      return unsupported(String(error.message || error));
    }
  }
  const target: any = stringNode(action.args[0]);
  if (target === null)
    return unsupported("url.replace target must be a fixed string");
  try {
    const replacement: any = loonTemplateToNativeUrl(
      action.args[0],
      condition.capture,
      argumentTable,
    );
    return {
      ok: true,
      strategy: "direct",
      section: "url",
      pattern: condition.pattern,
      line: condition.pattern + " " + replacement + " header",
      notes: condition.notes,
    };
  } catch (error: any) {
    return unsupported(String(error.message || error));
  }
}
function mapLocalData(value: any): any {
  return JSON.stringify(String(value));
}
export function surgeRejectRewritePlan(ast: any): any {
  validateRewriteV2Ast(ast);
  if (ast.actions.length !== 1)
    return unsupported("Surge reject mapping requires exactly one action");
  const condition: any = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const action: any = ast.actions[0];
  if (
    !["reject", "reject_img", "reject_dict", "reject_array"].includes(
      action.name,
    )
  )
    return unsupported("reject action has no direct Surge mapping");
  const status: any = action.args[0];
  if (
    status?.type !== "number" ||
    !Number.isInteger(status.value) ||
    status.value < 200 ||
    status.value > 599
  ) {
    return unsupported("reject status must be 200...599 for this mapping");
  }
  // Ordinary Loon reject(404) is just a normal reject. Surge has a native
  // URL Rewrite reject action, so do not synthesize a Map Local response.
  if (
    action.name === "reject" &&
    action.args.length === 1 &&
    status.value === 404
  ) {
    return {
      ok: true,
      strategy: "direct",
      section: "url",
      pattern: condition.pattern,
      line: condition.pattern + " _ reject",
      notes: condition.notes,
    };
  }
  if (action.name === "reject_img") {
    return {
      ok: true,
      strategy: "direct",
      section: "map",
      pattern: condition.pattern,
      line:
        condition.pattern + " data-type=tiny-gif status-code=" + status.value,
      notes: condition.notes,
    };
  }
  let body: any = "";
  let header: any = "";
  if (action.name === "reject_dict") {
    body = "{}";
    header = ' header="Content-Type:application/json"';
  } else if (action.name === "reject_array") {
    body = "[]";
    header = ' header="Content-Type:application/json"';
  } else if (action.args.length > 1) {
    body = stringNode(action.args[1]);
    if (body === null)
      return unsupported("custom reject body must be a fixed string");
    header = ' header="Content-Type:text/plain; charset=utf-8"';
  }
  return {
    ok: true,
    strategy: "direct",
    section: "map",
    pattern: condition.pattern,
    line:
      condition.pattern +
      " data-type=text data=" +
      mapLocalData(body) +
      " status-code=" +
      status.value +
      header,
    notes: condition.notes,
  };
}
function fixedNoTemplate(node: any, what: any): any {
  const value: any = stringNode(node);
  if (value === null) throw new Error(what + " must be a fixed string");
  if (value.includes("$" + "{"))
    throw new Error(what + " contains a runtime variable");
  return value;
}
function expandBulkAction(action: any): any {
  if (!action.args.some((arg: any): any => arg.type === "array"))
    return [action.args];
  const arrays: any = action.args.map((arg: any): any => arg.items);
  return arrays[0].map((_: any, index: any): any =>
    arrays.map((items: any): any => items[index]),
  );
}
function surgeHeaderLine(pattern: any, action: any, args: any): any {
  const mapping: any = REWRITE_MUTATION_MAPPINGS[action.name];
  const direction: any = mapping.surge;
  const name: any = fixedNoTemplate(args[0], "header name");
  if (/\s/.test(name)) throw new Error("header name contains whitespace");
  return mapping.surgeActions.map((type: any): any => {
    if (type === "header-del")
      return direction + " " + pattern + " " + type + " " + name;
    if (type === "header-add") {
      const value: any = fixedNoTemplate(args[1], "header value");
      if (/[\r\n]/.test(value))
        throw new Error("header value contains a line break");
      return direction + " " + pattern + " " + type + " " + name + " " + value;
    }
    const regex: any = args[1];
    const replacement: any = fixedNoTemplate(args[2], "header replacement");
    if (regex?.type !== "regex")
      throw new Error("header.replace regex must be fixed");
    // Modified: 2026-10-26 (chance). QX author confirmation does not apply to Surge.
    const compiled: any = compileRegexForTarget(regex, {
      subject: "header",
      target: "surge",
    });
    if (!compiled.ok) throw new Error(compiled.reason);
    if (/\s/.test(compiled.pattern) || /[\r\n]/.test(replacement)) {
      throw new Error(
        "Surge header-replace-regex with literal whitespace requires script fallback",
      );
    }
    return (
      direction +
      " " +
      pattern +
      " " +
      type +
      " " +
      name +
      " " +
      compiled.pattern +
      " " +
      replacement
    );
  });
}
export function surgeHeaderRewritePlan(ast: any): any {
  validateRewriteV2Ast(ast);
  const allowed: any = new Set([
    ast.phase + ".header.add",
    ast.phase + ".header.set",
    ast.phase + ".header.del",
    ast.phase + ".header.replace",
  ]);
  if (
    !ast.actions.length ||
    ast.actions.some((action: any): any => !allowed.has(action.name))
  ) {
    return unsupported(
      "Surge Header Rewrite requires same-phase header actions only",
    );
  }
  const condition: any = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  try {
    const lines: any = [];
    for (const action of ast.actions) {
      for (const args of expandBulkAction(action))
        lines.push(...surgeHeaderLine(condition.pattern, action, args));
    }
    return {
      ok: true,
      strategy: "direct",
      section: "header",
      pattern: condition.pattern,
      lines,
      notes: condition.notes,
    };
  } catch (error: any) {
    return unsupported(String(error.message || error));
  }
}
const MOCK_MIME: any = Object.freeze({
  json: "application/json",
  text: "text/plain",
  css: "text/css",
  html: "text/html",
  javascript: "application/javascript",
  plain: "text/plain",
  png: "image/png",
  gif: "image/gif",
  jpeg: "image/jpeg",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  mp4: "video/mp4",
  "form-data": "multipart/form-data",
});
const MOCK_TEXT_TYPES: any = new Set([
  "json",
  "text",
  "css",
  "html",
  "javascript",
  "plain",
]);
function boolArg(node: any, fallback: any = false): any {
  if (!node) return fallback;
  if (node.type !== "boolean")
    throw new Error("mock Base64 flag must be Boolean");
  return node.value;
}
function intArg(node: any, fallback: any): any {
  if (!node) return fallback;
  if (node.type !== "number" || !Number.isInteger(node.value))
    throw new Error("mock status must be an integer");
  return node.value;
}
function applyStaticHeaderAction(headers: any, action: any): any {
  const remove: any = (name: any): any => {
    const wanted: any = name.toLowerCase();
    for (let i: any = headers.length - 1; i >= 0; i--) {
      if (headers[i][0].toLowerCase() === wanted) headers.splice(i, 1);
    }
  };
  for (const args of expandBulkAction(action)) {
    const name: any = fixedNoTemplate(args[0], "header name");
    if (action.name.endsWith(".add")) {
      headers.push([name, fixedNoTemplate(args[1], "header value")]);
    } else if (action.name.endsWith(".set")) {
      remove(name);
      headers.push([name, fixedNoTemplate(args[1], "header value")]);
    } else if (action.name.endsWith(".del")) {
      remove(name);
    } else {
      const regex: any = args[1];
      const replacement: any = fixedNoTemplate(args[2], "header replacement");
      if (regex?.type !== "regex")
        throw new Error("header.replace regex must be fixed");
      const re: any = new RegExp(
        normalizeRegexBodyForTarget(regex.pattern),
        regex.flags || "",
      );
      const wanted: any = name.toLowerCase();
      for (const pair of headers) {
        if (pair[0].toLowerCase() === wanted)
          pair[1] = String(pair[1]).replace(re, replacement);
      }
    }
  }
}
export function surgeInlineMockPlan(ast: any): any {
  validateRewriteV2Ast(ast);
  if (ast.phase !== "response")
    return unsupported("Surge Map Local maps response.body.mock only");
  const condition: any = simpleUrlRewriteCondition(ast);
  if (!condition.ok) return condition;
  const mocks: any = ast.actions.filter(
    (action: any): any => action.name === "response.body.mock",
  );
  if (mocks.length !== 1)
    return unsupported(
      "Surge mock conversion requires exactly one response.body.mock",
    );
  if (
    ast.actions.some(
      (action: any): any =>
        action !== mocks[0] &&
        !/^response\.header\.(?:add|set|del|replace)$/.test(action.name),
    )
  ) {
    return unsupported(
      "response mock may only combine response.header actions",
    );
  }
  try {
    const mock: any = mocks[0];
    const type: any = fixedNoTemplate(
      mock.args[0],
      "mock content type",
    ).toLowerCase();
    const body: any = fixedNoTemplate(mock.args[1], "mock body");
    const status: any = intArg(mock.args[2], 200);
    const base64: any = boolArg(mock.args[3], false);
    if (status < 200 || status > 999)
      return unsupported(
        "Surge Map Local cannot preserve this Loon mock status",
      );
    if (!Object.hasOwn(MOCK_MIME, type))
      return unsupported("unsupported Loon mock content type: " + type);
    if (!MOCK_TEXT_TYPES.has(type) && !base64)
      return unsupported(
        "binary inline mock requires Base64=true for Surge Map Local",
      );
    const compactBase64: any = base64 ? body.replace(/\s+/g, "") : "";
    if (
      base64 &&
      (!/^[A-Za-z0-9+/]*={0,2}$/.test(compactBase64) ||
        compactBase64.length % 4 === 1)
    ) {
      return unsupported("invalid inline Base64 mock body");
    }
    const headers: any = [["Content-Type", MOCK_MIME[type]]];
    for (const action of ast.actions) {
      if (action !== mock) applyStaticHeaderAction(headers, action);
    }
    for (const pair of headers) {
      if (/[\r\n|]/.test(pair[0]) || /[\r\n|]/.test(pair[1])) {
        return unsupported(
          "Map Local header contains a separator or line break and requires encoded header materialization",
        );
      }
    }
    const headerValue: any = headers
      .map((pair: any): any => pair[0] + ":" + pair[1])
      .join("|");
    const data: any = base64 ? compactBase64 : body;
    const dataType: any = base64 ? "base64" : "text";
    const line: any =
      condition.pattern +
      " data-type=" +
      dataType +
      " data=" +
      JSON.stringify(data) +
      " status-code=" +
      status +
      (headerValue ? " header=" + JSON.stringify(headerValue) : "");
    return {
      ok: true,
      strategy: "direct",
      section: "map",
      pattern: condition.pattern,
      line,
      notes: condition.notes,
    };
  } catch (error: any) {
    return unsupported(String(error.message || error));
  }
}
export function surgeMockFilePlan(
  ast: any,
  { pluginSourceUrl = "", materialized = null }: any = {},
): any {
  validateRewriteV2Ast(ast);
  if (ast.phase !== "response") {
    return unsupported("Surge Map Local file mapping requires response phase");
  }
  const condition: any = simpleUrlRewriteCondition(ast, { target: "surge" });
  if (!condition.ok) return condition;
  const mocks: any = ast.actions.filter(
    (action: any): any => action.name === "response.body.mock_file",
  );
  if (mocks.length !== 1)
    return unsupported(
      "Surge Map Local file mapping requires exactly one response.body.mock_file action",
    );
  if (
    ast.actions.some(
      (action: any): any =>
        action !== mocks[0] &&
        !/^response\.header\.(?:add|set|del|replace)$/.test(action.name),
    )
  ) {
    return unsupported(
      "response mock_file may only combine response.header actions",
    );
  }
  try {
    const action: any = mocks[0];
    const spec: any = dependencySpecFromAction(action, { pluginSourceUrl });
    if (!spec?.resolvable || !spec.url)
      return unsupported(spec?.reason || "mock_file is not resolvable");
    if (spec.status < 200 || spec.status > 999)
      return unsupported(
        "Surge Map Local cannot preserve this Loon mock_file status",
      );
    if (!Object.hasOwn(MOCK_MIME, spec.contentType))
      return unsupported(
        "unsupported Loon mock_file content type: " + spec.contentType,
      );
    let dataType: any = "file";
    let data: any = spec.url;
    if (spec.base64) {
      if (
        !materialized ||
        materialized.error ||
        typeof materialized.bodyBase64 !== "string"
      ) {
        return unsupported(
          materialized?.error ||
            "Base64 mock_file content was not materialized",
        );
      }
      dataType = "base64";
      data = materialized.bodyBase64;
    }
    const headers: any = [["Content-Type", MOCK_MIME[spec.contentType]]];
    for (const item of ast.actions) {
      if (item !== action) applyStaticHeaderAction(headers, item);
    }
    for (const pair of headers) {
      if (/[\r\n|]/.test(pair[0]) || /[\r\n|]/.test(pair[1])) {
        return unsupported(
          "Map Local header contains a separator or line break and requires script fallback",
        );
      }
    }
    const headerValue: any = headers
      .map((pair: any): any => pair[0] + ":" + pair[1])
      .join("|");
    return {
      ok: true,
      strategy: "direct",
      section: "map",
      pattern: condition.pattern,
      line:
        condition.pattern +
        " data-type=" +
        dataType +
        " data=" +
        JSON.stringify(data) +
        " status-code=" +
        spec.status +
        (headerValue ? " header=" + JSON.stringify(headerValue) : ""),
      notes: condition.notes,
    };
  } catch (error: any) {
    return unsupported(String(error?.message || error));
  }
}
export function fixedStringValue(node: any): any {
  // Legacy redirect/mock renderers validate and expand their own templates.
  // Keep their public input contract; the feature planner selects the semantic
  // string compiler for mutation actions before native lowering.
  return node && ["string", "raw-string"].includes(node.type)
    ? String(node.value)
    : null;
}
// Loon splits mutations by operation; targets group them by phase and family.
// This table names supported target types. Argument/condition lowering remains
// responsible for translating JSON paths, file JQ and whole-header patterns.
export const REWRITE_MUTATION_MAPPINGS: any = Object.freeze(
  Object.fromEntries(
    ["request", "response"].flatMap((phase: any): any => [
      ...[
        ["add", ["header-add"]],
        ["set", ["header-del", "header-add"]],
        ["del", ["header-del"]],
        ["replace", ["header-replace-regex"]],
      ].map(([operation, surgeActions]: any): any => [
        phase + ".header." + operation,
        Object.freeze({
          qx: phase + "-header",
          surge: "http-" + phase,
          section: "header",
          surgeActions: Object.freeze(surgeActions),
        }),
      ]),
      ...["add", "delete", "replace", "jq", "jq_file"].map(
        (operation: any): any => [
          phase + ".json." + operation,
          Object.freeze({
            qx: "jsonjq-" + phase + "-body",
            surge: "http-" + phase + "-jq",
            section: "body",
          }),
        ],
      ),
      [
        phase + ".body.replace",
        Object.freeze({
          qx: phase + "-body",
          surge: "http-" + phase,
          section: "body",
        }),
      ],
    ]),
  ),
);
// QX types are selected by behavior; lookup does not bypass argument validation.
// Only actions without a verified target type retain null here.
export const QX_REWRITE_PRIMITIVES: any = Object.freeze({
  "url.replace": null,
  redirect: Object.freeze({ 302: "302", 307: "307" }),
  reject: Object.freeze({ 200: "reject-200", 404: "reject" }),
  reject_img: Object.freeze({ 200: "reject-img" }),
  reject_dict: Object.freeze({ 200: "reject-dict" }),
  reject_array: Object.freeze({ 200: "reject-array" }),
  reject_video: null,
  ...Object.fromEntries(
    Object.entries(REWRITE_MUTATION_MAPPINGS).map(
      ([name, mapping]: any): any => [name, mapping.qx],
    ),
  ),
  "request.body.mock": null,
  "request.body.mock_file": null,
  "response.body.mock": null,
  "response.body.mock_file": null,
});
export function qxPrimitiveForRewriteV2Action(action: any): any {
  validateRewriteV2Action(action);
  const mapping: any = QX_REWRITE_PRIMITIVES[action.name];
  if (!mapping) return null;
  if (typeof mapping === "string") return mapping;
  // A custom reject body needs the existing semantic/script planner.
  if (action.name === "reject" && action.args.length !== 1) return null;
  const status: any = action.args[0];
  return status?.type === "number" ? (mapping[status.value] ?? null) : null;
}
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / Rewrite-Result / Domain
// Rewrite planner result helpers
// Author: chance
// Category: Converter / Rewrite / Planning
export function rewriteReview(source: any, reason: any): any {
  return {
    section: "comment",
    line:
      "# [WayX] REVIEW REQUIRED: " +
      reason +
      "\n# Source declaration: " +
      source,
  };
}
export function rewriteIssue(source: any, code: any, reason: any): any {
  return {
    section: "comment",
    line:
      "# [WayX] ISSUE REQUIRED [" +
      code +
      "]: " +
      reason +
      "\n# Source declaration: " +
      source,
    issue: true,
    issueCode: code,
  };
}

// Quantumult X Rewrite native matcher planner
// Author: chance
// Category: Converter / Quantumult X / Rewrite Matching
function unwrap(node: any): any {
  let cur: any = node;
  while (cur?.type === "group") cur = cur.expression;
  return cur;
}
function fixedString(node: any): any {
  if (!node || !["string", "raw-string"].includes(node.type)) return null;
  return String(node.value);
}
function regexEscape(value: any): any {
  return String(value).replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
function requestHeaderName(variableName: any): any {
  const match: any = String(variableName || "").match(
    /^request\.header\[(['"])([^'"]+)\1\]$/,
  );
  if (!match) return null;
  const name: any = match[2];
  if (!/^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name)) return null;
  return name;
}
function headerNameRegex(name: any): any {
  return [...String(name)]
    .map((ch: any): any => {
      if (/[A-Za-z]/.test(ch)) {
        return "[" + ch.toUpperCase() + ch.toLowerCase() + "]";
      }
      return regexEscape(ch);
    })
    .join("");
}
function requestHeaderLinePattern(name: any, value: any = null): any {
  const field: any = "\\r\\n" + headerNameRegex(name) + ":[ \\t]*";
  if (value === null) return field + "[^\\r\\n]*(?:\\r\\n|$)";
  return field + regexEscape(value) + "[ \\t]*(?:\\r\\n|$)";
}
function comparisonKey(node: any, { compatibility = false }: any = {}): any {
  const n: any = unwrap(node);
  if (n?.type !== "comparison" || n.left?.type !== "variable") return null;
  const url: any = urlComparisonRegex(n);
  if (url && (compatibility || !url.regex.flags)) {
    return {
      kind: "url-regex",
      key:
        "url-regex\u0000" +
        url.regex.pattern +
        "\u0000" +
        String(url.regex.flags || ""),
      sourceFlags: String(url.regex.flags || ""),
      pattern: compileRegexForTarget(url.regex).pattern,
    };
  }
  if (n.left.name === "request.method" && n.operator === "==") {
    const value: any = fixedString(n.right);
    if (value === null || !value || /[\s\r\n]/.test(value)) return null;
    return {
      kind: "request-method-eq",
      key: "request-method-eq\u0000" + value,
      value,
    };
  }
  const headerName: any = requestHeaderName(n.left.name);
  if (headerName) {
    const normalizedName: any = headerName.toLowerCase();
    if (n.operator === "==") {
      const value: any = fixedString(n.right);
      if (value === null || /[\x00-\x1F\x7F]/.test(value)) return null;
      return {
        kind: "request-header-eq",
        key: "request-header-eq\u0000" + normalizedName + "\u0000" + value,
        name: headerName,
        value,
        pattern: requestHeaderLinePattern(headerName, value),
      };
    }
    if (n.operator === "~=" && n.right?.type === "regex") {
      // A successful Loon header-regex condition guarantees that the request
      // header exists. Keep the source regex inside the helper because
      // embedding it in QX's serialized Headers string changes ^/$ and capture
      // semantics.
      return {
        kind: "request-header-present",
        key: "request-header-present\u0000" + normalizedName,
        name: headerName,
        pattern: requestHeaderLinePattern(headerName, null),
      };
    }
  }
  return null;
}
function guaranteedPredicates(node: any): any {
  const n: any = unwrap(node);
  if (!n) return new Map();
  if (n.type === "comparison") {
    const item: any = comparisonKey(n, { compatibility: true });
    return item ? new Map([[item.key, item]]) : new Map();
  }
  if (n.type !== "logical") return new Map();
  const left: any = guaranteedPredicates(n.left);
  const right: any = guaranteedPredicates(n.right);
  if (n.operator === "&&") {
    return new Map([...left, ...right]);
  }
  if (n.operator === "||") {
    const out: any = new Map();
    for (const [key, item] of left) if (right.has(key)) out.set(key, item);
    return out;
  }
  return new Map();
}
function selectUrlPredicate(predicates: any): any {
  for (const item of predicates.values())
    if (item.kind === "url-regex") return item;
  return null;
}
function selectMethodPredicate(predicates: any): any {
  for (const item of predicates.values())
    if (item.kind === "request-method-eq") return item;
  return null;
}
function selectHeaderPredicate(predicates: any): any {
  for (const item of predicates.values()) {
    if (
      item.kind === "request-header-eq" ||
      item.kind === "request-header-present"
    )
      return item;
  }
  return null;
}
function exactPredicates(node: any, options: any = {}): any {
  const n: any = unwrap(node);
  if (!n) return { ok: false, reason: "missing Rewrite condition" };
  if (n.type === "comparison") {
    const item: any = comparisonKey(n, options);
    if (!item || item.kind.startsWith("request-header-")) {
      return {
        ok: false,
        reason: "condition comparison is outside the exact QX matcher subset",
      };
    }
    return { ok: true, predicates: new Map([[item.key, item]]) };
  }
  if (n.type !== "logical" || n.operator !== "&&") {
    return {
      ok: false,
      reason:
        "exact QX matcher currently requires a comparison or AND-only condition",
    };
  }
  const left: any = exactPredicates(n.left, options);
  if (!left.ok) return left;
  const right: any = exactPredicates(n.right, options);
  if (!right.ok) return right;
  const merged: any = new Map([...left.predicates, ...right.predicates]);
  const urls: any = [...merged.values()].filter(
    (item: any): any => item.kind === "url-regex",
  );
  const methods: any = [...merged.values()].filter(
    (item: any): any => item.kind === "request-method-eq",
  );
  if (urls.length > 1)
    return {
      ok: false,
      reason:
        "exact QX matcher cannot intersect multiple distinct URL regex predicates",
    };
  if (methods.length > 1)
    return {
      ok: false,
      reason:
        "exact QX matcher cannot satisfy multiple distinct request.method equalities",
    };
  return { ok: true, predicates: merged };
}
function matcherFromPredicates(predicates: any): any {
  const url: any = selectUrlPredicate(predicates);
  const method: any = selectMethodPredicate(predicates);
  const header: any = selectHeaderPredicate(predicates);
  const hasUrl: any = Boolean(url);
  const hasHeaders: any = Boolean(method || header);
  const urlPattern: any = hasUrl ? url.pattern : "^https?://";
  if (hasHeaders) {
    // Quantumult X url-and-header evaluates URL first and then one regex over
    // a serialized request-side string containing method, path and headers.
    // Header-regex source conditions remain in the helper; the native layer
    // only proves request-header presence for those cases.
    const methodPattern: any = method
      ? "^" + regexEscape(method.value) + "[ ]"
      : null;
    let headersPattern: any = header?.pattern || methodPattern;
    if (methodPattern && header) {
      headersPattern = methodPattern + "[\\s\\S]*" + header.pattern;
    }
    const pushedDown: any = [];
    if (method) pushedDown.push("request.method");
    if (header)
      pushedDown.push("request.header[" + JSON.stringify(header.name) + "]");
    return {
      ok: true,
      matcher: "url-and-header",
      matchScope: hasUrl ? "url-and-headers" : "headers-only",
      urlPattern,
      headersPattern,
      prefix: urlPattern + " " + headersPattern + " url-and-header ",
      pushedDown,
    };
  }
  return {
    ok: true,
    matcher: "url",
    matchScope: hasUrl ? "url-only" : "unfiltered",
    urlPattern,
    headersPattern: null,
    prefix: urlPattern + " url ",
    pushedDown: [],
  };
}
export function qxExactRewriteMatcherPlan(ast: any, options: any = {}): any {
  const exact: any = exactPredicates(ast?.condition, options);
  if (!exact.ok) return exact;
  const plan: any = matcherFromPredicates(exact.predicates);
  if (!options.compatibility && plan.urlPattern === "^https?://") {
    plan.urlPattern = "^";
    plan.prefix = plan.prefix.replace("^https?:// ", "^ ");
  }
  return {
    ...plan,
    exact: true,
    compatibilityUnverified: [...exact.predicates.values()].some(
      (p: any): any => Boolean(p.sourceFlags),
    ),
  };
}
export function qxRewriteMatcherPlan(ast: any): any {
  const predicates: any = guaranteedPredicates(ast?.condition);
  // Prefilter mode may intentionally drop non-native predicates because the
  // generated helper re-evaluates the complete source condition.
  const plan: any = matcherFromPredicates(predicates);
  if (plan.urlPattern === "^https?://") {
    plan.urlPattern = "^";
    plan.prefix = plan.prefix.replace("^https?:// ", "^ ");
  }
  return { ...plan, exact: false };
}

// Generic Loon legacy Rewrite classifier and target planner
// Author: chance
// Category: Converter / Legacy Rewrite
function legacyRewriteReview(pattern: any, action: any, reason: any): any {
  return {
    section: "comment",
    line: `# [WayX] REVIEW REQUIRED: ${reason}\n# Source declaration: ${pattern} ${action}`,
  };
}
function issue(pattern: any, action: any, code: any, reason: any): any {
  return {
    section: "comment",
    line: `# [WayX] ISSUE REQUIRED [${code}]: ${reason}\n# Source declaration: ${pattern} ${action}`,
    issue: true,
    issueCode: code,
  };
}
function legacyShellTokens(input: any): any {
  const out: any = [];
  let cur: any = "",
    quote: any = null,
    esc: any = false;
  for (let i: any = 0; i < input.length; i++) {
    const ch: any = input[i];
    if (esc) {
      cur += ch;
      esc = false;
      continue;
    }
    if (ch === "\\" && quote) {
      cur += ch;
      esc = true;
      continue;
    }
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
function unquote(token: any): any {
  const t: any = String(token ?? "");
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    return t.slice(1, -1);
  }
  return t;
}
function jqPath(pathText: any): any {
  try {
    return parseJsonKeyPath(pathText);
  } catch {
    return null;
  }
}
function jqAccess(pathText: any): any {
  const parts: any = jqPath(pathText);
  return parts ? jqPathSelector(parts) : null;
}
function parseJsonValue(token: any): any {
  const t: any = String(token).trim();
  try {
    return JSON.parse(t);
  } catch {}
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  )
    return t.slice(1, -1);
  return t;
}
function compileJsonMutation(phase: any, op: any, rest: any): any {
  if (op === "jq")
    return { ok: true, jq: unquote(String(rest).trim()), preserve: true };
  const tokens: any = legacyShellTokens(rest);
  if (op === "del") {
    if (!tokens.length) return { ok: false, reason: "missing JSON path" };
    const paths: any = tokens.map(unquote).map((path: any): any => ({
      parts: jqPath(path),
      access: jqAccess(path),
    }));
    if (paths.some((path: any): any => !path.parts || !path.access))
      return { ok: false, reason: "unsupported JSON path syntax" };
    return {
      ok: true,
      jq: renderFixedPathDeleteJq(
        paths.map((path: any): any => ({
          parts: path.parts,
          selector: path.access,
        })),
      ),
    };
  }
  if (op === "add" || op === "replace") {
    if (!tokens.length || tokens.length % 2)
      return { ok: false, reason: "json-" + op + " requires path/value pairs" };
    const ops: any = [];
    for (let i: any = 0; i < tokens.length; i += 2) {
      const path: any = jqPath(unquote(tokens[i]));
      if (!path) return { ok: false, reason: "unsupported JSON path syntax" };
      const value: any = JSON.stringify(parseJsonValue(tokens[i + 1]));
      if (op === "add") {
        ops.push(renderFixedPathAddJq(path, value));
      } else {
        ops.push(renderFixedPathReplaceJq(path, value));
      }
    }
    return { ok: true, jq: ops.join(" | ") };
  }
  return { ok: false, reason: "unsupported JSON operation" };
}
export function classifyLegacyRewrite(action: any): any {
  const parsed: any = classifyLegacyRewriteAction(action);
  if (parsed.kind === "reject" && parsed.variant === "video")
    return { kind: "reject-video" };
  if (parsed.kind === "header")
    return {
      kind: "header",
      phase: parsed.phase,
      op: parsed.operation,
      rest: parsed.rest,
    };
  if (parsed.kind === "body-regex")
    return { kind: "body-regex", phase: parsed.phase, rest: parsed.rest };
  if (parsed.kind === "json")
    return {
      kind: "json",
      phase: parsed.phase,
      op: parsed.operation,
      rest: parsed.rest,
    };
  if (parsed.kind === "mock")
    return { kind: "mock", phase: parsed.phase, mock: parsed.mock };
  if (parsed.kind === "reject")
    return { kind: "reject", action: parsed.action };
  if (parsed.kind === "redirect")
    return { kind: "redirect", status: parsed.status, target: parsed.target };
  if (parsed.kind === "url-rewrite")
    return { kind: "url-rewrite", target: parsed.target };
  return { kind: "unknown", raw: parsed.raw };
}
function legacyStringNode(value: any): any {
  return {
    type: "string",
    value: String(value),
    raw: JSON.stringify(String(value)),
  };
}
function legacyRegexNode(pattern: any): any {
  return {
    type: "regex",
    pattern: String(pattern),
    flags: "",
    raw: "/" + String(pattern).replaceAll("/", "\\/") + "/",
  };
}
function legacyHeaderAst(pattern: any, parsed: any, tokens: any): any {
  const width: any =
    parsed.op === "del" ? 1 : parsed.op === "replace-regex" ? 3 : 2;
  const actions: any = [];
  for (let i: any = 0; i < tokens.length; i += width) {
    const args: any = tokens.slice(i, i + width).map(unquote);
    let suffix: any;
    let nodes: any;
    if (parsed.op === "del") {
      suffix = "del";
      nodes = [legacyStringNode(args[0])];
    } else if (parsed.op === "add") {
      suffix = "add";
      nodes = [legacyStringNode(args[0]), legacyStringNode(args[1])];
    } else if (parsed.op === "replace") {
      // Legacy header-replace is the set/replace-whole-field operation.
      suffix = "set";
      nodes = [legacyStringNode(args[0]), legacyStringNode(args[1])];
    } else {
      suffix = "replace";
      nodes = [
        legacyStringNode(args[0]),
        legacyRegexNode(args[1]),
        legacyStringNode(args[2]),
      ];
    }
    actions.push({
      type: "action",
      name: parsed.phase + ".header." + suffix,
      args: nodes,
    });
  }
  return {
    type: "rewrite",
    phase: parsed.phase,
    condition: {
      type: "comparison",
      operator: "~=",
      left: { type: "variable", name: "url" },
      right: legacyRegexNode(pattern),
      capture: null,
    },
    actions,
  };
}
function planHeader(
  pattern: any,
  action: any,
  parsed: any,
  target: any,
  ctx: any,
): any {
  const tokens: any = legacyShellTokens(parsed.rest);
  const direction: any =
    parsed.phase === "response" ? "http-response" : "http-request";
  const width: any =
    parsed.op === "del" ? 1 : parsed.op === "replace-regex" ? 3 : 2;
  if (!tokens.length || tokens.length % width)
    return legacyRewriteReview(
      pattern,
      action,
      "invalid legacy header argument grouping",
    );
  if (
    target === "qx" &&
    parsed.op === "add" &&
    ["request", "response"].includes(parsed.phase)
  ) {
    const targetPattern: any = normalizeUrlRegexForTarget(pattern);
    const pairs: any = [];
    for (let i: any = 0; i < tokens.length; i += width) {
      const [name, value] = tokens.slice(i, i + width).map(unquote);
      if (!name || /[\s:\r\n]/.test(name) || /[\r\n$]/.test(value)) {
        if (parsed.phase === "response") break;
        return legacyRewriteReview(
          pattern,
          action,
          "legacy request header-add contains an unsafe field name/value for QX whole-header rewrite",
        );
      }
      pairs.push([name, value]);
    }
    if (pairs.length === tokens.length / width) {
      const token: any = parsed.phase + "-header";
      const inserted: any = pairs
        .map(([name, value]: any): any => name + ": " + value + "$2")
        .join("");
      return {
        section: "rewrite",
        line:
          targetPattern +
          " url " +
          token +
          " ^([^\\r\\n]+)(\\r\\n) " +
          token +
          " $1$2" +
          inserted,
      };
    }
  }
  if (target === "qx" && parsed.phase === "response" && parsed.op === "add") {
    return {
      section: "comment",
      line:
        "# [WayX] Quantumult X legacy response-header-add commented out; this field/value cannot be safely encoded by native response-header without changing duplicate-header semantics.\n# Source declaration: " +
        pattern +
        " " +
        action,
      reason: "unsupported-qx-response-header-add-comment",
    };
  }
  if (target === "qx") {
    try {
      const ast: any = legacyHeaderAst(pattern, parsed, tokens);
      const plan: any = renderQxHeaderScript(ast, {
        stamp: ctx.stamp || "",
        category: ctx.category || "Rewrite / Legacy Header",
        sourceLine: pattern + " " + action,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("legacy-header\\0" + pattern + "\\0" + action)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "legacy_header_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "rewrite",
        line:
          plan.pattern +
          " url " +
          plan.qxAction +
          " " +
          ctx.rawBase +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return legacyRewriteReview(
        pattern,
        action,
        String(error?.message || error),
      );
    }
  }
  const targetPattern: any = normalizeUrlRegexForTarget(pattern);
  const lines: any = [];
  for (let i: any = 0; i < tokens.length; i += width) {
    const args: any = tokens.slice(i, i + width).map(unquote);
    if (parsed.op === "replace-regex")
      args[1] = normalizeRegexBodyForTarget(args[1]);
    lines.push(
      `${direction} ${targetPattern} header-${parsed.op} ${args.join(" ")}`,
    );
  }
  return { section: "header", lines };
}
function planBodyRegex(
  pattern: any,
  action: any,
  parsed: any,
  target: any,
): any {
  const tokens: any = legacyShellTokens(parsed.rest).map(unquote);
  if (!tokens.length || tokens.length % 2)
    return legacyRewriteReview(
      pattern,
      action,
      "body regex rewrite requires regex/replacement pairs",
    );
  const targetPattern: any = normalizeUrlRegexForTarget(pattern);
  for (let i: any = 0; i < tokens.length; i += 2)
    tokens[i] = normalizeRegexBodyForTarget(tokens[i]);
  if (target === "qx") {
    const verb: any =
      parsed.phase === "request" ? "request-body" : "response-body";
    const lines: any = [];
    for (let i: any = 0; i < tokens.length; i += 2)
      lines.push(
        `${targetPattern} url ${verb} ${tokens[i]} ${verb} ${tokens[i + 1]}`,
      );
    return { section: "rewrite", lines };
  }
  const direction: any =
    parsed.phase === "request" ? "http-request" : "http-response";
  return {
    section: "body",
    line: `${direction} ${targetPattern} ${tokens.join(" ")}`,
  };
}
function planJson(
  pattern: any,
  action: any,
  parsed: any,
  target: any,
  ctx: any,
): any {
  let compiled: any;
  try {
    compiled = compileJsonMutation(parsed.phase, parsed.op, parsed.rest);
  } catch (error: any) {
    return legacyRewriteReview(
      pattern,
      action,
      String(error?.message || error),
    );
  }
  if (!compiled.ok)
    return legacyRewriteReview(pattern, action, compiled.reason);
  const jq: any = compiled.jq;
  if (parsed.op === "jq" && !String(jq).trim()) {
    // Source-authored empty JQ expressions have no executable target filter.
    // Emitting jsonjq/http-*-jq with '' is invalid; treat the declaration as
    // an intentional no-op/drop rather than inventing target semantics.
    return { section: "drop", reason: "empty-legacy-json-jq" };
  }
  let quoted: any;
  try {
    quoted = quoteJq(jq);
  } catch (error: any) {
    return legacyRewriteReview(
      pattern,
      action,
      String(error?.message || error),
    );
  }
  const targetPattern: any = normalizeUrlRegexForTarget(pattern);
  if (target === "qx") {
    const verb: any = REWRITE_MUTATION_MAPPINGS[parsed.phase + ".json.jq"].qx;
    return {
      section: "rewrite",
      line: `${targetPattern} url ${verb} ${quoted}`,
    };
  }
  const verb: any = REWRITE_MUTATION_MAPPINGS[parsed.phase + ".json.jq"].surge;
  return { section: "body", line: `${verb} ${targetPattern} ${quoted}` };
}
function legacyMockAst(pattern: any, parsed: any): any {
  const mock: any = parsed.mock;
  const args: any = [legacyStringNode(mock.type), legacyStringNode(mock.data)];
  if (parsed.phase === "response") {
    args.push({ type: "number", value: mock.status, raw: String(mock.status) });
    if (mock.base64) args.push({ type: "boolean", value: true, raw: "true" });
  } else if (mock.base64) {
    args.push({ type: "boolean", value: true, raw: "true" });
  }
  return {
    type: "rewrite",
    phase: parsed.phase,
    condition: {
      type: "comparison",
      operator: "~=",
      left: { type: "variable", name: "url" },
      right: legacyRegexNode(pattern),
      capture: null,
    },
    actions: [{ type: "action", name: parsed.phase + ".body.mock", args }],
  };
}
function planMock(
  pattern: any,
  action: any,
  parsed: any,
  target: any,
  ctx: any,
): any {
  const mock: any = parsed.mock;
  if (mock.dataPath)
    return legacyRewriteReview(
      pattern,
      action,
      "legacy mock data-path requires source dependency materialization before a native/helper target can be proven",
    );
  if (mock.data === null)
    return legacyRewriteReview(
      pattern,
      action,
      "legacy body mock has no inline data",
    );
  try {
    const ast: any = legacyMockAst(pattern, parsed);
    if (target === "qx") {
      const plan: any = renderQxInlineMockScript(ast, {
        stamp: ctx.stamp || "",
        category: ctx.category || "Rewrite / Legacy Mock",
        sourceLine: pattern + " " + action,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("legacy-mock\\0" + pattern + "\\0" + action)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "legacy_mock_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "rewrite",
        line:
          plan.pattern +
          " url " +
          plan.qxAction +
          " " +
          ctx.rawBase +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    }
    if (parsed.phase === "response") {
      const direct: any = surgeInlineMockPlan(ast);
      if (direct.ok)
        return {
          section: direct.section,
          line: direct.line,
          lines: direct.lines,
        };
      return legacyRewriteReview(pattern, action, direct.reason);
    }
    const plan: any = renderSurgeRequestMockScript(ast, {
      stamp: ctx.stamp || "",
      category: ctx.category || "Rewrite / Legacy Mock",
      sourceLine: pattern + " " + action,
    });
    const key: any = crypto
      .createHash("sha1")
      .update("legacy-request-mock\\0" + pattern + "\\0" + action)
      .digest("hex")
      .slice(0, 10);
    const filename: any = "legacy_request_mock_" + key + ".js";
    ctx.generatedScripts.set(filename, plan.script);
    return {
      section: "script",
      line:
        "wayx_legacy_request_mock_" +
        key +
        " = type=" +
        plan.surgeType +
        ",pattern=" +
        surgeRegexParameter(plan.pattern) +
        ",script-path=" +
        ctx.rawBase +
        "/Script/" +
        ctx.id +
        "/" +
        filename +
        ",requires-body=true" +
        (plan.binaryBodyMode ? ",binary-body-mode=true" : ""),
    };
  } catch (error: any) {
    return legacyRewriteReview(
      pattern,
      action,
      String(error?.message || error),
    );
  }
}
export function planLegacyRewriteIr(ir: any, target: any, ctx: any = {}): any {
  if (
    !ir ||
    ir.type !== "rewrite-semantic-ir" ||
    ir.sourceSyntax !== "legacy"
  ) {
    throw new TypeError("Expected Legacy Rewrite Semantic IR");
  }
  const pattern: any = ir.condition?.pattern ?? "";
  const action: any = ir.operations[0]?.raw ?? "";
  if (isEmptyLegacyJsonJqIr(ir))
    return { section: "drop", reason: "empty-legacy-json-jq" };
  const targetPattern: any = normalizeUrlRegexForTarget(pattern);
  const operation: any = ir.operations[0];
  const parsed: any = classifyLegacyRewrite(action);
  if (operation.kind === "reject" && operation.variant !== "video") {
    if (target === "qx")
      return {
        section: "rewrite",
        line: `${targetPattern} url ${parsed.action}`,
      };
    const mapping: any = LEGACY_REJECT_VARIANTS.get(parsed.action);
    return {
      section: mapping.surgeSection,
      line: `${targetPattern} ${mapping.surgeArguments}`,
    };
  }
  if (operation.kind === "reject" && operation.variant === "video")
    return legacyRewriteReview(
      pattern,
      action,
      "target mapping for Loon reject-video is not yet proven by official target documentation",
    );
  if (operation.kind === "redirect") {
    return target === "qx"
      ? {
          section: "rewrite",
          line: `${targetPattern} url ${parsed.status} ${parsed.target}`,
        }
      : {
          section: "url",
          line: `${targetPattern} ${parsed.target} ${parsed.status}`,
        };
  }
  if (operation.kind === "url-rewrite") {
    return target === "surge"
      ? { section: "url", line: `${targetPattern} ${parsed.target} header` }
      : legacyRewriteReview(
          pattern,
          action,
          "Quantumult X official sample has no verified transparent URL-rewrite equivalent for Loon legacy header action",
        );
  }
  if (operation.kind === "header")
    return planHeader(pattern, action, parsed, target, ctx);
  if (operation.kind === "body-regex")
    return planBodyRegex(pattern, action, parsed, target);
  if (operation.kind === "json")
    return planJson(pattern, action, parsed, target, ctx);
  if (operation.kind === "mock")
    return planMock(pattern, action, parsed, target, ctx);
  return issue(
    pattern,
    action,
    "unknown-legacy-rewrite-action",
    "unsupported Loon legacy Rewrite action is outside the registered grammar",
  );
}
export function planLegacyRewrite(
  pattern: any,
  action: any,
  target: any,
  ctx: any = {},
): any {
  return planLegacyRewriteIr(
    legacyRewriteToSemanticIr(pattern, action),
    target,
    ctx,
  );
}

// Quantumult X Rewrite target planner
// Author: chance
// Category: Converter / Rewrite / Quantumult X
function qxRewriteSourceLine(ir: any, ctx: any): any {
  return String(ctx.sourceLine || ir?.source || "").trim();
}
function qxRewriteRawBase(ctx: any): any {
  const base: any = String(ctx.rawBase || "").replace(/\/$/, "");
  if (!base)
    throw new Error(
      "Rewrite planner requires rawBase for generated helper URLs",
    );
  return base;
}
let qxRewriteHandlersRegistered: any = false;
function ensureQxRewriteHandlers(): any {
  if (qxRewriteHandlersRegistered) return;
  qxRewriteHandlersRegistered = true;
  registerComplexRewriteHandler({
    id: "qx-inline-mock-header-pipeline",
    targets: ["qx"],
    match: (ast: any): any => {
      if (ast.phase !== "response") return false;
      const mockName: any = "response.body.mock";
      const headerNames: any = new Set([
        ast.phase + ".header.add",
        ast.phase + ".header.set",
        ast.phase + ".header.del",
        ast.phase + ".header.replace",
      ]);
      const mocks: any = ast.actions.filter(
        (action: any): any => action.name === mockName,
      );
      return (
        mocks.length === 1 &&
        ast.actions.every(
          (action: any): any =>
            action.name === mockName || headerNames.has(action.name),
        )
      );
    },
    plan: (ast: any, _target: any, ctx: any): any => {
      try {
        const matcher: any = qxExactRewriteMatcherPlan(ast, {
          compatibility: true,
        });
        if (!matcher.ok) throw new Error(matcher.reason);
        const plan: any = renderQxInlineMockScript(ast, {
          conditionMode: "external-exact",
          stamp: ctx.stamp,
          category: ctx.category,
          sourceLine: ctx.sourceLine,
        });
        const key: any = crypto
          .createHash("sha1")
          .update("mock-inline\0" + ctx.sourceLine)
          .digest("hex")
          .slice(0, 10);
        const filename: any = "mock_" + key + ".js";
        ctx.generatedScripts.set(filename, plan.script);
        return {
          ok: true,
          section: "rewrite",
          line:
            matcher.prefix +
            plan.qxAction +
            " " +
            qxRewriteRawBase(ctx) +
            "/Script/" +
            ctx.id +
            "/" +
            filename,
        };
      } catch (error: any) {
        return {
          ok: false,
          terminal: true,
          reason: String(error?.message || error),
        };
      }
    },
  });
}
function qxNativeHeaderPlan(ast: any): any {
  if (!["request", "response"].includes(ast?.phase) || !ast.actions?.length)
    return null;
  if (
    ast.actions.length === 1 &&
    simpleUrlRewriteCondition(ast).ok &&
    !ast.condition.capture &&
    [ast.phase + ".header.set", ast.phase + ".header.del"].includes(
      ast.actions[0].name,
    )
  ) {
    try {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) return null;
      const token: any = REWRITE_MUTATION_MAPPINGS[ast.actions[0].name].qx,
        lines: any = [];
      for (const args of expandBulkAction(ast.actions[0])) {
        const name: any = fixedNoTemplate(args[0], "header name");
        if (!name || /[\s:\r\n]/.test(name)) return null;
        const field: any = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        lines.push(
          matcher.prefix +
            token +
            " (?m)^()(?i:" +
            field +
            "):[^\\r\\n]*(?:\\r?\\n|$) " +
            token +
            " $1",
        );
        if (ast.actions[0].name.endsWith(".set")) {
          const value: any = fixedNoTemplate(args[1], "header value");
          if (/[\r\n$]/.test(value)) return null;
          lines.push(
            matcher.prefix +
              token +
              " ^([^\\r\\n]+)(\\r\\n) " +
              token +
              " $1$2" +
              name +
              ": " +
              value +
              "$2",
          );
        }
      }
      return { section: "rewrite", line: lines[0], lines };
    } catch {
      return null;
    }
  }
  if (
    ast.actions.length === 1 &&
    simpleUrlRewriteCondition(ast).ok &&
    !ast.condition.capture &&
    ast.actions[0].name === ast.phase + ".header.replace"
  ) {
    try {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) return null;
      const lines: any = [];
      for (const args of expandBulkAction(ast.actions[0])) {
        const name: any = fixedNoTemplate(args[0], "header name");
        const replacement: any = fixedNoTemplate(args[2], "header replacement");
        const regex: any = args[1];
        if (
          !name ||
          /[\s:\r\n]/.test(name) ||
          /[\r\n]/.test(replacement) ||
          regex?.type !== "regex"
        )
          return null;
        // Whole-header matching must stay inside one value. Boundary-sensitive,
        // newline-capable, lookaround and backreference patterns keep a helper.
        const pattern: any = String(regex.pattern);
        if (
          /[\^$]|\\[sSDWnr1-9xucpP0]|\(\?[^:]|\[\^|\[\[:/.test(pattern) ||
          (regex.flags?.includes("s") && pattern.includes("."))
        )
          return null;
        const field: any = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Modified: 2026-10-26 (chance). Restore only source m/s inside the
        // Header value group. Keep source i omitted and field-name casing intact.
        const compiled: any = compileRegexForTarget(regex, {
          subject: "header",
          target: "qx",
        });
        if (!compiled.ok) return null;
        const body: any = compiled.mappedFlags
          ? "(?" + compiled.mappedFlags + ":" + pattern + ")"
          : "(?:" + pattern + ")";
        const token: any = REWRITE_MUTATION_MAPPINGS[ast.actions[0].name].qx;
        const search: any =
          "(?m)^((?i:" + field + "):[\\t\\x20]*[^\\r\\n]*?)(" + body + ")";
        const value: any =
          "$1" +
          replacement.replace(
            /\$(\d+)/g,
            (_: any, number: any): any => "$" + (Number(number) + 2),
          );
        if (/\$(?!\d)/.test(replacement)) return null;
        lines.push(
          matcher.prefix + token + " " + search + " " + token + " " + value,
        );
      }
      return { section: "rewrite", line: lines[0], lines };
    } catch {
      return null;
    }
  }
  if (
    ast.actions.some(
      (action: any): any => action.name !== ast.phase + ".header.add",
    )
  )
    return null;
  const matcher: any = qxExactRewriteMatcherPlan(ast, { compatibility: true });
  if (!matcher.ok) return null;
  const pairs: any = [];
  for (const action of ast.actions) {
    const names: any =
      action.args[0]?.type === "array"
        ? action.args[0].items
        : [action.args[0]];
    const values: any =
      action.args[1]?.type === "array"
        ? action.args[1].items
        : [action.args[1]];
    if (!names.length || names.length !== values.length) return null;
    for (let i: any = 0; i < names.length; i++) {
      const nameNode: any = names[i],
        valueNode: any = values[i];
      if (
        !nameNode ||
        !["string", "raw-string"].includes(nameNode.type) ||
        !valueNode ||
        !["string", "raw-string"].includes(valueNode.type)
      )
        return null;
      const name: any = String(nameNode.value),
        value: any = String(valueNode.value);
      if (!name || /[\s:\r\n]/.test(name) || /[\r\n$]/.test(value)) return null;
      pairs.push([name, value]);
    }
  }
  // QX request/response-header rewrites operate on the complete header block.
  // A source-authored add|add pipeline can therefore be coalesced into one
  // whole-header insertion without changing duplicate-header semantics or
  // source action order.
  const token: any = REWRITE_MUTATION_MAPPINGS[ast.actions[0].name].qx;
  const headerPattern: any = "^([^\\r\\n]+)(\\r\\n)";
  const inserted: any = pairs
    .map(([name, value]: any): any => name + ": " + value + "$2")
    .join("");
  return {
    section: "rewrite",
    line:
      matcher.prefix +
      token +
      " " +
      headerPattern +
      " " +
      token +
      " $1$2" +
      inserted,
  };
}
function qxNativeJsonPipelinePlan(ast: any): any {
  if (
    !["request", "response"].includes(ast?.phase) ||
    (ast.actions?.length || 0) < 2
  )
    return null;
  const matcher: any = qxExactRewriteMatcherPlan(ast, { compatibility: true });
  if (!matcher.ok) return null;
  const mapped: any = jsonPipelineToSafeNativeJq(ast);
  if (!mapped.ok) return null;
  const token: any = REWRITE_MUTATION_MAPPINGS[ast.actions[0].name].qx;
  return {
    section: "rewrite",
    line: matcher.prefix + token + " " + quoteJq(mapped.jq),
  };
}
export function planQxRewrite(ir: any, ctx: any = {}): any {
  if (!ir || ir.type !== "rewrite-semantic-ir")
    throw new TypeError("Expected Rewrite Semantic IR");
  if (ir.sourceSyntax === "legacy") return planLegacyRewriteIr(ir, "qx", ctx);
  if (ir.sourceSyntax !== "v2") {
    return rewriteIssue(
      qxRewriteSourceLine(ir, ctx),
      "unknown-rewrite-source-syntax",
      "unsupported Rewrite source syntax",
    );
  }
  ensureQxRewriteHandlers();
  const source: any = qxRewriteSourceLine(ir, ctx);
  const ast: any = rewriteIrDeclaration(ir);
  const singleOp: any = singleRewriteOperation(ir);
  const argumentRefs: any = ctx.argumentRefs || [];
  if (argumentRefs.length) {
    if (singleOp?.kind === "redirect")
      return {
        section: "comment",
        reason: "unsupported-qx-redirect-argument-comment",
        line:
          "# [WayX] Known Quantumult X target limitation: Loon redirect plugin [Argument] templates have no equivalent runtime transport; source parameter references are preserved as comments: " +
          argumentRefs.join(", ") +
          ".\n# Source declaration: " +
          source,
      };
    return rewriteReview(
      source,
      "Quantumult X cannot carry Loon plugin [Argument] references without changing the source script/runtime contract: " +
        argumentRefs.join(", "),
    );
  }
  if (singleOp?.kind === "redirect") {
    const matcher: any = qxExactRewriteMatcherPlan(ast, {
      compatibility: true,
    });
    if (!matcher.ok)
      return rewriteReview(
        source,
        "QX native redirect requires an exact condition: " + matcher.reason,
      );
    const direct: any = qxDirectRewritePlan(ast, { matcher });
    return direct.ok
      ? { section: direct.section, line: direct.line }
      : rewriteReview(source, direct.reason);
  }
  const nativeJson: any = nativeJsonPriorityPlan(ast, "qx");
  if (nativeJson) return nativeJson;
  const nativeJq: any = nativeJqPriorityPlan(ast, "qx");
  if (nativeJq)
    return nativeJq.ok
      ? {
          section: nativeJq.section,
          line: nativeJq.line,
          lines: nativeJq.lines,
        }
      : rewriteReview(source, nativeJq.reason);
  const nativeHeaderFirst: any = qxNativeHeaderPlan(ast);
  if (nativeHeaderFirst) return nativeHeaderFirst;
  if (
    (rewriteFeatureProfile(ast).needsHelper &&
      !ctx.featureCompatibilityPhases?.has(ast.phase)) ||
    ast.actions.some(isTextRequestMockAction)
  ) {
    const featurePlan: any = planRewriteFeatureHelper(ast, "qx", {
      ...ctx,
      sourceLine: source,
      argumentRefs,
    });
    if (featurePlan)
      return featurePlan.ok
        ? { section: featurePlan.section, line: featurePlan.line }
        : rewriteReview(source, featurePlan.reason);
  }
  const fileMocks: any = ast.actions.filter(
    (action: any): any => action.name === ast.phase + ".body.mock_file",
  );
  const fileMockPipeline: any =
    fileMocks.length === 1 &&
    ast.actions.every(
      (action: any): any =>
        action === fileMocks[0] ||
        new RegExp(
          "^" + ast.phase + "\\.header\\.(?:add|set|del|replace)$",
        ).test(action.name),
    );
  if (
    fileMockPipeline &&
    (ast.phase === "response" || ast.actions.length === 1)
  ) {
    try {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) throw new Error(matcher.reason);
      const fileMock: any = fileMocks[0];
      const plan: any = qxMockPlanFromAction(fileMock, {
        pluginSourceUrl: ctx.sourceUrl,
      });
      const materialized: any = ctx.mockFiles?.get(source);
      if (!materialized)
        throw new Error("mock_file was not materialized during conversion");
      if (materialized.error) throw new Error(materialized.error);
      const headerOps: any = headerOpsForMock(ast, fileMock);
      const key: any = crypto
        .createHash("sha1")
        .update("mock-file\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "mock_file_" + key + ".js";
      const script: any = renderQxMockFileScript(plan, {
        ...materialized,
        headerOps,
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      ctx.generatedScripts.set(filename, script);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  if (singleOp?.kind === "mock" && singleOp.operation === "inline") {
    try {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) throw new Error(matcher.reason);
      const plan: any = renderQxInlineMockScript(ast, {
        conditionMode: "external-exact",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("mock-inline\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "mock_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  const nativeHeader: any = qxNativeHeaderPlan(ast);
  if (nativeHeader) return nativeHeader;
  const nativeJsonPipeline: any = qxNativeJsonPipelinePlan(ast);
  if (nativeJsonPipeline) return nativeJsonPipeline;
  try {
    const exactMatcher: any = qxExactRewriteMatcherPlan(ast, {
      compatibility: true,
    });
    if (exactMatcher.ok) {
      const direct: any = qxDirectRewritePlan(ast, { matcher: exactMatcher });
      if (direct.ok)
        return {
          section: direct.section,
          line: direct.line,
          lines: direct.lines,
        };
    }
  } catch (error: any) {
    return rewriteReview(
      source,
      String(error?.message || error).split("\n")[0],
    );
  }
  if (ast.actions?.length === 1 && ast.actions[0]?.name === "url.replace") {
    return {
      section: "comment",
      line:
        "# [WayX] Known Quantumult X target limitation: Loon url.replace transparently rewrites the request URL, but no equivalent behavior is documented in the official Quantumult X rewrite sample.\n# Source declaration: " +
        source,
      reason: "unsupported-qx-url-replace-comment",
    };
  }
  if (
    singleOp?.kind === "header" &&
    singleOp.phase === "response" &&
    singleOp.operation === "add"
  ) {
    return {
      section: "comment",
      line:
        "# [WayX] Quantumult X response.header.add commented out; this field/value cannot be safely encoded by native response-header without changing duplicate-header semantics.\n# Source declaration: " +
        source,
      reason: "unsupported-qx-response-header-add-comment",
    };
  }
  if (singleOp?.kind === "header" && singleOp.phase === ir.phase) {
    try {
      if (singleOp.operation === "add")
        throw new Error(
          "QX header.add cannot be represented losslessly: duplicate-header runtime semantics are not verified",
        );
      const exact: any = qxExactRewriteMatcherPlan(ast);
      if (exact.ok) {
        const plan: any = renderQxHeaderScript(ast, {
          conditionMode: "external-exact",
          stamp: ctx.stamp,
          category: ctx.category,
          sourceLine: source,
        });
        const key: any = crypto
          .createHash("sha1")
          .update("header-single\\0" + source)
          .digest("hex")
          .slice(0, 10);
        const filename: any = "header_" + key + ".js";
        ctx.generatedScripts.set(filename, plan.script);
        return {
          section: "rewrite",
          line:
            exact.prefix +
            plan.qxAction +
            " " +
            qxRewriteRawBase(ctx) +
            "/Script/" +
            ctx.id +
            "/" +
            filename,
        };
      }
      const plan: any = renderSingleRewriteMutationScript(ast, {
        target: "qx",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("header-single-complex\\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "header_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      const matcher: any = qxRewriteMatcherPlan(ast);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  if (
    singleOp?.kind === "json" &&
    ["add", "delete", "replace"].includes(singleOp.operation) &&
    singleOp.phase === ir.phase
  ) {
    try {
      const plan: any = renderSingleJsonMutationScript(ast, {
        target: "qx",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("json-add-qx\\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "json_add_qx_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      const matcher: any = qxRewriteMatcherPlan(ast);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  if (
    ast.actions?.length === 1 &&
    ast.actions[0]?.name === ast.phase + ".body.replace"
  ) {
    try {
      const plan: any = renderSingleRewriteMutationScript(ast, {
        target: "qx",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("body-single-complex\\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "body_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      const matcher: any = qxRewriteMatcherPlan(ast);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  if (
    singleOp?.kind === "reject" &&
    ["reject", "reject_dict", "reject_array"].includes(singleOp.actionName)
  ) {
    try {
      const matcher: any = qxExactRewriteMatcherPlan(ast, {
        compatibility: true,
      });
      if (!matcher.ok) throw new Error(matcher.reason);
      const plan: any = renderQxRejectScript(ast, {
        conditionMode: "external-exact",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("reject\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "reject_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "rewrite",
        line:
          matcher.prefix +
          plan.qxAction +
          " " +
          qxRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename,
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  const complex: any = planComplexRewrite(ast, "qx", {
    ...ctx,
    sourceLine: source,
    argumentRefs,
  });
  if (complex.ok)
    return {
      section: complex.section,
      line: complex.line,
      lines: complex.lines,
    };
  if (complex.terminal) {
    return complex.issue
      ? rewriteIssue(
          source,
          complex.issueCode || "unknown-complex-rewrite",
          complex.reason,
        )
      : rewriteReview(source, complex.reason);
  }
  return rewriteReview(
    source,
    complex.reason ||
      "no verified Quantumult X mapping for normalized Rewrite semantics",
  );
}

// Surge Rewrite target planner
// Author: chance
// Category: Converter / Rewrite / Surge
function surgeRewriteSourceLine(ir: any, ctx: any): any {
  return String(ctx.sourceLine || ir?.source || "").trim();
}
function surgeRewriteRawBase(ctx: any): any {
  const base: any = String(ctx.rawBase || "").replace(/\/$/, "");
  if (!base)
    throw new Error(
      "Rewrite planner requires rawBase for generated helper URLs",
    );
  return base;
}
let surgeRewriteHandlersRegistered: any = false;
function ensureSurgeRewriteHandlers(): any {
  if (surgeRewriteHandlersRegistered) return;
  surgeRewriteHandlersRegistered = true;
  registerComplexRewriteHandler({
    id: "surge-complex-body-pipeline-script",
    targets: ["surge"],
    match: (_ast: any, info: any): any =>
      info.families.includes("mock-pipeline") &&
      (info.families.includes("body-pipeline") ||
        info.families.includes("json-pipeline")),
    plan: (ast: any, _target: any, ctx: any): any => {
      try {
        const plan: any = renderMixedRewriteScript(ast, {
          target: "surge",
          stamp: ctx.stamp,
          category: ctx.category,
          sourceLine: ctx.sourceLine,
          argumentTable: ctx.argumentTable,
        });
        const payload: any = ctx.argumentRefs?.length
          ? surgeRewriteArgumentPayload(ctx.argumentRefs, ctx.argumentTable)
          : { ok: true, value: null };
        if (!payload.ok) throw new Error(payload.reason);
        const key: any = crypto
          .createHash("sha1")
          .update("complex-mixed\0surge\0" + ctx.sourceLine)
          .digest("hex")
          .slice(0, 10);
        const filename: any = "complex_surge_" + key + ".js";
        ctx.generatedScripts.set(filename, plan.script);
        return {
          ok: true,
          section: "script",
          line:
            "wayx_complex_" +
            key +
            " = type=" +
            plan.surgeType +
            ",pattern=" +
            surgeRegexParameter(plan.pattern) +
            ",script-path=" +
            surgeRewriteRawBase(ctx) +
            "/Script/" +
            ctx.id +
            "/" +
            filename +
            (plan.requiresBody ? ",requires-body=true" : "") +
            (plan.fullHeaderMode ? ",full-header-mode=true" : "") +
            (payload.value ? ",argument=" + payload.value : ""),
        };
      } catch (error: any) {
        return {
          ok: false,
          terminal: true,
          reason: String(error?.message || error),
        };
      }
    },
  });
}
export function planSurgeRewrite(ir: any, ctx: any = {}): any {
  if (!ir || ir.type !== "rewrite-semantic-ir")
    throw new TypeError("Expected Rewrite Semantic IR");
  if (ir.sourceSyntax === "legacy")
    return planLegacyRewriteIr(ir, "surge", ctx);
  if (ir.sourceSyntax !== "v2") {
    return rewriteIssue(
      surgeRewriteSourceLine(ir, ctx),
      "unknown-rewrite-source-syntax",
      "unsupported Rewrite source syntax",
    );
  }
  ensureSurgeRewriteHandlers();
  const source: any = surgeRewriteSourceLine(ir, ctx);
  const ast: any = rewriteIrDeclaration(ir);
  const singleOp: any = singleRewriteOperation(ir);
  const argumentRefs: any = ctx.argumentRefs || [];
  const nativeJson: any = nativeJsonPriorityPlan(ast, "surge");
  if (nativeJson) return nativeJson;
  const nativeJq: any = nativeJqPriorityPlan(ast, "surge");
  if (nativeJq)
    return nativeJq.ok
      ? {
          section: nativeJq.section,
          line: nativeJq.line,
          lines: nativeJq.lines,
        }
      : rewriteReview(source, nativeJq.reason);
  if (
    (rewriteFeatureProfile(ast).needsHelper &&
      !ctx.featureCompatibilityPhases?.has(ast.phase)) ||
    ast.actions.some(isTextRequestMockAction)
  ) {
    const featurePlan: any = planRewriteFeatureHelper(ast, "surge", {
      ...ctx,
      sourceLine: source,
      argumentRefs,
    });
    if (featurePlan)
      return featurePlan.ok
        ? { section: featurePlan.section, line: featurePlan.line }
        : rewriteReview(source, featurePlan.reason);
  }
  if (
    ir.operations.some(
      (op: any): any =>
        op.kind === "mock" &&
        op.phase === "response" &&
        op.operation === "file",
    )
  ) {
    try {
      const mapped: any = surgeMockFilePlan(ast, {
        pluginSourceUrl: ctx.sourceUrl,
        materialized: ctx.mockFiles?.get(source) || null,
      });
      if (mapped.ok)
        return {
          section: mapped.section,
          line: mapped.line,
          lines: mapped.lines,
        };
    } catch {
      // Continue to request/native/helper/complex fallbacks.
    }
  }
  if (singleOp?.kind === "mock" && singleOp.phase === "request") {
    try {
      const plan: any = renderSurgeRequestMockScript(ast, {
        materialized:
          singleOp.operation === "file"
            ? ctx.mockFiles?.get(source) || null
            : null,
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
      });
      const key: any = crypto
        .createHash("sha1")
        .update("surge-request-mock\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "request_mock_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "script",
        line:
          "wayx_request_mock_" +
          key +
          " = type=" +
          plan.surgeType +
          ",pattern=" +
          surgeRegexParameter(plan.pattern) +
          ",script-path=" +
          surgeRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename +
          ",requires-body=true" +
          (plan.binaryBodyMode ? ",binary-body-mode=true" : ""),
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  if (
    ast.actions?.length === 1 &&
    ["redirect", "url.replace"].includes(ast.actions[0]?.name)
  ) {
    try {
      const mapped: any = surgeRedirectRewritePlan(ast, {
        argumentTable: ctx.argumentTable,
      });
      if (mapped.ok)
        return {
          section: mapped.section,
          line: mapped.line,
          lines: mapped.lines,
        };
    } catch {
      // Continue to generated-script/complex fallbacks.
    }
  }
  if (!argumentRefs.length) {
    try {
      for (const mapper of [
        surgeInlineMockPlan,
        surgeHeaderRewritePlan,
        surgeDirectRewritePlan,
        surgeRedirectRewritePlan,
        surgeRejectRewritePlan,
      ]) {
        const mapped: any = mapper(ast);
        if (mapped.ok)
          return {
            section: mapped.section,
            line: mapped.line,
            lines: mapped.lines,
          };
      }
    } catch {
      // Continue to dedicated helper/complex fallback.
    }
  }
  if (
    singleOp &&
    ["header", "body-regex", "json"].includes(singleOp.kind) &&
    singleOp.phase === ir.phase &&
    /\.(?:set|del|replace|add|delete)$/.test(ast.actions[0]?.name || "") &&
    !ast.actions[0].name.endsWith("header.add")
  ) {
    try {
      const plan: any = renderSingleRewriteMutationScript(ast, {
        target: "surge",
        stamp: ctx.stamp,
        category: ctx.category,
        sourceLine: source,
        argumentTable: ctx.argumentTable,
      });
      const payload: any = argumentRefs.length
        ? surgeRewriteArgumentPayload(argumentRefs, ctx.argumentTable)
        : { ok: true, value: null };
      if (!payload.ok) throw new Error(payload.reason);
      const key: any = crypto
        .createHash("sha1")
        .update("json-mutation-surge\\0" + source)
        .digest("hex")
        .slice(0, 10);
      const filename: any = "json_mutation_surge_" + key + ".js";
      ctx.generatedScripts.set(filename, plan.script);
      return {
        section: "script",
        line:
          "wayx_json_mutation_" +
          key +
          " = type=" +
          plan.surgeType +
          ",pattern=" +
          surgeRegexParameter(plan.pattern) +
          ",script-path=" +
          surgeRewriteRawBase(ctx) +
          "/Script/" +
          ctx.id +
          "/" +
          filename +
          ",requires-body=true" +
          (payload.value ? ",argument=" + payload.value : ""),
      };
    } catch (error: any) {
      return rewriteReview(
        source,
        String(error?.message || error).split("\n")[0],
      );
    }
  }
  const complex: any = planComplexRewrite(ast, "surge", {
    ...ctx,
    sourceLine: source,
    argumentRefs,
  });
  if (complex.ok)
    return {
      section: complex.section,
      line: complex.line,
      lines: complex.lines,
    };
  if (complex.terminal) {
    return complex.issue
      ? rewriteIssue(
          source,
          complex.issueCode || "unknown-complex-rewrite",
          complex.reason,
        )
      : rewriteReview(source, complex.reason);
  }
  return rewriteReview(
    source,
    complex.reason ||
      "no verified Surge mapping for normalized Rewrite semantics",
  );
}
