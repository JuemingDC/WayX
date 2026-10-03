// WayX target regex compiler
// Author: chance
// Category: Converter / Regex / Cross-platform
//
// Loon Rewrite v2 uses JavaScript-style /.../ regex literals. Target
// declarations use bare regex fields. Source i/m/s flags remain semantic
// metadata. For URL subjects, WayX may compile those flags into an equivalent
// bare pattern when the transformation is structurally provable; otherwise
// planners must use a sound broader prefilter plus a helper or fail closed.

export function normalizeRegexBodyForTarget(pattern) {
  // Historical name kept to avoid broad call-site churn. This is deliberately
  // an identity operation: no global \/ -> / or other regex-body rewriting.
  return String(pattern ?? '');
}

function asciiLetter(ch) {
  return typeof ch === 'string' && ch.length === 1 && /[A-Za-z]/.test(ch);
}

function nonAsciiCased(ch) {
  return Boolean(ch) && ch.codePointAt(0) > 0x7f && ch.toLowerCase() !== ch.toUpperCase();
}

function oppositeAsciiCase(ch) {
  return ch === ch.toLowerCase() ? ch.toUpperCase() : ch.toLowerCase();
}

function asciiCaseClass(ch) {
  return '[' + ch + oppositeAsciiCase(ch) + ']';
}

function decodeHexEscape(raw) {
  if (/^\\x[0-9A-Fa-f]{2}$/.test(raw)) return String.fromCodePoint(parseInt(raw.slice(2),16));
  if (/^\\u[0-9A-Fa-f]{4}$/.test(raw)) return String.fromCodePoint(parseInt(raw.slice(2),16));
  return null;
}

function classAtom(text,index) {
  const ch=text[index];
  if (ch !== '\\') return {raw:ch,char:ch,next:index+1,special:false};
  if (index+1 >= text.length) return {error:'dangling escape in character class'};

  const next=text[index+1];
  if (/[0-9]/.test(next)) return {error:'numeric/octal character-class escape is not flag-compilable'};
  if (next === 'x') {
    const raw=text.slice(index,index+4);
    if (!/^\\x[0-9A-Fa-f]{2}$/.test(raw)) return {error:'invalid hex escape'};
    return {raw,char:decodeHexEscape(raw),next:index+4,special:false};
  }
  if (next === 'u') {
    const raw=text.slice(index,index+6);
    if (!/^\\u[0-9A-Fa-f]{4}$/.test(raw)) return {error:'invalid unicode escape'};
    return {raw,char:decodeHexEscape(raw),next:index+6,special:false};
  }
  if (next === 'c') {
    const raw=text.slice(index,index+3);
    if (!/^\\c[A-Za-z]$/.test(raw)) return {error:'invalid control escape'};
    return {raw,char:null,next:index+3,special:true};
  }
  if (/[dDsSwWbBnrtfv0]/.test(next)) {
    return {raw:text.slice(index,index+2),char:null,next:index+2,special:true};
  }
  if (/[pPkK]/.test(next)) return {error:'property/named escape is not flag-compilable'};
  return {raw:text.slice(index,index+2),char:next,next:index+2,special:false};
}

function compileIgnoreCaseClass(pattern,start) {
  let index=start+1;
  let prefix='';
  if (pattern[index] === '^') {
    prefix='^';
    index++;
  }

  const atoms=[];
  let first=true;
  while (index < pattern.length) {
    if (pattern[index] === ']' && !first) break;
    first=false;
    const atom=classAtom(pattern,index);
    if (!atom || atom.error) return {ok:false,reason:atom?.error || 'unterminated character class'};
    atoms.push(atom);
    index=atom.next;
  }
  if (index >= pattern.length || pattern[index] !== ']') {
    return {ok:false,reason:'unterminated character class'};
  }

  let body=prefix;
  for (let i=0;i<atoms.length;i++) {
    const atom=atoms[i];
    if (
      i+2 < atoms.length &&
      atoms[i+1].char === '-' &&
      atom.char !== null &&
      atoms[i+2].char !== null
    ) {
      const end=atoms[i+2];
      if (nonAsciiCased(atom.char) || nonAsciiCased(end.char)) {
        return {ok:false,reason:'non-ASCII cased range is not flag-compilable'};
      }

      body+=atom.raw+'-'+end.raw;
      if (asciiLetter(atom.char) || asciiLetter(end.char)) {
        if (!(asciiLetter(atom.char) && asciiLetter(end.char))) {
          return {ok:false,reason:'mixed letter/non-letter range is not flag-compilable'};
        }
        const sameLower=atom.char===atom.char.toLowerCase() && end.char===end.char.toLowerCase();
        const sameUpper=atom.char===atom.char.toUpperCase() && end.char===end.char.toUpperCase();
        if (sameLower || sameUpper) {
          body+=oppositeAsciiCase(atom.char)+'-'+oppositeAsciiCase(end.char);
        } else {
          const lo=Math.min(atom.char.codePointAt(0),end.char.codePointAt(0));
          const hi=Math.max(atom.char.codePointAt(0),end.char.codePointAt(0));
          const alreadyCoversBoth=lo<=65 && hi>=122;
          if (!alreadyCoversBoth) return {ok:false,reason:'mixed-case range is not flag-compilable'};
        }
      }
      i+=2;
      continue;
    }

    if (nonAsciiCased(atom.char)) {
      return {ok:false,reason:'non-ASCII cased class literal is not flag-compilable'};
    }
    body+=asciiLetter(atom.char) ? atom.raw+oppositeAsciiCase(atom.char) : atom.raw;
  }

  return {ok:true,text:'['+body+']',next:index+1};
}

function compileIgnoreCaseBarePattern(pattern) {
  let out='';
  for (let index=0; index<pattern.length;) {
    const ch=pattern[index];

    if (ch === '[') {
      const compiled=compileIgnoreCaseClass(pattern,index);
      if (!compiled.ok) return compiled;
      out+=compiled.text;
      index=compiled.next;
      continue;
    }

    if (ch === '\\') {
      if (index+1 >= pattern.length) return {ok:false,reason:'dangling regex escape'};
      const next=pattern[index+1];

      if (/[1-9]/.test(next) || next === 'k') {
        return {ok:false,reason:'backreferences are not flag-compilable'};
      }
      if (next === 'x') {
        const raw=pattern.slice(index,index+4);
        if (!/^\\x[0-9A-Fa-f]{2}$/.test(raw)) return {ok:false,reason:'invalid hex escape'};
        const decoded=decodeHexEscape(raw);
        if (nonAsciiCased(decoded)) return {ok:false,reason:'non-ASCII cased hex escape is not flag-compilable'};
        out+=asciiLetter(decoded) ? asciiCaseClass(decoded) : raw;
        index+=4;
        continue;
      }
      if (next === 'u') {
        const raw=pattern.slice(index,index+6);
        if (!/^\\u[0-9A-Fa-f]{4}$/.test(raw)) return {ok:false,reason:'invalid unicode escape'};
        const decoded=decodeHexEscape(raw);
        if (nonAsciiCased(decoded)) return {ok:false,reason:'non-ASCII cased unicode escape is not flag-compilable'};
        out+=asciiLetter(decoded) ? asciiCaseClass(decoded) : raw;
        index+=6;
        continue;
      }
      if (next === 'c') {
        const raw=pattern.slice(index,index+3);
        if (!/^\\c[A-Za-z]$/.test(raw)) return {ok:false,reason:'invalid control escape'};
        out+=raw;
        index+=3;
        continue;
      }
      if (/[dDsSwWbBnrtfv0]/.test(next)) {
        out+=pattern.slice(index,index+2);
        index+=2;
        continue;
      }
      if (/[pP]/.test(next)) return {ok:false,reason:'property escape is not flag-compilable'};
      if (asciiLetter(next)) {
        out+=asciiCaseClass(next);
        index+=2;
        continue;
      }
      out+=pattern.slice(index,index+2);
      index+=2;
      continue;
    }

    // Preserve named-capture identifiers as syntax rather than case-folding
    // their letters. Backreferences to named captures are rejected above.
    if (ch === '(' && pattern.slice(index,index+3) === '(?<' && !['=','!'].includes(pattern[index+3])) {
      const end=pattern.indexOf('>',index+3);
      if (end < 0) return {ok:false,reason:'unterminated named capture'};
      out+=pattern.slice(index,end+1);
      index=end+1;
      continue;
    }

    if (nonAsciiCased(ch)) return {ok:false,reason:'non-ASCII cased literal is not flag-compilable'};
    out+=asciiLetter(ch) ? asciiCaseClass(ch) : ch;
    index++;
  }
  return {ok:true,pattern:out};
}

export function compileRegexForTarget(regex, { subject = 'url', target = 'generic' } = {}) {
  if (!regex || regex.type !== 'regex') throw new TypeError('Expected Rewrite v2 regex AST node');

  const pattern=normalizeRegexBodyForTarget(regex.pattern);
  const flags=String(regex.flags || '');
  if (!flags || target === 'generic') {
    return {ok:true,pattern,sourceFlags:flags,notes:[],compiledFlags:''};
  }

  // A URL string cannot contain literal CR/LF. Therefore JavaScript m and s
  // do not change URL matching semantics. i is compiled into ordinary regex
  // atoms only when the transformation is exact for the source pattern.
  if (subject === 'url' && (target === 'qx' || target === 'surge')) {
    let compiledPattern=pattern;
    if (flags.includes('i')) {
      const compiled=compileIgnoreCaseBarePattern(pattern);
      if (!compiled.ok) {
        return {
          ok:false,
          reason:target+' bare URL matcher cannot exactly compile Loon regex flags '+flags+': '+compiled.reason,
          sourceFlags:flags,
        };
      }
      compiledPattern=compiled.pattern;
    }
    return {
      ok:true,
      pattern:compiledPattern,
      sourceFlags:flags,
      compiledFlags:flags,
      notes:['Source URL regex flags '+flags+' were structurally compiled into an equivalent bare '+target+' matcher.'],
    };
  }

  return {
    ok:false,
    reason:target+' bare '+subject+' matcher cannot preserve Loon regex flags: '+flags,
    sourceFlags:flags,
  };
}
