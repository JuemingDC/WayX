// Modified: 2026-11-02 (chance). Independent API contracts for pinned providers:
// cryptographic vectors, WHATWG URL state, legacy streaming codecs and failures.
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import vm from "node:vm";
import { aesProvider } from "../src/vendor/providers/aes.ts";
import { encodingProvider } from "../src/vendor/providers/encoding.ts";
import { urlProvider } from "../src/vendor/providers/url.ts";
import { scriptCrypto } from "../src/emit/script-crypto.ts";
import { scriptCodecs } from "../src/emit/script-codecs.ts";
import { planScriptApiConversion as pair } from "../src/parser/script-api.ts";
const manifest = JSON.parse(
  fs.readFileSync("vendor/script-api-providers/manifest.json", "utf8"),
);
for (const [name, factory] of Object.entries({
  aes: aesProvider,
  encoding: encodingProvider,
  url: urlProvider,
})) {
  assert.equal(
    crypto.createHash("sha256").update(factory).digest("hex"),
    manifest.providers[name].sha256,
  );
  assert.ok(
    factory.includes("Permission") || factory.includes("Redistribution"),
  );
  assert.ok(!/require\("(?:node:|fs|crypto|buffer|util)/.test(factory));
}
const create = vm.runInNewContext("(" + scriptCrypto + ")");
let initialized = 0;
const host = {
  aes: () => {
    initialized++;
    return vm.runInNewContext("(" + aesProvider + ")()");
  },
};
const api = create(host, { from: "loon", to: "surge" }).aes;
assert.equal(initialized, 0);
// NIST SP800-38A AES-128 ECB and SP800-38D zero-key GCM vectors.
const u = (hex: string) => new Uint8Array(Buffer.from(hex, "hex"));
assert.equal(
  Buffer.from(
    api.encrypt(u("6bc1bee22e409f96e93d7e117393172a"), {
      mode: "ecb",
      key: u("2b7e151628aed2a6abf7158809cf4f3c"),
      padding: "none",
    }).ciphertext,
  ).toString("hex"),
  "3ad77bb40d7a3660a89ecaf32466ef97",
);
const gcm = api.encrypt(new Uint8Array(16), {
  mode: "gcm",
  key: new Uint8Array(16),
  iv: new Uint8Array(12),
});
assert.equal(
  Buffer.from(gcm.ciphertext).toString("hex"),
  "0388dace60b6a392f328c2b971b2fe78",
);
assert.equal(
  Buffer.from(gcm.tag).toString("hex"),
  "ab6e47d42cec13bdf53a67b21257bddf",
);
for (const mode of ["ecb", "cbc", "ctr", "gcm"])
  for (const size of [16, 24, 32])
    for (const length of [0, 1, 15, 16, 17, 64]) {
      const key = crypto.randomBytes(size),
        iv =
          mode === "ecb"
            ? undefined
            : crypto.randomBytes(mode === "gcm" ? 12 : 16),
        aad = mode === "gcm" ? crypto.randomBytes(9) : undefined,
        data = crypto.randomBytes(length),
        before = Buffer.from(data);
      const options = { mode, key, iv, aad };
      const result = api.encrypt(data, options);
      const cipher = crypto.createCipheriv(
        "aes-" + size * 8 + "-" + mode,
        key,
        iv ?? null,
      );
      if (aad) cipher.setAAD(aad);
      const expected = Buffer.concat([cipher.update(data), cipher.final()]);
      assert.deepEqual(Buffer.from(result.ciphertext), expected);
      if (mode === "gcm")
        assert.deepEqual(Buffer.from(result.tag), (cipher as any).getAuthTag());
      else assert.equal(result.tag, undefined);
      assert.deepEqual(
        Buffer.from(
          api.decrypt(result.ciphertext, { ...options, tag: result.tag }),
        ),
        data,
      );
      assert.deepEqual(data, before);
      if (mode === "gcm") {
        const badTag = result.tag.slice();
        badTag[0] ^= 1;
        assert.throws(
          () => api.decrypt(result.ciphertext, { ...options, tag: badTag }),
          (e: any) => e.code === "DECRYPTION_FAILED",
        );
        assert.throws(
          () =>
            api.decrypt(result.ciphertext, {
              ...options,
              tag: result.tag,
              aad: new Uint8Array([1]),
            }),
          (e: any) => e.code === "DECRYPTION_FAILED",
        );
      }
    }
assert.equal(initialized, 1);
for (const mode of ["ecb", "cbc"]) {
  const opts = {
    mode: mode.toUpperCase(),
    key: new Uint8Array(24),
    iv: mode === "cbc" ? new Uint8Array(16) : undefined,
    padding: "NONE",
  };
  const input = new Uint8Array([
    9, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 88,
  ]).subarray(1, 17);
  assert.deepEqual(
    Array.from(api.decrypt(api.encrypt(input, opts).ciphertext, opts)),
    Array.from(input),
  );
  assert.throws(() => api.encrypt(new Uint8Array(1), opts));
}
for (const opts of [
  { mode: "unknown", key: new Uint8Array(16) },
  { mode: "ecb", key: new Uint8Array(15) },
  { mode: "ecb", key: new Uint8Array(16), iv: new Uint8Array(16) },
  { mode: "gcm", key: new Uint8Array(16), iv: new Uint8Array(16) },
  {
    mode: "ctr",
    key: new Uint8Array(16),
    iv: new Uint8Array(16),
    padding: "pkcs7",
  },
])
  assert.throws(() => api.encrypt(new Uint8Array(0), opts));
assert.throws(() =>
  api.encrypt("string", { mode: "ecb", key: new Uint8Array(16) }),
);
const cross = vm.runInNewContext("new Uint8Array(18).subarray(1,17)");
Object.defineProperty(cross, "buffer", { value: new ArrayBuffer(0) });
assert.equal(
  api.encrypt(cross, { mode: "ecb", key: new Uint8Array(16), padding: "none" })
    .ciphertext.length,
  16,
);
const native = {
  aes: {
    encrypt() {
      return native;
    },
    decrypt() {
      throw native;
    },
  },
};
assert.equal(create({ crypto: native }, { from: "loon", to: "loon" }), native);
const codecs = vm.runInNewContext(
  "(" + scriptCodecs + ")((" + encodingProvider + "))",
);
const charsetVectors = [
  ["windows-1252", [0x80, 0xe9], "€é"],
  ["iso-8859-2", [0xa1, 0xe8], "Ąč"],
  ["windows-1251", [0xcf, 0xf0, 0xe8, 0xe2, 0xe5, 0xf2], "Привет"],
  ["gbk", [0xd6, 0xd0, 0xce, 0xc4], "中文"],
  ["gb18030", [0x94, 0x39, 0xfc, 0x36], "😀"],
  ["big5", [0xa4, 0xa4, 0xa4, 0xe5], "中文"],
  ["shift_jis", [0x93, 0xfa, 0x96, 0x7b], "日本"],
  ["euc-jp", [0xc6, 0xfc, 0xcb, 0xdc], "日本"],
  ["euc-kr", [0xc7, 0xd1, 0xb1, 0xb9], "한국"],
  ["utf-16le", [0xff, 0xfe, 0x2d, 0x4e], "中"],
  ["utf-16be", [0xfe, 0xff, 0x4e, 0x2d], "中"],
  [
    "iso-2022-jp",
    [0x1b, 0x24, 0x42, 0x46, 0x7c, 0x4b, 0x5c, 0x1b, 0x28, 0x42],
    "日本",
  ],
] as const;
for (const [label, data, expected] of charsetVectors) {
  const all = new Uint8Array(data),
    d = new codecs.TextDecoder(label);
  assert.equal(d.decode(all), expected, label);
  let streamed = "";
  for (const byte of all)
    streamed += d.decode(new Uint8Array([byte]), { stream: true });
  streamed += d.decode();
  assert.equal(streamed, expected, label + " streaming");
  assert.equal(d.encoding, new TextDecoder(label).encoding);
}
assert.throws(
  () => new codecs.TextDecoder("imaginary-codec"),
  (e: any) => e.name === "RangeError",
);
assert.throws(
  () =>
    new codecs.TextDecoder("gbk", { fatal: true }).decode(
      new Uint8Array([0x81]),
    ),
  (e: any) => e.name === "TypeError",
);
assert.equal(new codecs.TextDecoder("gbk").decode(new Uint8Array([0x81])), "�");
const url = vm.runInNewContext("(" + urlProvider + ")")(codecs);
for (const input of [
  "https://例子.测试:443/路径?q=é#片段",
  "http://0x7f.1/a/../b",
  "http://[::1]:80/a",
  "file:///C:/a/../b",
  "mailto:user@example.com",
  "data:text/plain,hello",
  "https://u:p@example.com:123/a%2Fb",
]) {
  const expected = new URL(input),
    actual = new url.URL(input);
  for (const prop of [
    "href",
    "origin",
    "protocol",
    "username",
    "password",
    "host",
    "hostname",
    "port",
    "pathname",
    "search",
    "hash",
  ])
    assert.equal(actual[prop], expected[prop], input + " " + prop);
}
for (const relative of [
  "../next?x=1",
  "//other.test/a",
  "?a+b=c%2Bd",
  "#片段",
  "\\new\\path",
])
  assert.equal(
    new url.URL(relative, "https://base.test/a/b").href,
    new URL(relative, "https://base.test/a/b").href,
  );
const linked = new url.URL("https://example.test/?a=1&a=2");
const params = linked.searchParams;
params.append("空 格", "a+b");
params.delete("a", "1");
params.sort();
assert.equal(
  linked.href,
  "https://example.test/?a=2&%E7%A9%BA+%E6%A0%BC=a%2Bb",
);
linked.search = "?z=3";
assert.equal(params.get("z"), "3");
assert.equal(params.getAll("a").length, 0);
assert.equal(url.URL.canParse("http://["), false);
assert.equal(url.URL.parse("http://["), null);
assert.throws(() => new url.URL("http://["));
assert.equal(
  new url.URLSearchParams([
    ["a", "1"],
    ["a", "2"],
    ["x", "a b"],
  ]).toString(),
  "a=1&a=2&x=a+b",
);
assert.equal(new url.URLSearchParams("?x=%E4%B8%AD+y").get("x"), "中 y");
// Execute unchanged API calls through both real common-program destinations.
for (const to of ["qx", "surge"] as const) {
  const source =
    'const encoded=$crypto.aes.encrypt(new TextEncoder().encode("通用"),{mode:"gcm",key:new Uint8Array(16),iv:new Uint8Array(12)});const plain=$crypto.aes.decrypt(encoded.ciphertext,{mode:"gcm",key:new Uint8Array(16),iv:new Uint8Array(12),tag:encoded.tag});const url=new URL("../next?x=1","https://example.test/a/");url.searchParams.append("x","2");$done({body:new TextDecoder().decode(plain)+":"+url.href+":"+new TextDecoder("gbk").decode(new Uint8Array([214,208]))});';
  const p = pair(source, {
    from: "loon",
    to,
    phase: "response",
    responseBody: true,
  });
  assert.equal(p.status, "adapted", JSON.stringify(p.problems));
  let result: any;
  vm.runInNewContext(p.code!, {
    $response: {},
    $done: (v: any) => (result = v),
  });
  assert.equal(result.body, "通用:https://example.test/next?x=1&x=2:中");
  assert.ok(p.code!.includes(source));
}
console.log(
  "Shared API providers passed: independent AES/NIST and Node crypto vectors, four modes/three keys/authentication errors, URL/IDNA/linked params, legacy codecs/streaming and both Loon destinations",
);

// Modified: 2026-11-02 (chance). Keep QX→Surge and scoped standard fallbacks;
// this path never adds a Loon-only crypto/compression SDK to the source facade.
const qxSource =
  'const address=new URL("https://例子.测试/");address.searchParams.set("q",new TextDecoder("gbk").decode(new Uint8Array([214,208])));$done({body:address.href+":"+typeof $httpClient});';
const qxPlan = pair(qxSource, {
  from: "qx",
  to: "surge",
  phase: "response",
  responseBody: true,
});
let qxResult: any;
vm.runInNewContext(qxPlan.code!, {
  $response: {},
  $done: (v: any) => (qxResult = v),
});
assert.equal(
  qxResult.body,
  "https://xn--fsqu00a.xn--0zwm56d/?q=%E4%B8%AD:undefined",
);
assert.ok(qxPlan.code!.includes(qxSource));
// Providers execute with dynamic source generation disabled and no host pollution.
const isolated = vm.createContext(
  {},
  { codeGeneration: { strings: false, wasm: false } },
);
const isolatedCodecs = vm.runInContext(
  "(" + scriptCodecs + ")((" + encodingProvider + "))",
  isolated,
);
const isolatedURL = vm.runInContext(
  "(" + urlProvider + ")",
  isolated,
)(isolatedCodecs);
assert.equal(new isolatedURL.URL("https://test/").hostname, "test");
vm.runInContext("Object.hasOwn=undefined", isolated);
assert.equal(
  new isolatedCodecs.TextDecoder("gbk").decode(new Uint8Array([214, 208])),
  "中",
);
assert.equal(
  vm.runInContext(
    'typeof URL+":"+typeof TextDecoder+":"+typeof __wayxProvider',
    isolated,
  ),
  "undefined:undefined:undefined",
);
const urlScript = pair('$done({body:typeof URL+":"+typeof URLSearchParams});', {
  from: "loon",
  to: "qx",
  phase: "response",
});
assert.ok(
  Buffer.byteLength(urlScript.code!) < 650_000,
  "Common provider profile exceeds the agreed 650 KB overhead budget",
);
