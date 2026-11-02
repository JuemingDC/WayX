// Modified: 2026-11-02 (chance). Prove closed context/result/string bindings
// across the same three-host bytes, with alias, mutation and prototype counterexamples.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
import {
  planScriptApiConversion,
  inspectScriptApis,
} from "../src/parser/script-api.ts";
const contexts = (to: string, extra: any = {}) => ({
  setTimeout,
  $request: { url: "http://fixture", body: "input", method: "GET" },
  $response: { body: "hello", headers: { "Content-Type": "text/plain" } },
  ...(to === "qx"
    ? {
        $task: { fetch() {} },
        $prefs: {
          valueForKey() {
            return undefined;
          },
          setValueForKey() {
            return true;
          },
          removeValueForKey() {
            return true;
          },
        },
      }
    : {
        $persistentStore: {
          read() {
            return null;
          },
          write() {
            return true;
          },
        },
        ...(to === "loon"
          ? { $loon: "test" }
          : { $environment: { "surge-version": "test" } }),
      }),
  ...extra,
});
const examples = [
  "const r=$response;const q=$request;if(!q||!r)$done({});else $done({body:r.body+q.method});",
  "if($request&&$response){$done({body:$response.body});}else $done({});",
  "function result(value){return {body:value}}$done(result($response.body));",
  "const result=value=>value?{body:$response.body}:{};$done(result(true));",
  "function result(){let out={};out.body=$response.body;return out;}$done(result());",
  "const body={body:$response.body};$done({...body});",
  'function base(){return {body:$response.body}}const out={...base()};out.body=out.body+"!";$done(out);',
  'const r=$response;const h=r.headers;const key=Object.keys(h).find(k=>k.toLowerCase()==="content-type");$done({body:key===undefined?"absent":h[key]});',
];
for (const source of examples) {
  const plan = planUniversalAdblockScript(source, "loon", [
    { phase: "response" },
  ]);
  assert.equal(
    plan.status,
    "universal",
    source + " " + JSON.stringify(plan.problems),
  );
  let expected: any;
  vm.runInNewContext(
    source,
    contexts("loon", { $done: (v: any) => (expected = v) }),
  );
  for (const to of ["qx", "surge", "loon"]) {
    let output: any;
    vm.runInNewContext(
      plan.code!,
      contexts(to, { $done: (v: any) => (output = v) }),
    );
    assert.equal(
      JSON.stringify(output),
      JSON.stringify(expected),
      to + " " + source,
    );
  }
}
assert.deepEqual(
  inspectScriptApis("const r=$response;$done({body:r.body});").paths,
  ["$done", "$response.body"],
);
for (const source of [
  "const r=$response;leak(r);$done({body:r.body});",
  'const r=$response;r.body="x";$done({body:r.body});',
  "const r=$response;const s=r;$done({body:s.body});",
  "const r=$response;$done({body:r[unknown]});",
  "$done({body:$response||{}});",
  "function result(){return unknown()}$done(result());",
  'function result(){return {body:"x"}}result=unknown;$done(result());',
  'const f=async()=>({body:"x"});$done(f());',
  'const r={body:"x"};leak(r);$done({...r});',
  "$done({...unknown});",
  "function f(){return f()}$done(f());",
  'function f(){if(unknown)return {response:{body:"x"}}}$done(f());',
])
  assert.equal(
    planUniversalAdblockScript(source, "loon", [{ phase: "response" }]).status,
    "blocked",
    source,
  );
const storage =
  'const prefix="app.";const key=prefix+"settings";$persistentStore.write(JSON.stringify({n:1}),key);$persistentStore.write(JSON.stringify(JSON.parse("null")),key);$done({body:$persistentStore.read(key)||"missing"});';
const plan = planUniversalAdblockScript(storage, "loon", [
  { phase: "response" },
]);
assert.equal(plan.status, "universal", JSON.stringify(plan.problems));
for (const to of ["qx", "surge", "loon"]) {
  const map = new Map<string, string>();
  let result: any;
  vm.runInNewContext(
    plan.code!,
    contexts(to, {
      $done: (v: any) => (result = v),
      $persistentStore: {
        read: (k: string) => map.get(k) ?? null,
        write: (v: string, k: string) => {
          map.set(k, v);
          return true;
        },
      },
      $prefs: {
        valueForKey: (k: string) => map.get(k),
        setValueForKey: (v: string, k: string) => {
          map.set(k, v);
          return true;
        },
      },
    }),
  );
  assert.equal(result.body, "null");
  assert.equal(map.get("app.settings"), "null");
}
for (const source of [
  'const key="x/y";$persistentStore.write("v",key);$done();',
  'const empty="";$persistentStore.write(empty,"key");$done();',
  '$persistentStore.write(JSON.stringify(undefined),"key");$done();',
  'JSON.stringify=()=>"";$persistentStore.write(JSON.stringify({x:1}),"key");$done();',
  '$persistentStore.write(JSON.stringify({toJSON(){return undefined}}),"key");$done();',
])
  assert.equal(
    planUniversalAdblockScript(source, "loon", [{ phase: "response" }]).status,
    "blocked",
    source,
  );
// A Boolean-only HTTP error proof must not admit an indirect typeof observation.
const http =
  '$httpClient.get({url:"http://fixture",timeout:1,"auto-cookie":false,"auto-redirect":false,headers:{"User-Agent":"x","Accept":"*/*","Accept-Encoding":"identity"}},(e,r,d)=>{if(typeof(e||{})==="object")$done({});});';
assert.equal(
  planScriptApiConversion(http, {
    from: "surge",
    to: "loon",
    phase: "response",
  }).status,
  "blocked",
);
console.log(
  "Closed flow passed: context aliases/Boolean guards, function and spread completions, constant keys/nonempty JSON strings and adversarial escapes",
);
// Modified: 2026-11-02 (chance). QX documents bare string completion for a
// response-body trigger; require that exact declaration and proven string flow.
for (const source of [
  'let body=$response.body;body=body.replace(/hello/g,"clean");$done(body);',
  'let body="";body+=$request.method;$done(body);',
  "$done(JSON.stringify(undefined));",
]) {
  const plan = planUniversalAdblockScript(source, "qx", [
    { phase: "response", responseBody: true },
  ]);
  assert.equal(
    plan.status,
    "universal",
    source + " " + JSON.stringify(plan.problems),
  );
  let native: any;
  vm.runInNewContext(
    source,
    contexts("qx", {
      $done: (v: any) =>
        (native = typeof v === "string" ? { body: v } : (v ?? {})),
    }),
  );
  for (const to of ["qx", "surge", "loon"]) {
    let result: any;
    vm.runInNewContext(
      plan.code!,
      contexts(to, {
        $done: (v: any) =>
          (result = typeof v === "string" ? { body: v } : (v ?? {})),
      }),
    );
    assert.equal(JSON.stringify(result), JSON.stringify(native));
  }
  assert.equal(
    planUniversalAdblockScript(source, "qx", [
      { phase: "response", responseBody: false },
    ]).status,
    "blocked",
  );
}
for (const source of [
  'let b="x";b=$response.body;b+=1;$done(b);',
  "let b=$response.body;b=parseUnknown();$done(b);",
  'String.prototype.replace=()=>1;let b=$response.body;b=b.replace("x","y");$done(b);',
])
  assert.equal(
    planUniversalAdblockScript(source, "qx", [
      { phase: "response", responseBody: true },
    ]).status,
    "blocked",
    source,
  );

for (const source of [
  "const r=$response;$done({body:r.headers[unknown]});",
  "let r={};function f(){return r}leak(f());$done(f());",
  "let r={};function f(){return r}const alias=f();leak(alias);$done(f());",
])
  assert.equal(
    planUniversalAdblockScript(source, "loon", [{ phase: "response" }]).status,
    "blocked",
    source,
  );
