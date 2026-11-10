// Modified: 2026-11-08 (chance). Update-only headers migrate owned stanzas,
// preserve source/native content and remain stable across repeated syncs.
import assert from "node:assert/strict";
import { applyUpstreamUpdateTime, upstreamUpdateTime, migrateUpdateMetadata } from "../src/domain/update-metadata.ts";
import {
  conversionStampFromText,
  mergeNativeQxSources,
  managedTargetDiffs,
} from "../src/publish/workflow.ts";
import { convertNativeQxToSurge, convertPlugin } from "../src/emit/conversion.ts";
const old =
  "# Updated: author-date\r\n# Converted: 2026-11-01\r\n# Converted by: chance\r\n# Source: https://example.test/a\r\n^https://example.test/ url reject\r\n";
const updated = migrateUpdateMetadata(old);
assert.equal(
  updated,
  old.replace("# Converted: 2026-11-01", "# Updated: 2026-11-01"),
);
assert.equal(conversionStampFromText(updated), "2026-11-01");
assert.equal(conversionStampFromText(old), "2026-11-01");
assert.equal(migrateUpdateMetadata(updated), updated);
const author = "# Converted: author-date\n# Original author text\n";
assert.equal(migrateUpdateMetadata(author), author);
assert.equal(
  migrateUpdateMetadata("# Managed by: WayX Native QX\n" + old, true),
  "# Managed by: WayX Native QX\n" + old,
);
assert.deepEqual(
  managedTargetDiffs(
    { qx: old, surge: old },
    { qx: updated.replace("2026-11-01", "2026-11-08"), surge: updated },
  ),
  [],
);
const surgeSource = "#!category=WayX\n# Managed by: WayX Native QX\n" + old;
assert.equal(
  migrateUpdateMetadata(surgeSource),
  surgeSource.replace("# Converted: 2026-11-01", "# Updated: 2026-11-01"),
);
const entry = {
  id: "UpdateOnly",
  source: "https://example.test/a.lpx",
  category: "Test",
};
const converted = convertPlugin(
  entry,
  "#!name=UpdateOnly\n[Rule]\nDOMAIN,example.test,REJECT\n",
  {
    stamp: "2026-11-08",
    rawBase: "https://raw.githubusercontent.com/JuemingDC/WayX/main",
  },
);
for (const target of [converted.qx, converted.surge]) {
  assert.match(target, /^# Updated: 上游未标注$/m);
  assert.doesNotMatch(target, /^# Converted:/m);
}
console.log(
  "Update metadata: emitted update-only headers, scoped legacy migration, unchanged native/author bytes and independent stable dates passed",
);

// Modified: 2026-11-10 (chance). Upstream dates survive conversion clocks,
// native-copy wrappers and retained output migration without changing source bytes.

assert.equal(upstreamUpdateTime("#!date=2026-08-30 10:10\n"), "2026-08-30 10:10");
assert.equal(upstreamUpdateTime("// @UpdateTime        2024-01-24\n"), "2024-01-24");
assert.equal(upstreamUpdateTime("# 更新时间：2025年1月2日\n"), "2025年1月2日");
assert.equal(upstreamUpdateTime("# Updated: 2026-11-10\n# Copied by: chance\n"), "上游未标注");
const dated = "#!name=Upstream\n#!date=2024-01-24\n[Rule]\nDOMAIN,example.test,REJECT\n";
for (const stamp of ["2026-11-09", "2026-11-10"]) {
  const out = convertPlugin(entry, dated, {stamp});
  for (const t of [out.qx, out.surge]) {
    assert.match(t, /^# Updated: 2024-01-24$/m);
    assert(!t.includes("# Updated: " + stamp));
  }
}
assert.equal(applyUpstreamUpdateTime(updated, "#!date=2024-01-24"), updated.replace("Updated: 2026-11-01", "Updated: 2024-01-24"));
assert.equal(upstreamUpdateTime("#!date=2024-01-24\n#!date=2025-02-03"), "2024-01-24 ; 2025-02-03");

const nativeSource = "// @UpdateTime        2024-01-24\n# [rewrite_local]\n^https://example.test url reject\n";
for (const stamp of ["2026-11-09", "2026-11-10"]) {
  const native = mergeNativeQxSources([{url:"https://example.test/native.conf", text:nativeSource}], {name:"NativeDate", stamp});
  assert.match(native, /^# Updated: 2024-01-24$/m);
  assert(native.includes(nativeSource));
  assert.match(convertNativeQxToSurge(native, {id:"NativeDate"}).surge, /^# Updated: 2024-01-24$/m);
}
console.log("Upstream time: directive/comment/native dates, missing dates, merged dates and conversion-clock independence passed");
