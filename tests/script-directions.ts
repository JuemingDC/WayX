// Modified: 2026-11-02 (chance). Only the three authorized conversions gate
// production; retaining a source-native branch is not a reverse conversion.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import {
  planUniversalAdblockScript,
  scriptTargetsForSource,
  scriptConversionDirections,
} from "../src/parser/universal-script.ts";
assert.deepEqual(scriptConversionDirections, [
  { from: "loon", to: "qx" },
  { from: "loon", to: "surge" },
  { from: "qx", to: "surge" },
]);
assert.deepEqual(scriptTargetsForSource("qx"), ["qx", "surge"]);
assert.deepEqual(scriptTargetsForSource("loon"), ["qx", "surge", "loon"]);
assert.deepEqual(scriptTargetsForSource("surge"), []);
const p = planUniversalAdblockScript("$done({body:$response.body});", "qx", [
  { phase: "response" },
]);
assert.equal(p.status, "universal", JSON.stringify(p.problems));
assert.deepEqual(Object.keys(p.contexts.response), ["qx", "surge"]);
assert.ok(!p.problems.some((x) => x.reason.startsWith("loon:")));
assert.throws(
  () =>
    vm.runInNewContext(p.code!, {
      setTimeout,
      $loon: "actual",
      $response: { body: "native" },
      $done() {},
    }),
  /Unregistered/,
);
assert.equal(
  planUniversalAdblockScript("$done({body:$response.body});", "surge", [
    { phase: "response" },
  ]).status,
  "excluded",
);
console.log(
  "Production directions passed: Loon to QX/Surge, QX to Surge, source-native retention, no QX-to-Loon gate or reverse production conversion",
);

const reversed = spawnSync(
  process.execPath,
  ["src/cli.ts", "script-api", "--from", "qx", "--to", "loon"],
  { input: "$done({});", encoding: "utf8" },
);
assert.notEqual(reversed.status, 0);
assert.match(reversed.stdout + reversed.stderr, /Authorized script directions/);
