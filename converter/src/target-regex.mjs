// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform

function fail(reason) {
  return { ok: false, reason };
}

function opposite(ch) {
  const lower = ch.toLowerCase();
  const upper = ch.toUpperCase();
  return lower === upper ? ch : (ch === lower ? upper : lower);
}

function compileClass(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '\\') {
      const next = raw[++i];
      if (next === undefined) return fail('unterminated escape in character class');
      if (/[A-Za-z]/.test(next) && !/[dDsSwWbB]/.test(next)) {
        return fail('case-insensitive character class contains an unsupported alphabetic escape');
      }
      out += '\\' + next;
      continue;
    }
    if (/[A-Za-z]/.test(ch) && raw[i + 1] === '-' && /[A-Za-z]/.test(raw[i + 2] || '')) {
      const end = raw[i + 2];
      if ((ch >= 'a' && ch <= 'z' && end >= 'a' && end <= 'z') ||
          (ch >= 'A' && ch <= 'Z' && end >= 'A' && end <= 'Z')) {
        out += ch + '-' + end + opposite(ch) + '-' + opposite(end);
        i += 2;
        continue;
      }
      return fail('mixed-case alphabetic range cannot be safely case-folded');
    }
    if (/[A-Za-z]/.test(ch)) {
      out += ch + opposite(ch);
      continue;
    }
    out += ch;
  }
  return { ok: true, value: out };
}

function asciiCaseFold(pattern) {
  if (/[^\x00-\x7F]/.test(pattern)) return fail('non-ASCII case-insensitive regex requires target-specific Unicode case-folding');
  if (/\(\?<[^=!]/.test(pattern) || /\\k</.test(pattern)) return fail('named regex groups are not supported by the target case-fold compiler');

  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\') {
      const next = pattern[++i];
      if (next === undefined) return fail('unterminated regex escape');
      if (/[xucpPk]/.test(next)) return fail('case-insensitive hex/unicode/control/property escape requires target regex review');
      out += '\\' + next;
      continue;
    }
    if (ch === '[') {
      let j = i + 1, escaped = false;
      for (; j < pattern.length; j++) {
        const c = pattern[j];
        if (escaped) { escaped = false; continue; }
        if (c === '\\') { escaped = true; continue; }
        if (c === ']') break;
      }
      if (j >= pattern.length) return fail('unterminated character class');
      const raw = pattern.slice(i + 1, j);
      const compiled = compileClass(raw);
      if (!compiled.ok) return compiled;
      out += '[' + compiled.value + ']';
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) out += '[' + ch.toLowerCase() + ch.toUpperCase() + ']';
    else out += ch;
  }
  return { ok: true, value: out };
}

export function compileRegexForTarget(regex, { subject = 'url' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');
  let pattern = regex.pattern;
  const flags = String(regex.flags || '');
  const notes = [];

  if (flags.includes('i')) {
    const folded = asciiCaseFold(pattern);
    if (!folded.ok) return fail(folded.reason);
    pattern = folded.value;
    notes.push('i->explicit-ascii-casefold');
  }

  if (flags.includes('m') || flags.includes('s')) {
    if (subject !== 'url') return fail('m/s regex flags require target-specific body/header regex semantics');
    // An HTTP URL cannot contain a literal CR/LF. For URL matching, multiline
    // anchors and dotAll therefore do not change the match set.
    notes.push(flags.includes('m') ? 'm-elided-for-url' : null, flags.includes('s') ? 's-elided-for-url' : null);
  }

  return { ok: true, pattern, sourceFlags: flags, notes: notes.filter(Boolean) };
}
