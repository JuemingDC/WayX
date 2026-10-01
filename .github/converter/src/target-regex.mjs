// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Loon Rewrite v2 uses JavaScript-style /.../ regex literals. Target
// declarations use their own bare/string regex fields. WayX removes only the
// Loon literal wrapper at parse time and intentionally discards source i/m/s
// flags by project standard. The regex body itself is preserved byte-for-byte;
// target-specific planners may adapt it only when an official target syntax
// requires a local change.

export function normalizeRegexBodyForTarget(pattern) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other regex-body rewriting.
  return String(pattern ?? '');
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = normalizeRegexBodyForTarget(regex.pattern);
  const flags = String(regex.flags || '');

  // i/m/s are intentionally source-only metadata. Never synthesize inline
  // modifiers, case-fold expansions, or target helper flags.
  return { ok: true, pattern, sourceFlags: flags, notes: [] };
}
