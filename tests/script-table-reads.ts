// Modified: 2026-11-02 (chance). Unrelated delayed readonly table uses cannot
// invalidate a proven top-level field lookup; writes/escapes remain blockers.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
const source =
  'var words=["body","replace","message"];var body=$response[words[0]][words[1]](/advert/g,"clean");$done({body});function message(){return words[2];}';
const p = planUniversalAdblockScript(source, "qx", [{ phase: "response" }]);
assert.equal(p.status, "universal", JSON.stringify(p.problems));
assert.deepEqual(Object.keys(p.contexts.response), ["qx", "surge"]);
for (const host of ["qx", "surge"]) {
  let output: any;
  vm.runInNewContext(p.code!, {
    setTimeout,
    $response: { body: "advert / keep" },
    $done: (v: any) => (output = v),
    ...(host === "qx"
      ? { $task: { fetch() {} } }
      : { $environment: { "surge-version": "actual" } }),
  });
  assert.equal(output.body, "clean / keep");
}
for (const suffix of [
  'function mutate(){words[0]="headers";}',
  '[words[0]]=["headers"];',
  '({value:words[0]}={value:"headers"});',
  '({...words[0]}={value:"headers"});',
  '(words[0])="headers";',
  'for(words[0] of ["headers"]){}',
  "function escape(){leak(words);}",
  'function reflect(){Object.defineProperty(words,"0",{get(){return "headers"}})}',
  "function unknown(){return words[index];}",
  "function remove(){delete words[0];}",
  'function alias(){const a=words;a[0]="headers";}',
])
  assert.equal(
    planUniversalAdblockScript(source + suffix, "qx", [{ phase: "response" }])
      .status,
    "blocked",
    suffix,
  );
assert.equal(
  planUniversalAdblockScript(
    'function result(){return $response[words[0]];}var words=["body"];$done({body:result()});',
    "qx",
    [{ phase: "response" }],
  ).status,
  "blocked",
);
console.log(
  "String-table read proofs passed: one shared QX/Surge program, unrelated delayed readonly uses, and mutations/escapes/unknown or delayed queried accesses remain blocked",
);
