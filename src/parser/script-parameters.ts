// Modified: 2026-11-02 (chance). Generated optional parameter slots remain
// capture-free even when authors bind an unused platform or codec name locally.
export function optionalScriptParameters(
  fresh: (name: string) => string,
  enabled: Record<string, boolean>,
) {
  const roots = [
    "$httpClient",
    "$task",
    "$argument",
    "TextEncoder",
    "TextDecoder",
    "atob",
    "btoa",
  ];
  let last = -1;
  for (let i = 0; i < roots.length; i++) if (enabled[roots[i]]) last = i;
  return roots
    .slice(0, last + 1)
    .map((root) =>
      enabled[root] ? root : fresh("__wayxUnused" + root.replace(/\$/g, "")),
    )
    .map((name) => "," + name)
    .join("");
}
