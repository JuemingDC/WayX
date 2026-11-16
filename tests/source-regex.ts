// Modified: 2026-11-16 (chance). Reproduce issue #517 through source review and
// both native planners; retain atomic backtracking semantics and reject bad ICU.
import assert from "node:assert/strict";
import {
  convertPlugin,
  parseRewriteV2,
  validateRewriteV2Ast,
  renderMixedRewriteScript,
  parseLoonPlugin,
} from "../src/index.ts";
import { collectIssueCandidates } from "../src/application/propose-conversion-issues.ts";
import { prepareRewriteDeclarations } from "../src/parser/input.ts";
import { replaceIcu, validateIcuPattern } from "../src/validation/icu.ts";

const patterns = [
  String.raw`^https?:\/\/mapi\.dianping\.com\/mapi\/operating\/(?>indexopsmodules|loadsplashconfig)`,
  String.raw`^https?:\/\/ddplus\.meituan\.net\/v\d\/mss_\w+\/(?>ehc|titansx|ddblue|edfu)\/`,
];
const source =
  "#!name=Atomic Regex\n[Rewrite]\n" +
  patterns
    .map(
      (pattern) => "request if ${url} ~= /" + pattern + "/i then reject(404)",
    )
    .join("\n") +
  "\n";
const parsed = parseLoonPlugin(source);
const declarations = prepareRewriteDeclarations(parsed);
for (const declaration of declarations.values()) {
  assert.equal(declaration.error, undefined);
  if (declaration.ast) validateRewriteV2Ast(declaration.ast);
}
const out = convertPlugin(
  {
    id: "AtomicFixture",
    file: "AtomicFixture.lpx",
    category: "Adblock",
    source: "https://example.test/AtomicFixture.lpx",
    qx: "AtomicFixture.snippet",
    surge: "AtomicFixture.sgmodule",
  },
  source,
  {
    stamp: "2026-11-16",
    rawBase: "https://example.test",
    parsed,
    declarations,
  },
);
for (const pattern of patterns) {
  assert.ok(out.qx.includes("(?i)" + pattern + " url reject"));
  assert.ok(out.surge.includes("(?i)" + pattern + " _ reject"));
}
assert.equal(out.generatedScripts.size, 0);
assert.throws(
  () =>
    validateRewriteV2Ast(
      parseRewriteV2("request if ${url} ~= /^(?>a|ab)c$/ then reject(404)"),
      { regexEngine: "javascript" },
    ),
  /Invalid group/,
);
assert.doesNotMatch(out.qx + out.surge, /REVIEW|Invalid group/);
assert.throws(() => renderMixedRewriteScript(parseRewriteV2(
  'response if ${url} ~= /^(?>a|ab)c$/ then response.header.set("X", "1") | response.body.replace(/a/, "b")'
), {target:"surge"}), /Invalid group/);
// Atomic grouping cannot be replaced with a noncapturing group.
assert.equal(replaceIcu("^(?>a|ab)c$", "hit", "abc"), "abc");
assert.equal(replaceIcu("^(?:a|ab)c$", "hit", "abc"), "hit");
for (const pattern of ["(?>a|b", "[abc", "a{3,2}", "(?q)abc"]) {
  assert.throws(() =>
    validateRewriteV2Ast(
      parseRewriteV2("request if ${url} ~= /" + pattern + "/ then reject(404)"),
    ),
  );
}
for (const pattern of ["(?i)^(?>a|ab)c$", "^a++b$", String.raw`^\p{L}+$`])
  validateIcuPattern(pattern, "source regression");
assert.throws(() =>
  validateRewriteV2Ast(
    parseRewriteV2("request if ${url} ~= /abc/ii then reject(404)"),
  ),
);
console.log(
  "Source regex: issue #517, native QX/Surge outputs, atomic semantics and invalid ICU rejection passed",
);

const issues = await collectIssueCandidates({
  catalog: [
    {
      id: "AtomicFixture",
      file: "AtomicFixture.lpx",
      source: "https://example.test/AtomicFixture.lpx",
    },
  ],
  sourceOverrides: new Map([["AtomicFixture", source]]),
  includeTargets: false,
  includeSyncFailures: false,
});
assert.deepEqual(issues.targetProblems, []);
