// Modified: 2026-11-15 (chance). Source JSON/JQ pipelines lower once for both
// clients; verify order and dependency indices without merging distinct rules.
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {convertPlugin, convertPluginWithContext, materializeConversionRunContext} from "../src/emit/conversion.ts";
import {mergeNativeQxSources} from "../src/publish/workflow.ts";
const entry = {id:"SourcePipeline", source:"https://example.test/main.lpx", category:"Test", file:"main.lpx", qx:"main.snippet", surge:"main.sgmodule"};
const options = {stamp:"2026-11-15", rawBase:"https://raw.githubusercontent.com/JuemingDC/WayX/main"};
const declaration = (phase: string, actions: string[]) => `${phase} if \${url} ~= /^https:\\/\\/example\\.test\\/api$/i then ${actions.join(' | ')}`;
const rules = (text: string, target: string, phase: string) => text.split('\n').filter(line => !line.startsWith('#') && (target === 'qx' ? line.includes(`url jsonjq-${phase}-body `) : line.startsWith(`http-${phase}-jq `)));
const expression = (line: string) => line.slice(line.indexOf(" '") + 2, -1);
const evaluate = (program: string, input: string) => {
  const result = spawnSync('jq', ['-c', program], {input, encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
for (const phase of ['request', 'response']) for (const section of ['Rewrite', 'Script']) {
  const actions = [
    `${phase}.json.add("added",true)`,
    `${phase}.json.jq(\`def bump: .x += 1; bump | .x += 1\`)`,
    `${phase}.json.replace("count",3)`,
    `${phase}.json.delete(["ads","old"])`,
  ];
  const source = `#!name=SourcePipeline\n[${section}]\n# author comment\n` + declaration(phase, actions);
  const out = convertPlugin(entry, source, options);
  for (const target of ['qx','surge']) {
    const active = rules(out[target], target, phase);
    assert.equal(active.length, 1, out[target]);
    assert.doesNotMatch(out[target], /REVIEW REQUIRED|OMITTED/);
    assert.ok(out[target].includes('# author comment'));
    assert.equal(evaluate(expression(active[0]), '{"x":0,"ads":1,"old":2}'), '{"x":2,"added":true,"count":3}');
  }
  assert.equal(out.generatedScripts.size, 0);
  // Repeated URL conditions in separate declarations remain distinct.
  const independent = convertPlugin(entry, `[${section}]\n` + actions.slice(0,2).map(action => declaration(phase,[action])).join('\n'), options);
  assert.equal(rules(independent.qx,'qx',phase).length,1);
  assert.equal(rules(independent.surge,'surge',phase).length,2);
  // A mixed declaration that requires two target rules stays diagnostic-only.
  const mixed = convertPlugin(entry, `[${section}]\n` + declaration(phase,[...actions,'script("https://example.test/original.js") with requires_body=true,tag="Original"']), options);
  for (const target of ['qx','surge']) {
    assert.equal(rules(mixed[target],target,phase).length,0,mixed[target]);
    assert.match(mixed[target], /REVIEW REQUIRED.*one equivalent target rule/);
    assert.doesNotMatch(mixed[target], /^[^#\n]*original\.js/m);
  }
  // Dependencies at indices 1 and 3 must stay associated with their own actions.
  const fileActions = [`${phase}.json.add("x",1)`,`${phase}.json.jq_file("one.jq")`,`${phase}.json.delete("ads")`,`${phase}.json.jq_file("two.jq")`];
  const fileSource = `[${section}]\n` + declaration(phase,fileActions);
  const context = await materializeConversionRunContext(entry,fileSource,{root:process.cwd(), fetchText:async (url: string) => url.endsWith('one.jq') ? '.x += 2' : '.x *= 3'});
  const files = convertPluginWithContext(entry,fileSource,context,options);
  for (const target of ['qx','surge']) {
    const active = rules(files[target],target,phase);
    assert.equal(active.length,1,files[target]);
    assert.equal(evaluate(expression(active[0]),'{"ads":1}'),'{"x":9}');
  }
}
// Parentheses preserve streams, comma precedence and local definitions.
const streams = convertPlugin(entry,'[Rewrite]\n' + declaration('response',[
  'response.json.jq(`def next: . + 1; (1,2) | next`)',
  'response.json.jq(`. * 10`)',
]),options);
for (const target of ['qx','surge']) {
  const active = rules(streams[target],target,'response');
  assert.equal(active.length,1);
  assert.equal(evaluate(expression(active[0]),'null'),'20\n30');
}
// Indexed deletions must remain sequential within the one source declaration.
const indexed = convertPlugin(entry,'[Rewrite]\n' + declaration('response',[
  'response.json.delete("items[0]")', 'response.json.delete("items[1]")',
  'response.json.jq(`.items += [9]`)',
]),options);
for (const target of ['qx','surge']) {
  const active = rules(indexed[target],target,'response');
  assert.equal(active.length,1);
  assert.equal(evaluate(expression(active[0]),'{"items":[0,1,2,3]}'),'{"items":[1,3,9]}');
}
// A failed file dependency cannot publish only a fragment of its source pipeline.
const brokenSource = '[Rewrite]\n' + declaration('response',[
  'response.json.add("before",true)', 'response.json.jq_file("missing.jq")',
  'response.json.replace("after",true)',
]);
const brokenContext = await materializeConversionRunContext(entry,brokenSource,{root:process.cwd(), fetchText:async () => {throw Error('fixture missing');}});
const broken = convertPluginWithContext(entry,brokenSource,brokenContext,options);
for (const target of ['qx','surge']) {
  assert.equal(rules(broken[target],target,'response').length,0);
  assert.match(broken[target], /REVIEW REQUIRED.*fixture missing/);
}
// Native QX source text and distinct declarations are no longer post-merged.
const native = "^https://example.test/api url jsonjq-response-body '.x += 1'\n# author note\n^https://example.test/api url jsonjq-response-body '.x += 2'\n";
assert.ok(mergeNativeQxSources([{url:'https://source.test/a.snippet',text:native}],{name:'Native'}).includes(native));
console.log('Source JSON/JQ pipelines: QX/Surge, both phases/sections, source order, mixed Scripts, dependency indices, streams and source URL groups passed');
