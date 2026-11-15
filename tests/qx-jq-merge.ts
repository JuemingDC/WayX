// Modified: 2026-11-15 (chance). Verify one native QX JQ owner, operation
// order, scopes, comments, phases and native-source integration using real jq.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {quoteJq} from "../src/parser/rewrite.ts";
import {mergeQxJsonJqRewriteLines as mergeQxJqRules} from "../src/validation/output.ts";
import {mergeNativeQxSources} from "../src/publish/workflow.ts";
const rule = (program: string, phase = "response", matcher = "^https://example.test/a", kind = "url") => `${matcher} ${kind} jsonjq-${phase}-body ${quoteJq(program)}`;
const programs = [
  'def change: .x += 1; change',
  '.x += 1',
  '.x += 1',
  '(.items[0], .items[1]) as $n | .x += $n',
  '.text = "O\u0027Reilly #keep"',
];
const rows = programs.flatMap((program, i) => [`# step ${i}`, rule(program)]);
const extra = [rule('.request = true', 'request'), rule('.other = true', 'response', '^https://example.test/b'), '# ' + rule('.disabled = true')];
const merged = mergeQxJqRules([...rows, ...extra]);
assert.equal(merged.length, programs.length + 1 + extra.length);
assert.deepEqual(merged.slice(-extra.length), extra);
assert.deepEqual(merged.filter(line => line.startsWith('# step')), rows.filter(line => line.startsWith('# step')));
assert.deepEqual(mergeQxJqRules(merged), merged);
const expression = merged.find(line => !line.startsWith('#') && line.includes('jsonjq-response-body'))!.split("jsonjq-response-body '")[1].slice(0, -1);
let input = '{"x":0,"items":[2,5]}';
for (const program of programs) {
  const result = spawnSync('jq', ['-c', program], {input, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  input = result.stdout;
}
const actual = spawnSync('jq', ['-c', expression], {input:'{"x":0,"items":[2,5]}', encoding:'utf8'});
assert.equal(actual.status, 0, actual.stderr);
assert.equal(actual.stdout, input);
// Different header predicates must not share an owner, including literal spaces.
const headers = [rule('.a=1', 'response', '^https://example.test/a ^GET  /a', 'url-and-header'), rule('.b=2', 'response', '^https://example.test/a ^GET /a', 'url-and-header')];
assert.deepEqual(mergeQxJqRules(headers), headers);
assert.equal(mergeQxJqRules([headers[0], headers[0]]).length, 1);
const native = mergeNativeQxSources([{url:'https://source.test/native.snippet', text: rows.join('\n')}], {name:'Merge'});
assert.equal(native.split('\n').filter(line => line.includes(' url jsonjq-response-body ')).length, 1);
assert.ok(native.includes('# step 4'));
assert.deepEqual(mergeQxJqRules([rule('.only=1')]), [rule('.only=1')]);
console.log('QX JQ grouping: order, repeated operations, streams, scopes, quoting, comments, phases, headers and native sources passed');
