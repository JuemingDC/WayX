// Modified: 2026-11-14 (chance). Compare original jq files against both emitted
// native inline programs using the official engine, including errors and streams.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { materializeConversionRunContext, convertPluginWithContext } from "../src/emit/conversion.ts";
import { minifyJqFile, quoteJq } from "../src/parser/rewrite.ts";
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
      assert.equal(expressions.length, 2, out[target]);
      const result = spawnSync("jq", ["-c", expressions.join(" | ")], {input:'{}', encoding:"utf8"});
      assert.equal(result.stdout.trim(), '{"x":3}');
    }
  }
} finally {
  await fs.rm(root, {recursive: true, force:true});
}
console.log("jq file/inline differential: both clients, nested strings, continued comments, streams, errors, phases and order passed");
