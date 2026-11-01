// Modified: 2026-11-01 (chance). Locate only script declaration operands; never replace URLs in comments, regexes, icons, arguments or redirect destinations.
import { discoverSourceScriptUrls } from "./input.ts";
export type ScriptReference = { start: number; end: number; value: string };
export function scriptReferences(text: string): ScriptReference[] {
  const result: ScriptReference[] = [];
  let offset = 0;
  for (const line of text.split(/(?<=\n)/)) {
    if (!/^\s*(?:#|;|\/\/)/.test(line)) {
      const patterns = [
        /(?:^|[,\s])script-path\s*=\s*("[^"]+"|'[^']+'|[^,\s]+)/g,
        /\burl(?:-and-header)?\s+script-(?:request-(?:header|body)|response-(?:header|body)|(?:analyze-)?echo-response)\s+(\S+)/g,
        /^\s*(?:[\d*/?,\-]+\s+){5,6}(https?:\/\/[^,\s]+|[^,\s]+\.js(?:#[^,\s]*)?)/g,
      ];
      for (const pattern of patterns)
        for (const match of line.matchAll(pattern)) {
          // A quoted pattern/argument can contain script-path text; only top-level declaration operands count.
          let quote = "";
          for (let i = 0; i < match.index!; i++) {
            if (line[i] === "\\") {
              i++;
              continue;
            }
            if (quote) {
              if (line[i] === quote) quote = "";
            } else if (line[i] === '"' || line[i] === "'") quote = line[i];
          }
          if (quote) continue;
          const token = match[1],
            quoted = /^["']/.test(token);
          const start =
            offset +
            match.index! +
            match[0].lastIndexOf(token) +
            (quoted ? 1 : 0);
          result.push({
            start,
            end: start + token.length - (quoted ? 2 : 0),
            value: quoted ? token.slice(1, -1) : token,
          });
        }
    }
    offset += line.length;
  }
  return result
    .filter((r, i) => result.findIndex((v) => v.start === r.start) === i)
    .sort((a, b) => a.start - b.start);
}
export function sourceScriptUrls(text: string, base: string): string[] {
  const refs = new Set(scriptReferences(text).map((r) => r.value));
  // Script v2 includes static paths embedded in action pipelines and relative references.
  if (/^\[(?:Script|Rewrite)\]/im.test(text))
    for (const value of discoverSourceScriptUrls(text)) refs.add(value);
  return [...refs].map((value) => new URL(value, base).href);
}
export function replaceScriptReferences(
  text: string,
  replace: (value: string) => string,
): string {
  for (const ref of scriptReferences(text).reverse())
    text = text.slice(0, ref.start) + replace(ref.value) + text.slice(ref.end);
  return text;
}

// Modified: 2026-11-01 (chance). Reuse established stable backups during generation, avoiding a rewrite of every target on unchanged daily runs.
export function bindKnownBackups(
  text: string,
  index: any,
  rawBase: string,
  artifact?: string,
): string {
  const bindings: Record<string, ScriptBinding> = {};
  for (const ref of scriptReferences(text)) {
    if (!/^https?:\/\//.test(ref.value)) continue;
    const url = new URL(ref.value),
      fragment = url.hash;
    url.hash = "";
    const known = index?.bindings?.[artifact ?? ""]?.[ref.value];
    const record = index?.objects?.[index?.latest?.[url.href]];
    if (known) bindings[ref.value] = known;
    else if (record?.kind === "script")
      bindings[ref.value] = { path: record.path };
  }
  return applyScriptBindings(text, bindings, rawBase);
}

// Modified: 2026-11-01 (chance). A script binding may also require a documented echo trigger or binary input declaration.
export type ScriptBinding = { path: string; binary?: boolean; echo?: boolean };
export function applyScriptBindings(
  text: string,
  bindings: Record<string, ScriptBinding>,
  rawBase: string,
): string {
  for (const ref of scriptReferences(text).reverse()) {
    const binding = bindings[ref.value];
    if (!binding) continue;
    const first = text.lastIndexOf("\n", ref.start - 1) + 1,
      last = text.indexOf("\n", ref.end),
      end = last < 0 ? text.length : last;
    let line =
      text.slice(first, ref.start) +
      rawBase +
      "/" +
      binding.path +
      new URL(ref.value).hash +
      text.slice(ref.end, end);
    if (binding.echo)
      line = line.replace(
        /(\surl\s+)script-request-(header|body)\b/,
        (_all, prefix, mode) =>
          prefix +
          (mode === "body"
            ? "script-analyze-echo-response"
            : "script-echo-response"),
      );
    if (
      binding.binary &&
      /\bscript-path\s*=/.test(line) &&
      !/\bbinary-body-mode\s*=/.test(line)
    )
      line += ",binary-body-mode=true";
    text = text.slice(0, first) + line + text.slice(end);
  }
  return text;
}
export function scriptReferencePhase(
  text: string,
  ref: ScriptReference,
): {
  phase: "request" | "response" | "echo" | "task";
  body: boolean;
  binary: boolean;
} {
  const first = text.lastIndexOf("\n", ref.start - 1) + 1,
    last = text.indexOf("\n", ref.end),
    line = text.slice(first, last < 0 ? undefined : last);
  const qx = line.match(/\surl(?:-and-header)?\s+script-([a-z-]+)/);
  const phase = qx
    ? qx[1].includes("echo")
      ? "echo"
      : qx[1].startsWith("response")
        ? "response"
        : "request"
    : /\btype\s*=\s*http-response/.test(line)
      ? "response"
      : /\btype\s*=\s*http-request/.test(line)
        ? "request"
        : "task";
  return {
    phase,
    body: qx
      ? /body|analyze/.test(qx[1])
      : /\brequires-body\s*=\s*true/.test(line),
    binary: /\bbinary-body-mode\s*=\s*true/.test(line),
  };
}
