// Modified: 2026-11-14 (chance). Compare original jq files against both emitted
// native inline programs using the official engine, including errors and streams.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { materializeConversionRunContext, convertPluginWithContext } from "../src/emit/conversion.ts";
import { minifyJqFile, quoteJq } from "../src/parser/rewrite.ts";
import { mergeQxJsonJqRewriteLines } from "../src/validation/output.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-jq-inline-"));
const entry = {id: "Inline", source: "https://example.test/main.lpx", file: "main.lpx", qx: "main.snippet", surge: "main.sgmodule", category: "Test"};
const cases = [
  '# comment\ndef total: reduce .[] as $n (0; . + $n);\n.sum = (.values | total) | del(.ads)',
  '# continued comment \\\n.hidden = 99\n.x = 1',
  String.raw`{text: "head \(if .x then " spaced # O'Reilly \("inner # ' ok")" else "no" end) tail"}`,
  String.raw`.text = "O'Reilly #keep \\ quote \" end"`,
  '(.x, .values[])',
  'empty',
  '.literal = "${not_a_loon_argument}"',
  'error("fixture error")',
  'delpaths([["values",0],["values",1]])',
  '.values |= map(select(. > 1)) | .count = (.values | length)',
];
const inputs = ['{"x":true,"ads":{},"values":[1,2,3]}', '{"x":false,"values":[]}', 'null'];
try {
  for (const program of cases) {
    const file = path.join(root, "filter.jq");
    await fs.writeFile(file, program);
    const source = '#!name=Inline\n[Rewrite]\nresponse if ${url} ~= /^https:\\/\\/example\\.test/i then response.json.jq_file("filter.jq")\n';
    const context = await materializeConversionRunContext(entry, source, {root, fetchText: async () => program});
    const out = convertPluginWithContext(entry, source, context, {stamp: "2026-11-14", rawBase: "https://raw.githubusercontent.com/JuemingDC/WayX/main"});
    assert.doesNotMatch(out.qx + out.surge, /JQ File:|Resource\/JQ|OMITTED|REVIEW REQUIRED|ISSUE REQUIRED/);
    assert.equal(out.generatedScripts.size, 0);
    assert.equal(out.generatedJqFiles, undefined);
    const qx = out.qx.split('\n').find((line: string) => / url jsonjq-response-body /.test(line))!;
    const surge = out.surge.split('\n').find((line: string) => /^http-response-jq /.test(line))!;
    assert.ok(qx, out.qx); assert.ok(surge, out.surge);
    assert.match(qx, /\(\?i\)/); assert.match(surge, /\(\?i\)/);
    for (const line of [qx, surge]) {
      const expression = line.slice(line.indexOf(" '") + 2, -1);
      assert.ok(expression); assert.ok(!expression.includes("\n"));
      for (const input of inputs) {
        const original = spawnSync("jq", ["-c", "-f", file], {input, encoding: "utf8"});
        const inline = spawnSync("jq", ["-c", expression], {input, encoding: "utf8"});
        assert.equal(inline.status, original.status, program + "\n" + inline.stderr);
        assert.equal(inline.stdout, original.stdout, program);
      }
    }
  }
  const nested = String.raw`"x \("a # O'Reilly")"`;
  assert.ok(quoteJq(minifyJqFile(nested)).includes("\\u0027"));
  const files = new Map<string,string>([["https://example.test/one.jq", ".x = 1"], ["https://example.test/two.jq", ".x += 2"]]);
  for (const phase of ["request", "response"]) {
    const source = `#!name=Order\n[Rewrite]\n${phase} if \${url} ~= /^https:\\/\\/example\\.test/ then ${phase}.json.jq_file("one.jq")\n${phase} if \${url} ~= /^https:\\/\\/example\\.test/ then ${phase}.json.jq_file("two.jq")\n`;
    const context = await materializeConversionRunContext(entry, source, {root, fetchText: async (url: string) => files.get(url)!});
    const out = convertPluginWithContext(entry, source, context, {stamp:"2026-11-14"});
    for (const target of ["qx", "surge"]) {
      const expressions = out[target].split('\n').filter((line: string) => target === "qx" ? line.includes(`url jsonjq-${phase}-body `) : line.startsWith(`http-${phase}-jq `)).map((line: string) => line.slice(line.indexOf(" '") + 2, -1));
      assert.equal(expressions.length, target === "qx" ? 1 : 2, out[target]);
      const result = spawnSync("jq", ["-c", target === "qx" ? expressions[0] : expressions.join(" | ")], {input:'{}', encoding:"utf8"});
      assert.equal(result.stdout.trim(), '{"x":3}');
    }
  }
  // Exact matcher, direction, and headers are required. Comments are kept,
  // and repeated stateful filters must still execute the same number of times.
  const increment = "^https://example\\.test/api$ url jsonjq-response-body '(.count += 1)'";
  const append = "^https://example\\.test/api$ url jsonjq-response-body '(.tags += [\"b\"])'";
  const grouped = mergeQxJsonJqRewriteLines([
    "# original rule A", increment,
    "# original rule B", "{# original inline note #} " + append,
    "# original rule C", increment,
  ]);
  const groupedActive = grouped.filter((line: string) => / url jsonjq-response-body /.test(line));
  assert.equal(groupedActive.length, 1, grouped.join("\n"));
  assert.ok(grouped.includes("# original rule A"));
  assert.ok(grouped.includes("# original rule B"));
  assert.ok(grouped.includes("# original rule C"));
  assert.ok(grouped.includes("# {# original inline note #}"));
  assert.deepEqual(mergeQxJsonJqRewriteLines(grouped), grouped, "jq merging is idempotent");
  const mergedProgram = groupedActive[0].slice(groupedActive[0].indexOf(" '") + 2, -1);
  const checked = spawnSync("jq", ["-c", mergedProgram], {
    input: '{"count":0,"tags":[]}', encoding: "utf8",
  });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(checked.stdout.trim(), '{"count":2,"tags":["b"]}');

  // An intervening executable rewrite or a distinct request/response phase
  // is a barrier even if a different regex might overlap the same URL.
  const barrier = "^https://example\\.test/ url reject";
  assert.deepEqual(
    mergeQxJsonJqRewriteLines([increment, barrier, increment]),
    [increment, barrier, increment],
  );
  const request = "^https://example\\.test/api$ url jsonjq-request-body '(.count += 1)'";
  assert.deepEqual(mergeQxJsonJqRewriteLines([increment, request]), [increment, request]);
  const headerRule = "^https://example\\.test/api$ ^GET[ ] url-and-header jsonjq-response-body '(.count += 1)'";
  assert.deepEqual(mergeQxJsonJqRewriteLines([increment, headerRule]), [increment, headerRule]);
  assert.deepEqual(mergeQxJsonJqRewriteLines([increment, append.replace("/api$", "/other$")]), [increment, append.replace("/api$", "/other$")]);
} finally {
  await fs.rm(root, {recursive: true, force:true});
}
console.log("jq file/inline differential and QX same-matcher jq consolidation passed");
