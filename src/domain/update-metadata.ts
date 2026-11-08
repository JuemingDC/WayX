// Modified: 2026-11-08 (chance). Migrate only WayX's own timestamp stanza;
// upstream text, native QX copies and original archives keep their author bytes.
export function migrateUpdateMetadata(text: string, nativeQx = false): string {
  if (nativeQx) return text;
  return text.replace(
    /^# Converted:([^\r\n]*)(\r?)\n(?=# Converted by: chance(?:\r?\n|$))/gm,
    "# Updated:$1$2\n",
  );
}
