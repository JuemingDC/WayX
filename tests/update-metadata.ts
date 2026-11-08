// Modified: 2026-11-08 (chance). Update-only headers migrate owned stanzas,
// preserve source/native content and remain stable across repeated syncs.
import assert from "node:assert/strict";
import { migrateUpdateMetadata } from "../src/domain/update-metadata.ts";
import {
  conversionStampFromText,
  managedTargetDiffs,
} from "../src/publish/workflow.ts";
import { convertPlugin } from "../src/emit/conversion.ts";
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
  assert.match(target, /^# Updated: 2026-11-08$/m);
  assert.doesNotMatch(target, /^# Converted:/m);
}
console.log(
  "Update metadata: emitted update-only headers, scoped legacy migration, unchanged native/author bytes and independent stable dates passed",
);
