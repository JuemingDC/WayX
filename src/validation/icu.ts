// Modified: 2026-10-30 (chance). Use native ICU for target syntax and fixture
// replacement execution; no Python or JavaScript substitute for client regex.
import koffi from "koffi";
let bindings: any;
function icu() {
  if (bindings) return bindings;
  let lib: ReturnType<typeof koffi.load> | undefined;
  for (const name of [
    process.env.WAYX_ICU_LIBRARY,
    ...(process.platform === "darwin"
      ? ["libicucore.dylib"]
      : [
          "libicui18n.so",
          ...Array.from({ length: 61 }, (_, i) => "libicui18n.so." + (100 - i)),
        ]),
  ].filter(Boolean))
    try {
      lib = koffi.load(name!);
      break;
    } catch {}
  if (!lib)
    throw Error("ICU regex library is required for target publication audit");
  for (const suffix of [
    "",
    ...Array.from({ length: 61 }, (_, i) => "_" + (100 - i)),
  ])
    try {
      const status = koffi.inout(koffi.pointer("int32_t"));
      bindings = {
        open: lib.func("uregex_open" + suffix, "void *", [
          "void *",
          "int32_t",
          "uint32_t",
          "void *",
          status,
        ]),
        close: lib.func("uregex_close" + suffix, "void", ["void *"]),
        errorName: lib.func("u_errorName" + suffix, "str", ["int32_t"]),
        setText: lib.func("uregex_setText" + suffix, "void", [
          "void *",
          "void *",
          "int32_t",
          status,
        ]),
        replace: lib.func("uregex_replaceAll" + suffix, "int32_t", [
          "void *",
          "void *",
          "int32_t",
          "void *",
          "int32_t",
          status,
        ]),
      };
      return bindings;
    } catch {}
  throw Error("Cannot resolve native ICU regex entry points");
}
export function validateIcuPatterns(
  patterns: { pattern: string; label: string }[],
): void {
  const api = icu(),
    failures: string[] = [];
  for (const item of patterns) {
    const bytes = Buffer.from(item.pattern, "utf16le"),
      status = [0],
      compiled = api.open(bytes, bytes.length / 2, 0, null, status);
    if (compiled) api.close(compiled);
    if (status[0] > 0)
      failures.push(
        item.label + ": " + api.errorName(status[0]) + ": " + item.pattern,
      );
  }
  if (failures.length)
    throw Error("ICU target regex audit failed:\n" + failures.join("\n"));
  console.log(
    `ICU target regex audit passed: ${patterns.length} unique patterns`,
  );
}
export function replaceIcu(
  pattern: string,
  replacement: string,
  text: string,
): string {
  const api = icu(),
    source = Buffer.from(pattern, "utf16le"),
    input = Buffer.from(text, "utf16le"),
    value = Buffer.from(replacement, "utf16le"),
    status = [0],
    compiled = api.open(source, source.length / 2, 0, null, status);
  if (status[0] > 0 || !compiled) throw Error(api.errorName(status[0]));
  try {
    api.setText(compiled, input, input.length / 2, status);
    const output = Buffer.alloc(
      Math.max(1024, input.length * 4 + value.length * 16),
    );
    const length = api.replace(
      compiled,
      value,
      value.length / 2,
      output,
      output.length / 2,
      status,
    );
    if (status[0] > 0) throw Error(api.errorName(status[0]));
    return output.subarray(0, length * 2).toString("utf16le");
  } finally {
    api.close(compiled);
  }
}
