// Quantumult X snippet output builder
// Author: chance
// Category: Converter / Output / Quantumult X

import { renderQxSnippetHeader } from './metadata.mjs';
import { compactOutputLines, finalizeOutputLines } from './output-lines.mjs';

const QX_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['filter','filter'],
  ['rewrite','rewrite'],
  ['mitm','mitm'],
]);

export function createQxOutputState() {
  return {
    notes:[],
    filter:[],
    rewrite:[],
    mitm:[],
    generatedScripts:new Map(),
  };
}

export function qxOutputDestination(state,section) {
  const key=QX_DESTINATIONS.get(String(section || '').toLowerCase());
  return key ? state[key] : null;
}

export function appendQxOutput(state,section,...lines) {
  const dest=qxOutputDestination(state,section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}

export function qxRuleOutputDestination(state,kind) {
  return qxOutputDestination(state,kind==='rewrite' ? 'rewrite' : 'filter');
}

export function qxRewriteOutputDestination(state,section) {
  if (section==='rewrite' || section==='drop') return qxOutputDestination(state,'rewrite');
  return qxOutputDestination(state,'notes');
}

export function renderQxOutput({state,headerLines,entry,stamp}) {
  const header=renderQxSnippetHeader(headerLines,entry,stamp);
  const lines=[
    ...header,
    '',
    ...(state.notes.length ? [...state.notes,''] : []),
    '# [filter_local]',
    ...compactOutputLines(state.filter),
    '',
    '# [rewrite_local]',
    ...compactOutputLines(state.rewrite),
    '',
    '# [mitm]',
    ...compactOutputLines(state.mitm),
    '',
  ];
  return finalizeOutputLines(lines);
}
