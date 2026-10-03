// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Loon Rewrite v2 uses JavaScript-style /.../ regex literals. Target
// declarations use their own bare/string regex fields. WayX removes only the
// Loon literal wrapper at parse time and preserves source i/m/s flags as
// semantic metadata. Target planners must explicitly prove native flag
// equivalence, use a sound broader prefilter plus helper, or fail closed.
// The regex body itself is preserved byte-for-byte.

export function normalizeRegexBodyForTarget(pattern) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other regex-body rewriting.
  return String(pattern ?? '');
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = normalizeRegexBodyForTarget(regex.pattern);
  const flags = String(regex.flags || '');

  // Preserve source flags for planners/runtime. Never synthesize undocumented
  // target inline modifiers or silently treat a flag-less matcher as equal.
  return { ok: true, pattern, sourceFlags: flags, notes: [] };
}
