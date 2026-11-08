// Modified: 2026-11-03 (chance). Compact only known generated commentary; preserve source comments and actionable diagnostics.
const routine =
  /^# \[WayX\] Source (?:enable forced to enabled for Quantumult X|dynamic Cron expression=.* is fixed to its plugin default for Quantumult X\.|img_url=.* omitted because Quantumult X task img-url|Script (?:argument (?:ignored for Quantumult X|omitted for Surge by user conversion policy)|timeout ignored for Quantumult X|debug is not a Quantumult X)|binary[-_]body[-_]mode=true ignored for Quantumult X)/;
export function compactGeneratedPluginComments(
  text: string,
  source: string,
): string {
  if (!/^# (?:Converted by: chance|Managed by: WayX Native QX)\r?$/m.test(text))
    return text;
  const protectedLines = new Set(
    source.split(/\r?\n/).map((line) => line.trim()),
  );
  let metadata = false;
  return text
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      // Modified: 2026-11-08 (chance). Recognize update-only and legacy metadata stanzas.
      if (/^# (?:Updated|Converted):/.test(value)) metadata = true;
      else if (!/^# (?:Converted by:|Category:|Source:|Target:)/.test(value))
        metadata = false;
      if (protectedLines.has(value)) return true;
      return !(
        routine.test(value) ||
        (metadata && /^# Target: (?:Quantumult X|Surge)$/.test(value))
      );
    })
    .join("\n");
}
