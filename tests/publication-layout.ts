// Modified: 2026-11-05 (chance). Exercise the real publication transaction:
// a migrated manual-resource registry must reach Git with its app resources.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { publish } from "../src/application/automation.ts";
const root = await fs.mkdtemp(
  path.join(os.tmpdir(), "wayx-publication-layout-"),
);
const cwd = process.cwd();
const saved = { ...process.env };
const repository = path.join(root, "work");
const remote = path.join(root, "origin.git");
const git = (...args: string[]) =>
  execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
try {
  await fs.mkdir(repository);
  git("init", "--bare", "--initial-branch=main", remote);
  git("init", "--initial-branch=main");
  git("config", "user.name", "chance");
  git("config", "user.email", "fixture@example.test");
  git("remote", "add", "origin", remote);
  await fs.mkdir(path.join(repository, ".github"));
  const registry = path.join(repository, ".github/manual-assets.json");
  await fs.writeFile(registry, '{"version":1,"assets":[]}\n');
  git("add", ".");
  git("commit", "-m", "Fixture baseline");
  git("push", "origin", "main");
  const expected = git("rev-parse", "HEAD");
  const target = "Adblock/Quantumult X/chance/Demo/Demo.snippet";
  const updated =
    JSON.stringify({ version: 1, assets: [{ id: "Demo", qx: target }] }) + "\n";
  await fs.mkdir(path.dirname(path.join(repository, target)), {
    recursive: true,
  });
  await fs.writeFile(path.join(repository, target), "# Name: Demo\n");
  await fs.writeFile(registry, updated);
  process.chdir(repository);
  Object.assign(process.env, {
    PUBLISHABLE: "true",
    PUBLISH_BRANCH: "main",
    EXPECTED_HEAD: expected,
    MONITOR_ENABLED: "false",
  });
  delete process.env.GITHUB_OUTPUT;
  await publish();
  assert.equal(
    git("--git-dir=" + remote, "show", "main:.github/manual-assets.json") +
      "\n",
    updated,
  );
  assert.equal(
    git("--git-dir=" + remote, "show", "main:" + target),
    "# Name: Demo",
  );
  assert.equal(git("status", "--porcelain"), "");
  console.log(
    "Publication layout: migrated manual registry and target resources committed together; clean worktree passed",
  );
} finally {
  process.chdir(cwd);
  process.env = saved;
  await fs.rm(root, { recursive: true, force: true });
}
