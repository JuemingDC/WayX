// WayX target Regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Loon Rewrite v2 uses JavaScript-style /.../flags Regex literals. Target
// declarations use target-specific matcher fields. The parser has already
// removed the literal wrapper, so this module preserves the source body
// byte-for-byte and refuses native lowering when source flags have no verified
// target encoding.

export function normalizeRegexBodyForTarget(pattern) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other Regex-body rewriting.
  return String(pattern ?? '');
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'target' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 Regex AST node');

  const pattern=normalizeRegexBodyForTarget(regex.pattern);
  const flags=String(regex.flags || '');
  if (flags) {
    return {
      ok:false,
      pattern,
      sourceFlags:flags,
      notes:[],
      reason:String(target || 'target')+' native '+subject+' Regex has no verified Loon flag encoding: '+flags,
    };
  }
  return {ok:true,pattern,sourceFlags:'',notes:[]};
}
