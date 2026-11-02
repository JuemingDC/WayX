// Modified: 2026-11-02 (chance). Compare scoped codecs with the independent
// native WHATWG/HTML implementation, including malformed and streamed data.
import assert from "node:assert/strict";
import vm from "node:vm";
import { scriptCodecs } from "../src/emit/script-codecs.ts";

const codecs = vm.runInNewContext("(" + scriptCodecs + ")()", {
  Uint8Array,
  ArrayBuffer,
  WeakSet,
  WeakMap,
});
const native = { TextEncoder, TextDecoder, atob, btoa };
function observed(fn: () => any) {
  try {
    return { value: fn() };
  } catch (error: any) {
    return { error: error.name, code: error.code };
  }
}
let state = 317;
function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state;
}
const arrays = [
  [],
  [0xef, 0xbb, 0xbf, 65],
  [0xff],
  [0xed, 0xa0, 0x80],
  [0xe0, 0x80, 0x80],
  [0xf4, 0x90, 0x80, 0x80],
  [0xf0, 0x9f, 0x98, 0x80],
  [0xc2],
  [0x80, 0x41],
];
for (let i = 0; i < 800; i++)
  arrays.push(Array.from({ length: random() % 37 }, () => random() % 256));
for (const bytes of arrays)
  for (const fatal of [false, true])
    for (const ignoreBOM of [false, true]) {
      const raw = new Uint8Array([9, ...bytes, 8]),
        view = new DataView(raw.buffer, 1, bytes.length);
      const ours = new codecs.TextDecoder("utf8", { fatal, ignoreBOM }),
        reference = new TextDecoder("utf-8", { fatal, ignoreBOM });
      // TypeError codes/messages are implementation details; compare standard names.
      const a = observed(() => ours.decode(view)),
        b = observed(() => reference.decode(view));
      assert.equal(a.error, b.error, JSON.stringify(bytes));
      assert.equal(a.value, b.value, JSON.stringify(bytes));
    }
for (const bytes of arrays.slice(0, 100))
  for (let split = 0; split <= bytes.length; split++)
    for (const fatal of [false, true]) {
      const ours = new codecs.TextDecoder("utf8", { fatal }),
        reference = new TextDecoder("utf8", { fatal });
      for (const [input, stream] of [
        [bytes.slice(0, split), true],
        [bytes.slice(split), true],
        [[], false],
        [[65], false],
      ] as const) {
        const a = observed(() =>
            ours.decode(new Uint8Array(input), { stream }),
          ),
          b = observed(() =>
            reference.decode(new Uint8Array(input), { stream }),
          );
        assert.equal(a.error, b.error);
        assert.equal(a.value, b.value);
      }
    }
const strings = [
  "",
  "中文😀",
  "\ud800",
  "\udc00",
  "a\ud800b",
  "\ufeffabc",
  "\u0000é",
];
for (let i = 0; i < 200; i++)
  strings.push(
    Array.from({ length: random() % 24 }, () =>
      String.fromCharCode(random() % 65536),
    ).join(""),
  );
for (const text of strings) {
  const ours = new codecs.TextEncoder(),
    ref = new TextEncoder();
  assert.deepEqual([...ours.encode(text)], [...ref.encode(text)]);
  for (let len = 0; len < 15; len++) {
    const a = new Uint8Array(len + 4).fill(99),
      b = new Uint8Array(len + 4).fill(99);
    const ar = ours.encodeInto(text, a.subarray(2, 2 + len)),
      br = ref.encodeInto(text, b.subarray(2, 2 + len));
    assert.equal(ar.read, br.read);
    assert.equal(ar.written, br.written);
    assert.deepEqual([...a], [...b]);
  }
}
for (const input of [
  "",
  "YQ",
  "YQ==",
  "YWI=",
  " Y W\nI=\t",
  "AB==",
  "ABC=",
  "A",
  "a=",
  "abc===",
  "====",
  "-_",
  "中文",
  "\u00a0YQ==",
]) {
  const a = observed(() => codecs.atob(input)),
    b = observed(() => atob(input));
  assert.equal(a.error, b.error, input);
  assert.equal(a.value, b.value, input);
  if (a.error) assert.equal(a.code, b.code, input);
}
for (let length = 0; length < 300; length++) {
  const s = Array.from({ length }, () =>
    String.fromCharCode(random() % 256),
  ).join("");
  assert.equal(codecs.btoa(s), btoa(s));
  assert.equal(codecs.atob(codecs.btoa(s)), s);
}
for (const input of ["\u0100", "😀", "\ud800"]) {
  assert.equal(
    observed(() => codecs.btoa(input)).error,
    observed(() => btoa(input)).error,
  );
}
assert.equal(observed(() => codecs.atob()).error, "TypeError");
assert.equal(observed(() => codecs.btoa()).error, "TypeError");
assert.equal(
  observed(() => new codecs.TextDecoder().decode(null)).error,
  "TypeError",
);
assert.equal(
  observed(() => new codecs.TextEncoder().encode(Symbol())).error,
  "TypeError",
);
const foreign = vm.runInNewContext("new Uint8Array([65,66]).buffer");
assert.equal(
  new codecs.TextDecoder().decode(foreign),
  new TextDecoder().decode(foreign),
);
const disguised = new Proxy(new Uint8Array(8), {
  get(t, k) {
    if (k === "length") return 8;
    if (k === "set") return () => {};
    return Reflect.get(t, k, t);
  },
});
assert.equal(
  observed(() => new codecs.TextEncoder().encodeInto("abc", disguised)).error,
  observed(() => new TextEncoder().encodeInto("abc", disguised)).error,
);
const bufferProxy = new Proxy(new ArrayBuffer(8), {
  get() {
    return 0;
  },
});
assert.equal(
  observed(() => new codecs.TextDecoder().decode(bufferProxy)).error,
  observed(() => new TextDecoder().decode(bufferProxy)).error,
);
const dest = new Uint8Array(4);
dest.set = () => {
  throw Error("shadow must not run");
};
assert.equal(new codecs.TextEncoder().encodeInto("a", dest).written, 1);
assert.equal(dest[0], 97);

console.log(
  "UTF-8/Base64 standard API vectors passed independently of author scripts",
);
