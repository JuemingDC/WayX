// Modified: 2026-11-02 (chance). Generated-program fixtures follow source-specific authorized conversion hosts.
// Modified: 2026-11-02 (chance). Typed Surge arguments retain false/zero/empty
// values; QX omissions use safe author defaults, and binary inputs keep view ranges.
import assert from "node:assert/strict";
import vm from "node:vm";
import { planUniversalAdblockScript } from "../src/parser/universal-script.ts";
import { planScriptApiConversion } from "../src/parser/script-api.ts";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshSourceBackups } from "../src/application/backups.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
const schema = {
  kind: "object" as const,
  fields: {
    flag: "boolean" as const,
    number: "number" as const,
    text: "string" as const,
  },
};
const source =
  'const flag=$argument?.flag!==undefined?$argument.flag:true;const number=$argument?.number!==undefined?$argument.number:5;const text=$argument?.text!==undefined?$argument.text:"default";$done({body:JSON.stringify({flag,number,text})});';
const plan = planUniversalAdblockScript(source, "loon", [
  { phase: "response", argumentSchema: schema },
]);
assert.equal(plan.status, "universal", JSON.stringify(plan.problems));
assert.deepEqual((plan.contexts as any).response.qx.omittedParameters, [
  "$argument",
]);
for (const target of ["qx", "surge", "loon"]) {
  let result: any;
  vm.runInNewContext(plan.code!, {
    setTimeout,
    $response: { body: "x" },
    $done: (v: any) => (result = v),
    $argument:
      target === "surge"
        ? ' {"flag":false,"number":0,"text":""} '
        : { flag: false, number: 0, text: "" },
    ...(target === "qx"
      ? { $task: { fetch() {} } }
      : target === "loon"
        ? { $loon: "test" }
        : { $environment: { "surge-version": "test" } }),
  });
  assert.deepEqual(
    JSON.parse(result.body),
    target === "qx"
      ? { flag: true, number: 5, text: "default" }
      : { flag: false, number: 0, text: "" },
  );
}
assert.throws(
  () =>
    vm.runInNewContext(plan.code!, {
      setTimeout,
      $environment: { "surge-version": "test" },
      $response: {},
      $argument: '{"flag":"false","number":0,"text":""}',
      $done() {},
    }),
  /type mismatch/,
);
assert.throws(
  () =>
    vm.runInNewContext(plan.code!, {
      setTimeout,
      $environment: { "surge-version": "test" },
      $response: {},
      $done() {},
    }),
  /argument missing/,
);
for (const bad of [
  "$done({body:$argument.flag});",
  'const arg=typeof $argument==="object"?$argument:null;process(arg);$done({});',
  "const f=()=>{return $argument?.flag};leak(f());$done({});",
])
  assert.equal(
    planUniversalAdblockScript(bad, "loon", [
      { phase: "response", argumentSchema: schema },
    ]).status,
    "blocked",
    bad,
  );
for (const from of ["loon"]) {
  const bytesSource =
    "const b=$response.body;$done({body:b.subarray(1,b.length-1)});";
  const binary = planUniversalAdblockScript(bytesSource, from as any, [
    { phase: "response", binary: true },
  ]);
  assert.equal(binary.status, "universal", JSON.stringify(binary.problems));
  for (const target of ["qx", "surge", "loon"]) {
    let result: any;
    const raw = new Uint8Array([99, 3, 1, 2, 4, 88]),
      slice = raw.subarray(1, 5);
    vm.runInNewContext(binary.code!, {
      setTimeout,
      Uint8Array,
      ArrayBuffer,
      $response:
        target === "qx"
          ? {
              bodyBytes: slice.buffer.slice(
                slice.byteOffset,
                slice.byteOffset + slice.byteLength,
              ),
              statusCode: 200,
            }
          : { body: slice, status: 200 },
      $done: (v: any) => (result = v),
      ...(target === "qx"
        ? { $task: { fetch() {} } }
        : target === "loon"
          ? { $loon: "test" }
          : { $environment: { "surge-version": "test" } }),
    });
    assert.deepEqual(
      [...new Uint8Array(target === "qx" ? result.bodyBytes : result.body)],
      [1, 2],
    );
  }
  assert.throws(
    () =>
      vm.runInNewContext(binary.code!, {
        setTimeout,
        Uint8Array,
        ArrayBuffer,
        $task: { fetch() {} },
        $response: { body: "wrong" },
        $done() {},
      }),
    /requires QX ArrayBuffer/,
  );
}
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-argument-binding-"));
try {
  for (const p of ["Resource/Loon", "Adblock/Quantumult X", "Adblock/Surge"])
    await fs.mkdir(path.join(root, p), { recursive: true });
  const scriptUrl = "https://author.test/settings.js",
    entry = {
      id: "settings",
      file: "settings.lpx",
      source: "https://author.test/settings.lpx",
      qx: "settings.snippet",
      surge: "settings.sgmodule",
    };
  const plugin = Buffer.from(
    '[Argument]\nflag=switch,false,true\nnumber=select,0,5,type=number\ntext=select,"",x\n[Script]\nresponse if ${url} ~= /^https:\\/\\/fixture\\.test\\// then script("' +
      scriptUrl +
      '", {${flag},${number},${text}}) with requires_body=true\n',
  );
  await fs.writeFile(path.join(root, "Resource/Loon/settings.lpx"), plugin);
  const qx = "Adblock/Quantumult X/settings.snippet",
    surge = "Adblock/Surge/settings.sgmodule";
  await fs.writeFile(
    path.join(root, qx),
    "^https://fixture\\.test/ url script-response-body " + scriptUrl + "\n",
  );
  await fs.writeFile(
    path.join(root, surge),
    "S=type=http-response,pattern=^https://fixture\\.test/,script-path=" +
      scriptUrl +
      ',requires-body=true,argument="{\\"flag\\":false,\\"number\\":0,\\"text\\":\\"\\"}"\n',
  );
  const resources = {
    cachedBytes: async (u: string) => (u === entry.source ? plugin : null),
    fetchBytes: async () => Buffer.from(source),
  };
  await refreshSourceBackups(root, {
    catalog: [entry],
    resources,
    log: () => {},
  });
  const report = JSON.parse(
    await fs.readFile(
      path.join(root, "Resource/Backup/script-api-status.json"),
      "utf8",
    ),
  );
  assert.equal(report.universal, 1, JSON.stringify(report.diagnostics));
  assert.equal(report.adapted, 2);
  assert.ok(
    report.diagnostics.every((d: any) =>
      d.omittedParameters.includes("$argument"),
    ),
  );
  assert.equal((await validateSourceBackups(root)).length, 0);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
// Source Loon permits undefined deletion; pristine JSON.stringify has exactly
// String/undefined outcomes, while source QX and Surge still need String proof.
for (const value of ["unknown", "undefined", "{n:1}"]) {
  const s = `$persistentStore.write(JSON.stringify(${value}),"key");$done({});`;
  assert.equal(
    planScriptApiConversion(s, { from: "loon", to: "qx", phase: "response" })
      .status,
    "adapted",
  );
  if (value !== "{n:1}")
    assert.equal(
      planScriptApiConversion(s, { from: "surge", to: "qx", phase: "response" })
        .status,
      "blocked",
    );
}
const read =
  'const value=$persistentStore.read("key");if(typeof value==="string"&&value.length>10)$done({});else $done({body:value||"missing"});';
assert.equal(
  planUniversalAdblockScript(read, "loon", [{ phase: "response" }]).status,
  "universal",
);
assert.equal(
  planUniversalAdblockScript(read.replace('"string"', '"undefined"'), "loon", [
    { phase: "response" },
  ]).status,
  "blocked",
);
console.log(
  "Argument/binary flow passed: native typed settings, QX safe defaults and omission metadata, source schema transactions, exact binary slices and storage String/undefined semantics",
);

for (const expression of ["undefined", "{toJSON(){return undefined}}"]) {
  const program = planUniversalAdblockScript(
    `const result=$persistentStore.write(JSON.stringify(${expression}),"key");$done({body:JSON.stringify({result})});`,
    "loon",
    [{ phase: "response" }],
  );
  assert.equal(program.status, "universal", JSON.stringify(program.problems));
  for (const target of ["qx", "surge", "loon"]) {
    const map = new Map([["key", "old"]]);
    let result: any;
    vm.runInNewContext(program.code!, {
      setTimeout,
      $response: { body: "" },
      $persistentStore: {
        write: (v: any, k: string) => {
          assert.ok(v == null);
          return map.delete(k);
        },
      },
      $prefs: { removeValueForKey: (k: string) => map.delete(k) },
      $done: (v: any) => (result = v),
      ...(target === "qx"
        ? { $task: { fetch() {} } }
        : target === "loon"
          ? { $loon: "test" }
          : { $environment: { "surge-version": "test" } }),
    });
    assert.equal(map.has("key"), false);
    assert.equal(JSON.parse(result.body).result, true);
  }
}

const textProgram = planUniversalAdblockScript(
  "$done({body:JSON.stringify(JSON.parse($response.body))});",
  "loon",
  [{ phase: "response" }],
);
assert.equal(textProgram.status, "universal");
let preserved: any;
vm.runInNewContext(textProgram.code!, {
  setTimeout,
  Uint8Array,
  ArrayBuffer,
  $task: { fetch() {} },
  $response: {
    body: '{"text":true}',
    bodyBytes: new Uint8Array([0, 255]).buffer,
  },
  $done: (v: any) => (preserved = v),
});
assert.equal(
  preserved.body,
  '{"text":true}',
  "available bytes must never overwrite an explicitly text declaration",
);
assert.equal(
  planUniversalAdblockScript("$done({body:$response.body});", "loon", [
    { phase: "response", binaryKnown: false },
  ]).status,
  "blocked",
  "unknown declaration mode is not silently text",
);

const ternaryRead =
  'const v=$persistentStore.read("key");$done({body:typeof v==="string"?v:"missing"});';
assert.equal(
  planUniversalAdblockScript(ternaryRead, "loon", [{ phase: "response" }])
    .status,
  "universal",
);
