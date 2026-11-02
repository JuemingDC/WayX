// Modified: 2026-11-02 (chance). Maintain API contracts independently of local
// plugin/script contents: dynamic inputs, Env receivers, all methods and failures.
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import {
  isExcludedAdblockScriptApi,
  scriptApiDefinitions,
} from "../src/domain/script-api.ts";
import { scriptConversionPriorities } from "../src/parser/script-api-mapping.ts";
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
  const source = `// Modified: author note must survive\n/* Original author license */\nclass Env{constructor(){this.values=[];}read(message){const k=['bo','dy'].join('');return message[k];}done(v){const result={};result[['bo','dy'].join('')]=v;globalThis.$done(result);}}const env=new Env();env.done(env.read($response));`;
  const r = execute(source, from, to, {
    $response: { body: "dynamic ✓", status: 201, statusCode: 201 },
  });
  assert.equal(r.out.body, "dynamic ✓");
  assert.ok(r.p.code!.includes(source));
  assert.match(r.p.code!, /Adapter: GPL-3.0-only/);
  assert.doesNotMatch(r.p.code!, /Modified: 2026-11-02 \(chance\)/);
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
    assert.equal(r.out.body, expected);
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

// Modified: 2026-11-02 (chance). Shared providers are advertised as runtime
// capabilities without blocking author feature detection or reusing target APIs.
for (const to of ["qx", "surge"] as const) {
  const r = execute(
    '$done({body:[typeof $crypto,typeof $utils.gzip].join(":")});if(false){$crypto.aes.encrypt(data,options);new URL(input);}',
    "loon",
    to,
    { $response: {}, $crypto: { unrelated: true } },
  );
  assert.equal(r.out.body, "object:function");
  const operations = r.p.operationIR.operations;
  for (const rule of ["crypto.aes.encrypt"])
    assert.equal(
      operations.find((o) => o.rule === rule)?.target.capability,
      "runtime",
    );
  assert.equal(
    operations.find((o) => o.rule === "standard.URL")?.target.capability,
    "runtime",
  );
}
const nativeUtils = {
  gzip: (v: any) => v,
  ungzip: (v: any) => v,
  marker: "native",
};
const cryptoRef = { aes: { encrypt() {}, decrypt() {} } };
const nativeServices = execute(
  '$done({body:$utils.marker+":"+String($crypto===cryptoRef)+":"+String($utils===utilsRef)});',
  "loon",
  "loon",
  {
    $response: {},
    $utils: nativeUtils,
    $crypto: cryptoRef,
    cryptoRef,
    utilsRef: nativeUtils,
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
assert.equal(unavailableClear.out.body, "function");

// Modified: 2026-11-02 (chance). Excluded SDK services do not become missing
// adblock APIs; nested in-scope expressions still appear in the API inventory.
for (const [from, to] of directions) {
  const read = from === "qx" ? "$prefs.valueForKey" : "$persistentStore.read";
  const source = `if(false){$dns.query({domain:${read}("host")},()=>{});globalThis.$dns.query(options,callback);$utils.geoip(ip);window.$utils.ipasn(ip);global.$utils.ipaso(ip);}$done({body:"adblock"});`;
  const result = execute(source, from, to, { $response: {} });
  assert.equal(result.out.body, "adblock");
  assert.ok(result.p.code!.includes(source));
  assert.ok(result.p.features.includes(read));
  assert.ok(!result.p.features.some(isExcludedAdblockScriptApi));
  assert.ok(
    !result.p.operationIR.operations.some((o) =>
      isExcludedAdblockScriptApi(o.source.api),
    ),
  );
}
assert.ok(
  !scriptApiDefinitions.some((d) =>
    Object.values(d.source).some(
      (api) => api && isExcludedAdblockScriptApi(api),
    ),
  ),
);
const excludedPriorities = scriptConversionPriorities([
  {
    status: "blocked",
    sourceUrl: "synthetic:excluded",
    problems: [{ api: "$dns.query" }, { api: "$utils.geoip" }],
  },
  {
    status: "blocked",
    sourceUrl: "synthetic:mixed",
    problems: [{ api: "$utils.ipasn" }, { api: "syntax" }],
  },
]);
assert.equal(excludedPriorities.blockedSources, 1);
assert.equal(
  excludedPriorities.families.find((f) => f.family === "engine")
    ?.affectedSources,
  0,
);
assert.equal(
  excludedPriorities.families.find((f) => f.family === "profile")
    ?.affectedSources,
  1,
);

// Modified: 2026-11-02 (chance). Complete supported Loon options without
// inventing target behavior; QX omissions preserve argument construction.
for (const to of ["qx", "surge"] as const) {
  let cleared = 0;
  const run = () =>
    execute("$persistentStore.remove();$done({});", "loon", to, {
      $response: {},
      $prefs: {
        removeAllValues() {
          cleared++;
        },
      },
      $persistentStore: {},
    });
  if (to === "qx") {
    run();
    assert.equal(cleared, 1);
  } else {
    run();
    assert.equal(cleared, 0);
  }
}
let notice: any;
execute(
  '$notification.post("title","subtitle","body",{clipboard:input});$done({});',
  "loon",
  "surge",
  {
    input: "copy me",
    $response: {},
    $notification: {
      post(...args: any[]) {
        notice = args;
      },
    },
  },
);
assert.deepEqual(flat(notice[3]), {});
for (const option of [
  { openUrl: "https://test/", clipboard: "both" },
  { mediaUrl: "data:image/png;base64,AA==" },
]) {
  execute(
    '$notification.post("t","s","b",option,500);$done({body:"ok"});',
    "loon",
    "surge",
    {
      $response: {},
      option,
      $notification: {
        post(...args: any[]) {
          assert.deepEqual(flat(args[3]), {});
        },
      },
    },
  );
}
let surgeRequest: any;
execute(
  '$httpClient.get({url:input,alpn:"h2"},()=> $done({}));',
  "loon",
  "surge",
  {
    input: "https://test/",
    $response: {},
    $httpClient: {
      get(o: any, cb: any) {
        surgeRequest = o;
        cb(null, { status: 200, headers: {} }, "");
      },
    },
  },
);
assert.equal(surgeRequest.alpn, undefined);
let qxRequest: any;
execute(
  '$httpClient.get({url:input,alpn:"h2",unknown:(effects.push(1),true)},()=> $done({abort:true,body:"done"}));',
  "loon",
  "qx",
  {
    input: "https://test/",
    effects: [],
    $response: {},
    $task: {
      fetch: (o: any) => {
        qxRequest = o;
        return Promise.resolve({ statusCode: 200, headers: {}, body: "" });
      },
    },
  },
);
await new Promise((r) => setTimeout(r, 0));
assert.equal(qxRequest.alpn, undefined);
const qxUnknown = execute(
  '$done({abort:true,body:"kept",unknown:1});',
  "loon",
  "qx",
  { $response: {} },
);
assert.deepEqual(flat(qxUnknown.out), { body: "kept" });
for (const to of ["qx", "surge"] as const) {
  const action = () =>
    execute(
      '$done({body:"value",h2_trailers:{"grpc-status":"0"}});',
      "loon",
      to,
      { $response: {} },
    );
  if (to === "qx") assert.deepEqual(flat(action().out), { body: "value" });
  else assert.deepEqual(flat(action().out), { body: "value" });
}
// Excluded services are never read by the host capture or rewritten body.
const scoped = pair("if(false)$dns.query(options,callback);$done({});", {
  from: "loon",
  to: "surge",
  phase: "response",
});
const bare: any = { $response: {}, $done() {} };
Object.defineProperty(bare, "$dns", {
  get() {
    throw Error("excluded API captured");
  },
});
vm.runInNewContext(scoped.code!, bare);
console.log(
  "SDK omission contracts passed: real QX clear-all, ignored Surge clear-all/click/delay/ALPN/trailers, inline notification media and excluded service isolation",
);
// Foreign-realm ArrayBuffers use the same completion and transport byte fields.
const foreignBuffer = vm.runInNewContext("new Uint8Array([9,1,2,8]).buffer");
const foreignResult = execute("$done({body:payload});", "loon", "qx", {
  $response: {},
  payload: foreignBuffer,
});
assert.deepEqual(
  Array.from(new Uint8Array(foreignResult.out.bodyBytes)),
  [9, 1, 2, 8],
);

// Modified: 2026-11-02 (chance). Source option construction still executes;
// omitted click metadata getters are never needed to post the notification.
for (const mediaUrl of ["iVBORw0KGgo=", "data:image/png;base64,iVBORw0KGgo="]) {
  let posted: any;
  const result = execute(
    '$notification.post("t","s","b",options,2000);$done({body:"continued"});',
    "loon",
    "surge",
    {
      $response: {},
      options: {
        mediaUrl,
        get openUrl() {
          throw Error("ignored click option");
        },
      },
      $notification: {
        post(...args: any[]) {
          posted = args;
        },
      },
    },
  );
  assert.equal(result.out.body, "continued");
  assert.deepEqual(flat(posted[3]), {
    "media-base64": "iVBORw0KGgo=",
    "media-base64-mime": "image/png",
  });
}
const clearing = execute(
  '$prefs.removeAllValues();$done({body:"continued"});',
  "qx",
  "surge",
  {
    $response: {},
    $persistentStore: {
      write() {
        throw Error("must not delete keys");
      },
    },
  },
);
assert.equal(clearing.out.body, "continued");
