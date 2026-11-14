// Modified: 2026-11-13 (chance). Native QX removes non-executable comments at
// publication; archives stay byte-exact and only Surge is API-adapted.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshSourceBackups } from "../src/application/backups.ts";
import {
  publishLayout,
  prepareWorkingLayout,
} from "../src/application/release-layout.ts";
import { validateSourceBackups } from "../src/validation/backups.ts";
import { mergeNativeQxSources } from "../src/publish/workflow.ts";
import { executableScript } from "../src/domain/executable-script.ts";
// Modified: 2026-11-14 (chance). Reproduce the failed upstream revision and
// preserve the author's corrected rule, unrelated declarations and strict validation.
const limboUrl = "https://raw.githubusercontent.com/limbopro/Adblock4limbo/main/Adblock4limbo.conf";
const invalidHeader = String.raw`^https:\/\/kanav\.ad\/ url request-header url`;
const authorHeader = String.raw`^https:\/\/kanav\.ad\/ url request-header (\r\n)Accept-Encoding:.+(\r\n) request-header $1Accept-Encoding: identity$2`;
const sibling = "^https://example.test/ads url reject";
const repaired = mergeNativeQxSources([{url: limboUrl, text: invalidHeader + "\n" + sibling}], {name: "Limbo"});
assert.ok(repaired.includes("\n" + authorHeader + "\n"));
assert.ok(repaired.includes("# Source declaration: " + invalidHeader));
assert.ok(repaired.includes(sibling));
const authorText = authorHeader + "\n" + sibling + "\n";
assert.ok(mergeNativeQxSources([{url: limboUrl, text: authorText}], {name: "Limbo"}).includes(authorText));
assert.throws(() => mergeNativeQxSources([{url: "https://other.test/example.conf", text: invalidHeader}], {name: "Other"}), /unsupported/);
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-native-copy-"));
const url = "https://author.test/author.js";
const script = Buffer.from(
  '\ufeff/* installation instructions stay in the native copy */\r\nif(false)return;\r\n$done({body:"native"});\r\n',
);
const cleaned = Buffer.from(executableScript(script.toString()));
const body =
  "# Original comments\n# [rewrite_local]\n^https://example\\.test/ url script-response-body " +
  url +
  "\n# [mitm]\nhostname = example.test\n";
const qx = mergeNativeQxSources(
  [{ url: "https://author.test/native.snippet", text: body }],
  { name: "Native", stamp: "2026-11-05" },
);
assert.ok(qx.includes(body));
assert.doesNotMatch(qx, /# Source declaration:|SOURCE INVALID/);
try {
  for (const [file, text] of [
    ["Adblock/Quantumult X/Native.snippet", qx],
    [
      "Adblock/Surge/Native.sgmodule",
      "# Managed by: WayX Native QX\n[Script]\nNative = type=http-response,pattern=^https://example\\.test/,requires-body=true,script-path=" +
        url +
        "\n",
    ],
  ]) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), text);
  }
  const refresh = () =>
    refreshSourceBackups(root, {
      resources: {
        cachedBytes: async () => null,
        fetchBytes: async () => script,
      },
      log: () => {},
    });
  // Module still uses a legacy QuantumultX working directory before publication.
  await fs.mkdir(path.join(root, "Module/QuantumultX"), { recursive: true });
  await fs.mkdir(path.join(root, "Module/Surge"), { recursive: true });
  await fs.copyFile(
    path.join(root, "Adblock/Quantumult X/Native.snippet"),
    path.join(root, "Module/QuantumultX/Native.snippet"),
  );
  await fs.copyFile(
    path.join(root, "Adblock/Surge/Native.sgmodule"),
    path.join(root, "Module/Surge/Native.sgmodule"),
  );
  for (let iteration = 0; iteration < 2; iteration++) {
    const report = await refresh();
    assert.equal(report.scriptApi.universal, 1);
    assert.equal(report.scriptApi.nativeCopied, 2);
    const layout = await publishLayout(root);
    const native = Object.entries(layout.scripts).find(([file]) =>
      file.includes("/Quantumult X/"),
    )!;
    assert.deepEqual(await fs.readFile(path.join(root, native[0])), cleaned);
    for (const file of Object.keys(layout.scripts).filter((f) =>
      f.includes("/Quantumult X/"),
    ))
      assert.deepEqual(await fs.readFile(path.join(root, file)), cleaned);
    const surge = Object.keys(layout.scripts).find((file) =>
      file.includes("/Surge/"),
    )!;
    const adapted = await fs.readFile(path.join(root, surge), "utf8");
    assert.match(adapted, /__wayx/);
    assert.doesNotMatch(adapted, /installation instructions/);
    const index = JSON.parse(
      await fs.readFile(path.join(root, "Resource/Backup/index.json"), "utf8"),
    );
    for (const [file, record] of Object.entries<any>(index.objects))
      if (record.kind === "script")
        assert.deepEqual(await fs.readFile(path.join(root, file)), script);
    assert.equal(
      Object.values<any>(index.adapters).some((r) => r.targetClient === "qx"),
      false,
    );
    for (const plan of Object.values<any>(index.apiPlans)) {
      const data = JSON.parse(
        await fs.readFile(path.join(root, plan.path), "utf8"),
      );
      for (const targets of Object.values<any>(data.plans))
        assert.deepEqual(Object.keys(targets), ["surge"]);
    }
    assert.deepEqual(await validateSourceBackups(root), []);
    if (!iteration) await prepareWorkingLayout(root);
  }
  console.log(
    "Native QX publication: clean comments, byte-exact archives, no QX adapter, Surge-only adaptation and repeat publication passed",
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
