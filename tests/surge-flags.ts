// Modified: 2026-11-01 (chance). Frozen flag corrections preserve byte identity
// outside known fields, reject ambiguity and stay idempotent without acquisition.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {restoreFrozenSurgeFlags} from '../src/application/surge-flags.ts';
import {loadLoonSourceCatalog} from '../src/parser/input.ts';
import {validateSurgeModule} from '../src/validation/output.ts';
import {targetRegexValidationInventory} from '../src/domain/core.ts';
import {validateIcuPatterns} from '../src/validation/icu.ts';
import {scriptReferences} from '../src/parser/backup-references.ts';
const source='[Rewrite]\nresponse if ${url} ~= /API/i then response.body.replace(/^a.b$/s,"hit")\n[Script]\nresponse if ${url} ~= /API/i then script("https://example.test/a.js")';
const target='[Body Rewrite]\nhttp-response API ^a.b$ hit\n[Script]\na = type=http-response,pattern=API,script-path=https://example.test/backup.js\n';
const out=restoreFrozenSurgeFlags(source,target);
assert.equal(out.changed,2); assert.deepEqual(out.unresolved,[]);
assert.ok(out.text.includes('http-response (?i)API (?s-m)^a.b$ hit'));
assert.ok(out.text.includes('pattern=(?i)API,script-path=https://example.test/backup.js'));
assert.equal(restoreFrozenSurgeFlags(source,out.text).text,out.text);
const ambiguous=restoreFrozenSurgeFlags(source+'\nresponse if ${url} ~= /API/ then script("https://example.test/b.js")',target);
assert.ok(ambiguous.unresolved.includes('API')); assert.ok(ambiguous.text.includes('pattern=API,'));
let fields=0, artifacts=0, conflicts=0;
for(const entry of await loadLoonSourceCatalog('.github/sources/loon.json')) {
  if(!entry.source.includes('kelee.one'))continue;
  const source=await fs.readFile('Resource/Loon/'+entry.file,'utf8');
  const target=await fs.readFile('Adblock/Surge/'+entry.surge,'utf8');
  const result=restoreFrozenSurgeFlags(source,target);
  assert.deepEqual(scriptReferences(result.text).map(r=>r.value),scriptReferences(target).map(r=>r.value));
  assert.equal(restoreFrozenSurgeFlags(source,result.text).text,result.text,entry.id+' must be idempotent');
  validateSurgeModule(result.text,entry);
  fields+=result.changed; artifacts+=Number(result.changed>0); conflicts+=result.unresolved.length;
}
validateIcuPatterns(targetRegexValidationInventory());
console.log(`Frozen Surge flag fixtures passed: ${fields} fields in ${artifacts} artifacts; ${conflicts} ambiguous fields; script addresses preserved`);
