// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Target rewrite declarations use the target platform's documented regex form.
// Loon /i, /m and /s flags are source-literal metadata only: WayX strips them
// during conversion and preserves the regex body without synthesizing target
// modifiers or case-fold expansions.

function fail(reason) {
  return { ok: false, reason };
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = regex.pattern;
  const flags = String(regex.flags || '');

  // Loon regex flags (i/m/s) belong to the source literal syntax. WayX
  // intentionally does not emulate or propagate them into QX/Surge
  // declarations. Preserve the regex body and let the target declaration use
  // only syntax officially supported by that target.
  return { ok: true, pattern, sourceFlags: flags, notes: [] };
}
