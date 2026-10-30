// Modified: 2026-10-30 (chance). Validate the TypeScript boundaries and resolve
// actual imports rather than requiring obsolete Python/module filenames.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {listFiles} from '../src/publish/transaction.ts';
const layers=['application','domain','ingest','parser','emit','validation','publish'];
for(const layer of layers)assert.ok((await fs.stat('src/'+layer)).isDirectory());
for(const file of await listFiles('src')){
 assert.ok(file.endsWith('.ts'),file);
 const text=await fs.readFile('src/'+file,'utf8');
 assert.doesNotMatch(text,/@ts-nocheck|@ts-ignore|python-urllib|spawnSync\(['"]python/);
 for(const [,reference]of text.matchAll(/(?:from\s*|import\s*\()\s*['"](\.[^'"]+)['"]/g)){
  const dependency=path.resolve('src',path.dirname(file),reference);
  assert.ok((await fs.stat(dependency)).isFile(),file+' -> '+reference);
  if(file.startsWith('domain/'))assert.ok(dependency.includes('/src/domain/'),'pure domain cannot import IO/orchestration');
 }
}
const workflow=await fs.readFile('.github/workflows/converter-check.yml','utf8');
assert.doesNotMatch(workflow,/setup-python|automation\.py/);assert.match(workflow,/npm ci/);assert.match(workflow,/node src\/cli\.ts gate/);
assert.match(workflow,/steps\.loon_sync\.outputs\.publishable == 'true'/);assert.match(workflow,/cancel-in-progress: false/);
assert.match(workflow,/cron: '30 17 \* \* \*'/);
const spec=await fs.readFile('.github/CONVERSION_SPEC.md','utf8');
for(const requirement of ['Semantic IR','false negative','native-equivalent','crossutility/Quantumult-X','manual.nssurge.com'])assert.ok(spec.includes(requirement),requirement);
console.log('TypeScript architecture: imports, pure domain, workflow gates and normative semantics passed');
