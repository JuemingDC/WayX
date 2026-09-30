// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Loon uses JavaScript-style /.../ regex literals. QX and Surge target
// declarations use bare regex patterns. During conversion WayX discards the
// Loon i/m/s flags and removes literal-only slash escaping (\/) so generated
// patterns follow the target declaration format without changing the remaining
// regex structure.

export function normalizeRegexBodyForTarget(pattern) {
  return String(pattern ?? '').replace(/\\\//g, '/');
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = normalizeRegexBodyForTarget(regex.pattern);
  const flags = String(regex.flags || '');

  // i/m/s are intentionally source-only metadata. Never synthesize inline
  // modifiers, case-fold expansions, or target helper flags.
  return { ok: true, pattern, sourceFlags: flags, notes: [] };
}
