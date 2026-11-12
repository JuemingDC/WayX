// Modified: 2026-11-08 (chance). Migrate only WayX's own timestamp stanza;
// upstream text, native QX copies and original archives keep their author bytes.
export function migrateUpdateMetadata(text: string, nativeQx = false): string {
  if (nativeQx) return text;
  return text.replace(
    /^# Converted:([^\r\n]*)(\r?)\n(?=# Converted by: chance(?:\r?\n|$))/gm,
    "# Updated:$1$2\n",
  );
}

// Modified: 2026-11-10 (chance). Published plugin dates come only from explicit
// upstream metadata. Never infer an author update from a fetch/build clock.
export function upstreamUpdateTime(source: string): string {
  const original = source.replace(
    /^# (?:Updated|Converted):[^\r\n]*\r?\n(?=# (?:Converted|Copied) by: chance(?:\r?\n|$))/gm,
    "",
  );
  const dates: string[] = [];
  for (const line of original.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    // Modified: 2026-11-12 (chance). Embedded script installation comments
    // also declare explicit > UpdateTime values without @ or a colon.
    const match =
      line.match(
        /^[ \t]*(?:#!(?:date|updated?|update[-_]?time)\s*=\s*|(?:#|\/\/|\*)\s*(?:@(?:UpdateTime|LastUpdated|Date)\s+|(?:Last[ \t]+Updated|Updated?|Update[ \t_-]*Time|更新时间|更新日期|最后更新|更新)[ \t]*[:：=][ \t]*))(.+?)\s*$/i,
      ) ??
      line.match(
        /^[ \t]*(?:#\s*)?>\s*(?:UpdateTime|LastUpdated|Date)\s+(.+?)\s*$/i,
      );
    if (match && !dates.includes(match[1])) dates.push(match[1]);
  }
  return dates.length ? dates.join(" ; ") : "上游未标注";
}

// Replace WayX-owned wrapper dates only; original author/native bytes stay intact.
export function applyUpstreamUpdateTime(text: string, source: string): string {
  return text.replace(
    /^(# )(?:Updated|Converted):[^\r\n]*(\r?)\n(?=# (?:Converted|Copied) by: chance(?:\r?\n|$))/gm,
    (_, prefix: string, cr: string) =>
      prefix + "Updated: " + upstreamUpdateTime(source) + cr + "\n",
  );
}
