// Modified: 2026-11-01 (chance). Validate exact upstream checksums and local closure independently of generated JavaScript syntax.
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import {
  listFiles,
  readJson,
  readOptional,
  safePath,
} from "../publish/transaction.ts";
// Modified: 2026-11-02 (chance). Coverage follows the source's authorized
// directions, rather than requiring a Loon destination for QX-source scripts.
import {
  universalScriptPath,
  scriptTargetsForSource,
} from "../parser/universal-script.ts";
import { scriptReferences } from "../parser/backup-references.ts";
export async function validateSourceBackups(root: string) {
  const findings: any[] = [];
  const add = (file: string, code: string, text: string) =>
    findings.push({ file, line: 1, code, text });
  const index = await readJson<any>(
    path.join(root, "Resource/Backup/index.json"),
    null,
  );
  if (!index) {
    add(
      "Resource/Backup/index.json",
      "missing-backup-index",
      "Source backup stage did not produce an index",
    );
    return findings;
  }
  if (index.version !== 1 || !index.objects || !index.latest) {
    add(
      "Resource/Backup/index.json",
      "invalid-backup-index",
      "Unsupported backup index",
    );
    return findings;
  }
  for (const [file, record] of Object.entries<any>(index.objects)) {
    try {
      if (
        file !== record.path ||
        !/^Resource\/Backup\/(?:script|plugin)\/[a-f0-9]{64}\/[\w.-]+$/.test(
          file,
        )
      )
        throw Error("Invalid backup path");
      const bytes = await readOptional(safePath(root, file));
      if (
        !bytes ||
        bytes.length !== record.size ||
        crypto.createHash("sha256").update(bytes).digest("hex") !==
          record.sha256 ||
        file.split("/")[3] !==
          crypto.createHash("sha256").update(record.url).digest("hex")
      )
        throw Error("Missing or corrupted upstream archive");
    } catch (e: any) {
      add(file, "backup-integrity", e.message);
    }
  }
  // Modified: 2026-11-01 (chance). Universal source-named adblock programs and retained legacy adapter bytes are audited separately from raw evidence.
  for (const [file, record] of Object.entries<any>(index.adapters ?? {})) {
    try {
      if (
        !/^(?:Script\/Api\/(?:qx|loon|surge|egern)-to-(?:qx|loon|surge|egern)\/[a-f0-9]{64}\.js|Script\/Adblock\/[a-zA-Z0-9_.-]+-[a-f0-9]{12}\/[\p{L}\p{N}_.-]+)$/u.test(
          file,
        ) ||
        file !== record.path
      )
        throw Error("Invalid API adapter path");
      if (
        file.startsWith("Script/Adblock/") &&
        (!["loon", "qx"].includes(record.from) ||
          file !== universalScriptPath(record.sourceUrl) ||
          (JSON.stringify(record.targets) !==
            JSON.stringify(scriptTargetsForSource(record.from)) &&
            // Modified: 2026-11-02 (chance). Previously published programs
            // remain verifiable until Actions replaces their legacy metadata.
            !(
              record.directionPolicyVersion === undefined &&
              JSON.stringify(record.targets) ===
                JSON.stringify(["qx", "surge", "loon"])
            )))
      )
        throw Error("Invalid universal script identity or target coverage");
      const bytes = await readOptional(safePath(root, file));
      if (
        !bytes ||
        crypto.createHash("sha256").update(bytes).digest("hex") !==
          record.sha256
      )
        throw Error("Missing or corrupted API adapter");
      if (file.startsWith("Script/Adblock/"))
        new vm.Script(bytes.toString(), { filename: file });
    } catch (e: any) {
      add(file, "api-adapter-integrity", e.message);
    }
  }
  for (const [url, file] of Object.entries<any>(index.latest))
    if (index.objects[file]?.url !== url)
      add("Resource/Backup/index.json", "backup-source-index", url);
  for (const directory of ["Adblock", "Module"])
    for (const file of await listFiles(path.join(root, directory))) {
      if (!/\.(?:snippet|sgmodule|plugin|conf)$/.test(file)) continue;
      const relative = directory + "/" + file,
        bytes = await readOptional(path.join(root, relative));
      for (const ref of scriptReferences(bytes!.toString())) {
        const match = ref.value.match(
          /^https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/[^/]+\/(Resource\/Backup\/[^#?]+)/,
        );
        const adapter = ref.value.match(
          /^https:\/\/raw\.githubusercontent\.com\/JuemingDC\/WayX\/[^/]+\/(Script\/(?:Api|Adblock)\/[^#?]+)/,
        );
        if (adapter && !index.adapters?.[adapter[1]])
          add(relative, "missing-api-adapter", ref.value);
        if (match && index.objects[match[1]]?.kind !== "script")
          add(relative, "missing-script-backup", ref.value);
      }
    }
  return findings;
}
