// Loon source header metadata parser
// Author: chance
// Category: Converter / Source Metadata

export function parseSourceMetadataHeader(headerLines = []) {
  const directives=new Map();
  const comments=[];

  for (const raw of headerLines) {
    const line=String(raw ?? '').trimEnd();
    const match=line.trim().match(/^#!([^=]+)=(.*)$/);
    if (match) {
      directives.set(match[1].trim().toLowerCase(),match[2].trim());
      continue;
    }
    comments.push(line);
  }

  return {directives,comments};
}
