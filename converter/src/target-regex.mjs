// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Target rewrite declarations follow the target platform's documented bare-regex
// syntax. Do not expand Loon /i into [aA][pP][iI] character classes and do not
// invent an undocumented inline modifier for Quantumult X / Surge.
// The source regex body is preserved verbatim; flags that have no documented
// declaration field are recorded in notes for review/diagnostics.

function fail(reason) {
  return { ok: false, reason };
}

export function compileRegexForTarget(regex, { subject = 'url' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern = regex.pattern;
  const flags = String(regex.flags || '');
  const notes = [];

  if (flags.includes('i')) {
    notes.push('i-source-flag-not-expressed-in-target-declaration');
  }

  if (flags.includes('m') || flags.includes('s')) {
    if (!['url','header'].includes(subject)) {
      return fail('m/s regex flags require target-specific body regex semantics');
    }
    // URL/header match declarations use the documented bare regular-expression
    // form. Preserve the source pattern and do not synthesize target-only syntax.
    if (flags.includes('m')) notes.push('m-source-flag-not-expressed-in-target-declaration');
    if (flags.includes('s')) notes.push('s-source-flag-not-expressed-in-target-declaration');
  }

  return { ok: true, pattern, sourceFlags: flags, notes };
}
