// Modified: 2026-11-12 (chance). Discover the site's lazy script catalog and
// extract embedded installation declarations without executing upstream JavaScript.
import path from "node:path";
import ts from "typescript";
export const DDGKSF_SITE = "https://ddgksf2013.top/";
export type SiteResource = {
  name: string;
  url: string;
  author: string;
  icon?: string;
  desc?: string;
  category: "Adblock" | "Module";
  path: string;
};
export function ddgksfCatalogUrl(html: string, site = DDGKSF_SITE) {
  const urls = [
    ...html.matchAll(/\bfetch\(\s*(['"])([^'"\r\n]+\.json)\1\s*\)/g),
  ]
    .map((m) => new URL(m[2], site))
    .filter((u) => u.origin === new URL(site).origin);
  const unique = [...new Set(urls.map((u) => u.href))];
  if (unique.length !== 1)
    throw Error("Ddgksf website catalog discovery is incomplete");
  return unique[0];
}
export function parseDdgksfCatalog(text: string) {
  const payload = JSON.parse(text);
  if (!Array.isArray(payload) || !payload.length)
    throw Error("Invalid Ddgksf website catalog");
  const entries: SiteResource[] = [],
    ignored: any[] = [];
  let total = 0;
  const urls = new Set<string>(),
    paths = new Set<string>();
  for (const group of payload) {
    if (typeof group?.category !== "string" || !Array.isArray(group.items))
      throw Error("Invalid Ddgksf category");
    for (const item of group.items) {
      total++;
      if (
        typeof item?.url !== "string" ||
        typeof item.name !== "string" ||
        !item.name.trim()
      )
        throw Error("Invalid Ddgksf resource");
      const url = new URL(item.url);
      if (url.protocol !== "https:")
        throw Error("Ddgksf resources must use HTTPS");
      url.hash = "";
      if (String(group.catetype) !== "2") {
        ignored.push({
          name: item.name,
          url: url.href,
          reason: "not a script/rewrite resource",
          category: group.category,
        });
        continue;
      }
      if (urls.has(url.href)) continue;
      urls.add(url.href);
      let stem = path.posix
        .basename(decodeURIComponent(url.pathname))
        .replace(/\.(?:js|conf|snippet|sgmodule)$/i, "");
      if (
        /^(?:main|index|rewrite|script)$/i.test(stem) &&
        /[a-z]/i.test(item.name)
      )
        stem = item.name;
      const slug = stem
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!slug)
        throw Error("Ddgksf resource needs a readable name: " + item.name);
      const category: SiteResource["category"] =
        group.category === "去广告" ? "Adblock" : "Module";
      const relative =
        (category === "Adblock" ? "AdBlock" : "Function") +
        "/" +
        slug +
        ".conf";
      if (paths.has(relative))
        throw Error("Ambiguous Ddgksf application identity: " + relative);
      paths.add(relative);
      entries.push({
        name: item.name,
        url: url.href,
        author: item.author || "ddgksf2013",
        icon: item.icon,
        desc: item.desc,
        category,
        path: relative,
      });
    }
  }
  if (!entries.length) throw Error("Empty Ddgksf script catalog");
  return { entries, ignored, total };
}
export function embeddedQxConfiguration(text: string) {
  const tree = ts.createSourceFile(
      "source.js",
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.JS,
    ),
    ranges = new Map<number, ts.CommentRange>();
  const collect = (node: ts.Node) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, node.pos) || []),
      ...(ts.getTrailingCommentRanges(text, node.end) || []),
    ])
      ranges.set(range.pos, range);
    ts.forEachChild(node, collect);
  };
  collect(tree);
  const blocks = [...ranges.values()]
    .sort((a, b) => a.pos - b.pos)
    .filter((r) => r.kind === ts.SyntaxKind.MultiLineCommentTrivia)
    .map((r) => text.slice(r.pos + 2, r.end - 2));
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*\* ?/, ""));
    if (!lines.some((line) => /\surl(?:-and-header)?\s/.test(line))) continue;
    const out: string[] = [];
    let section: string | null = null;
    for (const line of lines) {
      const trimmed = line.trim();
      const target = /^hostname\s*=/.test(trimmed)
        ? "mitm"
        : /\surl(?:-and-header)?\s/.test(trimmed) && !/^[/#;]/.test(trimmed)
          ? "rewrite_local"
          : /^(?:host|ip-cidr)(?:-[a-z]+)?\s*,/i.test(trimmed)
            ? "filter_local"
            : null;
      const heading = trimmed.match(/^\[([^\]]+)\]$/);
      if (heading) {
        section = ["rewrite_local", "filter_local", "mitm"].includes(
          heading[1].toLowerCase(),
        )
          ? heading[1].toLowerCase()
          : null;
        out.push(
          section ? "# [" + section + "]" : "# Source section: " + trimmed,
        );
        continue;
      }
      if (target) {
        if (target !== section) {
          out.push("# [" + target + "]");
          section = target;
        }
        out.push(line);
      } else
        out.push(
          !trimmed || /^(?:#|;|\/\/)/.test(trimmed) ? line : "# " + line,
        );
    }
    return out.join("\n") + "\n";
  }
  throw Error(
    "JavaScript has no embedded Quantumult X installation configuration",
  );
}

export function websiteQxConfiguration(text: string, url: string) {
  if (!/\.js$/i.test(new URL(url).pathname)) return text;
  try {
    return embeddedQxConfiguration(text);
  } catch (error) {
    // A few .js links are themselves headerless QX snippets, not JavaScript.
    if (
      !/^(?:\^|\(\?i\)).+\surl(?:-and-header)?\s/m.test(
        text.replace(/\/\*[\s\S]*?\*\//g, ""),
      )
    )
      throw error;
    return text.replace(/\/\*[\s\S]*?\*\//g, (block) =>
      block
        .split("\n")
        .map((line) => "# " + line)
        .join("\n"),
    );
  }
}
