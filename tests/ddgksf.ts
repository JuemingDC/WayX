// Modified: 2026-11-12 (chance). Website discovery, embedded native QX,
// native Surge isolation, metadata and site-scoped HTTP headers use inert fixtures.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  ddgksfCatalogUrl,
  parseDdgksfCatalog,
  embeddedQxConfiguration,
  websiteQxConfiguration,
} from "../src/ingest/ddgksf.ts";
import {
  prepareNativeQxSync,
  commitNativeQxSync,
  mergeNativeQxSources,
} from "../src/publish/workflow.ts";
import { fetchOriginalText, WAYX_FETCH_UA } from "../src/ingest/resources.ts";
import { prepareScriptApiAdapters } from "../src/application/script-api.ts";
import { validateQX } from "../src/validation/output.ts";
const home = "https://ddgksf2013.top/",
  feed = home + "data.json";
assert.equal(
  ddgksfCatalogUrl('<script>fetch("./data.json").then(x=>x.json())</script>'),
  feed,
);
assert.throws(
  () =>
    ddgksfCatalogUrl(
      '<script>fetch("https://foreign.test/data.json")</script>',
    ),
  /incomplete/,
);
assert.throws(() => parseDdgksfCatalog("[]"), /Invalid/);
const payload = [
  {
    category: "远程配置",
    catetype: "1",
    items: [{ name: "profile", url: home + "Profile/example.conf" }],
  },
  {
    category: "去广告",
    catetype: "2",
    items: [
      { name: "Alpha", url: home + "scripts/alpha.js", author: "author" },
      { name: "inactive", url: home + "rewrite/LofterAds.conf" },
    ],
  },
  {
    category: "功能增强",
    catetype: "2",
    items: [
      { name: "Beta", url: home + "rewrite/beta.conf" },
      { name: "Redirect", url: home + "module/redirect.sgmodule" },
    ],
  },
];
assert.equal(parseDdgksfCatalog(JSON.stringify(payload)).entries.length, 4);
const js =
  "/*\n> UpdateTime 2025-01-02\n[Script]\n^https://alpha.test/ url script-response-body " +
  home +
  "scripts/alpha.js\n[mitm]\nhostname = alpha.test\n*/\n$done({body:$response.body});";
const config = embeddedQxConfiguration(js);
assert.match(config, /# \[rewrite_local\]/);
assert.doesNotMatch(config, /\$done/);
assert.ok(config.includes("script-response-body " + home + "scripts/alpha.js"));
const raw =
  "/* description */\nhostname=alpha.test\n^https://alpha.test url reject\n";
assert.doesNotThrow(() =>
  mergeNativeQxSources(
    [
      {
        url: home + "scripts/raw.js",
        text: websiteQxConfiguration(raw, home + "scripts/raw.js"),
      },
    ],
    { name: "raw" },
  ),
);
assert.throws(
  () =>
    embeddedQxConfiguration('const text="^https://test url reject";$done({});'),
  /no embedded/,
);
const compact =
  "#\u0020Name: compact\n#[rewrite_local]\napp_name=super&(.*) url 307 app_name=pro&$1\n#[MITM]\nhostname = alpha.test\n";
assert.doesNotThrow(() => validateQX(compact, { id: "compact" }));
const oldFetch = globalThis.fetch;
try {
  const requests: any[] = [];
  globalThis.fetch = async (url, opts) => {
    requests.push({ url: String(url), headers: new Headers(opts?.headers) });
    return new Response("ok");
  };
  await fetchOriginalText(feed);
  await fetchOriginalText("https://foreign.test/resource");
  assert.equal(requests[0].headers.get("Accept"), "application/json");
  assert.equal(requests[0].headers.get("Referer"), home);
  assert.equal(requests[0].headers.get("Cache-Control"), "no-cache");
  assert.equal(requests[0].headers.get("User-Agent"), WAYX_FETCH_UA);
  assert.equal(requests[1].headers.get("Referer"), null);
  assert.equal(requests[1].headers.get("Cache-Control"), null);
} finally {
  globalThis.fetch = oldFetch;
}
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-ddgksf-"));
try {
  await fs.mkdir(path.join(root, ".github/sources"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".github/sources/native-qx.json"),
    JSON.stringify({
      version: 1,
      website: home,
      repository: "ddgksf2013/Rewrite",
      ref: "master",
      prefix: "ddgksf2013_",
      directories: { AdBlock: "Adblock", Function: "Module", Html: "Module" },
      surge: true,
    }),
  );
  const native =
    '#!name=Redirect\n#!date=2025-03-04\n#!desc=Open client\n#!arguments=通知:false\n[Script]\nRedirect = type=http-response,pattern=^https://redirect.test/,requires-body=1,script-path=https://native.test/author.js,argument="通知={{{通知}}}"\n[MITM]\nhostname = %APPEND% redirect.test\n';
  const beta = "# [rewrite_local]\n^https://beta.test/ url reject\n";
  const calls: string[] = [];
  const sha = "a".repeat(40),
    legacy =
      "https://raw.githubusercontent.com/ddgksf2013/Rewrite/" +
      sha +
      "/Function/Legacy.conf";
  const bodies: any = {
    [home]: '<script>fetch("./data.json")</script>',
    [feed]: JSON.stringify(payload),
    [home + "scripts/alpha.js"]: js,
    [home + "rewrite/beta.conf"]: beta,
    [home + "module/redirect.sgmodule"]: native,
    [legacy]: beta,
  };
  const fetchText = async (url: string) => {
    calls.push(url);
    if (url.includes("/commits/")) return JSON.stringify({ sha });
    if (url.includes("/git/trees/"))
      return JSON.stringify({
        tree: [
          { path: "AdBlock/Alpha.conf", type: "blob" },
          { path: "Function/Legacy.conf", type: "blob" },
        ],
      });
    if (!(url in bodies)) throw Error("Unexpected source: " + url);
    return bodies[url];
  };
  const plan = await prepareNativeQxSync(root, { fetchText });
  assert.equal(plan.discovery[0].eligible, 4);
  assert.equal(plan.discovery[0].sourceResources, 4);
  assert.equal(plan.outputs.size, 7);
  assert.ok(plan.outputs.has("Adblock/Quantumult X/ddgksf2013_alpha.snippet"));
  assert.ok(plan.outputs.has("Module/QuantumultX/ddgksf2013_beta.snippet"));
  assert.ok(plan.outputs.has("Module/QuantumultX/ddgksf2013_legacy.snippet"));
  assert.match(
    plan.outputs.get("Adblock/Quantumult X/ddgksf2013_alpha.snippet"),
    /# Updated: 2025-01-02/,
  );
  const surge = plan.outputs.get("Module/Surge/ddgksf2013_redirect.sgmodule");
  assert.match(surge, /#!arguments=option:false/);
  assert.match(surge, /通知=\{\{\{option\}\}\}/);
  assert.match(surge, /requires-body=true/);
  assert.match(surge, /# Updated: 2025-03-04/);
  assert.ok(
    !plan.outputs.has("Module/QuantumultX/ddgksf2013_redirect.snippet"),
  );
  assert.ok(!calls.includes(home + "rewrite/LofterAds.conf"));
  assert.ok(!calls.some((x) => x.endsWith("/AdBlock/Alpha.conf")));
  assert.equal(
    plan.inputs.find((i: any) => i.sourceUrl === home + "scripts/alpha.js")
      .sha256,
    crypto.createHash("sha256").update(js).digest("hex"),
  );
  await commitNativeQxSync(root, plan);
  const changes = new Map(),
    report = await prepareScriptApiAdapters(root, {
      artifacts: [
        { relative: "Module/Surge/ddgksf2013_redirect.sgmodule", text: surge },
      ],
      catalog: [],
      index: { objects: {}, latest: {} },
      changes,
      rawBase: "https://raw.githubusercontent.com/JuemingDC/WayX/main",
    });
  assert.equal(report.adapted, 0);
  assert.equal(report.universal, 0);
  await assert.rejects(
    prepareNativeQxSync(root, {
      fetchText: async (url: string) =>
        url === home ? "unrelated HTML" : fetchText(url),
    }),
    /incomplete/,
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
console.log(
  "Ddgksf website: live catalog discovery fixtures, embedded/headerless QX, native Surge arguments/SDK, GitHub supplements, fail-closed catalog and scoped headers passed",
);
