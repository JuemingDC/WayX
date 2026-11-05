// Modified: 2026-11-05 (chance). Exercise published links, target separation,
// readable names, duplicate script identities, code-only output and next-run staging.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  publishLayout,
  prepareWorkingLayout,
} from "../src/application/release-layout.ts";
import { scriptReferences } from "../src/parser/backup-references.ts";
import { executableScript } from "../src/domain/executable-script.ts";
import { disableUnavailableDeclarations } from "../src/domain/source-health.ts";
import {
  validatePublishedRuleList,
  validateSurgeModule,
} from "../src/validation/output.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-release-layout-"));
const write = async (file: string, data: string) => {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), data);
};
const raw = "https://raw.githubusercontent.com/JuemingDC/WayX/main/";
try {
  const source =
    '/* install instructions */\n/* SPDX-License-Identifier: MIT */\n$done({body:"ok"});\n';
  const script = "Script/Adblock/example.test-123456789abc/qx/ads.js";
  const surgeScript = "Script/Adblock/example.test-123456789abc/surge/ads.js";
  await write(script, source);
  await write(surgeScript, source);
  const entry = {
    id: "Demo",
    source: "https://kelee.one/Tool/Loon/demo.lpx",
    file: "demo.lpx",
    qx: "Demo.snippet",
    surge: "Demo.sgmodule",
    category: "去广告",
  };
  await write(".github/sources/loon.json", JSON.stringify([entry]));
  await write(
    ".github/sources/native-qx.json",
    JSON.stringify({ version: 1, sources: [] }),
  );
  await write(
    "Adblock/Quantumult X/Demo.snippet",
    `# Name: Demo\n# [rewrite_local]\n^https://example.test/api url script-response-body ${raw + script}\n# [mitm]\nhostname = example.test\n`,
  );
  await write(
    "Resource/Loon/demo.lpx",
    "[Script]\nhttp-response ^https://example.test/a script-path=https://example.test/ads.js,timeout=10,max-size=-1\n",
  );
  const sg = `#!name=Demo\n#!desc=Demo\n#!category=WayX\n[Script]\nDemo = type=http-response,pattern=^https://example.test/a,timeout=10,max-size=-1,script-path=${raw + surgeScript}\nDemo = type=http-response,pattern=^https://example.test/b,timeout=20,script-path=${raw + surgeScript}\n`;
  await write("Adblock/Surge/Demo.sgmodule", sg);
  await write("Rule/QuantumultX/demo.list", "host, example.test, direct\n");
  await write(
    "Resource/Backup/index.json",
    JSON.stringify({
      version: 1,
      objects: {},
      latest: {},
      adapters: {
        [script]: {
          path: script,
          sourceUrl: "https://example.test/ads.js",
          sha256: "old",
        },
        [surgeScript]: {
          path: surgeScript,
          sourceUrl: "https://example.test/ads.js",
          sha256: "old",
        },
      },
      bindings: {
        "Adblock/Quantumult X/Demo.snippet": {
          "https://example.test/ads.js": { path: script },
        },
        "Adblock/Surge/Demo.sgmodule": {
          "https://example.test/ads.js": { path: surgeScript },
        },
      },
    }),
  );
  await assert.rejects(
    async () =>
      validateSurgeModule(sg, { id: "duplicate" }, { uniqueScripts: true }),
    /duplicate Surge script name/,
  );
  const first = await publishLayout(root);
  assert.equal(
    first.artifacts["Adblock/Quantumult X/Demo.snippet"],
    "Adblock/Quantumult X/Kelee/Demo/Demo.snippet",
  );
  assert.equal(
    first.artifacts["Rule/QuantumultX/demo.list"],
    "Rule/Quantumult X/WayX/demo/demo.list",
  );
  validatePublishedRuleList(
    await fs.readFile(
      path.join(root, "Rule/Quantumult X/WayX/demo/demo.list"),
      "utf8",
    ),
    "Rule/Quantumult X/WayX/demo/demo.list",
  );
  assert.throws(() =>
    validatePublishedRuleList(
      "host,example.test,unsupported-policy",
      "Rule/Quantumult X/WayX/demo/demo.list",
    ),
  );
  const qx = await fs.readFile(
    path.join(root, "Adblock/Quantumult X/Kelee/Demo/Demo.snippet"),
    "utf8",
  );
  assert.ok(qx.includes("Adblock/Quantumult%20X/Kelee/Demo/ads.js"));
  const published = await fs.readFile(
    path.join(root, "Adblock/Quantumult X/Kelee/Demo/ads.js"),
    "utf8",
  );
  assert.doesNotMatch(published, /install instructions|123456789abc|#!name/);
  assert.match(published, /SPDX-License-Identifier: MIT/);
  validateSurgeModule(
    await fs.readFile(
      path.join(root, "Adblock/Surge/Kelee/Demo/Demo.sgmodule"),
      "utf8",
    ),
    { id: "published" },
    { uniqueScripts: true },
  );
  const surgePublished = await fs.readFile(
    path.join(root, "Adblock/Surge/Kelee/Demo/Demo.sgmodule"),
    "utf8",
  );
  assert.match(surgePublished, /timeout=10,max-size=-1/);
  assert.doesNotMatch(surgePublished, /timeout=20/);
  await prepareWorkingLayout(root);
  assert.ok(
    (
      await fs.readFile(
        path.join(root, "Adblock/Quantumult X/Demo.snippet"),
        "utf8",
      )
    ).includes(raw + script),
  );
  const restored = JSON.parse(
    await fs.readFile(path.join(root, ".github/sources/loon.json"), "utf8"),
  );
  assert.equal(restored[0].qx, "Demo.snippet");
  const second = await publishLayout(root);
  assert.deepEqual(second, first);
  assert.equal(
    await fs.readFile(
      path.join(root, "Adblock/Quantumult X/Kelee/Demo/ads.js"),
      "utf8",
    ),
    published,
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
const source =
  '/* [rewrite_local] installation only */\nconst url="https://example.test/a//b"; /a\\/\\/b/.test(url); $done({body:url});';
assert.doesNotMatch(executableScript(source), /installation only/);
assert.ok(executableScript(source).includes("https://example.test/a//b"));
assert.equal(
  scriptReferences(
    '#!REQUIREMENT "{{{enabled}}}" Demo = type=http-response,script-path=https://example.test/ads.js',
  ).length,
  1,
);
const failed = "https://example.test/dead.js";
const disabled = disableUnavailableDeclarations(
  `^a url script-response-body ${failed}\n^b url reject\n`,
  new Set([failed]),
);
assert.equal(disabled.disabled, 1);
assert.match(disabled.text, /^# \^a/m);
assert.match(disabled.text, /^\^b url reject$/m);
console.log(
  "Release layout: target/author/app paths, executable-only scripts, license preservation, duplicate names, source-scoped disable and next-run round trip passed",
);
