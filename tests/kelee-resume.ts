// Modified: 2026-11-08 (chance). Directory 403 retains membership, but actual
// registered plugin acquisition resumes; unavailable discovery is never called fresh.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { refreshCatalog, DEFAULT_LIST_URL } from "../src/ingest/catalog.ts";
import { runMonitor } from "../src/application/monitor.ts";
import { syncCatalogEntry } from "../src/application/sync-convert.ts";
const root = await fs.mkdtemp(path.join(os.tmpdir(), "wayx-kelee-resume-"));
const entry = {
  id: "Kelee_Known",
  file: "Known.lpx",
  source: "https://kelee.one/Tool/Loon/Lpx/Known.lpx",
  qx: "Known.snippet",
  surge: "Known.sgmodule",
  category: "去广告",
};
const write = async (f: string, v: any) => {
  await fs.mkdir(path.dirname(path.join(root, f)), { recursive: true });
  await fs.writeFile(path.join(root, f), JSON.stringify(v));
};
try {
  await write(".github/sources/loon.json", [entry]);
  await write(".github/sources/loon-static.json", []);
  await write(".github/sources/kelee-pause.json", { paused: false });
  const failed = async () => {
    throw Object.assign(Error("HTTP 403"), { status: 403 });
  };
  const result = await refreshCatalog(root, {
    rucu6ListUrl: "",
    fetchText: failed,
  });
  assert.equal(result.paused, false);
  assert.equal(result.keleeDiscovery.complete, false);
  assert.equal(result.keleeDiscovery.retainedEntries, 1);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(root, ".github/sources/loon.json"), "utf8"),
    ),
    [entry],
  );
  await assert.rejects(
    fs.stat(path.join(root, ".github/monitor/.runtime/kelee-feed.json")),
    /ENOENT/,
  );
  let fetched = 0;
  await syncCatalogEntry(entry, {
    root,
    fetchText: async (url: string) => {
      assert.equal(url, entry.source);
      fetched++;
      return "#!name=Known\n[Rule]\nDOMAIN,example.test,REJECT\n";
    },
    log: () => {},
  });
  assert.equal(fetched, 1);
  await write(".github/monitor/sources.json", {
    version: 2,
    settings: {},
    sources: [
      {
        id: "kelee-plugin-directory",
        kind: "http",
        url: DEFAULT_LIST_URL,
        save_as: "Kelee/list.json",
        cached_feed: ".github/monitor/.runtime/kelee-feed.json",
      },
    ],
  });
  const state = {
    version: 1,
    sources: {
      "kelee-plugin-directory": { url: DEFAULT_LIST_URL, sha256: "old-sha" },
    },
  };
  await write(".github/monitor/state.json", state);
  const monitored = await runMonitor(root);
  assert.equal(monitored.failures.length, 0);
  assert.equal(monitored.results[0].deferred, true);
  assert.equal(monitored.results[0].succeeded, false);
  assert.deepEqual(
    JSON.parse(
      await fs.readFile(path.join(root, ".github/monitor/state.json"), "utf8"),
    ),
    state,
  );
  await assert.rejects(
    refreshCatalog(root, {
      rucu6ListUrl: "",
      fetchText: async () => {
        throw Object.assign(Error("Unauthorized"), { status: 401 });
      },
    }),
    /Unauthorized/,
  );
  await assert.rejects(
    refreshCatalog(root, {
      rucu6ListUrl: "",
      fetchText: async () => "{malformed json",
    }),
  );
  await write('.github/sources/loon.json',[]);
  await assert.rejects(refreshCatalog(root,{rucu6ListUrl:'',fetchText:failed}),/HTTP 403/);
  console.log(
    "Kelee resume: unavailable directory retained, actual plugin fetched, explicit monitor deferral/no mirror advancement, authorization/schema failures remain fatal",
  );
} finally {
  await fs.rm(root, { recursive: true, force: true });
}
