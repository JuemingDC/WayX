// Target output line utilities
// Author: chance
// Category: Converter / Output

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
