// Modified: 2026-11-09 (chance). Keep parameter metadata in the contiguous
// leading directive block, including retained/manual modules during publication.
export function normalizeSurgeModuleHeader(text: string): string {
  const section = text.search(/^[\t ]*\[[^\]\r\n]+\]/m);
  if (section < 0) return text;
  const header = text.slice(0, section);
  if (!/^#!arguments=/m.test(header)) return text;
  const bom = header.startsWith("\uFEFF") ? "\uFEFF" : "";
  const lines = header.slice(bom.length).match(/[^\n]*(?:\n|$)/g)!.filter(Boolean);
  const directives = lines.filter((line) => /^#![\w-]+=/.test(line));
  const rest = lines.filter((line) => !/^#![\w-]+=/.test(line));
  return bom + directives.join("") + rest.join("") + text.slice(section);
}
