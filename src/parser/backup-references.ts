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
): string {
  return replaceScriptReferences(text, (value) => {
    if (!/^https?:\/\//.test(value)) return value;
    const url = new URL(value),
      fragment = url.hash;
    url.hash = "";
    const record = index?.objects?.[index?.latest?.[url.href]];
    return record?.kind === "script"
      ? rawBase + "/" + record.path + fragment
      : value;
  });
}
