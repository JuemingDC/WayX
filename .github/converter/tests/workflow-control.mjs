// Workflow control-boundary regression contract.
// Author: chance
// Category: Converter / Workflow Architecture Test

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=process.cwd();
const sync=await fs.readFile(path.join(ROOT,'.github/scripts/sync-convert.mjs'),'utf8');
const canonical=await fs.readFile(path.join(ROOT,'.github/converter/tools/regenerate-canonical.mjs'),'utf8');
const managed=await fs.readFile(path.join(ROOT,'.github/converter/src/managed-artifacts.mjs'),'utf8');

assert.match(sync,/for \(const entry of manifest\)/,'sync must retain its own Catalog entry lifecycle');
assert.match(canonical,/for \(const entry of manifest\)/,'canonical must retain its own Catalog entry lifecycle');
assert.equal(/runCatalogEntries|processCatalogEntries|sharedCatalogLoop/.test(sync+canonical),false,
  'workflow entry lifecycles must not be forced through a shared loop abstraction');

assert.match(managed,/export function managedTargetDiffs\(state, out\)/,
  'managed artifact layer must own the pure target-diff primitive');
assert.match(sync,/managedTargetDiffs\(targetState,out\)\.some\(target =>/,
  'sync must reuse target diffs only for its existing-target drift check');
assert.match(sync,/target === 'qx' \? Boolean\(oldQx\) : Boolean\(oldSg\)/,
  'sync drift refresh must continue to ignore missing-target recovery');
assert.match(sync,/const helperChanges = await syncGeneratedScripts\(/,
  'sync must retain helper write results for status reporting');
assert.match(sync,/targetChanges\.length \|\| helperChanges\.length \|\| changed/,
  'helper-only repair must not be reported as fully unchanged');

assert.match(canonical,/const staleEntries = \[\]/,
  'canonical result tracking must name pre-write differences as stale entries');
assert.match(canonical,/const targetDiffs = managedTargetDiffs\(targetState,out\)/,
  'canonical stale detection must reuse the shared target-diff primitive');
assert.match(canonical,/const differs = targetDiffs\.length > 0 \|\| helperDiffs\.length > 0/,
  'canonical stale result must include both targets and generated helpers');
assert.match(canonical,/Stale canonical entries: ' \+ staleEntries\.join/,
  'canonical check-mode stale reporting must remain workflow-specific');

console.log('Workflow lifecycle/result boundary contract passed');
