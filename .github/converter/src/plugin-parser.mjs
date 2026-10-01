// Loon whole-plugin parser
// Author: chance
// Category: Converter / Plugin Parsing

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
