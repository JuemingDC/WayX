// Modified: 2026-11-02 (chance). HTTP response aliases remain closed while
// only supported fields are consumed; exercise success, rejection and exact bytes.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript as plan } from "../src/parser/universal-script.ts";
const request =
  '$task.fetch({url:"http://fixture.test/",headers:{"User-Agent":"fixture","Accept":"*/*","Accept-Encoding":"identity"},opts:{"auto-cookie":false,redirection:false}})';
async function run(
  source: string,
  host: "qx" | "surge",
  bad = false,
  binary = false,
) {
  const p = plan(source, "qx", [{ phase: "response" }]);
  assert.equal(p.status, "universal", JSON.stringify(p.problems));
  let result: any;
  const context = {
    setTimeout,
    ArrayBuffer,
    Uint8Array,
    $response: { body: "original" },
    $done: (v: any) => (result = v),
    ...(host === "qx"
      ? {
          $task: {
            fetch: () =>
              bad
                ? Promise.reject({ error: "network" })
                : Promise.resolve(
                    binary
                      ? {
                          statusCode: 201,
                          bodyBytes: new Uint8Array([1, 2, 3]).buffer,
                        }
                      : { statusCode: 201, body: "payload" },
                  ),
          },
        }
      : {
          $environment: { "surge-version": "actual" },
          $httpClient: {
            get: (_o: any, cb: any) =>
              bad
                ? cb("network", undefined, undefined)
                : cb(
                    null,
                    { status: 201 },
                    binary
                      ? new Uint8Array([9, 1, 2, 3, 8]).subarray(1, 4)
                      : "payload",
                  ),
          },
        }),
  };
  vm.runInNewContext(p.code!, context);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return result;
}
for (const consume of [
  "const a=response;const b=a;$done({body:b.body+b.statusCode});",
  "const a=response;const {body:text,statusCode:status}=a;$done({body:text+status});",
  'const a=response;const key="body";$done({body:a[key]+a.statusCode});',
]) {
  const source =
    request +
    ".then(response=>{" +
    consume +
    '},error=>$done({body:error?"failed":"missing"}));';
  for (const host of ["qx", "surge"] as const) {
    assert.equal((await run(source, host)).body, "payload201");
    assert.equal((await run(source, host, true)).body, "failed");
  }
}
const awaiting =
  "(async()=>{try{const response=await " +
  request +
  ';const alias=response;const {body,statusCode}=alias;$done({body:body+statusCode});}catch(error){$done({body:error?"failed":"missing"});}})();';
for (const host of ["qx", "surge"] as const) {
  assert.equal((await run(awaiting, host)).body, "payload201");
  assert.equal((await run(awaiting, host, true)).body, "failed");
}
const binary =
  request +
  ".then(response=>{const a=response;const {bodyBytes:bytes}=a;$done({bodyBytes:bytes});});";
for (const host of ["qx", "surge"] as const) {
  const out = await run(binary, host, false, true);
  assert.deepEqual(
    [...new Uint8Array(host === "qx" ? out.bodyBytes : out.body)],
    [1, 2, 3],
  );
}
for (const consume of [
  "let a=response;$done({body:a.body});",
  "const a=response;leak(a);$done({body:a.body});",
  'const a=response;[a.body]=["changed"];$done({body:a.body});',
  'const a=response;({body:a.body}={body:"changed"});$done({body:a.body});',
  'const a=response;for(a.body of ["changed"]){}$done({body:a.body});',
  "const a=response;delete a.body;$done({});",
  'const a=response;const {body="default"}=a;$done({body});',
  "const a=response;const {...rest}=a;$done({});",
  "const a=response;const {headers}=a;$done({});",
  "const a=response;$done({body:a[unknown]});",
])
  assert.equal(
    plan(request + ".then(response=>{" + consume + "});", "qx", [
      { phase: "response" },
    ]).status,
    "blocked",
    consume,
  );
console.log(
  "HTTP response alias class passed: closed const chains, field destructuring/computed constants, caught await, success/rejection, exact byte views and escape/mutation negatives on QX/Surge",
);
