// Modified: 2026-11-17 (chance). Prepare native Surge mock-response trailers;
// reserved for verified future mappings, not connected to source conversion.
// https://manual.nssurge.com/scripting/http-request.html
export function prepareSurgeMockResponse(
  response: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...response };
  if (!Object.prototype.hasOwnProperty.call(result, "trailers")) return result;
  const value = result.trailers;
  if (value === undefined) {
    delete result.trailers;
    return result;
  }
  const invalid = () => {
    throw new TypeError("WayX API: mock trailers require string fields and values");
  };
  if (Array.isArray(value)) {
    result.trailers = Array.from(value, (row) => {
      if (!row || typeof row !== "object") return invalid();
      const { field, value: entry } = row;
      if (typeof field !== "string" || typeof entry !== "string") return invalid();
      return { field, value: entry };
    });
  } else {
    if (!value || typeof value !== "object") return invalid();
    const entries = Object.entries(value);
    if (entries.some(([, entry]) => typeof entry !== "string")) return invalid();
    result.trailers = Object.fromEntries(entries);
  }
  return result;
}
