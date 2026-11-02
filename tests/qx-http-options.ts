// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). The author's QX options survive; undocumented
// timeout/ALPN/custom parameters are omitted without error, across all seven methods.
import assert from "node:assert/strict";
import vm from "node:vm";
import http from "node:http";
import { createContractServer } from "./support/http-contract-server.ts";
import { planScriptApiConversion } from "../src/parser/script-api.ts";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
import { qxHttpOptions } from "../src/parser/qx-http-options.ts";
const server = createContractServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + (server.address() as any).port;
const seen: any[] = [];
const task = {
  fetch(options: any) {
    seen.push(options);
    return new Promise((resolve, reject) => {
      const request = http.request(
        options.url,
        {
          method: options.method,
          headers: {
            ...options.headers,
            ...(options.body !== undefined
              ? { "Content-Length": Buffer.byteLength(options.body) }
              : {}),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () =>
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: Buffer.concat(chunks).toString(),
            }),
          );
        },
      );
      request.on("error", (e) => reject({ error: String(e) }));
      request.end(options.body);
    });
  },
};
function source(method: string, extra = "", route = "/echo") {
  return `$httpClient.${method}({url:${JSON.stringify(origin + route)},headers:{"User-Agent":"fixture","Accept":"application/json","Accept-Encoding":"identity","Content-Type":"text/plain","Host":"keep.test"},"auto-redirect":false,"auto-cookie":false,timeout:100${["get", "head"].includes(method) ? "" : ',body:"data"'}${extra}},(error,response,data)=>{if(error){$done({body:"error"});}else{$done({body:data,status:response.status});}});`;
}
async function execute(text: string, from = "surge", nativeTask: any = task) {
  const plan = planScriptApiConversion(text, {
    from: from as any,
    to: "qx",
    phase: "response",
  });
  assert.equal(plan.status, "adapted", JSON.stringify(plan.problems));
  const result = await new Promise<any>((resolve) =>
    vm.runInNewContext(plan.code!, {
      setTimeout,
      $task: nativeTask,
      $done: resolve,
    }),
  );
  return { plan, result };
}
try {
  for (const method of [
    "get",
    "post",
    "put",
    "delete",
    "head",
    "options",
    "patch",
  ]) {
    const { plan, result } = await execute(
      source(method, ',alpn:"h2",unknownOption:123'),
    );
    assert.deepEqual(plan.contract?.httpIgnoredOptions, [
      "alpn",
      "timeout",
      "unknownOption",
    ]);
    assert.match(result.status, /200/);
    const request = seen.at(-1);
    assert.equal(request.method, method.toUpperCase());
    assert.equal(request.timeout, undefined);
    assert.equal(request.alpn, undefined);
    assert.equal(request.unknownOption, undefined);
    assert.equal(request.headers.Host, "keep.test");
    assert.equal(request.opts.redirection, false);
    assert.equal(request.opts["auto-cookie"], false);
    assert.equal(request.opts["skip-cert-verify"], false);
    if (method !== "head") {
      const response = JSON.parse(result.body);
      assert.equal(response.method, method.toUpperCase());
      assert.equal(response.headers.host, "keep.test");
    }
  }
  await execute(source("get", ',insecure:true,policy:"DIRECT"'), "loon");
  assert.equal(seen.at(-1).opts["skip-cert-verify"], true);
  assert.equal(seen.at(-1).opts.policy, "direct");
  await execute(
    source("get").replace("timeout:100", 'timeout:"undocumented type"'),
  );
  assert.equal(seen.at(-1).timeout, undefined);
  const bare = source("get").replace(
    ',"auto-redirect":false,"auto-cookie":false,timeout:100',
    "",
  );
  await execute(bare, "loon");
  assert.equal(seen.at(-1).opts["auto-cookie"], true);
  assert.equal(seen.at(-1).opts.redirection, true);
  assert.equal(seen.at(-1).opts["skip-cert-verify"], true);
  const https = source("get").replace(origin, "https://fixture.test");
  await execute(https, "surge", {
    fetch(o: any) {
      assert.match(o.url, /^https:/);
      return Promise.resolve({ statusCode: 200, body: "ok", headers: {} });
    },
  });
  const delayed = await execute(
    source("get", "", "/delay?ms=150").replace("timeout:100", "timeout:0.001"),
  );
  assert.match(
    delayed.result.status,
    /200/,
    "ignored QX timeout must not become fake cancellation",
  );
  assert.equal(
    (await execute(source("get", "", "/drop"))).result.body,
    "error",
  );
  for (const from of ["loon"]) {
    const text = source("post"),
      plan = planUniversalAdblockScript(text, from as any, [
        { phase: "response" },
      ]);
    assert.equal(plan.status, "universal", JSON.stringify(plan.problems));
    for (const to of ["qx", "surge", "loon"]) {
      const result = await new Promise<any>((resolve) =>
        vm.runInNewContext(plan.code!, {
          setTimeout,
          $response: { body: "input" },
          $done: resolve,
          $httpClient: {
            post(options: any, cb: any) {
              cb(null, { status: 200 }, "ok");
            },
          },
          ...(to === "qx"
            ? {
                $task: {
                  fetch(o: any) {
                    assert.equal(o.timeout, undefined);
                    return Promise.resolve({ statusCode: 200, body: "ok" });
                  },
                },
              }
            : to === "loon"
              ? { $loon: "test" }
              : { $environment: { "surge-version": "test" } }),
        }),
      );
      assert.equal(result.body, "ok");
    }
  }
  const invalid = planScriptApiConversion(
    source("get").replace("if(error)", 'if(typeof error==="string")'),
    { from: "surge", to: "qx", phase: "response" },
  );
  assert.equal(
    invalid.status,
    "blocked",
    "parameter omission does not invent error-shape equivalence",
  );
  assert.ok(!qxHttpOptions.opts.includes("timeout" as any));
  assert.ok(qxHttpOptions.deprecated.includes("filter"));
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
console.log(
  "QX author option policy passed: seven methods, omission/no parameter errors, TLS/cookie/redirect/policy mapping, actual network failures and the same shared bytes on three hosts",
);
