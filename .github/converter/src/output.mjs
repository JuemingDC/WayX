// Target output builders for Quantumult X and Surge
// Author: chance
// Category: Converter / Output

import { renderQxSnippetHeader, renderSurgeModuleHeader } from './metadata.mjs';

export function compactOutputLines(lines = []) {
  const out=[];
  for (const raw of lines) {
    const line=raw ?? '';
    if (line==='' && out.at(-1)==='') continue;
    out.push(line);
  }
  while (out.length && out.at(-1)==='') out.pop();
  return out;
}

export function hasActiveOutputLines(lines = []) {
  return lines.some(raw=>{
    const line=String(raw ?? '').trim();
    return line && !line.startsWith('#') && !line.startsWith(';') && !line.startsWith('//');
  });
}

export function finalizeOutputLines(lines = []) {
  return lines.join('\n').replace(/\n*$/, '\n');
}

const QX_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['filter','filter'],
  ['rewrite','rewrite'],
  ['task','task'],
  ['mitm','mitm'],
]);

export function createQxOutputState() {
  return {
    notes:[],
    filter:[],
    rewrite:[],
    task:[],
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
    ...(state.task.length ? ['# [task_local]',...compactOutputLines(state.task),''] : []),
    '# [mitm]',
    ...compactOutputLines(state.mitm),
    '',
  ];
  return finalizeOutputLines(lines);
}

const SURGE_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['general','general'],
  ['rule','rule'],
  ['url','url'],
  ['header','header'],
  ['body','body'],
  ['map','map'],
  ['script','script'],
  ['mitm','mitm'],
]);

const SURGE_SECTION_ORDER=[
  ['general','[General]'],
  ['rule','[Rule]'],
  ['url','[URL Rewrite]'],
  ['header','[Header Rewrite]'],
  ['body','[Body Rewrite]'],
  ['map','[Map Local]'],
  ['script','[Script]'],
  ['mitm','[MITM]'],
];

export function createSurgeOutputState() {
  return {
    notes:[],
    general:[],
    rule:[],
    url:[],
    header:[],
    body:[],
    map:[],
    script:[],
    mitm:[],
    generatedScripts:new Map(),
  };
}

export function surgeOutputDestination(state,section) {
  const key=SURGE_DESTINATIONS.get(String(section || '').toLowerCase());
  return key ? state[key] : null;
}

export function appendSurgeOutput(state,section,...lines) {
  const dest=surgeOutputDestination(state,section);
  if (!dest) return false;
  dest.push(...lines);
  return true;
}

export function surgeRuleOutputDestination(state,section) {
  return surgeOutputDestination(state,section==='map' ? 'map' : 'rule');
}

export function surgeRewriteOutputDestination(state,section) {
  if (section==='drop') return surgeOutputDestination(state,'notes');
  return surgeOutputDestination(state,section) || surgeOutputDestination(state,'notes');
}

export function renderSurgeOutput({
  state,
  headerLines,
  entry,
  stamp,
  argumentMetadata=[],
  needsLineRequirement=false,
}) {
  const needsCore20=hasActiveOutputLines(state.body) || hasActiveOutputLines(state.map);
  const header=renderSurgeModuleHeader(headerLines,entry,stamp,{
    needsCore20,
    argumentMetadata,
    needsLineRequirement,
  });

  const sections=[];
  if (state.notes.length) sections.push(...state.notes,'');

  for (const [key,title] of SURGE_SECTION_ORDER) {
    if (!state[key].length) continue;
    sections.push(title,...compactOutputLines(state[key]),'');
  }

  return finalizeOutputLines([...header,'',...sections]);
}
