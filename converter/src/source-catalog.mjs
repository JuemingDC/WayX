// WayX declarative Loon source catalog
// Author: chance
// Category: Converter / Source Catalog
import fs from 'node:fs/promises';

const REQUIRED = Object.freeze(['id','file','source','qx','surge','category']);

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeRelativePath(value, field) {
  const path = cleanString(value);
  if (!path) throw new Error(`catalog entry missing ${field}`);
  if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) {
    throw new Error(`catalog ${field} must be a safe repository-relative path: ${path}`);
  }
  return path;
}

function absoluteHttpUrl(value, field) {
  const text=cleanString(value);
  let url;
  try { url=new URL(text); }
  catch { throw new Error(`catalog ${field} must be an absolute URL: ${text}`); }
  if (!['http:','https:'].includes(url.protocol)) {
    throw new Error(`catalog ${field} must use HTTP(S): ${text}`);
  }
  return text;
}

export function validateLoonSourceEntry(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('catalog entry must be an object');
  }
  for (const field of REQUIRED) {
    if (!cleanString(input[field])) throw new Error(`catalog entry missing ${field}`);
  }

  const entry = {
    id: cleanString(input.id),
    file: safeRelativePath(input.file, 'file'),
    source: absoluteHttpUrl(input.source, 'source'),
    qx: safeRelativePath(input.qx, 'qx'),
    surge: safeRelativePath(input.surge, 'surge'),
    category: cleanString(input.category)
  };

  if (!/^[A-Za-z0-9._-]+$/.test(entry.id)) {
    throw new Error(`catalog id contains unsupported characters: ${entry.id}`);
  }
  if (!/\.lpx$/i.test(entry.file)) throw new Error(`catalog file must end in .lpx: ${entry.file}`);
  if (!/\.snippet$/i.test(entry.qx)) throw new Error(`catalog qx target must end in .snippet: ${entry.qx}`);
  if (!/\.sgmodule$/i.test(entry.surge)) throw new Error(`catalog surge target must end in .sgmodule: ${entry.surge}`);

  return Object.freeze(entry);
}

export function validateLoonSourceCatalog(input) {
  if (!Array.isArray(input)) throw new TypeError('Loon source catalog must be an array');
  const entries = input.map(validateLoonSourceEntry);
  const seen = {
    id:new Set(),
    file:new Set(),
    qx:new Set(),
    surge:new Set(),
  };
  for (const entry of entries) {
    for (const field of Object.keys(seen)) {
      const key=entry[field];
      if (seen[field].has(key)) throw new Error(`duplicate catalog ${field}: ${key}`);
      seen[field].add(key);
    }
  }
  return Object.freeze(entries);
}

export async function loadLoonSourceCatalog(file) {
  const raw=JSON.parse(await fs.readFile(file,'utf8'));
  return validateLoonSourceCatalog(raw);
}
