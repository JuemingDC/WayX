// Modified: 2026-11-02 (chance). Prove fresh Object.assign completion shapes
// independently of HTTP flow; never mutate author expressions or rely on getters.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript as plan } from "../src/parser/universal-script.ts";
const cases = [
  '$done(Object.assign({}, {body:$response.body+"!"}));',
  'const base={body:"old"};const result=Object.assign({},base,{body:$response.body+"!"});$done(result);',
  'function fields(){return {body:$response.body+"!"}}$done(Object.assign({},fields()));',
  'const result=Object.assign({},$response.body?{body:$response.body+"!"}:{body:"missing"});$done(result);',
];
for (const source of cases) {
  const p = plan(source, "loon", [{ phase: "response" }]);
  assert.equal(p.status, "universal", JSON.stringify(p.problems));
  for (const host of ["qx", "surge", "loon"]) {
    let result: any;
    vm.runInNewContext(p.code!, {
      setTimeout,
      $response: { body: "same" },
      $done: (v: any) => (result = v),
      ...(host === "qx"
        ? { $task: { fetch() {} } }
        : host === "loon"
          ? { $loon: "actual" }
          : { $environment: { "surge-version": "actual" } }),
    });
    assert.equal(result.body, "same!");
    assert.ok(p.code!.includes(source), "author expression must stay intact");
  }
}
for (const source of [
  '$done(Object.assign(existing,{body:"x"}));',
  "$done(Object.assign({},unknown));",
  "$done(Object.assign({},...unknown));",
  '$done(Object.assign({},{get body(){return "x"}}));',
  '$done(Object.assign({},{__proto__:{body:"x"}}));',
  '$done(Object.assign({},{[unknown]:"x"}));',
  'const O=Object;O.assign=()=>({body:"bad"});$done(Object.assign({},{body:"x"}));',
  'Object.assign=()=>({body:"bad"});$done(Object.assign({},{body:"x"}));',
  'const base={body:"x"};leak(base);$done(Object.assign({},base));',
])
  assert.equal(
    plan(source, "loon", [{ phase: "response" }]).status,
    "blocked",
    source,
  );
console.log(
  "Completion construction class passed: fresh Object.assign dictionaries, ordered overrides, closed factories/conditions, original expressions and prototype/getter/escape negatives on all required hosts",
);

const synthetic =
  '$done(Object.assign({}, {response:{status:201,body:"made"}}));';
const echo = plan(synthetic, "loon", [{ phase: "request" }]);
assert.equal(echo.status, "universal", JSON.stringify(echo.problems));
assert.equal(echo.contexts.request.qx.phase, "echo");
for (const host of ["qx", "surge", "loon"]) {
  let result: any;
  vm.runInNewContext(echo.code!, {
    setTimeout,
    $request: { url: "https://a.test/" },
    $done: (v: any) => (result = v),
    ...(host === "qx"
      ? { $task: { fetch() {} } }
      : host === "loon"
        ? { $loon: "actual" }
        : { $environment: { "surge-version": "actual" } }),
  });
  if (host === "qx") {
    assert.equal(result.status, "HTTP/1.1 201 Created");
    assert.equal(result.body, "made");
  } else {
    assert.equal(result.response.status, 201);
    assert.equal(result.response.body, "made");
  }
}
