// Modified: 2026-11-02 (chance). Retirement follows final references, including
// staged outputs, frozen sources and transitive/manual dependencies, not age.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pruneGeneratedScripts } from "../src/application/generated-scripts.ts";
import { commitFiles } from "../src/publish/transaction.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-script-cleanup-"));
const write = async (file: string, text: string | Buffer) => {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), text);
};
try {
  const live = "Script/Adblock/host-aaaaaaaaaaaa/live.js",
    dead = "Script/Adblock/host-bbbbbbbbbbbb/dead.js",
    pending = "Script/Adblock/host-cccccccccccc/pending.js";
  const api = "Script/Api/qx-to-surge/" + "a".repeat(64) + ".js",
    old = "Script/Api/qx-to-surge/" + "b".repeat(64) + ".js";
  const first = "Script/Cycle/mock_aaaaaaaaaa.js",
    second = "Script/Cycle/mock_bbbbbbbbbb.js",
    child = "Script/Dependency/header_cccccccccc.js";
  const legacy = "Script/App/legacy/obsolete.js",
    frozen = "Script/App/legacy/frozen.js",
    source = "Script/App/legacy/source.js";
  const raw = "Resource/Backup/script/" + "c".repeat(64) + "/source.js",
    bytes = Buffer.from("\ufeff/* author */\r\n$done({});\r\n");
  for (const file of [live, dead, old, legacy, frozen, source])
    await write(file, "$done({});");
  await write(first, 'require("./mock_bbbbbbbbbb.js");');
  await write(second, 'require("./mock_aaaaaaaaaa.js");');
  await write(api, 'const dependency="' + child + '";');
  await write(child, "$done({});");
  // Manual entry points remain; their old directional dependency is still live.
  await write(
    "Script/Manual/entry.js",
    'require("../Api/qx-to-surge/' + "a".repeat(64) + '.js");',
  );
  await write(
    "Script/Manual/unused-author.js",
    "/* author-owned, never delete by filename alone */",
  );
  await write(
    "Module/Surge/live.sgmodule",
    "[Script]\nA=type=http-response,script-path=https://raw.githubusercontent.com/JuemingDC/WayX/main/" +
      live +
      "\n",
  );
  await write(
    "Adblock/Surge/staged.sgmodule",
    "[Script]\nA=type=http-response,script-path=https://raw.githubusercontent.com/JuemingDC/WayX/main/" +
      dead +
      "\n",
  );
  await write(
    "Adblock/Surge/deleted.sgmodule",
    "[Script]\nA=type=http-response,script-path=https://raw.githubusercontent.com/JuemingDC/WayX/main/" +
      old +
      "\n",
  );
  await write(
    "Resource/Loon/frozen.lpx",
    '[Script]\nscript("https://raw.githubusercontent.com/JuemingDC/WayX/main/' +
      frozen +
      '")',
  );
  await write(raw, bytes);
  const archived = "Resource/Backup/script/" + "d".repeat(64) + "/active.js";
  const dependency = "Script/Dependency/header_dddddddddd.js";
  await write(archived, 'const dependency="' + dependency + '";');
  await write(dependency, "$done({});");
  await write(
    "Module/Surge/archive.sgmodule",
    "A=type=http-response,script-path=https://raw.githubusercontent.com/JuemingDC/WayX/main/" +
      archived,
  );

  const index: any = {
    objects: { [raw]: { sha256: "unchanged", path: raw } },
    adapters: {
      [live]: { sourceUrl: "https://author.test/live.js" },
      [dead]: {
        sourceUrl:
          "https://raw.githubusercontent.com/JuemingDC/WayX/main/" + legacy,
      },
      [old]: { sourceUrl: "https://author.test/old.js" },
      [pending]: {
        sourceUrl:
          "https://raw.githubusercontent.com/JuemingDC/WayX/main/" + source,
      },
    },
    bindings: {
      stale: { old: { path: old } },
      mixed: { dead: { path: dead }, active: { path: live } },
    },
  };
  index.objects[archived] = {
    kind: "script",
    path: archived,
    url: "https://author.test/active.js",
  };
  const changes = new Map<string, string | Uint8Array | null>([
    [pending, "$done({});"],
    [
      "Adblock/Surge/staged.sgmodule",
      "[Script]\nA=type=http-response,script-path=" +
        encodeURIComponent(
          "https://raw.githubusercontent.com/JuemingDC/WayX/main/" + pending,
        ) +
        "\n",
    ],
    ["Adblock/Surge/deleted.sgmodule", null],
  ]);
  const report = await pruneGeneratedScripts(root, {
    index,
    changes,
    artifacts: [
      {
        relative: "Adblock/Surge/deleted.sgmodule",
        text: "script-path=" + old,
      },
    ],
  });
  assert.deepEqual(
    report.removed.sort(),
    [dead, old, first, second, legacy].sort(),
  );
  for (const file of [live, pending, api, child, frozen, source])
    assert.notEqual(changes.get(file), null, file);
  assert.equal(index.adapters[dead], undefined);
  assert.equal(index.adapters[old], undefined);
  assert.equal(index.bindings.stale, undefined);
  assert.deepEqual(index.bindings.mixed, { active: { path: live } });
  assert.deepEqual(await fs.readFile(path.join(root, raw)), bytes);
  assert.ok(!changes.has(raw));
  await commitFiles(root, changes);
  assert.deepEqual(
    (await pruneGeneratedScripts(root, { index, changes: new Map() })).removed,
    [],
  );
  assert.ok(
    await fs.readFile(path.join(root, "Script/Manual/unused-author.js")),
  );
  console.log(
    "Generated script cleanup passed: staged references, dependency cycles, manual and frozen roots, source identities, stale metadata, exact archives and idempotence",
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
