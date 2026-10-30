// Modified: 2026-10-30 (chance). Move semantic implementation into the TypeScript parser layer; preserve source behavior.
// Consolidated: 2026-10-03
// Author: chance
// Category: Converter / configuration

// Source configuration IR and target adapters (General / MITM)
// Converted: 2026-10-03
// Author: chance
// Category: Converter / Configuration / Semantic IR
export function parseConfigurationDeclaration(
  line: any,
  { section = "MITM" }: any = {},
): any {
  const source: any = String(line ?? "").trim();
  const match: any = source.match(/^([\w-]+)\s*=\s*([\s\S]*)$/);
  const domain: any =
    String(section).toLowerCase() === "general" ? "general" : "mitm";
  const name: any = match?.[1]?.toLowerCase() ?? null;
  const value: any = match?.[2]?.trim() ?? null;
  const hostnameList: any =
    name === (domain === "general" ? "real-ip" : "hostname");
  return Object.freeze({
    type: "configuration-semantic-ir",
    domain,
    source,
    name,
    value,
    operation: hostnameList ? "hostname-list" : "unknown",
    hosts: Object.freeze(
      hostnameList && value
        ? value
            .split(",")
            .map((host: any): any => host.trim())
            .filter(Boolean)
        : [],
    ),
  });
}
export function planConfiguration(ir: any, target: any): any {
  if (ir?.type !== "configuration-semantic-ir")
    throw new TypeError("Expected Configuration Semantic IR");
  if (!["qx", "surge"].includes(target))
    throw new TypeError("Unknown configuration target: " + target);
  if (!ir.source)
    return { section: ir.domain === "mitm" ? "mitm" : "notes", line: "" };
  if (ir.domain === "mitm") {
    if (ir.operation === "hostname-list") {
      if (!ir.value)
        return {
          section: "mitm",
          line: "# [WayX] REVIEW REQUIRED: empty source MITM hostname declaration",
        };
      // Preserve order, exclusions, wildcards and ports exactly; do not union,
      // sort, deduplicate or infer hosts from Rewrite/Script patterns.
      return {
        section: "mitm",
        line:
          "hostname = " + (target === "surge" ? "%APPEND% " : "") + ir.value,
      };
    }
    return {
      section: "mitm",
      line:
        "# [WayX] ISSUE REQUIRED [unknown-mitm-option]: unsupported source MITM option is outside the registered target grammar\n# Source declaration: " +
        ir.source,
    };
  }
  if (ir.operation !== "hostname-list" || !ir.hosts.length) {
    return {
      section: "notes",
      line:
        "# [WayX] ISSUE REQUIRED [unknown-general-option]: unsupported Loon [General] option\n# Source declaration: " +
        ir.source,
    };
  }
  return target === "surge"
    ? {
        section: "general",
        line: "always-real-ip = %APPEND% " + ir.hosts.join(", "),
      }
    : {
        section: "notes",
        line:
          "# [WayX] Known Quantumult X target limitation: Loon real-ip maps to Quantumult X [general] dns_exclusion_list, but rewrite/filter snippets cannot inject that global option.\n# Source declaration: " +
          ir.source,
      };
}
// Public compatibility API delegates to the sole source parser + IR adapter.
export function planMitmLine(line: any, target: any): any {
  return planConfiguration(parseConfigurationDeclaration(line), target);
}
