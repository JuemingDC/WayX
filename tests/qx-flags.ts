// Modified: 2026-11-05 (chance). Restore frozen Loon→QX flags without changing
// script URLs, author comments, action order, native QX or source snapshots.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { restoreFrozenQxFlags } from "../src/application/qx-flags.ts";
import { loadLoonSourceCatalog } from "../src/parser/input.ts";
import { validateQX } from "../src/validation/output.ts";
import {
  targetRegexValidationInventory,
  compileRegexForTarget,
} from "../src/domain/core.ts";
import { validateIcuPatterns, replaceIcu } from "../src/validation/icu.ts";
import { scriptReferences } from "../src/parser/backup-references.ts";
import { mergeNativeQxSources } from "../src/publish/workflow.ts";

const source =
  '[Rewrite]\nresponse if ${url} ~= /API/i then response.body.replace(/^a.b$/is,"hit")\nrequest if ${url} ~= /HEAD/i then request.header.replace("X-Test", /abc/i,"ok")\n[Script]\nresponse if ${url} ~= /API/i then script("https://example.test/a.js")';
const target =
  "# Author comment\n# [rewrite_local]\n# [WayX] COMPATIBILITY LIMITATION: native URL matcher temporarily omits Loon flags i; user-authorized compatibility downgrade; matching semantics may differ.\nAPI url response-body (?s)^a.b$ response-body hit\nHEAD url request-header (?m)^((?i:X-Test):[\\t\\x20]*[^\\r\\n]*?)((?:abc)) request-header $1ok\nAPI url script-response-body https://example.test/backup.js\n# [mitm]\nhostname = example.test\n";
const out = restoreFrozenQxFlags(source, target);
assert.equal(out.changed, 3);
assert.deepEqual(out.unresolved, []);
assert.ok(
  out.text.includes("(?i)API url response-body (?is)^a.b$ response-body hit"),
);
assert.ok(out.text.includes("((?i:abc)) request-header $1ok"));
assert.ok(out.text.includes("(?i)HEAD url request-header"));
assert.ok(
  out.text.includes(
    "(?i)API url script-response-body https://example.test/backup.js",
  ),
);
assert.ok(out.text.startsWith("# Author comment\n# [rewrite_local]\n"));
assert.doesNotMatch(out.text, /temporarily omits/);
assert.equal(restoreFrozenQxFlags(source, out.text).text, out.text);
assert.deepEqual(
  scriptReferences(out.text).map((r) => r.value),
  scriptReferences(target).map((r) => r.value),
);
const ambiguous = restoreFrozenQxFlags(
  source +
    '\nresponse if ${url} ~= /API/ then script("https://example.test/b.js")',
  target,
);
assert.ok(ambiguous.unresolved.includes("API"));
assert.ok(ambiguous.text.includes("\nAPI url script-response-body"));

for (const flags of ["", "i", "m", "s", "im", "is", "ms", "ims"])
  for (const subject of ["url", "header", "body", "script"]) {
    const regex = compileRegexForTarget(
      { type: "regex", pattern: "^a.b$", flags },
      { target: "qx", subject, requireEquivalent: true },
    );
    assert.ok(regex.ok);
    for (const input of [
      "a.b",
      "A.B",
      "a\nb",
      "before\na.b\nafter",
      "before\nA\nB\nafter",
    ])
      assert.equal(
        replaceIcu(regex.pattern, "hit", input),
        input.replace(new RegExp("^a.b$", flags + "g"), "hit"),
      );
  }

const nativeLines = [
  "(?ims)^https://example.com/a url reject",
  "^https://example.com/b url response-body (?i:ads) response-body ok",
  "hostname = example.com",
];
const native = mergeNativeQxSources(
  [
    {
      url: "https://example.test/native.conf",
      text: "# Original native comment\n" + nativeLines.join("\n"),
    },
  ],
  { name: "native", author: "upstream", stamp: "fixed" },
);
for (const line of nativeLines) assert.ok(native.split("\n").includes(line));
assert.ok(native.includes("# Original native comment"));

let fields = 0,
  artifacts = 0;
for (const entry of await loadLoonSourceCatalog(".github/sources/loon.json")) {
  if (!entry.source.includes("kelee.one")) continue;
  const source = await fs.readFile("Resource/Loon/" + entry.file, "utf8");
  const target = await fs.readFile("Adblock/Quantumult X/" + entry.qx, "utf8");
  const result = restoreFrozenQxFlags(source, target);
  assert.deepEqual(result.unresolved, [], entry.id);
  assert.deepEqual(
    scriptReferences(result.text).map((r) => r.value),
    scriptReferences(target).map((r) => r.value),
  );
  assert.equal(
    restoreFrozenQxFlags(source, result.text).text,
    result.text,
    entry.id,
  );
  validateQX(result.text, entry);
  fields += result.changed;
  artifacts += Number(result.changed > 0);
}
validateIcuPatterns(targetRegexValidationInventory());
console.log(
  `QX source flags passed: ${fields} frozen rules in ${artifacts} artifacts; native QX and script addresses preserved`,
);
