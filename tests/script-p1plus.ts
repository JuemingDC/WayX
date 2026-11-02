// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). Exercise P1+ codecs/HTTP shapes and explicit
// notification mapping without turning absent contracts into silent APIs.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript as universal } from "../src/parser/universal-script.ts";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
const profiles = [{ phase: "response" as const }];
const markers = (host: string) =>
  host === "qx"
    ? { $task: { fetch() {} } }
    : host === "loon"
      ? { $loon: "actual" }
      : { $environment: { "surge-version": "actual" } };
const codec =
  'const Encode=TextEncoder;const Decode=TextDecoder;const base=btoa;const unbase=atob;const e=new Encode();const d=new Decode("utf8");$done({body:d.decode(e.encode(unbase(base("hello"))))});';
const c = universal(codec, "loon", profiles);
assert.equal(c.status, "universal", JSON.stringify(c.problems));
for (const h of ["qx", "surge", "loon"]) {
  let out: any;
  vm.runInNewContext(c.code!, {
    setTimeout,
    $response: { body: "" },
    $done: (v: any) => (out = v),
    ...markers(h),
  });
  assert.equal(out.body, "hello");
}
for (const bad of [
  codec.replace("const Encode=", "let Encode="),
  codec.replace("const e=", "leak(Encode);const e="),
  codec.replace("new Encode()", "new Encode.constructor()"),
  codec.replace('new Decode("utf8")', 'new Decode("gbk")'),
])
  assert.equal(universal(bad, "loon", profiles).status, "blocked");
const note =
  '$notification.post("title","sub","body",{openUrl:"https://a.test/",mediaUrl:"https://a.test/image.png"},0);$done({body:$response.body});';
const n = universal(note, "loon", profiles);
assert.equal(n.status, "universal", JSON.stringify(n.problems));
for (const h of ["qx", "surge", "loon"]) {
  let call: any;
  vm.runInNewContext(n.code!, {
    setTimeout,
    $response: { body: "same" },
    $done() {},
    $notification: { post: (...a: any[]) => (call = a) },
    $notify: (...a: any[]) => (call = a),
    ...markers(h),
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(call)),
    h === "qx"
      ? ["title", "sub", "body"]
      : [
          "title",
          "sub",
          "body",
          h === "loon"
            ? {
                openUrl: "https://a.test/",
                mediaUrl: "https://a.test/image.png",
              }
            : {
                url: "https://a.test/",
                "media-url": "https://a.test/image.png",
              },
          ...(h === "loon" ? [0] : []),
        ],
  );
}
const dropped = pair(
  'let count=0;$notification.post("t","s","b",{mystery:++count},++count);$done({body:String(count)});',
  { from: "loon", to: "qx", phase: "response" },
);
assert.equal(dropped.status, "adapted", JSON.stringify(dropped.problems));
let calls: any, out: any;
vm.runInNewContext(dropped.code!, {
  setTimeout,
  $task: {},
  $response: { body: "" },
  $done: (v: any) => (out = v),
  $notify: (...a: any[]) => (calls = a),
});
assert.equal(out.body, "2");
assert.equal(calls.length, 3);
assert.deepEqual(dropped.contract?.omittedParameters, [
  "notification.argument4",
  "notification.argument5",
]);
assert.equal(
  universal(note.replace("},0)", "},100)"), "loon", profiles).status,
  "blocked",
);
assert.equal(
  universal(note.replace("mediaUrl:", "clipboard:"), "loon", profiles).status,
  "blocked",
);
const request =
  'const URL="http://a.test/";const METHOD="POST";const UA="fixture";const PAYLOAD="abc";$task.fetch({url:URL,method:METHOD,headers:{"User-Agent":UA,"Accept":"*/*","Accept-Encoding":"identity","Content-Type":"text/plain"},body:PAYLOAD,opts:{"auto-cookie":false,redirection:false}}).then(({body:received,statusCode})=>$done({body:received+statusCode}));';
const p = universal(request, "qx", profiles);
assert.equal(p.status, "universal", JSON.stringify(p.problems));
for (const h of ["qx", "surge"]) {
  let done: any, options: any;
  const http = {
    post: (o: any, cb: any) => {
      options = o;
      cb(null, { status: 201 }, "reply");
    },
  };
  vm.runInNewContext(p.code!, {
    setTimeout,
    $response: { body: "original" },
    $done: (v: any) => (done = v),
    $httpClient: http,
    ...markers(h),
    ...(h === "qx"
      ? {
          $task: {
            fetch: (o: any) => {
              options = o;
              return Promise.resolve({ statusCode: 201, body: "reply" });
            },
          },
        }
      : {}),
  });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(done.body, "reply201");
  assert.equal(options.url, "http://a.test/");
  assert.equal(options.body, "abc");
}
for (const bad of [
  request.replace(
    "{body:received,statusCode}",
    '{body:received="default",statusCode}',
  ),
  request.replace("{body:received,statusCode}", "{body:received,...rest}"),
  request.replace(
    "{body:received,statusCode}",
    "{headers:received,statusCode}",
  ),
  request.replace('const METHOD="POST"', 'let METHOD="POST"'),
])
  assert.equal(universal(bad, "qx", profiles).status, "blocked");
console.log(
  "P1+ contracts passed: closed codec aliases, constant HTTP fields and destructured responses, notification URL/media mapping, evaluated-but-omitted QX options and failure boundaries",
);

const forwarded =
  'function finish(result){$done(result);}finish({body:$response.body+"!"});';
const f = universal(forwarded, "loon", profiles);
assert.equal(f.status, "universal", JSON.stringify(f.problems));
for (const h of ["qx", "surge", "loon"]) {
  let out: any;
  vm.runInNewContext(f.code!, {
    setTimeout,
    $response: { body: "original" },
    $done: (v: any) => (out = v),
    ...markers(h),
  });
  assert.equal(out.body, "original!");
}
for (const bad of [
  forwarded + "leak(finish);",
  forwarded.replace('finish({body:$response.body+"!"})', "finish(unknown)"),
  forwarded.replace("$done(result);", 'result.body="changed";$done(result);'),
  forwarded.replace("function finish(result)", "function finish(...result)"),
])
  assert.equal(universal(bad, "loon", profiles).status, "blocked");
