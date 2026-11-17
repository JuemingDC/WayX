// Modified: 2026-11-17 (chance). Test the reserved target-only mock emitter
// without enabling any Loon/QX source trailer mapping.
import assert from "node:assert/strict";
import { prepareSurgeMockResponse as prepare } from "../src/emit/surge-mock-response.ts";

const body = new Uint8Array([9, 0, 255, 8]).subarray(1, 3);
const source = { status: 200, body, trailers: { "grpc-status": "0" } };
const result = prepare(source);
assert.deepEqual(result, source);
assert.notEqual(result, source);
assert.notEqual(result.trailers, source.trailers);
assert.equal(result.body, body, "retain binary view and offsets");
(result.trailers as Record<string, string>)["grpc-status"] = "7";
assert.equal(source.trailers["grpc-status"], "0");
const rows = [{ field: "X-Trace", value: "a" }, { field: "X-Trace", value: "b" }];
const array = prepare({ trailers: rows }).trailers as typeof rows;
assert.deepEqual(array, rows, "preserve duplicate fields, case and order");
array[0].value = "changed";
assert.equal(rows[0].value, "a");
assert.deepEqual(prepare({ status: 200 }), { status: 200 });
assert.deepEqual(prepare({ trailers: undefined }), {});
assert.deepEqual(prepare({ trailers: {} }), { trailers: {} });
assert.deepEqual(prepare({ trailers: [] }), { trailers: [] });
for (const trailers of [null, 5, "bad", { bad: 5 }, [null], [{ field: "x", value: 5 }], Array(1)]) {
  assert.throws(() => prepare({ trailers }), /mock trailers require/);
}
assert.deepEqual(prepare({ h2_trailers: { "grpc-status": "0" } }), {
  h2_trailers: { "grpc-status": "0" },
}, "target helper never invents a source alias mapping");
console.log("Reserved Surge mock trailers: dictionary/array, absence/empty, validation, isolation and exact binary views passed");
