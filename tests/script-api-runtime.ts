// Modified: 2026-11-02 (chance). Maintain API contracts independently of local
// plugin/script contents: dynamic inputs, Env receivers, all methods and failures.
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import { planUniversalAdblockScript as universal } from "../src/parser/universal-script.ts";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
const flat = (x: any) => JSON.parse(JSON.stringify(x));
const directions = [
  ["loon", "qx"],
  ["loon", "surge"],
  ["qx", "surge"],
] as const;
function execute(
  source: string,
  from: any,
  to: any,
  input: any = {},
  phase: any = "response",
) {
  const p = pair(source, {
    from,
    to,
    phase,
    responseBody: true,
    name: "source-name",
  });
  assert.equal(
    p.status,
    from === to ? "native" : "adapted",
    JSON.stringify(p.problems),
  );
  let out: any;
  const scope: any = {
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Uint8Array,
    ArrayBuffer,
    Date,
    Promise,
    console,
    $done: (v: any) => {
      out = v;
    },
    ...input,
  };
  vm.runInNewContext(p.code!, scope);
  return {
    p,
    scope,
    get out() {
      return out;
    },
  };
}
// Dynamic receiver/alias/key/return flow is runtime JavaScript, never a whitelist.
for (const [from, to] of directions) {
  const api = from === "qx" ? "$prefs" : "$persistentStore";
  const source = `class Env{constructor(){this.values=[];}read(message){const k=['bo','dy'].join('');return message[k];}done(v){const result={};result[['bo','dy'].join('')]=v;globalThis.$done(result);}}const env=new Env();env.done(env.read($response));`;
  const r = execute(source, from, to, {
    $response: { body: "dynamic ✓", status: 201, statusCode: 201 },
  });
  assert.equal(r.out.body, "dynamic ✓");
  assert.ok(r.p.code!.includes(source));
}
// ScriptHub Header behavior with the missing deletion/has/descriptor traps fixed.
for (const [from, to] of directions) {
  const native = { "If-None-Match": "etag", "User-Agent": "ua" };
  const r = execute(
    'const h=$request.headers;const before=h["USER-AGENT"];delete h["If-None-Match"];if("IF-NONE-MATCH" in h)throw Error("delete failed");Object.defineProperty(h,"X-Added",{value:before,enumerable:true,configurable:true});h[Symbol.iterator];$done({headers:h});',
    from,
    to,
    { $request: { url: "https://test/", headers: native } },
    "request",
  );
  assert.deepEqual(flat(r.out.headers), {
    "user-agent": "ua",
    "x-added": "ua",
  });
  assert.equal(native["If-None-Match"], "etag");
}
// Every dynamic HTTP method reaches its corresponding native method. Failures
// reject rather than resolve(null), and parallel requests have independent state.
for (const method of [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "PATCH",
]) {
  let seen: any;
  const source =
    'const options=JSON.parse(input);function send(o){return $task.fetch(o);}send(options).then(r=>$done({body:r.body+":"+r.statusCode}));';
  const r = execute(source, "qx", "surge", {
    input: JSON.stringify({
      url: "https://api.test/",
      method,
      headers: { Host: "api.test" },
      timeout: 3,
      opts: { redirection: false, "auto-cookie": false, unknown: 1 },
    }),
    $response: { body: "" },
    $httpClient: {
      [method.toLowerCase()]: (o: any, cb: any) => {
        seen = o;
        cb(null, { status: 201, headers: { "X-Test": "v" } }, "reply");
      },
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(r.out.body, "reply:201");
  assert.equal(seen.headers.Host, "api.test");
  assert.equal(seen.timeout, undefined);
  assert.equal(seen["auto-redirect"], false);
}
for (const reason of ["offline", null]) {
  const r = execute(
    '$task.fetch({url:"https://test/"}).then(()=>{throw Error("must reject");}).catch(e=>$done({body:String(!!e.error)}));',
    "qx",
    "surge",
    {
      $response: {},
      $httpClient: {
        get: (_o: any, cb: any) =>
          reason ? cb(reason) : cb(null, undefined, undefined),
      },
    },
  );
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(r.out.body, "true");
}
const parallel = execute(
  'Promise.all([1,2,3].map(i=>$task.fetch({url:"https://test/"+i}))).then(r=>$done({body:r.map(x=>x.body).join(",")}));',
  "qx",
  "surge",
  {
    $response: {},
    $httpClient: {
      get: (o: any, cb: any) =>
        setTimeout(
          () => cb(null, { status: 200, headers: {} }, o.url.slice(-1)),
          0,
        ),
    },
  },
);
await new Promise((r) => setTimeout(r, 10));
assert.equal(parallel.out.body, "1,2,3");
for (const to of ["qx", "surge"] as const) {
  let seen: any;
  const native: any =
    to === "qx"
      ? {
          $task: {
            fetch: (o: any) => {
              seen = o;
              return Promise.resolve({
                statusCode: 200,
                headers: {},
                body: "text",
                bodyBytes: new ArrayBuffer(1),
              });
            },
          },
        }
      : {
          $httpClient: {
            post: (o: any, cb: any) => {
              seen = o;
              cb(null, { status: 200, headers: {} }, "text");
            },
          },
        };
  const r = execute(
    "$httpClient.post({url:input,timeout:2500},(error,response,data)=>$done({body:data+response.status}));",
    "loon",
    to,
    { input: "https://test/", $response: {}, ...native },
  );
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(r.out.body, "text200");
  assert.equal(
    to === "qx" ? seen.timeout : seen.timeout,
    to === "qx" ? undefined : 2.5,
  );
}
// Typed binary views retain their slice; text response API is available too.
const backing = new Uint8Array([9, 65, 66, 8]);
const binary = execute(
  '$task.fetch({url:"https://test/"}).then(r=>$done({body:r.body+":"+Array.from(new Uint8Array(r.bodyBytes)).join()}));',
  "qx",
  "surge",
  {
    $response: {},
    $httpClient: {
      get: (_o: any, cb: any) =>
        cb(null, { status: 200, headers: {} }, backing.subarray(1, 3)),
    },
  },
);
await new Promise((r) => setTimeout(r, 0));
assert.equal(binary.out.body, "AB:65,66");
// Dynamic storage keys/values, default source identity, deletion and native absence.
for (const [from, to] of directions) {
  const writes: any[] = [];
  const nativeStore = {
      read: () => undefined,
      write: (v: any, k: any) => {
        writes.push([v, k]);
        return true;
      },
    },
    prefs = {
      valueForKey: () => undefined,
      setValueForKey: (v: any, k: any) => {
        writes.push([v, k]);
        return true;
      },
      removeValueForKey: (k: any) => {
        writes.push([null, k]);
        return true;
      },
    };
  const body =
    from === "qx"
      ? 'const api=$prefs;const key=input;api.setValueForKey("",key);api.removeValueForKey(key);$done({body:String(api.valueForKey(key))});'
      : 'const api=$persistentStore;const key=input;api.write("",key);api.write(undefined,key);api.write("named");$done({body:String(api.read(key))});';
  const r = execute(body, from, to, {
    input: "dynamic/key",
    $response: {},
    $prefs: prefs,
    $persistentStore: nativeStore,
  });
  assert.equal(r.out.body, "undefined");
  assert.deepEqual(writes.slice(0, 2), [
    ["", "dynamic/key"],
    [null, "dynamic/key"],
  ]);
  if (from === "loon") assert.deepEqual(writes[2], ["named", "source-name"]);
}
// Unknown QX notification parameters are omitted after construction, on native
// and converted branches; errors are propagated instead of catch-and-pass.
for (const to of ["qx", "surge"]) {
  let call: any;
  const r = execute(
    'let n=0;$notify("t","s","b",{x:++n},++n);$done({body:String(n)});',
    "qx",
    to,
    {
      $response: {},
      $notify: (...a: any[]) => (call = a),
      $notification: { post: (...a: any[]) => (call = a) },
    },
  );
  assert.equal(call.length, 3);
  assert.equal(r.out.body, "2");
}
assert.throws(
  () =>
    execute('throw Error("business failure");', "qx", "surge", {
      $response: {},
    }),
  /business failure/,
);
// Mutable and dynamically constructed completion results are API inputs.
const changed = execute(
  '$response.body="changed";const response=$response;const done=globalThis.$done;done(response);',
  "qx",
  "surge",
  { $response: { status: 200, headers: {}, body: "original" } },
);
assert.equal(changed.out.body, "changed");
const echo = execute(
  "$done(JSON.parse(input));",
  "qx",
  "surge",
  { input: '{"status":"HTTP/1.1 204 No Content","body":""}', $request: {} },
  "echo",
);
assert.equal(echo.out.response.status, 204);
// Common file/native source branches use exactly the same API runtime.
const common = universal(
  "const local={x:1};$done({body:$response.body+local.x});",
  "loon",
  [{ phase: "response", responseBody: true }],
);
assert.equal(common.status, "universal");
for (const to of ["qx", "surge", "loon"]) {
  let result: any;
  vm.runInNewContext(common.code!, {
    setTimeout,
    $response: { body: "v" },
    $done: (v: any) => (result = v),
    ...(to === "qx"
      ? { $task: { fetch() {} } }
      : to === "loon"
        ? { $loon: "actual" }
        : { $environment: { "surge-version": "actual" } }),
  });
  assert.equal(result.body, "v1");
}
// Isolated transport/backup integration uses a synthetic API program, not a
// repository adblock fixture to decide which source syntax may be converted.
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-runtime-api-"));
try {
  const qx = "Adblock/Quantumult X/runtime.snippet",
    surge = "Adblock/Surge/runtime.sgmodule",
    url = "https://author.test/runtime.js",
    source =
      "class A{done(value){$done(value)}}new A().done(JSON.parse($response.body));";
  for (const file of [qx, surge])
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(
    path.join(root, qx),
    "# Managed by: WayX Native QX\n^https://test/ url script-response-body " +
      url +
      "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "# Managed by: WayX Native QX\n[Script]\nA=type=http-response,pattern=^https://test/,requires-body=true,script-path=" +
      url +
      "\n",
  );
  const r = await refreshSourceBackups(root, {
    catalog: [],
    resources: {
      cachedBytes: async () => null,
      fetchBytes: async () => Buffer.from(source),
    },
    log: () => {},
  });
  assert.equal(r.scriptApi.universal, 1);
  assert.deepEqual(await validateSourceBackups(root), []);
  const index = JSON.parse(
    await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
  );
  assert.equal(
    await fs.readFile(path.join(root, index.latest[url]), "utf8"),
    source,
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "Generic Script API runtime contracts passed: dynamic Env/values, Header traps, seven methods/concurrency/failures, storage, notifications, binary views, completions and backup composition",
);

// Source API presence remains stable across actual target hosts; local bindings
// and global API hooks remain ordinary JavaScript rather than AST rewrites.
for (const [from, to] of directions) {
  const source =
    from === "qx"
      ? "function Env(){this.read=k=>$prefs.valueForKey(k);this.done=v=>$done(v);}const env=new Env();const key=input;env.done({body:env.read(key)});"
      : 'class Env{isLoon(){return typeof $loon!=="undefined";}read(k){return $persistentStore.read(k);}done(v){$done(v)}}const env=new Env();if(!env.isLoon())throw Error("wrong facade");env.done({body:env.read(input)});';
  const r = execute(source, from, to, {
    input: "dynamic",
    $response: {},
    $persistentStore: { read: () => "value" },
    $prefs: { valueForKey: () => "value" },
  });
  assert.equal(r.out.body, "value");
  const shadow = execute(
    'const $request={url:"author-local"};const __wayxScope="author";$done({body:$request.url+__wayxScope});',
    from,
    to,
    { $response: {} },
  );
  assert.equal(shadow.out.body, "author-localauthor");
}
const hooked = execute(
  'const original=$done;globalThis.$done=value=>{value.body+=" hook";original(value)};$done({body:"value"});',
  "qx",
  "surge",
  { $response: {} },
);
assert.equal(hooked.out.body, "value hook");
const strict = execute(
  '"use strict";const obj={x:"receiver",method(){return this.x;}};$done({body:obj.method()});',
  "qx",
  "surge",
  { $response: {} },
);
assert.equal(strict.out.body, "receiver");

for (const [from, to] of directions) {
  const sliced = new Uint8Array([9, 1, 2, 8]).subarray(1, 3);
  let sent: any;
  const method =
    from === "qx"
      ? '$task.fetch({url:"https://test/",method:"POST",body:payload}).then(r=>$done({}));'
      : '$httpClient.post({url:"https://test/",body:payload},()=> $done({}));';
  execute(method, from, to, {
    payload: sliced,
    $response: {},
    $task: {
      fetch: (o: any) => {
        sent = o.body;
        return Promise.resolve({ statusCode: 200, headers: {}, body: "" });
      },
    },
    $httpClient: {
      post: (o: any, cb: any) => {
        sent = o.body;
        cb(null, { status: 200, headers: {} }, "");
      },
    },
  });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    Array.from(sent instanceof ArrayBuffer ? new Uint8Array(sent) : sent),
    [1, 2],
  );
}

// Modified: 2026-11-02 (chance). Failed completion validation does not consume
// the one native submission; native submission errors are not swallowed.
for (const [from, to] of directions) {
  let calls = 0;
  let submitted: any;
  execute(
    'try{$done({status:"invalid"})}catch(e){$done({body:"fallback"})}$done({body:"duplicate"});',
    from,
    to,
    {
      $response: {},
      $done: (value: any) => {
        calls++;
        submitted = value;
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(submitted.body, "fallback");
  const error = Error("native completion failed");
  assert.throws(
    () =>
      execute('$done({body:"valid"});', from, to, {
        $response: {},
        $done: () => {
          throw error;
        },
      }),
    (e) => e === error,
  );
}
// Native QX text is authoritative even when bytes are available. Foreign binary
// responses decode explicit charsets or fail instead of silently corrupting text.
const nativeText = execute(
  "$task.fetch({url:input}).then(r=>$done({body:r.body}));",
  "qx",
  "qx",
  {
    input: "https://test/",
    $response: {},
    $task: {
      fetch: () =>
        Promise.resolve({
          statusCode: 200,
          headers: { "Content-Type": "text/plain; charset=windows-1252" },
          body: "café",
          bodyBytes: new Uint8Array([99, 97, 102, 233]).buffer,
        }),
    },
  },
);
await new Promise((r) => setTimeout(r, 0));
assert.equal(nativeText.out.body, "café");
for (const decoder of [undefined, TextDecoder]) {
  for (const [encoding, data, expected] of [
    ["utf-8", new TextEncoder().encode("✓"), "✓"],
    ["windows-1252", new Uint8Array([233]), "é"],
  ] as const) {
    const r = execute(
      '$task.fetch({url:input}).then(r=>$done({body:r.body})).catch(e=>$done({body:e.code+":"+e.encoding}));',
      "qx",
      "surge",
      {
        input: "https://test/",
        $response: {},
        TextDecoder: decoder,
        $httpClient: {
          get: (_o: any, cb: any) =>
            cb(
              null,
              {
                status: 200,
                headers: {
                  "CONTENT-TYPE": 'text/plain; charset="' + encoding + '"',
                },
              },
              data,
            ),
        },
      },
    );
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(
      r.out.body,
      encoding === "windows-1252" && !decoder
        ? "UNSUPPORTED_RESPONSE_CHARSET:windows-1252"
        : expected,
    );
  }
}
let omitted: any;
const effects: string[] = [];
execute(
  '$task.fetch({url:input,get bodyBytes(){effects.push("getter");return bytes;},timeout:(effects.push("timeout"),5),opts:{unknown:(effects.push("opts"),true)}}).then(()=>$done({}));',
  "qx",
  "surge",
  {
    input: "https://test/",
    bytes: new Uint8Array([8]).buffer,
    effects,
    $response: {},
    $httpClient: {
      get: (o: any, cb: any) => {
        omitted = o;
        cb(null, { status: 200, headers: {} }, "");
      },
    },
  },
);
await new Promise((r) => setTimeout(r, 0));
assert.equal(omitted.bodyBytes, undefined);
assert.equal(omitted.body, undefined);
assert.equal(omitted.timeout, undefined);
assert.deepEqual(effects, ["timeout", "opts"]); // Unknown getter is not an API argument.
// A getter on a documented field is evaluated by the API boundary normally.
for (const to of ["qx", "surge"] as const) {
  let sent: any;
  const native =
    to === "qx"
      ? {
          $task: {
            fetch: (o: any) => {
              sent = o;
              return Promise.resolve({
                statusCode: 200,
                headers: {},
                body: "",
              });
            },
          },
        }
      : {
          $httpClient: {
            post: (o: any, cb: any) => {
              sent = o;
              cb(null, { status: 200, headers: {} }, "");
            },
          },
        };
  const r = execute(
    '$httpClient.post({url:input,body:encoded,"body-base64":true},()=>{const zipped=$utils.gzip(new Uint8Array([1,2,3]));$done({body:Array.from($utils.ungzip(zipped)).join(",")});});',
    "loon",
    to,
    {
      input: "https://test/",
      encoded: Buffer.from([0, 128, 255]).toString("base64"),
      $response: {},
      ...native,
    },
  );
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(
    Array.from(
      sent.body instanceof ArrayBuffer ? new Uint8Array(sent.body) : sent.body,
    ),
    [0, 128, 255],
  );
  assert.equal(sent["body-base64"], undefined);
  assert.equal(r.out.body, "1,2,3");
  assert.ok(
    r.p.operationIR?.operations.some((o: any) => o.rule === "compression.gzip"),
  );
}
assert.throws(
  () =>
    execute(
      '$httpClient.post({url:input,body:bytes,"body-base64":true},()=>{});',
      "loon",
      "surge",
      { input: "https://test/", bytes: new Uint8Array([1]), $response: {} },
    ),
  /String body/,
);

// Modified: 2026-11-02 (chance). Inventories name missing providers without
// blocking author feature detection; unrelated target APIs are not substituted.
for (const to of ["qx", "surge"] as const) {
  const r = execute(
    '$done({body:[typeof $crypto,typeof $dns,typeof $utils.gzip].join(":")});if(false){$crypto.aes.encrypt(data,options);$dns.query(options,callback);$utils.geoip(ip);new URL(input);}',
    "loon",
    to,
    { $response: {}, $crypto: { unrelated: true }, $dns: { unrelated: true } },
  );
  assert.equal(r.out.body, "undefined:undefined:function");
  const operations = r.p.operationIR.operations;
  for (const rule of ["crypto.aes.encrypt", "dns.query", "ip.geoip"])
    assert.equal(
      operations.find((o) => o.rule === rule)?.target.capability,
      "unavailable",
    );
  assert.equal(
    operations.find((o) => o.rule === "standard.URL")?.target.capability,
    "native-only",
  );
}
const nativeUtils = {
  gzip: (v: any) => v,
  ungzip: (v: any) => v,
  geoip() {
    assert.equal(this, nativeUtils);
    return "native";
  },
};
const cryptoRef = { aes: {} };
const dnsRef = { query() {} };
const nativeServices = execute(
  '$done({body:$utils.geoip("1.1.1.1")+":"+String($crypto===cryptoRef)+":"+String($dns===dnsRef)});',
  "loon",
  "loon",
  {
    $response: {},
    $utils: nativeUtils,
    $crypto: cryptoRef,
    $dns: dnsRef,
    cryptoRef,
    dnsRef,
  },
);
assert.equal(nativeServices.out.body, "native:true:true");

// Modified: 2026-11-02 (chance). SDK request routing is a per-fetch field;
// clear-all is preserved only where the native source store actually offers it.
for (const to of ["qx", "surge"] as const) {
  let request: any;
  const native =
    to === "qx"
      ? {
          $task: {
            fetch: (o: any) => {
              request = o;
              return Promise.resolve({
                statusCode: 200,
                headers: {},
                body: "",
              });
            },
          },
        }
      : {
          $httpClient: {
            get: (o: any, cb: any) => {
              request = o;
              cb(null, { status: 200, headers: {} }, "");
            },
          },
        };
  execute(
    '$httpClient.get({url:input,node:"DIRECT"},()=> $done({}));',
    "loon",
    to,
    { input: "https://test/", $response: {}, ...native },
  );
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(
    to === "qx" ? request.opts.policy : request.policy,
    to === "qx" ? "direct" : "DIRECT",
  );
  assert.equal(request.node, undefined);
}
let cleared = 0;
const nativePrefs = {
  removeAllValues() {
    assert.equal(this, nativePrefs);
    cleared++;
    return true;
  },
};
const clear = execute(
  "$done({body:String($prefs.removeAllValues())});",
  "qx",
  "qx",
  { $response: {}, $prefs: nativePrefs },
);
assert.equal(clear.out.body, "true");
assert.equal(cleared, 1);
const unavailableClear = execute(
  "$done({body:typeof $prefs.removeAllValues});",
  "qx",
  "surge",
  { $response: {}, $persistentStore: {} },
);
assert.equal(unavailableClear.out.body, "undefined");
