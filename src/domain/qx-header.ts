// Modified: 2026-11-03 (chance). Support serialization-independent QX header predicates; unknown whole-header layouts remain diagnosed.
export type HeaderPredicate = {
  kind: "token" | "method" | "field";
  pattern: string;
  flags: string;
  field?: string;
};
export function parseQxHeaderPredicate(input: string): HeaderPredicate | null {
  const flags = input.startsWith("(?i)") ? "i" : "";
  const pattern = flags ? input.slice(4) : input;
  if (/^[A-Za-z0-9_%]+\*?(?:\|[A-Za-z0-9_%]+\*?)*$/.test(pattern))
    return ["", "HTTP/1.0", "HTTP/1.1", "HTTP/2", "HTTP/2.0", "HTTP/3"].some(
      (value) => new RegExp(pattern, flags).test(value),
    )
      ? null
      : { kind: "token", pattern, flags };
  const method = pattern.match(/^\^([A-Z]+)(?:\[ \]| )?$/);
  if (method)
    return {
      kind: "method",
      pattern:
        "^" +
        method[1] +
        (pattern.endsWith("[ ]") || pattern.endsWith(" ") ? "$" : ""),
      flags,
    };
  const field = pattern.match(/^\\r\\n([A-Za-z0-9-]+):\\s\*(.+)$/);
  if (field && flags === "i" && /^[A-Za-z0-9_%]+(?:\\\/)?$/.test(field[2]))
    return {
      kind: "field",
      field: field[1],
      pattern: "^\\s*" + field[2],
      flags,
    };
  return null;
}
// A finite literal prefix proves disjointness only; it never certifies overlap.
export function literalUrlPrefix(pattern: string): string {
  if (!pattern.startsWith("^")) return "";
  let depth = 0,
    inClass = false;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      i++;
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
    if (inClass) continue;
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (c === "|" && depth === 0) return "";
  }
  let out = "";
  for (let i = 1; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\" && /[/.:-]/.test(pattern[i + 1] ?? "")) out += pattern[++i];
    else if (/[A-Za-z0-9:/_%-]/.test(c)) out += c;
    else {
      if (c === "?" || c === "*" || c === "{") out = out.slice(0, -1);
      break;
    }
  }
  return out;
}
export function disjointUrls(a: string, b: string): boolean {
  const x = literalUrlPrefix(a),
    y = literalUrlPrefix(b);
  return Boolean(x && y && !x.startsWith(y) && !y.startsWith(x));
}
// Kept self-contained for emission into request helpers and shared API adapters.
export const headerPredicateRuntime = String.raw`function(p,r){
const re=new RegExp(p.pattern,p.flags),headers=Array.isArray(r.headers)?r.headers:Object.keys(r.headers||{}).map(field=>({field,value:r.headers[field]}));
if(p.kind==='method')return re.test(String(r.method||''));
if(p.kind==='field')return headers.some(h=>String(h.field).toLowerCase()===p.field.toLowerCase()&&re.test(String(h.value)));
const path=String(r.url||'').replace(/^[a-z]+:\/\/[^/]+/i,'').split('#')[0]||'/';
return [String(r.method||''),path,...headers.flatMap(h=>[String(h.field),String(h.value)])].some(value=>re.test(value));
}`;
export const headerArgumentPrefix = "wayx_qx_header_v1=";
