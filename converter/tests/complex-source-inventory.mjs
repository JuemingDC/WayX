import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isRewriteV2, parseRewriteV2 } from '../src/rewrite-v2.mjs';
import { validateRewriteV2Ast } from '../src/rewrite-v2-actions.mjs';
import { complexRewriteSignature, OBSERVED_COMPLEX_REWRITE_TYPES } from '../src/complex-rewrite-types.mjs';

const ROOT = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, '.github/sources/loon.json'), 'utf8'));
const registered = new Set(OBSERVED_COMPLEX_REWRITE_TYPES.map(type => type.actions.join(' | ')));
const found = new Map();

function activeRewriteLines(text) {
  const out = [];
  let section = null;
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = raw.trim();
    const header = trimmed.match(/^\[([^\]]+)\]$/);
    if (header) {
      section = header[1];
      continue;
    }
    if (section !== 'Rewrite' || !trimmed || /^(?:#|;|\/\/)/.test(trimmed)) continue;
    out.push(trimmed);
  }
  return out;
}

for (const entry of manifest) {
  const file = path.join(ROOT, 'Resource/Loon', entry.file);
  const source = await fs.readFile(file, 'utf8');
  for (const line of activeRewriteLines(source)) {
    if (!isRewriteV2(line)) continue;
    const ast = parseRewriteV2(line);
    validateRewriteV2Ast(ast);
    if (ast.actions.length < 2) continue;
    const signature = complexRewriteSignature(ast);
    if (!found.has(signature)) found.set(signature, []);
    found.get(signature).push({id:entry.id, file:entry.file, line});
  }
}

assert.ok(found.size > 0, 'expected at least one real source-authored complex Rewrite signature');
for (const [signature, evidence] of found) {
  assert.ok(
    registered.has(signature),
    'unregistered source-authored complex Rewrite signature: ' + signature + '\n' +
      evidence.map(item => item.file + ': ' + item.line).join('\n'),
  );
}

assert.ok(
  found.has('response.body.mock | response.header.set'),
  'current Source Catalog should retain the observed mock + header-set complex type',
);

console.log('Observed complex Rewrite inventory:');
for (const [signature, evidence] of found) console.log('- ' + signature + ': ' + evidence.length);
