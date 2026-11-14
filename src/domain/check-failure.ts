// Modified: 2026-11-14 (chance). Keep the first concrete error and nearby
// context ahead of routine progress, even when it occurs in the middle of a log.
export function checkFailureExcerpt(text: string, limit = 4000): string {
  if (text.length <= limit) return text;
  const lines = text.split("\n");
  const first = lines.findIndex(line =>
    /(?:\b(?:[A-Za-z]*Error|failed|failure|fatal|ENOBUFS|ENOENT)\b|::error)/i.test(line),
  );
  const focus = first < 0 ? text.slice(-limit) : lines.slice(first, first + 12).join("\n");
  const note = "\n[full log in artifact]\n";
  const budget = limit - note.length;
  if (focus.length >= budget) return focus.slice(0, budget) + note;
  return focus + note + text.slice(-(budget - focus.length));
}
