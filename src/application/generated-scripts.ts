// Modified: 2026-11-02 (chance). Retire only owned generated scripts after
// final rebinding. Keep active/transitive/manual dependencies and exact archives.
import path from "node:path";
import { listFiles, readOptional, safePath } from "../publish/transaction.ts";
import { isWayxGeneratedHelperFilename } from "../domain/generated-scripts.ts";
const generated = (file: string) =>
  path.posix.normalize(file) === file &&
  !file.includes("\\") &&
  (/^Script\/Api\/(?:qx|loon|surge|egern)-to-(?:qx|loon|surge|egern)\/[a-f0-9]{64}\.js$/.test(
    file,
  ) ||
    /^Script\/Adblock\/[a-zA-Z0-9_.-]+-[a-f0-9]{12}\/[\p{L}\p{N}_.-]+$/u.test(
      file,
    ) ||
    /^Script\/(?:[\w.-]+\/)*legacy\/[\w.-]+\.(?:js|mjs|cjs)$/.test(file) ||
    (file.startsWith("Script/") &&
      isWayxGeneratedHelperFilename(path.posix.basename(file))));
export async function pruneGeneratedScripts(
  root: string,
  { index, changes, artifacts = [] }: any,
) {
  const files = new Set(
    (await listFiles(path.join(root, "Script"))).map((f) => "Script/" + f),
  );
  for (const file of changes.keys())
    if (file.startsWith("Script/")) files.add(file);
  for (const file of Object.keys(index.adapters || {}))
    if (generated(file)) files.add(file);
  const owned = new Set([...files].filter(generated));
  // Active raw-backed scripts may depend on generated helpers too. Archives
  // are graph nodes, never deletion candidates or unconditional liveness roots.
  const archives = new Map<string, any>(
    Object.entries<any>(index.objects || {}).filter(
      ([file, record]) =>
        record.kind === "script" && file.startsWith("Resource/Backup/script/"),
    ),
  );
  const nodes = new Set([...files, ...archives.keys()]);
  const current = async (file: string) => {
    if (changes.has(file)) {
      const value = changes.get(file);
      return value === null
        ? null
        : typeof value === "string"
          ? value
          : Buffer.from(value).toString("utf8");
    }
    const bytes = await readOptional(safePath(root, file));
    return bytes === null ? null : bytes.toString();
  };
  const used = new Set<string>(),
    queue: string[] = [];
  const add = (file: string) => {
    if (nodes.has(file) && !used.has(file)) {
      used.add(file);
      queue.push(file);
    }
  };
  const refs = (text: string, owner?: string) => {
    // Also retain literal references in comments: removing a documented callable
    // helper is unnecessary risk. This is reachability, not source API analysis.
    const decoded = text.replace(/(?:%[a-f0-9]{2})+/gi, (part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
    for (const file of nodes)
      if (
        decoded.includes(file) ||
        text.includes(file) ||
        text.includes(encodeURI(file)) ||
        text.includes(encodeURIComponent(file))
      )
        add(file);
    if (owner)
      for (const [, literal] of text.matchAll(/["'`]([^"'`\r\n]+)["'`]/g)) {
        if (!/^(?:\.\.?\/)?[\w./-]+\.(?:js|mjs|cjs)(?:[?#].*)?$/.test(literal))
          continue;
        const clean = literal.split(/[?#]/)[0];
        add(
          path.posix.normalize(
            path.posix.join(path.posix.dirname(owner), clean),
          ),
        );
      }
  };
  const roots = new Map<string, string>();
  for (const artifact of artifacts) {
    if (
      changes.has(artifact.relative) &&
      changes.get(artifact.relative) === null
    )
      continue;
    roots.set(
      artifact.relative,
      String(changes.get(artifact.relative) ?? artifact.text),
    );
  }
  // All retained source declarations and public output types participate,
  // including frozen catalogs and hand-maintained modules outside acquisition.
  for (const base of ["Adblock", "Module", "Rule", "Boxjs", "Resource/Loon"])
    for (const relative of await listFiles(path.join(root, base))) {
      const file = base + "/" + relative;
      if (!roots.has(file)) {
        const text = await current(file);
        if (text !== null) roots.set(file, text);
      }
    }
  const readme = await current("README.md");
  if (readme !== null) roots.set("README.md", readme);
  for (const text of roots.values()) refs(text);
  // An unowned author/functional script is retained and can itself depend on a
  // generated helper. Adapter metadata alone is not a liveness root.
  for (const file of files) if (!owned.has(file)) add(file);
  // Source identities are dependencies of reachable adapters/archives, not
  // roots held alive by obsolete metadata from an orphaned adapter.
  for (let n = 0; n < queue.length; n++) {
    const file = queue[n],
      text = await current(file);
    if (text !== null) refs(text, file);
    const source = index.adapters?.[file]?.sourceUrl || archives.get(file)?.url;
    if (source) refs(source);
  }
  const removed = [...owned].filter((file) => !used.has(file)).sort();
  for (const file of removed) {
    changes.set(file, null);
    if (index.adapters) delete index.adapters[file];
  }
  for (const [artifact, bindings] of Object.entries<any>(
    index.bindings || {},
  )) {
    for (const [url, binding] of Object.entries<any>(bindings))
      if (removed.includes(binding.path)) delete bindings[url];
    if (!Object.keys(bindings).length) delete index.bindings[artifact];
  }
  return {
    removed,
    retainedGenerated: owned.size - removed.length,
    policy:
      "unreferenced-generated-only; active/transitive/manual/source dependencies retained",
  };
}
