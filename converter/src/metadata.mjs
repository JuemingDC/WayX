// WayX target metadata normalization
// Author: chance
// Category: Converter / Metadata

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

function parseHeader(headerLines = []) {
  const directives = new Map();
  const comments = [];
  for (const raw of headerLines) {
    const line = String(raw ?? '').trimEnd();
    const m = line.trim().match(/^#!([^=]+)=(.*)$/);
    if (m) {
      directives.set(m[1].trim().toLowerCase(), m[2].trim());
      continue;
    }
    comments.push(line);
  }
  return { directives, comments };
}

function targetText(value) {
  return value == null ? value : String(value);
}

export function sourcePlatformConstraint(headerLines = []) {
  const { directives } = parseHeader(headerLines);
  const raw = String(directives.get('system') || '').trim();
  if (!raw) return { macOnly:false, raw:'' };
  const systems = raw.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  const normalized = systems.map(v => v === 'macos' ? 'mac' : v);
  return {
    raw,
    macOnly: normalized.length > 0 && normalized.every(v => v === 'mac'),
  };
}

function metadataComments(directives, target) {
  const out = [];
  for (const [key, value] of directives) {
    if (!value) continue;
    if (key === 'name' || key === 'desc' || key === 'loon_version') continue;
    if (key === 'system' && /^(?:ios|mac)$/i.test(value) && target === 'Surge') continue;
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
  const { directives, comments } = parseHeader(headerLines);
  const out = [];
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || '');

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
  const { directives, comments } = parseHeader(headerLines);
  const name = directives.get('name') || entry.id;
  const desc = targetText(directives.get('desc') || entry.id);
  const out = [
    '#!name=' + name,
    '#!desc=' + desc,
  ];

  const platform = sourcePlatformConstraint(headerLines);
  if (platform.macOnly) out.push('#!system=mac');
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
    '# Category: ' + entry.category,
    '# Source: ' + entry.source,
    '# Target: Surge',
  );
  return out;
}
