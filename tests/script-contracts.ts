// Modified: 2026-11-02 (chance). Execute bounded header/result/HTTP contracts
// against a controlled local server; preserve negative cases and native limits.
import assert from "node:assert/strict";
import vm from "node:vm";
import http from "node:http";
import { createContractServer } from "./support/http-contract-server.ts";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
import { planScriptApiConversion } from "../src/parser/script-api.ts";
import { inspectEmbeddedWasm } from "../src/parser/script-wasm.ts";
const lookup =
  'const h=$response.headers;const key=Object.keys(h).find(k=>k.toLowerCase()==="content-type");const value=key===undefined?undefined:h[key];let result={};result.body=value||"absent";delete result.status;$done(result);';
const common = planUniversalAdblockScript(lookup, "loon", [
  { phase: "response" },
]);
assert.equal(common.status, "universal", JSON.stringify(common.problems));
for (const target of ["qx", "surge", "loon"])
  for (const field of ["Content-Type", "content-type", "CONTENT-TYPE"]) {
    let result: any;
    vm.runInNewContext(common.code!, {
      setTimeout,
      $response: {
        body: "x",
        headers: { [field]: "application/json", Host: "keep" },
      },
      $done: (v: any) => (result = v),
      ...(target === "qx"
        ? { $task: { fetch() {} } }
        : target === "loon"
          ? { $loon: "test" }
          : { $environment: { "surge-version": "test" } }),
    });
    assert.equal(result.body, "application/json");
  }
for (const headers of [
  { "Content-Type": "a", "content-type": "b" },
  { "Content-Type": ["a", "b"] },
])
  assert.throws(
    () =>
      vm.runInNewContext(common.code!, {
        setTimeout,
        $task: { fetch() {} },
        $response: { headers },
        $done() {},
      }),
    /singleton/,
  );
for (const bad of [
  lookup.replace("key===undefined?undefined:h[key]", "h[key]"),
  lookup.replace("const value=", "console.log(key);const value="),
  '$done({body:$response.headers["Content-Type"]});',
  "let r={};r.headers={};$done(r);",
  'let r={};r[unknown]="x";$done(r);',
  'let r={};leak(r);r.body="x";$done(r);',
])
  assert.equal(
    planUniversalAdblockScript(bad, "loon", [{ phase: "response" }]).status,
    "blocked",
    bad,
  );
assert.equal(
  planUniversalAdblockScript('$done($response.body?{body:"yes"}:{});', "loon", [
    { phase: "response" },
  ]).status,
  "universal",
);
const server = createContractServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = (server.address() as any).port;
function nativeClient(to: string, seen: any[]) {
  return Object.fromEntries(
    ["get", "post", "put", "delete", "head", "options", "patch"].map(
      (method) => [
        method,
        (options: any, callback: any) => {
          seen.push({ method, ...options });
          const req = http.request(
            options.url,
            {
              method: method.toUpperCase(),
              headers: {
                ...options.headers,
                ...(options.body !== undefined
                  ? { "Content-Length": Buffer.byteLength(options.body) }
                  : {}),
              },
            },
            (res) => {
              const parts: Buffer[] = [];
              res.on("data", (b) => parts.push(b));
              res.on("end", () =>
                callback(
                  null,
                  { status: res.statusCode, headers: res.headers },
                  Buffer.concat(parts).toString(),
                ),
              );
            },
          );
          req.setTimeout(options.timeout * (to === "surge" ? 1000 : 1), () =>
            req.destroy(Error("native timeout")),
          );
          req.on("error", (e) => callback(e, undefined, undefined));
          req.end(options.body);
        },
      ],
    ),
  );
}
function program(method: string, from: string, route = "/echo") {
  return `$httpClient.${method}({url:"http://127.0.0.1:${port}${route}",timeout:${from === "surge" ? 0.1 : 100},"auto-cookie":false,"auto-redirect":false,headers:{"User-Agent":"fixture","Accept":"application/json","Accept-Encoding":"identity","Content-Type":"text/plain","Host":"retained.test"}${["get", "head"].includes(method) ? "" : ',body:"hello"'}},(error,response,data)=>{if(error){$done({body:"error"});}else{$done({body:data,status:response.status});}});`;
}
try {
  for (const from of ["surge", "loon"]) {
    const to = from === "surge" ? "loon" : "surge",
      seen: any[] = [];
    for (const method of [
      "get",
      "post",
      "put",
      "delete",
      "head",
      "options",
      "patch",
    ]) {
      const plan = planScriptApiConversion(program(method, from), {
        from: from as any,
        to: to as any,
        phase: "response",
      });
      assert.equal(plan.status, "adapted", JSON.stringify(plan.problems));
      const output: any = await new Promise((resolve) =>
        vm.runInNewContext(plan.code!, {
          setTimeout,
          $httpClient: nativeClient(to, seen),
          $done: resolve,
        }),
      );
      assert.equal(output.status, 200);
      if (method !== "head") {
        const data = JSON.parse(output.body);
        assert.equal(data.method, method.toUpperCase());
        assert.equal(data.headers.host, "retained.test");
        assert.equal(data.headers.cookie, undefined);
        assert.equal(
          data.body,
          ["get", "head"].includes(method) ? "" : "hello",
        );
      }
      assert.equal(seen.at(-1).timeout, to === "surge" ? 0.1 : 100);
      assert.equal(seen.at(-1)["auto-redirect"], false);
      assert.equal(seen.at(-1)["auto-cookie"], false);
    }
    for (const [route, expected] of [
      ["/redirect", 302],
      ["/failure", 503],
      ["/delay?ms=500", "error"],
      ["/drop", "error"],
    ]) {
      const plan = planScriptApiConversion(
        program("get", from, route as string),
        { from: from as any, to: to as any, phase: "response" },
      );
      const result: any = await new Promise((resolve) =>
        vm.runInNewContext(plan.code!, {
          setTimeout,
          $httpClient: nativeClient(to, seen),
          $done: resolve,
        }),
      );
      assert.equal(
        expected === "error" ? result.body : result.status,
        expected,
      );
    }
  }
  const source = program("get", "surge");
  for (const bad of [
    source.replace('"auto-cookie":false', '"auto-cookie":true'),
    source.replace("http://", "https://"),
    source.replace("if(error)", 'if(typeof error==="string")'),
    source.replace("body:data", "body:response.headers"),
    source.replace("body:data", "body:arguments[0]"),
  ])
    assert.equal(
      planScriptApiConversion(bad, {
        from: "surge",
        to: "loon",
        phase: "response",
      }).status,
      "blocked",
      bad,
    );
  assert.equal(
    planUniversalAdblockScript(source, "surge", [{ phase: "response" }]).status,
    "blocked",
    "pairwise HTTP evidence cannot enable three hosts",
  );
  const plan = planScriptApiConversion(source, {
    from: "surge",
    to: "loon",
    phase: "response",
  });
  assert.throws(
    () =>
      vm.runInNewContext(plan.code!, {
        setTimeout,
        $httpClient: {
          get(_o: any, cb: any) {
            cb(null, null, "");
          },
        },
        $done() {},
      }),
    /numeric response/,
  );
} catch (error) {
  throw error;
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
const wasm = inspectEmbeddedWasm(
  'const WASM_BASE64="AGFzbQEAAAA=";WebAssembly.instantiate();',
);
assert.equal(wasm?.execution, "none");
assert.equal(wasm?.modules[0].status, "compiled-without-instantiation");
assert.deepEqual(wasm?.modules[0].exports, []);
assert.equal(
  inspectEmbeddedWasm('const WASM_BASE64="AAAA";WebAssembly.instantiate();')
    ?.modules[0].status,
  "invalid-module",
);
console.log(
  "Bounded script contracts passed: three-host headers/results, seven HTTP methods, units, redirects, status errors, timeout, network failure and non-executing WASM inspection",
);
