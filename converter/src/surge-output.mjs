// Surge Module output builder
// Author: chance
// Category: Converter / Output / Surge

import { renderSurgeModuleHeader } from './metadata.mjs';
import { compactOutputLines, finalizeOutputLines, hasActiveOutputLines } from './output-lines.mjs';

const SURGE_DESTINATIONS=new Map([
  ['notes','notes'],
  ['comment','notes'],
  ['rule','rule'],
  ['url','url'],
  ['header','header'],
  ['body','body'],
  ['map','map'],
  ['script','script'],
  ['mitm','mitm'],
]);

const SURGE_SECTION_ORDER=[
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
