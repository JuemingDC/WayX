// Modified: 2026-11-02 (chance). Source counts must not multiply by target/profile,
// hide unknown blockers, or mistake one removed issue for an unlocked program.
import assert from "node:assert/strict";
import {
  scriptApiMapping,
  scriptConversionPriorities,
} from "../src/parser/script-api-mapping.ts";
const d = (sourceUrl: string, apis: string[], status = "blocked") => ({
  sourceUrl,
  status,
  problems: apis.map((api) => ({ api })),
});
const result = scriptConversionPriorities([
  d("a", ["$done", "$task"]),
  d("a", ["$task"]),
  d("b", ["$done"]),
  d("c", ["unknown-future-api"]),
  d("d", ["$done"], "universal"),
  d("e", ["$task"], "excluded"),
  d("f", []),
]);
assert.equal(result.blockedSources, 4);
const family = (id: string) => result.families.find((f) => f.family === id)!;
assert.equal(family("completion").affectedSources, 2);
assert.deepEqual(family("completion").singleFamilyCandidates, ["b"]);
assert.deepEqual(family("completion").coBlockers, { http: 1 });
assert.deepEqual(family("http").singleFamilyCandidates, []);
assert.equal(family("other").affectedSources, 2);
assert.equal(
  new Set(scriptApiMapping.map((m) => m.id)).size,
  scriptApiMapping.length,
);
for (const m of scriptApiMapping)
  for (const dependency of m.dependsOn)
    assert.ok(scriptApiMapping.some((x) => x.id === dependency));
console.log(
  "Script API mapping priorities passed: distinct source/profile union, co-blockers, candidates, unknown issues and excluded scope",
);
