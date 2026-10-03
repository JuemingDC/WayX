// Loon source parser and section/comment structure
// Author: chance
// Category: Converter / Source Parsing

export const WAYX_SUPPORTED_SOURCE_SECTIONS = new Set([
  'Argument',
  'General',
  'Rule',
  'Rewrite',
  'Script',
  'MITM',
  'MitM',
]);

export function normalizePluginSource(text) {
  return String(text ?? '').replace(/\r\n?/g,'\n').replace(/^\uFEFF/,'');
}

export function parseLoonPlugin(text) {
  const header=[];
  const sections=new Map();
  let current=null;

  for (const raw of normalizePluginSource(text).split('\n')) {
    const match=raw.trim().match(/^\[([^\]]+)\]$/);
    if (match) {
      current=match[1];
      if (!sections.has(current)) sections.set(current,[]);
      continue;
    }
    if (current===null) header.push(raw);
    else sections.get(current).push(raw);
  }

  return {header,sections};
}

export function isSupportedSourceSection(name) {
  return WAYX_SUPPORTED_SOURCE_SECTIONS.has(String(name ?? ''));
}

export function groupSourceSectionItems(lines = []) {
  const items=[];
  let pending=[];
  for (let sourceIndex=0; sourceIndex<lines.length; sourceIndex++) {
    const raw=String(lines[sourceIndex] ?? '');
    const trimmed=raw.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';') || trimmed.startsWith('//')) {
      pending.push(lines[sourceIndex]);
      continue;
    }
    items.push({comments:pending,line:trimmed,sourceIndex});
    pending=[];
  }
  if (pending.length) items.push({comments:pending,line:null,sourceIndex:lines.length});
  return items;
}

export function cleanSourceComments(comments = []) {
  return comments
    .map(value=>value || '')
    .map(value=>String(value).trim() ? String(value) : '')
    .filter((value,index,all)=>!(value==='' && all[index-1]===''));
}

export function sourceCommentText(raw) {
  const text=String(raw ?? '').trim();
  const match=text.match(/^(?:#|;|\/\/)\s*(.*?)\s*$/);
  return match ? match[1].trim() : null;
}
