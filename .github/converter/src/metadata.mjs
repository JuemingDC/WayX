// WayX target metadata normalization
// Author: chance
// Category: Converter / Metadata

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

const KNOWN_LABELS = new Map([
  ['author', 'Author'],
  ['homepage', 'Homepage'],
  ['icon', 'Icon'],
  ['openurl', 'Open URL'],
  ['tag', 'Tags'],
  ['raw-url', 'Upstream'],
  ['tg-channel', 'Channel'],
  ['date', 'Updated'],
  ['system', 'Platform'],
  ['system_version', 'System Version'],
]);

function targetText(value, target) {
  if (!value) return value;
  return String(value).replace(/\bLoon\b/g, target);
}

function metadataComments(directives, target) {
  const out = [];
  for (const [key, value] of directives) {
    if (!value) continue;
    if (key === 'name' || key === 'desc' || key === 'loon_version') continue;
    if (key === 'system' && /^(?:ios|mac)$/i.test(value) && target === 'Surge') continue;
    if (key === 'category' && target === 'Surge') continue;
    const label = KNOWN_LABELS.get(key) || key.replace(/(^|[-_])(\w)/g, (_, __, c) => ' ' + c.toUpperCase()).trim();
    out.push(`# ${label}: ${value}`);
  }
  return out;
}

function preservedComments(lines) {
  const out = [];
  for (const raw of lines) {
    const line = String(raw ?? '').trimEnd();
    if (!line.trim()) {
      if (out.length && out.at(-1) !== '') out.push('');
      continue;
    }
    out.push(line);
  }
  while (out.length && !out.at(-1)) out.pop();
  return out;
}

export function renderQxSnippetHeader(headerLines, entry, stamp) {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const out = [];
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || '', 'Quantumult X');

  out.push(`# Name: ${name}`);
  if (desc) out.push(`# Description: ${desc}`);
  out.push(...metadataComments(directives, 'Quantumult X'));
  const original = preservedComments(comments);
  if (original.length) {
    out.push('');
    out.push(...original);
  }
  out.push(
    '',
    `# Converted: ${stamp}`,
    '# Converted by: chance',
    `# Category: ${entry.category}`,
    `# Source: ${entry.source}`,
    '# Target: Quantumult X',
  );
  return out;
}

export function renderSurgeModuleHeader(headerLines, entry, stamp, { needsCore20 = false, argumentMetadata = [], needsLineRequirement = false } = {}) {
  const { directives, comments } = parseSourceMetadataHeader(headerLines);
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || entry.id, 'Surge');
  const out = [
    '#!name=' + name,
    '#!desc=' + desc,
    '#!category=WayX',
  ];

  const system = directives.get('system');
  if (system && /^mac$/i.test(system)) out.push('#!system=mac');
  if (needsLineRequirement) out.push('#!requirement=CORE_VERSION>=22');
  else if (needsCore20) out.push('#!requirement=CORE_VERSION>=20');
  out.push(...argumentMetadata);

  const meta = metadataComments(directives, 'Surge');
  const original = preservedComments(comments);
  if (meta.length || original.length) out.push('');
  out.push(...meta);
  if (meta.length && original.length) out.push('');
  out.push(...original);
  out.push(
    '',
    '# Converted: ' + stamp,
    '# Converted by: chance',
    '# Source: ' + entry.source,
    '# Target: Surge',
  );
  return out;
}

// Generated-file policy metadata; target syntax is validated by its sole adapter.
export function validateConversionMetadata(text,entry,target) {
  const common=[
    /^# Converted:\s*.+$/m,
    /^# Converted by:\s*chance\s*$/m,
    /^# Source:\s*.+$/m,
    target==='qx' ? /^# Target:\s*Quantumult X\s*$/m : /^# Target:\s*Surge\s*$/m,
  ];
  for(const pattern of common){
    if(!pattern.test(text))throw new Error(`${entry.id}: missing conversion metadata ${pattern}`);
  }
  if(target==='qx'){
    if(!/^# Category:\s*.+$/m.test(text))throw new Error(`${entry.id}: missing conversion Category`);
    for(const title of ['# [filter_local]','# [rewrite_local]','# [mitm]']){
      if(!text.includes(title))throw new Error(`${entry.id}: missing commented section ${title}`);
    }
  }else if(target==='surge'){
    if((text.match(/^#!category=WayX$/gm)||[]).length!==1)throw new Error(`${entry.id}: module requires exactly one #!category=WayX`);
    if(/^# Category:\s*.+$/m.test(text))throw new Error(`${entry.id}: legacy Surge Category comment`);
    let mitm=false;
    for(const raw of text.split('\n')){
      const line=raw.trim(),section=line.match(/^\[([^\]]+)\]$/);
      if(section){mitm=section[1]==='MITM';continue;}
      if(mitm && /^hostname\s*=/i.test(line) && !/^hostname\s*=\s*%APPEND%\s+\S/i.test(line)){
        throw new Error(`${entry.id}: Surge module MITM hostname must use %APPEND%`);
      }
    }
  }else throw new TypeError('Unknown metadata target: '+target);
}
