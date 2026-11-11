// Modified: 2026-11-11 (chance). Compare selected adapters with the full API
// kernel independently of source-specific fixtures; assert absent host modules.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
import { scriptApiRuntime } from "../src/emit/script-api-runtime.ts";
import { scriptCodecs } from "../src/emit/script-codecs.ts";
const directions = [
  ["loon", "qx"],
  ["loon", "surge"],
  ["qx", "surge"],
] as const;
async function observe(
  source: string,
  from: any,
  to: any,
  lean: boolean,
  body: any = "text ✓",
  phase: any = "response",
) {
  const events: any[] = [];
  let result: any, error: any;
  const globals: any = {
    input: "https://test/new",
    key: "read",
    api: "$persistentStore",
    Uint8Array,
    ArrayBuffer,
    DataView,
    setTimeout,
    clearTimeout,
    console,
    $request: { url: "https://test/original?x=1", headers: {} },
    ...(phase === "response"
      ? { $response: { status: 200, statusCode: 200, headers: {}, body } }
      : {}),
    $done: (value: any) => {
      events.push(["done", value]);
      result = value;
    },
    $persistentStore: {
      read: (key: any) => {
        events.push(["read", key]);
        return "stored";
      },
      write: (v: any, k: any) => {
        events.push(["write", v, k]);
        return true;
      },
    },
    $prefs: {
      valueForKey: (key: any) => {
        events.push(["read", key]);
        return "stored";
      },
      setValueForKey: (v: any, k: any) => {
        events.push(["write", v, k]);
        return true;
      },
    },
    $notification: {
      post: (...args: any[]) => events.push(["notify", ...args]),
    },
    $notify: (...args: any[]) => events.push(["notify", ...args]),
    $httpClient: {
      post: (o: any, cb: any) => {
        events.push(["http", o]);
        cb(null, { status: 200, headers: {} }, "ok");
      },
    },
    $task: {
      fetch: (o: any) => {
        events.push(["http", o]);
        return Promise.resolve({ statusCode: 200, headers: {}, body: "ok" });
      },
    },
  };
  const p = pair(source, {
    from,
    to,
    phase,
    responseBody: true,
    name: "source-name",
  });
  assert.notEqual(p.status, "blocked", JSON.stringify(p.problems));
  let program = p.code!;
  if (!lean) {
    const config = {
      from,
      to,
      phase,
      responseBody: true,
      name: "source-name",
      ...p.contract,
    };
    program = `(function(){const host={global:globalThis,request:typeof $request==='undefined'?undefined:$request,response:typeof $response==='undefined'?undefined:$response,done:$done,http:$httpClient,task:$task,store:$persistentStore,prefs:$prefs,notify:$notification,notifyQx:$notify,codecs:(${scriptCodecs})()};return (${scriptApiRuntime})(${JSON.stringify(config)},host,function(scope){with(scope){return(function(){${source}\n}).call(this);}});})();`;
  }
  try {
    vm.runInNewContext(program, globals, { timeout: 3000 });
  } catch (e: any) {
    error = { name: e.name, message: e.message };
  }
  await new Promise((r) => setTimeout(r, 0));
  const serial = (v: any) =>
    JSON.stringify(v, (_, value) =>
      ArrayBuffer.isView(value)
        ? Array.from(
            new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
          )
        : value instanceof ArrayBuffer
          ? Array.from(new Uint8Array(value))
          : value,
    );
  return { output: serial({ events, result, error }), code: p.code! };
}
for (const [from, to] of directions) {
  const store = from === "qx" ? "$prefs.valueForKey" : "$persistentStore.read";
  for (const source of [
    "$done({body:$response.body});",
    "let n=0;$done({body:String(++n)});$done({body:String(++n)});",
    'const $request={url:"local"};$done({body:$request.url});',
    `${store}("key");$done({body:"ok"});`,
    `const read=${store};$done({body:read("key")});`,
    "globalThis.$done({body:globalThis.$response.body});",
    "class Env{done(v){globalThis.$done({body:v});}}new Env().done($response.body);",
    from === "qx"
      ? '$notify("t","s","b",{"open-url":input});$done({});'
      : '$notification.post("t","s","b",{openUrl:input});$done({});',
    from === "qx"
      ? '$task.fetch({url:input,method:"POST",body:"x"}).then(r=>$done({body:r.body}));'
      : '$httpClient.post({url:input,body:"x"},(e,r,b)=>$done({body:b}));',
    'try{JSON.parse("invalid")}catch(e){$done({body:e.name})}',
    "$done({body:$custom});",
  ]) {
    const a = await observe(source, from, to, true),
      b = await observe(source, from, to, false);
    assert.equal(a.output, b.output, `${from}->${to}: ${source}`);
  }
  for (const body of [
    "",
    undefined,
    new Uint8Array([99, 1, 2, 98]).subarray(1, 3),
    new Uint8Array([0, 128, 255]).buffer,
  ]) {
    const source = "$done({body:$response.body});";
    assert.equal(
      (await observe(source, from, to, true, body)).output,
      (await observe(source, from, to, false, body)).output,
    );
  }
}
for (const to of ["qx", "surge"] as const) {
  const source =
    'const action=$persistentStore[key];$done({body:action("k")});';
  const lean = await observe(source, "loon", to, true);
  assert.equal(lean.output, (await observe(source, "loon", to, false)).output);
  assert.doesNotMatch(
    lean.code,
    /function taskFetch|function notify|class TextDecoder/,
  );
  const escape =
    'const g=globalThis;const read=g[api][key];$done({body:read("k")});';
  assert.equal(
    (await observe(escape, "loon", to, true)).output,
    (await observe(escape, "loon", to, false)).output,
  );
}
const body = await observe(
  "$done({body:$response.body});",
  "loon",
  "surge",
  true,
);
assert.doesNotMatch(
  body.code,
  /\bProxy\b|\bwith\s*\(|apiPlan|function notify|function transport|class TextDecoder/,
);
assert.ok(Buffer.byteLength(body.code) < 2500);
const store = await observe(
  '$persistentStore.read("key");$done({});',
  "loon",
  "surge",
  true,
);
assert.doesNotMatch(
  store.code,
  /function taskFetch|function notify|class TextDecoder|scriptCompression/,
);
// Strings/comments and local objects that happen to use API names add no modules.
const shadow = await observe(
  'const text="$httpClient $crypto TextDecoder";const $httpClient={};$done({body:text});',
  "loon",
  "surge",
  true,
);
assert.doesNotMatch(
  shadow.code,
  /function transport|class TextDecoder|function notify/,
);
console.log(
  "API selection passed: full-kernel differential outputs/events/errors, body/binary/aliases/dynamic globals and excluded helper modules",
);

const localThis = await observe(
  'class Item{get(){return "value";}}$done({body:new Item().get()});',
  "loon",
  "surge",
  true,
);
assert.ok(
  Buffer.byteLength(localThis.code) < 60000,
  "local receiver must not pull unrelated provider bundles",
);

assert.doesNotMatch(
  store.code,
  /new Proxy\(overlay|new Proxy\(host.global|\bwith\s*\(/,
  "static API bindings use lexical parameters",
);

const lexicalPlan = pair("$done({body:$custom});", {
  from: "loon",
  to: "surge",
  phase: "response",
  responseBody: true,
});
let lexicalValue: any;
vm.runInNewContext('const $custom="host lexical";' + lexicalPlan.code, {
  $response: { body: "x", status: 200 },
  $done: (v: any) => {
    lexicalValue = v;
  },
});
assert.equal(lexicalValue.body, "host lexical");

// Lazy URL probing must happen inside author control flow, including try/catch.
for (const source of [
  'if(false)new URL("https://test/");$done({body:"untouched"});',
  'try{new URL("https://test/")}catch(e){$done({body:e.message})}',
]) {
  const plan = pair(source, {
    from: "loon",
    to: "surge",
    phase: "response",
    responseBody: true,
  });
  let probes = 0,
    value: any;
  const globals: any = {
    $response: { body: "x", status: 200 },
    URLSearchParams,
    $done: (v: any) => {
      value = v;
    },
  };
  Object.defineProperty(globals, "URL", {
    get() {
      probes++;
      return class {
        constructor() {
          throw Error("lazy probe");
        }
      };
    },
  });
  vm.runInNewContext(plan.code!, globals);
  assert.equal(probes, source.startsWith("if") ? 0 : 2);
  assert.equal(
    value.body,
    source.startsWith("if") ? "untouched" : "lazy probe",
  );
}
