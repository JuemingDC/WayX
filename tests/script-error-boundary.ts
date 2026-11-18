// Modified: 2026-11-18 (chance). Real emitted HTTP programs recover once;
// native/task/registration/submission failures keep their existing contracts.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planScriptApiConversion as plan } from "../src/parser/script-api.ts";
import { planUniversalAdblockScript as universal } from "../src/parser/universal-script.ts";
import { scriptErrorBoundary } from "../src/emit/script-error-boundary.ts";

function execute(
  source: string,
  from: any,
  to: any,
  phase: any = "response",
  extra: any = {},
  shared = false,
) {
  const p = plan(source, { from, to, phase, responseBody: true });
  assert.ok(p.code, JSON.stringify(p.problems));
  const output: any[] = [],
    logs: any[] = [];
  const globals = {
    Uint8Array,
    ArrayBuffer,
    Promise,
    console: { log: (...args: any[]) => logs.push(args) },
    $request: { url: "https://example.test/?a=1&b=2", headers: {} },
    ...(phase === "response"
      ? {
          $response: {
            status: 200,
            statusCode: 200,
            body: "upstream",
            headers: {},
          },
        }
      : {}),
    ...(to === "qx"
      ? { $task: { fetch() {} } }
      : { $environment: { "surge-version": "test" } }),
    $done: (v: any) => output.push(JSON.parse(JSON.stringify(v))),
    ...extra,
  };
  const code = shared
    ? universal(source, from, [{ phase, responseBody: true }]).code!
    : p.code!;
  const result = vm.runInNewContext(code, globals);
  return { output, logs, result, code };
}

for (const [from, to] of [
  ["loon", "qx"],
  ["loon", "surge"],
  ["qx", "surge"],
]) {
  for (const shared of [false, true]) {
    for (const phase of ["request", "response"]) {
      // Body bridge and modular/global-alias paths must agree.
      for (const source of [
        'JSON.parse("bad");$done({body:"never"});',
        'const g=globalThis;g.$request.headers["X-Test"]="local";throw Error("escaped");g.$done({});',
      ]) {
        const r = execute(source, from, to, phase, {}, shared);
        assert.deepEqual(r.output, [{}]);
        assert.equal(r.logs.length, 1);
      }
      const caught = execute(
        'try{throw Error("caught");}catch(e){$done({body:"author fallback"});}',
        from,
        to,
        phase,
        {},
        shared,
      );
      assert.deepEqual(caught.output, [{ body: "author fallback" }]);
      assert.equal(caught.logs.length, 0);
      const committed = execute(
        '$done({body:"committed"});throw Error("late");',
        from,
        to,
        phase,
        {},
        shared,
      );
      assert.deepEqual(committed.output, [{ body: "committed" }]);
      assert.equal(committed.logs.length, 1);
      const promise = execute(
        'return Promise.reject(Error("async"));',
        from,
        to,
        phase,
        {},
        shared,
      );
      await promise.result;
      assert.deepEqual(promise.output, [{}]);
      const latePromise = execute(
        '$done({body:"committed"});return Promise.reject(Error("late async"));',
        from,
        to,
        phase,
        {},
        shared,
      );
      await latePromise.result;
      assert.deepEqual(latePromise.output, [{ body: "committed" }]);
    }
  }
  for (const phase of ["task", "network", "generic"]) {
    assert.throws(
      () => execute('throw Error("task failure");', from, to, phase),
      /task failure/,
    );
  }
  for (const error of [Error("native submission"), null, "native failure"]) {
    let attempts = 0;
    assert.throws(
      () =>
        execute('$done({body:"valid"});', from, to, "response", {
          $done() {
            attempts++;
            throw error;
          },
        }),
      (e) => e === error,
    );
    assert.equal(attempts, 1);
  }
}
for (const target of ["qx", "loon"]) {
  assert.throws(
    () => execute('throw Error("native error");', target, target),
    /native error/,
  );
}
const guarded = execute("$done({body:$response.body});", "loon", "surge");
assert.equal(
  (guarded.code.match(/\$done\(\{body:\$response.body\}\);/g) || []).length,
  1,
  "one author program",
);
const hostResponse = {
  status: 200,
  body: "upstream",
  headers: { "X-Original": "keep" },
};
assert.deepEqual(
  execute(
    '$response.body="local";$response.headers["X-Original"]="changed";throw Error("discard");',
    "loon",
    "surge",
    "response",
    { $response: hostResponse },
  ).output,
  [{}],
);
assert.equal(hostResponse.body, "upstream");
assert.deepEqual(hostResponse.headers, { "X-Original": "keep" });
assert.deepEqual(
  execute('throw Error("echo failure");', "qx", "surge", "echo").output,
  [{}],
);
const delayed = execute(
  'setTimeout(()=>$done({body:"too late"}),0);throw Error("early failure");',
  "loon",
  "surge",
  "response",
  { setTimeout },
);
await new Promise((resolve) => setTimeout(resolve, 10));
assert.deepEqual(
  delayed.output,
  [{}],
  "late callbacks cannot resubmit after fallback",
);
const boundary = vm.runInNewContext("(" + scriptErrorBoundary + ")", {
  console: {
    log() {
      throw Error("logger");
    },
  },
});
const calls: any[] = [];
boundary(
  (v: any) => calls.push(v),
  () => {
    throw undefined;
  },
);
assert.equal(calls.length, 1, "logging failure cannot prevent passthrough");
console.log(
  "HTTP error boundary: three directions, body/modular/shared scopes, request/response, returned Promise rejection, single submission, author catches, host isolation, native errors and non-HTTP exclusions passed",
);
