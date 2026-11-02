// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). Run QX-source Promise/await/byte fetch on one
// shared program using actual local HTTP fixtures and explicit option omission.
import assert from "node:assert/strict";
import vm from "node:vm";
import http from "node:http";
import { createContractServer } from "./support/http-contract-server.ts";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
import { planScriptApiConversion } from "../src/parser/script-api.ts";
const server = createContractServer();
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = "http://127.0.0.1:" + (server.address() as any).port;
const requests: any[] = [];
function nativeClient(to: string) {
  return Object.fromEntries(
    ["get", "post", "put", "delete", "head", "options", "patch"].map(
      (method) => [
        method,
        (options: any, cb: any) => {
          requests.push({ to, method, options });
          const request = http.request(
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
              const chunks: Buffer[] = [];
              res.on("data", (c) => chunks.push(c));
              res.on("end", () => {
                const bytes = Buffer.concat(chunks);
                cb(
                  null,
                  { status: res.statusCode },
                  options["binary-mode"]
                    ? new Uint8Array(
                        bytes.buffer,
                        bytes.byteOffset,
                        bytes.byteLength,
                      )
                    : bytes.toString(),
                );
              });
            },
          );
          request.on("error", (err) => cb(err));
          request.end(options.body);
        },
      ],
    ),
  );
}
const task = {
  fetch(input: any) {
    return new Promise((resolve, reject) => {
      requests.push({ to: "qx", options: input });
      const method = input.method || "GET";
      const request = http.request(
        input.url,
        {
          method,
          headers: {
            ...input.headers,
            ...(input.body !== undefined
              ? { "Content-Length": Buffer.byteLength(input.body) }
              : {}),
          },
        },
        (res) => {
          const parts: Buffer[] = [];
          res.on("data", (c) => parts.push(c));
          res.on("end", () => {
            const b = Buffer.concat(parts);
            resolve({
              statusCode: res.statusCode,
              body: b.toString(),
              bodyBytes: b.buffer.slice(
                b.byteOffset,
                b.byteOffset + b.byteLength,
              ),
              headers: res.headers,
            });
          });
        },
      );
      request.on("error", (error) => reject({ error: String(error) }));
      request.end(input.body);
    });
  },
};
const opts = (method = "GET", route = "/echo", extra = "") =>
  `{url:${JSON.stringify(origin + route)},method:${JSON.stringify(method)},headers:{"User-Agent":"fixture","Accept":"application/json","Accept-Encoding":"identity","Content-Type":"text/plain","Host":"preserved.test"},opts:{redirection:false,"auto-cookie":false,"skip-cert-verify":false,timeout:1,alpn:"h2"},timeout:"ignored"${["GET", "HEAD"].includes(method) ? "" : ',body:"hello"'}${extra}}`;
async function run(source: string, to: string) {
  const plan = planUniversalAdblockScript(source, "qx", [
    { phase: "response" },
  ]);
  assert.equal(
    plan.status,
    "universal",
    source + " " + JSON.stringify(plan.problems),
  );
  assert.deepEqual((plan.contexts as any).response.qx.httpIgnoredOptions, [
    "opts.alpn",
    "opts.timeout",
    "timeout",
  ]);
  const result = await new Promise<any>((resolve) =>
    vm.runInNewContext(plan.code!, {
      setTimeout,
      Uint8Array,
      ArrayBuffer,
      $response: { body: "input" },
      $done: resolve,
      ...(to === "qx" ? { $task: task } : {}),
      $httpClient: nativeClient(to),
      ...(to === "loon"
        ? { $loon: "test" }
        : to === "surge"
          ? { $environment: { "surge-version": "test" } }
          : {}),
    }),
  );
  return { result, plan };
}
try {
  for (const method of [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "HEAD",
    "OPTIONS",
    "PATCH",
  ])
    for (const to of ["qx", "surge"]) {
      const source = `$task.fetch(${opts(method)}).then(r=>{$done({body:r.body,status:r.statusCode===200?"HTTP/1.1 200 OK":"HTTP/1.1 503 Failed"});},reason=>{if(reason)$done({body:"error"});});`;
      const { result } = await run(source, to);
      assert.match(String(result.status), /200/);
      if (method !== "HEAD") {
        const body = JSON.parse(result.body);
        assert.equal(body.method, method);
        assert.equal(body.headers.host, "preserved.test");
      }
      const request = requests.at(-1);
      assert.equal(request.options.timeout, undefined);
      assert.equal(request.options.alpn, undefined);
      if (to === "qx") {
        assert.equal(request.options.opts.timeout, undefined);
        assert.equal(request.options.opts.alpn, undefined);
      } else {
        assert.equal(request.options["auto-cookie"], false);
        assert.equal(request.options["auto-redirect"], false);
        assert.equal(request.options.insecure, false);
      }
    }
  for (const to of ["qx", "surge"]) {
    let source = `$task.fetch(${opts("GET", "/drop")}).then(r=>$done({body:r.body}),reason=>{if(reason.error)$done({body:"error"});});`;
    assert.equal((await run(source, to)).result.body, "error");
    source = `$task.fetch(${opts("GET", "/echo")}).then(r=>{throw Error("business")}).catch(reason=>{if(reason)$done({body:"caught"});});`;
    assert.equal(
      (await run(source, to)).result.body,
      "caught",
      "business throws must remain rejected Promises",
    );
    source = `(async()=>{try{const r=await $task.fetch(${opts()});$done({body:r.body});}catch(reason){if(reason)$done({body:"error"});}})();`;
    assert.equal(JSON.parse((await run(source, to)).result.body).method, "GET");
    source = `$task.fetch(${opts("GET", "/bytes")}).then(r=>$done({bodyBytes:r.bodyBytes}),()=>{$done({});});`;
    const data = (await run(source, to)).result;
    assert.deepEqual(
      Array.from(new Uint8Array(data.bodyBytes ?? data.body)),
      [0, 1, 127, 128, 255],
    );
  }
  const base = `$task.fetch(${opts()}).then(r=>$done({body:r.body}),e=>{$done({});});`;
  for (const source of [
    base.replace("body:r.body", "body:r.headers"),
    base.replace(
      "r=>$done({body:r.body})",
      "r=>{r.statusCode=201;$done({body:r.body});}",
    ),
    base.replace("e=>{$done({});}", "e=>$done({body:e.error})"),
    base.replace(
      "r=>$done({body:r.body})",
      "r=>{leak(r);$done({body:r.body});}",
    ),
    base.replace("body:r.body", "body:r.body+r.bodyBytes"),
    `(async()=>{try{const r=await $task.fetch(${opts()});$done({body:r.body});}catch(e){$done({body:e.error});}})();`,
  ])
    assert.equal(
      planUniversalAdblockScript(source, "qx", [{ phase: "response" }]).status,
      "blocked",
      source,
    );
  const prefix =
    'const __wayxUnusedHttp="author";' +
    base.replace("body:r.body", "body:r.body+__wayxUnusedHttp");
  assert.equal(
    (await run(prefix, "surge")).result.body.endsWith("author"),
    true,
  );
  const cli = planScriptApiConversion(base, {
    from: "qx",
    to: "surge",
    phase: "response",
  });
  assert.equal(cli.status, "adapted");
} finally {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
console.log(
  "QX Promise flow passed: seven methods on shared bytes, then/catch/await, explicit defaults, ignored parameters, byte offsets, actual network rejection and adversarial result/error escapes",
);

assert.equal(
  planUniversalAdblockScript(
    `$task.fetch(${opts("GET").replace('"GET"', '"get"')}).then(r=>$done({body:r.body}),()=>{$done({});});`,
    "qx",
    [{ phase: "response" }],
  ).status,
  "blocked",
  "HTTP method case is not silently rewritten",
);
