// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript validation layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / output
import { isRewriteV2 } from "../parser/rewrite.ts";
import { parseLegacyScriptLine } from "../parser/script.ts";
import { cleanSourceComments, sourceCommentText } from "../parser/input.ts";
import {
  parseSurgeParameters,
  validateTargetRegex,
  QX_WAYX_REJECT_ACTIONS,
  QX_WAYX_FILTER_TYPES,
  QX_WAYX_REWRITE_MATCHERS,
  QX_WAYX_SCRIPT_ACTIONS,
  QX_WAYX_SNIPPET_MITM_KEYS,
  SURGE_WAYX_REWRITE_SECTIONS,
  SURGE_WAYX_URL_REWRITE_TYPES,
  SURGE_WAYX_HEADER_REWRITE_ACTIONS,
  SURGE_WAYX_BODY_REWRITE_TYPES,
  SURGE_WAYX_MAP_LOCAL_DATA_TYPES,
  SURGE_WAYX_SCRIPT_TYPES,
  SURGE_WAYX_MITM_KEYS,
} from "../domain/core.ts";
import {
  parseLoonRuleAst,
  walkRuleAst,
  splitTopLevelCsv,
  surgeRuleTypesInTree,
  SURGE_MODULE_POLICIES,
} from "../parser/rule.ts";
// metadata.mjs
// WayX target metadata normalization
// Author: chance
// Category: Converter / Metadata
export function parseSourceMetadataHeader(headerLines: any = []): any {
  const directives: any = new Map();
  const comments: any = [];
  for (const raw of headerLines) {
    const line: any = String(raw ?? "").trimEnd();
    const match: any = line.trim().match(/^#!([^=]+)=(.*)$/);
    if (match) {
      directives.set(match[1].trim().toLowerCase(), match[2].trim());
      continue;
    }
    comments.push(line);
  }
  return { directives, comments };
}
const KNOWN_LABELS: any = new Map([
  ["author", "Author"],
  ["homepage", "Homepage"],
  ["icon", "Icon"],
  ["openurl", "Open URL"],
  ["tag", "Tags"],
  ["raw-url", "Upstream"],
  ["tg-channel", "Channel"],
  ["date", "Updated"],
  ["system", "Platform"],
  ["system_version", "System Version"],
]);
function targetText(value: any, target: any): any {
  if (!value) return value;
  return String(value).replace(/\bLoon\b/g, target);
}
function metadataComments(directives: any, target: any): any {
  const out: any = [];
  for (const [key, value] of directives) {
    if (!value) continue;
    // Modified: 2026-10-30 (chance). Never relabel or recompute the author URL hash.
    if (key === "source") {
      out.push(`#!source=${value}`);
      continue;
    }
    if (key === "name" || key === "desc" || key === "loon_version") continue;
    if (key === "system" && /^(?:ios|mac)$/i.test(value) && target === "Surge")
      continue;
    if (key === "category" && target === "Surge") continue;
    const label: any =
      KNOWN_LABELS.get(key) ||
      key
        .replace(
          /(^|[-_])(\w)/g,
          (_: any, __: any, c: any): any => " " + c.toUpperCase(),
        )
        .trim();
    out.push(`# ${label}: ${value}`);
  }
  return out;
}
function preservedComments(lines: any): any {
  const out: any = [];
  for (const raw of lines) {
    const line: any = String(raw ?? "").trimEnd();
    if (!line.trim()) {
      if (out.length && out.at(-1) !== "") out.push("");
      continue;
    }
    out.push(line);
  }
  while (out.length && !out.at(-1)) out.pop();
  return out;
}
export function renderQxSnippetHeader(
  headerLines: any,
  entry: any,
  stamp: any,
): any {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const out: any = [];
  const name: any = directives.get("name") || entry.id;
  const desc: any = targetText(directives.get("desc") || "", "Quantumult X");
  out.push(`# Name: ${name}`);
  if (desc) out.push(`# Description: ${desc}`);
  out.push(...metadataComments(directives, "Quantumult X"));
  const original: any = preservedComments(comments);
  if (original.length) {
    out.push("");
    out.push(...original);
  }
  out.push(
    "",
    `# Converted: ${stamp}`,
    "# Converted by: chance",
    `# Category: ${entry.category}`,
    `# Source: ${entry.source}`,
    "# Target: Quantumult X",
  );
  return out;
}
export function renderSurgeModuleHeader(
  headerLines: any,
  entry: any,
  stamp: any,
  {
    needsCore20 = false,
    argumentMetadata = [],
    needsLineRequirement = false,
  }: any = {},
): any {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const name: any = directives.get("name") || entry.id;
  const desc: any = targetText(directives.get("desc") || entry.id, "Surge");
  const out: any = ["#!name=" + name, "#!desc=" + desc, "#!category=WayX"];
  const system: any = directives.get("system");
  if (system && /^mac$/i.test(system)) out.push("#!system=mac");
  if (needsLineRequirement) out.push("#!requirement=CORE_VERSION>=22");
  else if (needsCore20) out.push("#!requirement=CORE_VERSION>=20");
  out.push(...argumentMetadata);
  const meta: any = metadataComments(directives, "Surge");
  const original: any = preservedComments(comments);
  if (meta.length || original.length) out.push("");
  out.push(...meta);
  if (meta.length && original.length) out.push("");
  out.push(...original);
  out.push(
    "",
    "# Converted: " + stamp,
    "# Converted by: chance",
    "# Source: " + entry.source,
    "# Target: Surge",
  );
  return out;
}
// Generated-file policy metadata; target syntax is validated by its sole adapter.
export function validateConversionMetadata(
  text: any,
  entry: any,
  target: any,
): any {
  const common: any = [
    /^# Converted:\s*.+$/m,
    /^# Converted by:\s*chance\s*$/m,
    /^# Source:\s*.+$/m,
    target === "qx"
      ? /^# Target:\s*Quantumult X\s*$/m
      : /^# Target:\s*Surge\s*$/m,
  ];
  for (const pattern of common) {
    if (!pattern.test(text))
      throw new Error(`${entry.id}: missing conversion metadata ${pattern}`);
  }
  if (target === "qx") {
    if (!/^# Category:\s*.+$/m.test(text))
      throw new Error(`${entry.id}: missing conversion Category`);
    for (const title of ["# [filter_local]", "# [rewrite_local]", "# [mitm]"]) {
      if (!text.includes(title))
        throw new Error(`${entry.id}: missing commented section ${title}`);
    }
  } else if (target === "surge") {
    if ((text.match(/^#!category=WayX$/gm) || []).length !== 1)
      throw new Error(
        `${entry.id}: module requires exactly one #!category=WayX`,
      );
    if (/^# Category:\s*.+$/m.test(text))
      throw new Error(`${entry.id}: legacy Surge Category comment`);
    let mitm: any = false;
    for (const raw of text.split("\n")) {
      const line: any = raw.trim(),
        section: any = line.match(/^\[([^\]]+)\]$/);
      if (section) {
        mitm = section[1] === "MITM";
        continue;
      }
      if (
        mitm &&
        /^hostname\s*=/i.test(line) &&
        !/^hostname\s*=\s*%APPEND%\s+\S/i.test(line)
      ) {
        throw new Error(
          `${entry.id}: Surge module MITM hostname must use %APPEND%`,
        );
      }
    }
  } else throw new TypeError("Unknown metadata target: " + target);
}
// output.mjs
// Target output builders for Quantumult X and Surge
// Author: chance
// Category: Converter / Output
export function compactOutputLines(lines: any = []): any {
  const out: any = [];
  for (const raw of lines) {
    const line: any = raw ?? "";
    if (line === "" && out.at(-1) === "") continue;
    out.push(line);
  }
  while (out.length && out.at(-1) === "") out.pop();
  return out;
}
// Modified: 2026-10-25 (chance). Remove only identical active routing rules;
// preserve all comments, policy differences and mutation/Script execution counts.
export function uniqueRoutingLines(lines: any = []): any {
  const seen: any = new Set();
  return lines.filter((raw: any): any => {
    const line: any = String(raw ?? "").trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) return true;
    if (seen.has(line)) return false;
    seen.add(line);
    return true;
  });
}
export function hasActiveOutputLines(lines: any = []): any {
  return lines.some((raw: any): any => {
    const line: any = String(raw ?? "").trim();
    return (
      line &&
      !line.startsWith("#") &&
      !line.startsWith(";") &&
      !line.startsWith("//")
    );
  });
}
export function finalizeOutputLines(lines: any = []): any {
  return lines.join("\n").replace(/\n*$/, "\n");
}
const QX_DESTINATIONS: any = new Map([
  ["notes", "notes"],
  ["comment", "notes"],
  ["filter", "filter"],
  ["rewrite", "rewrite"],
  ["task", "task"],
  ["mitm", "mitm"],
]);
export function createQxOutputState(): any {
  return {
    notes: [],
    filter: [],
    rewrite: [],
    task: [],
    mitm: [],
    generatedScripts: new Map(),
  };
}
export function qxOutputDestination(state: any, section: any): any {
  const key: any = QX_DESTINATIONS.get(String(section || "").toLowerCase());
  return key ? state[key] : null;
}
export function appendQxOutput(state: any, section: any, ...lines: any[]): any {
  const dest: any = qxOutputDestination(state, section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}
export function qxRuleOutputDestination(state: any, kind: any): any {
  return qxOutputDestination(state, kind === "rewrite" ? "rewrite" : "filter");
}
export function qxRewriteOutputDestination(state: any, section: any): any {
  if (section === "rewrite" || section === "drop")
    return qxOutputDestination(state, "rewrite");
  return qxOutputDestination(state, "notes");
}
// Modified: 2026-10-25 (chance). Every author/app emits one mixed snippet;
// filter, rewrite and MITM stay together for the single rewrite subscription.
export function renderQxOutput({ state, headerLines, entry, stamp }: any): any {
  const header: any = renderQxSnippetHeader(headerLines, entry, stamp);
  const lines: any = [
    ...header,
    "",
    ...(state.notes.length ? [...state.notes, ""] : []),
    "# [filter_local]",
    ...compactOutputLines(uniqueRoutingLines(state.filter)),
    "",
    "# [rewrite_local]",
    ...compactOutputLines(state.rewrite),
    "",
    ...(state.task.length
      ? ["# [task_local]", ...compactOutputLines(state.task), ""]
      : []),
    "# [mitm]",
    ...compactOutputLines(state.mitm),
    "",
  ];
  return finalizeOutputLines(lines);
}
const SURGE_DESTINATIONS: any = new Map([
  ["notes", "notes"],
  ["comment", "notes"],
  ["general", "general"],
  ["rule", "rule"],
  ["url", "url"],
  ["header", "header"],
  ["body", "body"],
  ["map", "map"],
  ["script", "script"],
  ["mitm", "mitm"],
]);
const SURGE_SECTION_ORDER: any = [
  ["general", "[General]"],
  ["rule", "[Rule]"],
  ["url", "[URL Rewrite]"],
  ["header", "[Header Rewrite]"],
  ["body", "[Body Rewrite]"],
  ["map", "[Map Local]"],
  ["script", "[Script]"],
  ["mitm", "[MITM]"],
];
export function createSurgeOutputState(): any {
  return {
    notes: [],
    general: [],
    rule: [],
    url: [],
    header: [],
    body: [],
    map: [],
    script: [],
    mitm: [],
    generatedScripts: new Map(),
  };
}
export function surgeOutputDestination(state: any, section: any): any {
  const key: any = SURGE_DESTINATIONS.get(String(section || "").toLowerCase());
  return key ? state[key] : null;
}
export function appendSurgeOutput(
  state: any,
  section: any,
  ...lines: any[]
): any {
  const dest: any = surgeOutputDestination(state, section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}
export function surgeRuleOutputDestination(state: any, section: any): any {
  return surgeOutputDestination(state, section === "map" ? "map" : "rule");
}
export function surgeRewriteOutputDestination(state: any, section: any): any {
  if (section === "drop") return surgeOutputDestination(state, "notes");
  return (
    surgeOutputDestination(state, section) ||
    surgeOutputDestination(state, "notes")
  );
}
export function renderSurgeOutput({
  state,
  headerLines,
  entry,
  stamp,
  argumentMetadata = [],
  needsLineRequirement = false,
}: any): any {
  const needsCore20: any =
    hasActiveOutputLines(state.body) || hasActiveOutputLines(state.map);
  const header: any = renderSurgeModuleHeader(headerLines, entry, stamp, {
    needsCore20,
    argumentMetadata,
    needsLineRequirement,
  });
  const sections: any = [];
  if (state.notes.length) sections.push(...state.notes, "");
  for (const [key, title] of SURGE_SECTION_ORDER) {
    if (!state[key].length) continue;
    sections.push(
      title,
      ...compactOutputLines(
        key === "rule" ? uniqueRoutingLines(state[key]) : state[key],
      ),
      "",
    );
  }
  return finalizeOutputLines([...header, "", ...sections]);
}
// qx-comment.mjs
// Quantumult X inline source-note rendering
// Author: chance
// Category: Converter / Comments / Quantumult X
export function looksLikeCommentedSourceDeclaration(
  text: any,
  sectionKind: any,
): any {
  const value: any = String(text || "").trim();
  if (!value) return false;
  if (sectionKind === "rule") {
    return /^(?:[A-Z][A-Z0-9-]*|AND|OR|NOT)\s*,/i.test(value);
  }
  if (sectionKind === "rewrite") {
    if (isRewriteV2(value)) return true;
    return /^\S+\s+(?:-\s+)?(?:reject(?:-[A-Za-z0-9-]+)?|302\b|307\b|header\b|(?:response-)?header-(?:add|del|replace|replace-regex)\b|(?:request|response)-body-(?:replace-regex|json-|mock)|mock-(?:request|response)-body\b)/i.test(
      value,
    );
  }
  if (sectionKind === "script") {
    if (
      /^\s*(?:request|response)\s+if\b/.test(value) &&
      /\bthen\s+script\s*\(/.test(value)
    )
      return true;
    return Boolean(parseLegacyScriptLine(value)?.script?.path);
  }
  return false;
}
export function qxInlineNoteCandidate(
  sectionLines: any,
  item: any,
  sectionKind: any,
): any {
  if (
    !item?.line ||
    !Number.isInteger(item.sourceIndex) ||
    item.sourceIndex < 1
  )
    return null;
  const index: any = item.sourceIndex;
  const previousRaw: any = sectionLines[index - 1];
  const previous: any = String(previousRaw ?? "").trim();
  const note: any = sourceCommentText(previousRaw);
  if (
    !previous ||
    note === null ||
    !note ||
    note.includes("{#") ||
    note.includes("#}")
  )
    return null;
  // Only one adjacent source comment can become a QX leading note.
  if (index >= 2 && sourceCommentText(sectionLines[index - 2]) !== null)
    return null;
  // A comment followed by multiple active source declarations is a group comment.
  if (index + 1 < sectionLines.length) {
    const next: any = String(sectionLines[index + 1] ?? "").trim();
    if (next && sourceCommentText(sectionLines[index + 1]) === null)
      return null;
  }
  // Disabled source declarations are source content, not prose notes.
  if (looksLikeCommentedSourceDeclaration(note, sectionKind)) return null;
  return { text: note, raw: previousRaw };
}
export function attachQxInlineNote({
  sectionLines,
  item,
  sectionKind,
  lines,
  eligible = true,
}: any): any {
  const output: any = (lines || []).filter(
    (line: any): any =>
      line !== undefined && line !== null && String(line).length,
  );
  const candidate: any = eligible
    ? qxInlineNoteCandidate(sectionLines, item, sectionKind)
    : null;
  const singleActive: any =
    candidate &&
    output.length === 1 &&
    !String(output[0]).includes("\n") &&
    !String(output[0]).trim().startsWith("#");
  if (!singleActive) {
    return { comments: cleanSourceComments(item.comments), lines: output };
  }
  const remaining: any = [...item.comments];
  if (remaining.length && remaining.at(-1) === candidate.raw) remaining.pop();
  return {
    comments: cleanSourceComments(remaining),
    lines: [`{# ${candidate.text} #} ${output[0]}`],
  };
}
// qx-snippet-validator.mjs
// Quantumult X snippet validator
// Author: chance
// Category: Converter / Quantumult X / Validation
function stripQxLeadingNote(line: any, entry: any): any {
  const text: any = String(line ?? "").trim();
  if (!text.startsWith("{#")) return { line: text, note: null };
  const match: any = text.match(/^\{#\s*(.*?)\s*#\}\s+(.+)$/);
  if (!match || !match[1].trim() || !match[2].trim()) {
    throw new Error(
      `${entry.id}: malformed Quantumult X leading rule note: ${line}`,
    );
  }
  return { line: match[2].trim(), note: match[1].trim() };
}
function splitQxRewriteLine(line: any): any {
  const withHeaders: any = String(line).match(
    /^(\S+)\s+(.+?)\s+url-and-header\s+(.+)$/,
  );
  if (withHeaders) {
    return {
      matcher: "url-and-header",
      urlPattern: withHeaders[1].trim(),
      headersPattern: withHeaders[2].trim(),
      action: withHeaders[3].trim(),
    };
  }
  const urlOnly: any = String(line).match(/^(\S+)\s+url\s+(.+)$/);
  if (urlOnly) {
    return {
      matcher: "url",
      urlPattern: urlOnly[1].trim(),
      headersPattern: null,
      action: urlOnly[2].trim(),
    };
  }
  return null;
}
function targetRegex(
  pattern: any,
  entry: any,
  target: any,
  token: any = true,
): any {
  validateTargetRegex(pattern, entry.id + ": " + target, { token });
}
function validateQxRewriteAction(action: any, line: any, entry: any): any {
  if (QX_WAYX_REJECT_ACTIONS.has(action)) return;
  if (/^(?:302|307)\s+\S+$/.test(action)) return;
  if (/^jsonjq-(?:request|response)-body\s+'.+'$/.test(action)) return;
  const replacement: any = action.match(
    /^(request-body|response-body|request-header|response-header)\s+(.+?)\s+\1\s+.+$/,
  );
  if (replacement) {
    targetRegex(
      replacement[2],
      entry,
      "Quantumult X replacement matcher",
      false,
    );
    return;
  }
  const echo: any = action.match(
    /^echo-response\s+(.+)\s+echo-response\s+(\S+)$/,
  );
  if (echo) {
    const resourcePath: any = echo[2];
    if (
      /^[A-Za-z][A-Za-z0-9+.-]*:/.test(resourcePath) ||
      resourcePath.startsWith("/") ||
      resourcePath.split("/").includes("..")
    ) {
      throw new Error(
        `${entry.id}: Quantumult X echo-response resource must be a local Data-relative path: ${line}`,
      );
    }
    return;
  }
  const script: any = action.match(/^(script-[a-z-]+)\s+(\S+)$/);
  if (script && QX_WAYX_SCRIPT_ACTIONS.has(script[1])) return;
  const codepoints: any = [...String(action)]
    .map((ch: any): any => ch.codePointAt(0).toString(16))
    .join(",");
  throw new Error(
    `${entry.id}: unverified/unsupported Quantumult X rewrite action: ${action}; codepoints=${codepoints}; line: ${line}`,
  );
}
function validateQxTaskLine(line: any, entry: any): any {
  const source: any = String(line).trim();
  const comma: any = source.indexOf(",");
  const declaration: any = (
    comma >= 0 ? source.slice(0, comma) : source
  ).trim();
  const optionText: any = comma >= 0 ? source.slice(comma + 1).trim() : "";
  const event: any = declaration.match(
    /^(event-network|event-interaction)\s+(\S+)$/,
  );
  if (!event) {
    const tokens: any = declaration.split(/\s+/);
    if (tokens.length < 6) return false;
    const scriptUrl: any = tokens.at(-1);
    const cron: any = tokens.slice(0, -1);
    if (![5, 6].includes(cron.length) || !/^https?:\/\/\S+$/i.test(scriptUrl))
      return false;
  }
  if (!optionText) return true;
  for (const raw of optionText.split(/,\s*/)) {
    const eq: any = raw.indexOf("=");
    if (eq < 1)
      throw new Error(
        `${entry.id}: malformed Quantumult X task option: ${line}`,
      );
    const name: any = raw.slice(0, eq).trim().toLowerCase();
    const value: any = raw.slice(eq + 1).trim();
    if (
      !["tag", "img-url", "enabled", "require-devices"].includes(name) ||
      !value
    ) {
      throw new Error(
        `${entry.id}: unverified/unsupported Quantumult X task option ${name}: ${line}`,
      );
    }
    if (name === "enabled" && !/^(?:true|false)$/i.test(value)) {
      throw new Error(
        `${entry.id}: Quantumult X task enabled must be true/false: ${line}`,
      );
    }
  }
  return true;
}
function validateQxExecutableLine(
  line: any,
  entry: any,
  section: any = null,
): any {
  const noted: any = stripQxLeadingNote(line, entry);
  line = noted.line;
  if (noted.note && /^([A-Za-z0-9_-]+)\s*=/.test(line)) {
    throw new Error(
      `${entry.id}: Quantumult X leading notes are only valid on filter/rewrite rules: ${line}`,
    );
  }
  if (section === "task_local") {
    if (validateQxTaskLine(line, entry)) return;
    throw new Error(
      `${entry.id}: malformed/unverified Quantumult X task line: ${line}`,
    );
  }
  const mitm: any = line.match(/^([A-Za-z0-9_-]+)\s*=/);
  if (mitm) {
    if (section && section !== "mitm")
      throw new Error(
        entry.id + ": QX MITM assignment outside mitm section: " + line,
      );
    if (!QX_WAYX_SNIPPET_MITM_KEYS.has(mitm[1].toLowerCase())) {
      throw new Error(
        `${entry.id}: unverified/unsupported Quantumult X snippet MITM key: ${mitm[1]}`,
      );
    }
    return;
  }
  const rewrite: any = splitQxRewriteLine(line);
  if (rewrite) {
    if (section && section !== "rewrite_local")
      throw new Error(
        entry.id + ": QX rewrite outside rewrite_local section: " + line,
      );
    if (!QX_WAYX_REWRITE_MATCHERS.has(rewrite.matcher)) {
      throw new Error(
        `${entry.id}: unverified/unsupported Quantumult X rewrite matcher: ${rewrite.matcher}`,
      );
    }
    if (!rewrite.urlPattern) {
      throw new Error(
        `${entry.id}: Quantumult X rewrite line has an empty URL pattern: ${line}`,
      );
    }
    if (rewrite.matcher === "url-and-header" && !rewrite.headersPattern) {
      throw new Error(
        `${entry.id}: Quantumult X url-and-header rewrite has an empty Headers pattern: ${line}`,
      );
    }
    targetRegex(rewrite.urlPattern, entry, "Quantumult X URL");
    if (rewrite.headersPattern)
      targetRegex(rewrite.headersPattern, entry, "Quantumult X Headers", false);
    validateQxRewriteAction(rewrite.action, line, entry);
    return;
  }
  const comma: any = line.indexOf(",");
  if (comma > 0) {
    if (section && section !== "filter_local")
      throw new Error(
        entry.id + ": QX filter outside filter_local section: " + line,
      );
    const type: any = line.slice(0, comma).trim().toLowerCase();
    if (!QX_WAYX_FILTER_TYPES.has(type)) {
      throw new Error(
        `${entry.id}: unverified/unsupported Quantumult X filter type: ${type}`,
      );
    }
    const fields: any = line.split(",").map((part: any): any => part.trim());
    if (fields.length < 3 || !fields[1] || !fields[2]) {
      throw new Error(
        `${entry.id}: malformed Quantumult X filter line: ${line}`,
      );
    }
    if (
      ["ip-cidr", "ip6-cidr", "geoip", "ip-asn"].includes(type) &&
      fields.slice(3).some((x: any): any => x.toLowerCase() === "no-resolve")
    ) {
      throw new Error(
        `${entry.id}: Quantumult X IP-class rules must remove no-resolve`,
      );
    }
    return;
  }
  throw new Error(
    `${entry.id}: unclassified active Quantumult X line: ${line}`,
  );
}
export function validateQX(text: any, entry: any): any {
  const activeMetadata: any = text
    .split("\n")
    .filter((line: any): any => /^#!(?!source=)/.test(line.trim()));
  if (activeMetadata.length) {
    throw new Error(
      `${entry.id}: Quantumult X snippet metadata must be plain comments, not active #! directives`,
    );
  }
  const activeSections: any = text
    .split("\n")
    .filter((line: any): any =>
      /^\[(filter_local|rewrite_local|task_local|mitm)\]$/i.test(line.trim()),
    );
  if (activeSections.length) {
    throw new Error(
      `${entry.id}: Quantumult X section headings must be commented`,
    );
  }
  let section: any = null;
  for (const raw of text.split("\n")) {
    const line: any = raw.trim();
    const sectionMatch: any = line.match(
      /^#\s*\[(filter_local|rewrite_local|task_local|mitm)\]\s*$/i,
    );
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase();
      continue;
    }
    if (!line || line.startsWith("#")) continue;
    if (/\[hH\]\[tT\]\[tT\]\[pP\](?:\[sS\])?/.test(line)) {
      throw new Error(
        `${entry.id}: Quantumult X output must not emulate case-insensitive flags with manual HTTP case-fold classes: ${line}`,
      );
    }
    if (/jq-path=/i.test(line)) {
      throw new Error(
        `${entry.id}: discarded legacy jq-path alias leaked into active Quantumult X output: ${line}`,
      );
    }
    validateQxExecutableLine(line, entry, section);
  }
  for (const bad of [
    "response-body-json-del",
    "response-body-json-replace",
    "response-body-json-jq",
    "mock-response-body",
  ]) {
    const active: any = text
      .split("\n")
      .find(
        (line: any): any =>
          line.trim() && !line.trim().startsWith("#") && line.includes(bad),
      );
    if (active) throw new Error(`${entry.id}: unconverted QX token ${bad}`);
  }
  const commentedSections: any = [
    "# [filter_local]",
    "# [rewrite_local]",
    "# [mitm]",
  ].filter((section: any): any => text.includes(section));
  if (!commentedSections.length) {
    throw new Error(`${entry.id}: missing commented QX section heading`);
  }
}
// surge-module.mjs
// WayX Surge Module formatter / validator
// Author: chance
// Category: Converter / Surge Module
export function hasActiveSurgeLines(lines: any = []): any {
  return lines.some((raw: any): any => {
    const line: any = String(raw).trim();
    return (
      line &&
      !line.startsWith("#") &&
      !line.startsWith(";") &&
      !line.startsWith("//")
    );
  });
}
function validateSurgeRuleLine(
  line: any,
  entry: any,
  declaredArguments: any = new Set(),
  profilePolicies: any = false,
): any {
  const parts: any = splitTopLevelCsv(line);
  const typeTree: any = surgeRuleTypesInTree(line);
  if (!typeTree.ok) {
    throw new Error(
      `${entry.id}: unsupported Surge rule type/combination in module (${typeTree.reason}): ${line}`,
    );
  }
  const parsed: any = parseLoonRuleAst(line);
  walkRuleAst(parsed.ast, (node: any): any => {
    if (node.type === "URL-REGEX")
      targetRegex(node.value, entry, "Surge URL-REGEX", false);
  });
  const policyRaw: any = String(parts[2] || "");
  const argumentPolicy: any = policyRaw.match(/^\{\{\{([A-Za-z0-9_]+)\}\}\}$/);
  if (argumentPolicy) {
    if (!declaredArguments.has(argumentPolicy[1])) {
      throw new Error(
        `${entry.id}: Surge module [Rule] references undeclared policy argument ${argumentPolicy[1]}: ${line}`,
      );
    }
  } else if (!profilePolicies) {
    const policy: any = policyRaw.toUpperCase();
    if (!SURGE_MODULE_POLICIES.has(policy)) {
      throw new Error(
        `${entry.id}: Surge module [Rule] policy is outside the WayX accepted Surge Rule built-in policy set or a declared {{{argument}}}: ${line}`,
      );
    }
  }
  if (line !== parts.join(",")) {
    throw new Error(
      `${entry.id}: Surge module [Rule] must use canonical top-level comma formatting: ${line}`,
    );
  }
}
// Native filter/rule-set resources use the same rule-line contracts as modules.
export function validateQxFilterList(
  text: any,
  entry: any = { id: "filter-list" },
  { builtInPoliciesOnly = false }: any = {},
): any {
  for (const raw of String(text).split("\n")) {
    const line: any = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    if (!QX_WAYX_FILTER_TYPES.has(line.split(",")[0].trim().toLowerCase()))
      throw new Error(entry.id + ": unsupported QX filter type: " + line);
    validateQxExecutableLine(line, entry, "filter_local");
    // Modified: 2026-10-27 (chance). Generated routing lists use the ssid policy group for proxy traffic.
    if (
      builtInPoliciesOnly &&
      !["direct", "reject", "ssid"].includes(line.split(",")[2]?.trim())
    )
      throw new Error(
        entry.id +
          ": generated rule policy must be direct, reject or ssid: " +
          line,
      );
  }
}
export function validateSurgeRuleSet(
  text: any,
  entry: any = { id: "rule-set" },
): any {
  for (const raw of String(text).split("\n")) {
    const line: any = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    const parts: any = splitTopLevelCsv(line);
    if (
      parts.length < 2 ||
      parts
        .slice(2)
        .some(
          (option: any): any =>
            !["no-resolve", "extended-matching"].includes(option),
        )
    )
      throw new Error(
        entry.id + ": invalid external rule-set options/policy: " + line,
      );
    validateSurgeRuleLine(
      [parts[0], parts[1], "DIRECT", ...parts.slice(2)].join(","),
      entry,
    );
  }
}
export function validateSurgeRuleSection(
  text: any,
  entry: any = { id: "rule-section" },
): any {
  let section: any = null;
  for (const raw of String(text).split("\n")) {
    const line: any = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    if (line === "[Rule]") {
      section = "Rule";
      continue;
    }
    if (section !== "Rule" || line.startsWith("["))
      throw new Error(entry.id + ": expected detached [Rule] section");
    if (!splitTopLevelCsv(line)[2]?.trim())
      throw new Error(entry.id + ": missing profile policy");
    validateSurgeRuleLine(line, entry, new Set(), true);
  }
  if (section !== "Rule")
    throw new Error(entry.id + ": missing [Rule] section");
}
export function validateSurgeModule(
  text: any,
  entry: any = { id: "module" },
): any {
  const allowedSections: any = new Set([
    "General",
    "Rule",
    ...SURGE_WAYX_REWRITE_SECTIONS,
    "MITM",
  ]);
  const allowedTopDirectives: any = [
    /^#!name=.+$/i,
    /^#!desc=.+$/i,
    /^#!category=WayX$/,
    /^#!system=mac$/i,
    /^#!requirement=.+$/i,
    /^#!arguments=.+$/i,
    /^#!arguments-desc=.+$/i,
    // Modified: 2026-10-30 (chance). Preserve author Loon URL-binding comments.
    /^#!source=.+$/,
  ];
  if (!/^#!name=.+$/m.test(text))
    throw new Error(`${entry.id}: Surge module missing #!name`);
  if (!/^#!desc=.+$/m.test(text))
    throw new Error(`${entry.id}: Surge module missing #!desc`);
  if (!/^#!category=WayX$/m.test(text))
    throw new Error(`${entry.id}: Surge module must declare #!category=WayX`);
  let current: any = null;
  let hasBodyRewrite: any = false;
  let hasInlineMapLocal: any = false;
  let hasLineRequirement: any = false;
  const declaredArguments: any = new Set();
  let moduleRequirementCore: any = null;
  for (const raw of String(text).split("\n")) {
    let line: any = raw.trim();
    if (!line) continue;
    if (current === null) {
      const args: any = line.match(/^#!arguments=(.+)$/i);
      if (args) {
        for (const item of args[1].split(",")) {
          const name: any = item.split(":", 1)[0].trim();
          if (!/^[A-Za-z0-9_]+$/.test(name)) {
            throw new Error(
              `${entry.id}: invalid Surge module argument name: ${name}`,
            );
          }
          if (declaredArguments.has(name)) {
            throw new Error(
              `${entry.id}: duplicate Surge module argument: ${name}`,
            );
          }
          declaredArguments.add(name);
        }
      }
      const requirement: any = line.match(
        /^#!requirement=.*CORE_VERSION\s*>=\s*(\d+)/i,
      );
      if (requirement) moduleRequirementCore = Number(requirement[1]);
    }
    const lineRequirement: any = line.match(
      /^#!REQUIREMENT\s+(?:"(?:[^"\\]|\\.)*"|\S+)\s+(.+)$/,
    );
    if (lineRequirement) {
      hasLineRequirement = true;
      line = lineRequirement[1].trim();
    }
    const section: any = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      current = section[1];
      if (!allowedSections.has(current)) {
        throw new Error(
          `${entry.id}: unsupported Surge module section [${current}]`,
        );
      }
      continue;
    }
    if (line.startsWith("#!")) {
      if (
        current === null &&
        allowedTopDirectives.some((re: any): any => re.test(line))
      )
        continue;
      throw new Error(
        `${entry.id}: unsupported Surge module directive: ${line}`,
      );
    }
    if (line.startsWith("#") || line.startsWith(";") || line.startsWith("//"))
      continue;
    if (current === null) {
      throw new Error(
        `${entry.id}: active Surge content outside a section: ${line}`,
      );
    }
    if (current === "General") {
      const option: any = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!option || option[1].trim() !== "always-real-ip") {
        throw new Error(
          `${entry.id}: unsupported Surge module [General] option: ${line}`,
        );
      }
      continue;
    }
    if (current === "Rule") {
      validateSurgeRuleLine(line, entry, declaredArguments);
      continue;
    }
    if (current === "URL Rewrite") {
      if (!/^\S+\s+\S+\s+\S+$/.test(line))
        throw new Error(entry.id + ": malformed Surge URL Rewrite: " + line);
      targetRegex(line.split(/\s+/)[0], entry, "Surge URL Rewrite");
      const type: any = line.trim().split(/\s+/).at(-1);
      if (!SURGE_WAYX_URL_REWRITE_TYPES.has(type)) {
        throw new Error(`${entry.id}: invalid Surge URL Rewrite line: ${line}`);
      }
      if (type === "reject" && !/\s_\sreject$/.test(line)) {
        throw new Error(
          `${entry.id}: Surge URL reject must use '<pattern> _ reject': ${line}`,
        );
      }
      continue;
    }
    if (current === "Header Rewrite") {
      targetRegex(line.split(/\s+/)[1], entry, "Surge Header Rewrite URL");
      const match: any = line.match(
        /^http-(?:request|response)\s+\S+\s+(header-[a-z-]+)\b/,
      );
      if (!match || !SURGE_WAYX_HEADER_REWRITE_ACTIONS.has(match[1])) {
        throw new Error(
          `${entry.id}: invalid Surge Header Rewrite line: ${line}`,
        );
      }
      continue;
    }
    if (current === "Body Rewrite") {
      targetRegex(line.split(/\s+/)[1], entry, "Surge Body Rewrite URL");
      hasBodyRewrite = true;
      const type: any = line.trim().split(/\s+/, 1)[0];
      if (!SURGE_WAYX_BODY_REWRITE_TYPES.has(type)) {
        throw new Error(
          `${entry.id}: invalid Surge Body Rewrite line: ${line}`,
        );
      }
      continue;
    }
    if (current === "Map Local") {
      targetRegex(line.split(/\s+/)[0], entry, "Surge Map Local URL");
      const dataType: any = line.match(/\bdata-type=([^\s]+)/)?.[1];
      if (!dataType || !SURGE_WAYX_MAP_LOCAL_DATA_TYPES.has(dataType)) {
        throw new Error(`${entry.id}: invalid Surge Map Local line: ${line}`);
      }
      if (dataType !== "file") hasInlineMapLocal = true;
      continue;
    }
    if (current === "Script") {
      const declaration: any = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!declaration)
        throw new Error(
          `${entry.id}: invalid Surge [Script] declaration: ${line}`,
        );
      const body: any = declaration[2];
      const params: any = parseSurgeParameters(
        body,
        entry.id + ": Surge Script",
      );
      const type: any = params.get("type");
      if (!SURGE_WAYX_SCRIPT_TYPES.has(type))
        throw new Error(
          entry.id + ": unsupported/missing Surge Script type: " + line,
        );
      if (!params.get("script-path"))
        throw new Error(
          entry.id + ": Surge [Script] missing script-path: " + line,
        );
      if (type === "http-request" || type === "http-response") {
        if (!params.has("pattern"))
          throw new Error(
            entry.id + ": Surge HTTP script missing pattern: " + line,
          );
        targetRegex(
          params.get("pattern"),
          entry,
          "Surge Script pattern",
          false,
        );
      } else if (type === "cron" && !params.get("cronexp"))
        throw new Error(
          entry.id + ": Surge cron script missing cronexp: " + line,
        );
      else if (type === "event" && !params.get("event-name"))
        throw new Error(
          entry.id + ": Surge event script missing event-name: " + line,
        );
      continue;
    }
    if (current === "MITM") {
      const match: any = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!match)
        throw new Error(`${entry.id}: invalid Surge MITM option: ${line}`);
      const key: any = match[1].trim();
      if (!SURGE_WAYX_MITM_KEYS.has(key)) {
        throw new Error(
          `${entry.id}: WayX ad-block Surge Module [MITM] only accepts hostname: ${line}`,
        );
      }
      continue;
    }
  }
  if ((hasBodyRewrite || hasInlineMapLocal) && !(moduleRequirementCore >= 20)) {
    throw new Error(
      `${entry.id}: Body Rewrite / inline Map Local requires #!requirement CORE_VERSION>=20 or newer`,
    );
  }
  if (hasLineRequirement && !(moduleRequirementCore >= 22)) {
    throw new Error(
      `${entry.id}: parameterized line requirements require #!requirement CORE_VERSION>=22 or newer`,
    );
  }
  for (const match of String(text).matchAll(/\{\{\{([A-Za-z0-9_]+)\}\}\}/g)) {
    if (!declaredArguments.has(match[1])) {
      throw new Error(
        `${entry.id}: undeclared Surge module argument placeholder: ${match[1]}`,
      );
    }
  }
}
