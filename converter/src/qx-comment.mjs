// Quantumult X inline source-note rendering
// Author: chance
// Category: Converter / Comments / Quantumult X

import { isRewriteV2 } from './rewrite-v2.mjs';
import { parseLegacyScriptLine } from './script-legacy.mjs';
import { cleanSourceComments, sourceCommentText } from './source-section.mjs';

export function looksLikeCommentedSourceDeclaration(text,sectionKind) {
  const value=String(text || '').trim();
  if (!value) return false;

  if (sectionKind==='rule') {
    return /^(?:[A-Z][A-Z0-9-]*|AND|OR|NOT)\s*,/i.test(value);
  }

  if (sectionKind==='rewrite') {
    if (isRewriteV2(value)) return true;
    return /^\S+\s+(?:-\s+)?(?:reject(?:-[A-Za-z0-9-]+)?|302\b|307\b|header\b|(?:response-)?header-(?:add|del|replace|replace-regex)\b|(?:request|response)-body-(?:replace-regex|json-|mock)|mock-(?:request|response)-body\b)/i.test(value);
  }

  if (sectionKind==='script') {
    if (/^\s*(?:request|response)\s+if\b/.test(value) && /\bthen\s+script\s*\(/.test(value)) return true;
    return Boolean(parseLegacyScriptLine(value)?.script?.path);
  }

  return false;
}

export function qxInlineNoteCandidate(sectionLines,item,sectionKind) {
  if (!item?.line || !Number.isInteger(item.sourceIndex) || item.sourceIndex<1) return null;

  const index=item.sourceIndex;
  const previousRaw=sectionLines[index-1];
  const previous=String(previousRaw ?? '').trim();
  const note=sourceCommentText(previousRaw);

  if (!previous || note===null || !note || note.includes('{#') || note.includes('#}')) return null;

  // Only one adjacent source comment can become a QX leading note.
  if (index>=2 && sourceCommentText(sectionLines[index-2])!==null) return null;

  // A comment followed by multiple active source declarations is a group comment.
  if (index+1<sectionLines.length) {
    const next=String(sectionLines[index+1] ?? '').trim();
    if (next && sourceCommentText(sectionLines[index+1])===null) return null;
  }

  // Disabled source declarations are source content, not prose notes.
  if (looksLikeCommentedSourceDeclaration(note,sectionKind)) return null;

  return {text:note,raw:previousRaw};
}

export function attachQxInlineNote({sectionLines,item,sectionKind,lines,eligible=true}) {
  const output=(lines || []).filter(line=>line!==undefined && line!==null && String(line).length);
  const candidate=eligible ? qxInlineNoteCandidate(sectionLines,item,sectionKind) : null;
  const singleActive=
    candidate &&
    output.length===1 &&
    !String(output[0]).includes('\n') &&
    !String(output[0]).trim().startsWith('#');

  if (!singleActive) {
    return {comments:cleanSourceComments(item.comments),lines:output};
  }

  const remaining=[...item.comments];
  if (remaining.length && remaining.at(-1)===candidate.raw) remaining.pop();

  return {
    comments:cleanSourceComments(remaining),
    lines:[`{# ${candidate.text} #} ${output[0]}`],
  };
}
