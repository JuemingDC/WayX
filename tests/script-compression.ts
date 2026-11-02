// Modified: 2026-11-02 (chance). Verify the compression API with independent
// zlib vectors; no downloaded author script is a conversion acceptance fixture.
import assert from "node:assert/strict";
import vm from "node:vm";
import crypto from "node:crypto";
import { gzipSync, gunzipSync, deflateSync } from "node:zlib";
import { scriptCompression } from "../src/emit/script-compression.ts";
import {
  pakoRuntime,
  pakoBundle,
  pakoLicense,
} from "../src/vendor/pako/runtime.ts";
const context = vm.createContext({});
const create = vm.runInContext("(" + scriptCompression + ")", context);
const provider = vm.runInContext("(" + pakoRuntime + ")", context);
let initializations = 0;
const host = {
  compression: () => {
    initializations++;
    return provider();
  },
};
const api = create(host, { from: "loon", to: "surge" });
assert.equal(initializations, 0);
assert.ok(pakoRuntime.includes(pakoLicense));
assert.equal(vm.runInContext("typeof pako", context), "undefined");
const vectors = [
  Buffer.alloc(0),
  Buffer.from("通用 gzip ✓ 😀"),
  Buffer.from(Array.from({ length: 1024 }, (_, i) => i % 256)),
];
for (const original of vectors) {
  const before = Buffer.from(original);
  const compressed = api.gzip(original);
  assert.deepEqual(gunzipSync(compressed), original);
  assert.deepEqual(Buffer.from(api.ungzip(gzipSync(original))), original);
  assert.deepEqual(original, before);
}
assert.equal(initializations, 1);
const slice = new Uint8Array([99, 1, 2, 3, 88]).subarray(1, 4);
Object.defineProperty(slice, "byteOffset", { value: 0 });
Object.defineProperty(slice, "byteLength", { value: 5 });
Object.defineProperty(slice, "buffer", { value: new ArrayBuffer(0) });
Object.defineProperty(slice, Symbol.toStringTag, { value: "Int8Array" });
assert.deepEqual(gunzipSync(api.gzip(slice)), Buffer.from([1, 2, 3]));
const crossRealm = vm.runInNewContext(
  "new Uint8Array([6,7,8,9]).subarray(1,3)",
);
assert.deepEqual(gunzipSync(api.gzip(crossRealm)), Buffer.from([7, 8]));
const a = gzipSync(Buffer.from("one")),
  b = gzipSync(Buffer.from("two"));
assert.equal(
  Buffer.from(api.ungzip(Buffer.concat([a, b]))).toString(),
  "onetwo",
);
const crc = Buffer.from(a);
crc[crc.length - 8] ^= 1;
const size = Buffer.from(a);
size[size.length - 4] ^= 1;
for (const broken of [
  Buffer.alloc(0),
  new Uint8Array([1, 2, 3]),
  a.subarray(0, -1),
  crc,
  size,
  deflateSync(Buffer.from("zlib")),
  Buffer.concat([a, b.subarray(0, -1)]),
]) {
  assert.throws(
    () => api.ungzip(broken),
    (e: any) => e.code === "DECOMPRESSION_FAILED" && !!e.cause,
  );
}
for (const wrong of [
  undefined,
  null,
  "base64",
  new ArrayBuffer(2),
  new Int8Array(2),
  new Uint8ClampedArray(2),
  { [Symbol.toStringTag]: "Uint8Array" },
]) {
  assert.throws(
    () => api.gzip(wrong),
    (e: any) => e.name === "TypeError",
  );
}
const nativeError = Error("native failure");
const nativeOutput = new Uint8Array([4]);
const native = create(
  {
    utils: {
      gzip: (input: any) => {
        assert.deepEqual(Array.from(input), [1, 2]);
        return nativeOutput;
      },
      ungzip: () => {
        throw nativeError;
      },
    },
    compression: () => {
      throw Error("must use native");
    },
  },
  { from: "loon", to: "loon" },
);
assert.equal(native.gzip(new Uint8Array([1, 2])), nativeOutput);
assert.throws(
  () => native.ungzip(new Uint8Array(0)),
  (e) => e === nativeError,
);
assert.equal(
  crypto.createHash("sha256").update(pakoBundle).digest("hex"),
  "ede2693a4a6a5126b9d35669062b358ecab6ae7b9b86a1cf302feb45a8514907",
);
console.log(
  "Compression API contracts passed: zlib interoperability, lazy/native dispatch, exact cross-realm views, gzip framing/CRC/trailer errors",
);
