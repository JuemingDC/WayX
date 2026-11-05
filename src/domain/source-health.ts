// Modified: 2026-11-05 (chance). Known dead whole-file sources are not fetched;
// only declarations depending on an unavailable resource are disabled.
export function disableUnavailableDeclarations(
  text: string,
  unavailable: Set<string>,
  original: (url: string) => string | null = (v) => v,
  reason = "upstream resource unavailable",
) {
  let disabled = 0;
  const output = text
    .split("\n")
    .map((line) => {
      if (/^\s*(?:#(?!\!REQUIREMENT)|;|\/\/)/.test(line)) return line;
      const urls = line.match(/https?:\/\/[^\s,"'<>]+/g) ?? [];
      if (
        !urls.some((url) =>
          unavailable.has((original(url) ?? url).split("#")[0]),
        )
      )
        return line;
      disabled++;
      return "# Disabled: " + reason + "\n# " + line;
    })
    .join("\n");
  return { text: output, disabled };
}
