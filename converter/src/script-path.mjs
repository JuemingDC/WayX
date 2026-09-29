// Deterministic local mirror filenames for source JavaScript dependencies.
// Author: chance
// Category: Converter / Script Dependency
import crypto from 'node:crypto';

function hashUrl(url) {
  return crypto.createHash('sha256').update(String(url)).digest('hex').slice(0, 10);
}

function safeBaseName(url) {
  let raw='';
  try {
    const pathname=new URL(String(url)).pathname;
    raw=decodeURIComponent(pathname.split('/').filter(Boolean).at(-1) || '');
  } catch {
    raw='';
  }

  // Keep familiar filenames stable whenever possible, but never allow path
  // separators, traversal tokens, control characters, or awkward shell chars.
  let name=raw
    .replace(/[\\/\0-\x1f\x7f]/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/_+/g, '_');

  if (!name || name === '.' || name === '..') name=`script_${hashUrl(url)}.js`;
  if (!/\.[A-Za-z0-9]{1,10}$/.test(name)) name += '.js';
  return name;
}

function hashedVariant(base, url) {
  const m=base.match(/^(.*?)(\.[^.]+)?$/);
  const stem=(m?.[1] || 'script').replace(/[-_.]+$/,'') || 'script';
  const ext=m?.[2] || '.js';
  return `${stem}-${hashUrl(url)}${ext}`;
}

export function planScriptMirrorPaths(urls) {
  const unique=[...new Set((urls || []).map(x=>String(x).trim()).filter(Boolean))];
  const groups=new Map();

  for (const url of unique) {
    const base=safeBaseName(url);
    const key=base.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({url,base});
  }

  const out=new Map();
  for (const items of groups.values()) {
    if (items.length === 1) {
      out.set(items[0].url, items[0].base);
      continue;
    }
    for (const item of items) out.set(item.url, hashedVariant(item.base, item.url));
  }

  return out;
}

export function scriptMirrorFilename(url, urls=[url]) {
  return planScriptMirrorPaths(urls).get(String(url).trim());
}
