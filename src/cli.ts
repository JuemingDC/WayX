// Modified: 2026-10-30 (chance). The sole CLI dispatches layered TypeScript
// services. Proxy configuration stays inherited; no direct-network fallback.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
if (
  (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) &&
  !process.execArgv.includes("--use-env-proxy") &&
  process.env.WAYX_PROXY_BOOTSTRAPPED !== "1"
) {
  const child = spawnSync(
    process.execPath,
    [
      "--use-env-proxy",
      ...process.execArgv,
      fileURLToPath(import.meta.url),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit", env: { ...process.env, WAYX_PROXY_BOOTSTRAPPED: "1" } },
  );
  if (child.error) throw child.error;
  process.exit(child.status ?? 1);
}
const command = process.argv[2] ?? "help",
  args = process.argv.slice(3);
const automation = await import("./application/automation.ts");
const invoke = async (file: string, more: string[] = []) => {
  const result = spawnSync(
    process.execPath,
    [...process.execArgv, file, ...more],
    { stdio: "inherit", env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(`Command failed: ${file} (${result.status})`);
};
try {
  switch (command) {
    case "help":
      console.log(
        "WayX: prepare setup-jq catalog rules sync verify monitor reports issues gate publish summary final check test regenerate regex",
      );
      break;
    case "prepare":
      await automation.prepare();
      break;
    case "setup-jq":
    case "setup_jq":
      await automation.setupJq();
      break;
    case "catalog":
      await automation.executeChecks("catalog", [
        [
          "discovery",
          ["node", ...process.execArgv, "src/cli.ts", "discover", ...args],
        ],
      ]);
      break;
    case "discover":
      await (
        await import("./ingest/catalog.ts")
      ).refreshCatalog(process.cwd(), { check: args.includes("--check") });
      break;
    case "rules":
      if (args[0] === "sync" || args[0] === "check")
        await (
          await import("./application/rules.ts")
        ).runRules(args[0], process.cwd(), !args.includes("--offline"));
      else
        await automation.executeChecks("rules", [
          [
            "aggregate",
            ["node", ...process.execArgv, "src/cli.ts", "rules", "sync"],
          ],
        ]);
      break;
    case "sync":
      await automation.executeChecks("loon_sync", [
        [
          "full-catalog",
          ["node", ...process.execArgv, "src/application/sync-convert.ts"],
        ],
      ]);
      break;
    case "verify":
      await automation.executeChecks("verify", [
        ...(await automation.syntaxChecks(true)),
        [
          "repository-audit",
          ["node", ...process.execArgv, "src/validation/audit-repository.ts"],
        ],
      ]);
      break;
    case "monitor":
      await automation.executeChecks("monitor", [
        [
          "upstreams",
          ["node", ...process.execArgv, "src/cli.ts", "monitor-source"],
        ],
      ]);
      break;
    case "monitor-source":
      await (await import("./application/monitor.ts")).runMonitor();
      break;
    case "reports":
      await automation.executeChecks("reports", [
        [
          "reconciliation",
          ["node", ...process.execArgv, "src/publish/conversion-reports.ts"],
        ],
      ]);
      break;
    case "issues":
      await invoke(
        "src/application/propose-conversion-issues.ts",
        process.env.PUBLISH_BRANCH ? [] : ["--dry-run"],
      );
      break;
    case "gate":
      await automation.publicationGate();
      break;
    case "publish":
      await automation.publish();
      break;
    case "summary":
      await automation.summary();
      break;
    case "final":
      await automation.final();
      break;
    case "syntax":
    case "check":
      await automation.executeChecks("syntax", await automation.syntaxChecks());
      break;
    case "regenerate":
      await invoke("src/publish/regenerate-canonical.ts", args);
      break;
    case "regex": {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
      (await import("./validation/icu.ts")).validateIcuPatterns(
        JSON.parse(Buffer.concat(chunks).toString()),
      );
      break;
    }
    case "test": {
      const files = (await fs.readdir("tests"))
        .filter((f) => f.endsWith(".ts"))
        .sort();
      for (const file of files) await invoke("tests/" + file);
      break;
    }
    default:
      throw Error("Unknown WayX command: " + command);
  }
} catch (error: any) {
  if (command === "rules")
    await fs.mkdir(".github/monitor/.runtime", { recursive: true }).then(() =>
      fs.writeFile(
        ".github/monitor/.runtime/rules-result.json",
        JSON.stringify({
          version: 1,
          complete: false,
          error: error.message,
        }) + "\n",
      ),
    );
  console.error("::error::" + (error.stack || error.message));
  process.exitCode = 1;
}
