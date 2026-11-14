// Modified: 2026-11-14 (chance). Track nested jq string interpolation and
// continued comments so inline formatting preserves executable tokens and strings.
export function transformJqText(input: string, {compact = false, quoteSafe = false} = {}): string {
  let i = 0;
  const before = new Set([")", "]", ",", "|", "="]);
  const after = new Set(["(", "[", ",", "|", "="]);
  const string = (): string => {
    let out = '"';
    i++;
    while (i < input.length) {
      const ch = input[i++];
      if (ch === '"') return out + ch;
      if (ch === "\\") {
        const next = input[i++];
        if (next === "(") out += "\\(" + code(true) + ")";
        else {
          if (next === undefined) throw new Error("JQ contains an unterminated JSON string");
          out += ch + next;
        }
      } else out += quoteSafe && ch === "'" ? "\\u0027" : ch;
    }
    throw new Error("JQ contains an unterminated JSON string");
  };
  const code = (interpolation = false): string => {
    let out = "", pending = false, depth = 0;
    const emit = (value: string) => {
      if (compact && pending && out && !after.has(out.at(-1)!) && !before.has(value[0])) out += " ";
      pending = false;
      if (compact && before.has(value) && out.endsWith(" ")) out = out.slice(0, -1);
      out += value;
    };
    while (i < input.length) {
      const ch = input[i];
      if (ch === ")" && interpolation && depth === 0) { i++; return out; }
      if (ch === '"') { emit(string()); continue; }
      if (ch === "#") {
        // jq treats a backslash immediately before a newline as comment continuation.
        while (i < input.length) {
          if (input[i] === "\n" && input[i - 1] !== "\\" && !(input[i - 1] === "\r" && input[i - 2] === "\\")) break;
          i++;
        }
        if (compact) pending = true;
        else out += " ";
        continue;
      }
      if (/\s/.test(ch)) {
        if (compact) pending = true;
        else out += ch;
        i++; continue;
      }
      if (quoteSafe && ch === "'") throw new Error("JQ contains a single quote outside a JSON string; target quoting is not proven safe");
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      emit(ch); i++;
    }
    if (interpolation) throw new Error("JQ contains an unterminated string interpolation");
    return out;
  };
  const out = code();
  return compact ? out.trim() : out;
}
