// Modified: 2026-11-02 (chance). Compare source-host branch specialization with
// the source program, including hoisting, shadowing and side-effect boundaries.
import assert from "node:assert/strict";
import vm from "node:vm";
import { specializeScript } from "../src/parser/script-specialize.ts";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
const source =
  'const qx=typeof $task!=="undefined";if(qx){var hidden=1;$task.fetch({});}else{$done({body:typeof hidden+":"+$response.body});}';
const lowered = specializeScript(source, "loon");
assert.ok(lowered.folds);
assert.doesNotMatch(lowered.source, /\$task\.fetch/);
assert.match(lowered.source, /var hidden/);
let result: any;
vm.runInNewContext(lowered.source, {
  $response: { body: "x" },
  $done: (v: any) => (result = v),
});
assert.equal(result.body, "undefined:x");
assert.equal(
  specializeScript(
    'function f($task){if(typeof $task!=="undefined")return 1;return 2;}',
    "loon",
  ).folds,
  0,
);
assert.equal(
  specializeScript("const x=f();if(x){$done();}else{$done({});}", "loon").folds,
  0,
);
const annex = specializeScript(
  'if(typeof $task!=="undefined"){function f(){}}$done({body:typeof f});',
  "loon",
);
assert.match(
  annex.source,
  /if/,
  "Annex B function hoisting needs its own proof",
);
const observed =
  "function f(){return typeof $task} $done({body:f.toString()});";
assert.equal(specializeScript(observed, "loon").source, observed);
const pureMethod =
  'class Env{get isQx(){return typeof $task!=="undefined"}}const env=new Env();if(env.isQx){$task.fetch({});}else{$done({body:$response.body});}';
assert.match(
  specializeScript(pureMethod, "loon").source,
  /\$task\.fetch/,
  "getter receiver identity is not proven",
);
const mutated = pureMethod.replace(
  "if(env.isQx)",
  "env.isQx=unknown;if(env.isQx)",
);
assert.match(specializeScript(mutated, "loon").source, /\$task\.fetch/);
const plan = planUniversalAdblockScript(source, "loon", [
  { phase: "response" },
]);
assert.equal(plan.status, "universal", JSON.stringify(plan.problems));
for (const target of ["qx", "surge", "loon"]) {
  vm.runInNewContext(plan.code!, {
    setTimeout,
    $response: { body: "x" },
    $done: (v: any) => (result = v),
    ...(target === "qx"
      ? {
          $task: {
            fetch() {
              throw Error("dead branch executed");
            },
          },
        }
      : target === "loon"
        ? { $loon: "test" }
        : { $environment: { "surge-version": "test" } }),
  });
  assert.equal(result.body, "undefined:x");
}
console.log(
  "Source-host specialization passed: dead foreign branches, hoisted vars, lexical shadows, unknown conditions, Annex B, source observations and unresolved class receiver guards",
);

for (const tricky of [
  "if(x){$done()}const x=true;",
  "function f(){if(x)$done()}f();const x=true;",
  "const x={};if(make().isQx)$task.fetch({});",
  '$task={};if(typeof $task!=="undefined")$task.fetch({});',
]) {
  assert.match(specializeScript(tricky, "loon").source, /if/, tricky);
}

// Modified: 2026-11-02 (chance). Folding a conditional callee must not bind this.
const receiver =
  'class C{m(){return this===undefined}}const obj=new C();$done({body:(typeof $task==="undefined"?obj.m:obj.m)()});';
let native: any, compiled: any;
vm.runInNewContext(receiver, { $done: (v: any) => (native = v) });
vm.runInNewContext(specializeScript(receiver, "loon").source, {
  $done: (v: any) => (compiled = v),
});
assert.equal(compiled.body, native.body);
assert.equal(compiled.body, true);

// Modified: 2026-11-02 (chance). Preserve function source under implicit
// string coercion, and do not specialize bodies exposed to an unknown caller.
for (const text of [
  'function f () { return 1; } if(typeof $task!=="undefined")$task.fetch({});else $done({body:""+f});',
  'function f () { return typeof $task; } if(typeof $task!=="undefined")$task.fetch({});else $done({body:[f].join("")});',
]) {
  let before: any, after: any;
  vm.runInNewContext(text, { $done: (v: any) => (before = v) });
  vm.runInNewContext(specializeScript(text, "loon").source, {
    $done: (v: any) => (after = v),
  });
  assert.equal(after.body, before.body);
}

assert.match(
  specializeScript("$done({body:1e999||0});", "loon").source,
  /1e999/,
  "nonfinite numeric literals must not become JSON null",
);
