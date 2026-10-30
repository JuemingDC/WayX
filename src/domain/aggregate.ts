// Modified: 2026-10-30 (chance). Native TypeScript rule domain: exact bounded
// expansion, source policy provenance, ordered company layers and detached rules.
import { isIP } from "node:net";
import { domainToASCII } from "node:url";
export const QX_TYPES: Record<string, string> = {
  DOMAIN: "host",
  "DOMAIN-SUFFIX": "host-suffix",
  "DOMAIN-KEYWORD": "host-keyword",
  "DOMAIN-WILDCARD": "host-wildcard",
  "IP-CIDR": "ip-cidr",
  "IP-CIDR6": "ip6-cidr",
  "IP-ASN": "ip-asn",
  GEOIP: "geoip",
};
const pool = new Map<string, Rule>();
export class Rule {
  kind: string;
  value: string;
  options: string[];
  key: string;
  constructor(kind: string, value: string, options: string[] = []) {
    this.kind = kind;
    this.value = value;
    this.options = options;
    this.key = JSON.stringify([kind, value, options]);
    const prior = pool.get(this.key);
    if (prior) return prior;
    pool.set(this.key, this);
  }
}
const cmp = (a: any, b: any): number => {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let n = 0; n < Math.min(a.length, b.length); n++) {
      const c = cmp(a[n], b[n]);
      if (c) return c;
    }
    return a.length - b.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
};
const ruleCompare = (a: Rule, b: Rule) =>
  cmp([a.kind, a.value, a.options], [b.kind, b.value, b.options]);
const sorted = (rules: Iterable<Rule>) => [...rules].sort(ruleCompare);
const union = (...sets: Iterable<Rule>[]) =>
  new Set(sets.flatMap((s) => [...s]));
export function canonicalCidr(value: string): string {
  const [raw, maskText, ...extra] = value.split("/");
  const family = isIP(raw);
  if (!family || extra.length) throw Error("Invalid IP network");
  const bits = family === 4 ? 32 : 128,
    mask = maskText === undefined ? bits : Number(maskText);
  if (!/^\d+$/.test(maskText ?? String(bits)) || mask < 0 || mask > bits)
    throw Error("Invalid network prefix");
  let address: bigint;
  if (family === 4)
    address = raw.split(".").reduce((n, v) => (n << 8n) + BigInt(v), 0n);
  else {
    let v = new URL("http://[" + raw + "]/").hostname.slice(1, -1);
    const sides = v.split("::"),
      left = sides[0] ? sides[0].split(":") : [],
      right = sides[1] ? sides[1].split(":") : [];
    const groups =
      sides.length === 2
        ? [
            ...left,
            ...Array(8 - left.length - right.length).fill("0"),
            ...right,
          ]
        : left;
    address = groups.reduce((n, v) => (n << 16n) + BigInt("0x" + v), 0n);
  }
  address = (address >> BigInt(bits - mask)) << BigInt(bits - mask);
  if (family === 4)
    return (
      [24n, 16n, 8n, 0n]
        .map((shift) => Number((address >> shift) & 255n))
        .join(".") +
      "/" +
      mask
    );
  const groups = Array.from({ length: 8 }, (_, i) =>
    Number((address >> BigInt((7 - i) * 16)) & 65535n).toString(16),
  );
  const normalized = new URL(
    "http://[" + groups.join(":") + "]/",
  ).hostname.slice(1, -1);
  return normalized + "/" + mask;
}
export function normalized(
  kind: string,
  value: string,
  options: string[] = [],
): Rule {
  kind =
    Object.fromEntries(
      Object.entries(QX_TYPES).map(([k, v]) => [v.toUpperCase(), k]),
    )[kind.toUpperCase()] || kind.toUpperCase();
  if (kind === "PROCESS-NAME") {
    if (!value || /[\r\n,\0]/.test(value) || options.length)
      throw Error("Invalid process rule");
    return new Rule(kind, value);
  }
  if (!(kind in QX_TYPES)) throw Error("Unsupported native rule type: " + kind);
  if (!value || /[\s,\0]/.test(value))
    throw Error("Invalid rule operand: " + value);
  value = value.toLowerCase().replace(/\.+$/, "");
  if (["DOMAIN", "DOMAIN-SUFFIX"].includes(kind)) {
    value = domainToASCII(value);
    if (!/^[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/.test(value))
      throw Error("Invalid domain: " + value);
  } else if (kind === "IP-CIDR" || kind === "IP-CIDR6") {
    const family = isIP(value.split("/")[0]);
    if (family !== (kind === "IP-CIDR6" ? 6 : 4))
      throw Error("IP family mismatch");
    value = canonicalCidr(value);
  } else if (kind === "GEOIP" && !/^[a-z]{2}$/.test(value))
    throw Error("Invalid country code");
  else if (kind === "IP-ASN" && !/^\d+$/.test(value))
    throw Error("Invalid ASN");
  options = [...new Set(options.map((o) => o.toLowerCase()))].sort();
  if (options.some((o) => !["no-resolve", "extended-matching"].includes(o)))
    throw Error("Unsupported native rule parameters");
  return new Rule(kind, value, options);
}
export function regexNative(original: string, limit = 256): Set<Rule> | null {
  if (original.length > 4096) return null;
  let pattern = original,
    suffix = false;
  for (const p of ["(^|\\.)", "(?:^|\\.)"])
    if (pattern.startsWith(p)) {
      pattern = pattern.slice(p.length);
      suffix = true;
      break;
    }
  if (!suffix) {
    if (!pattern.startsWith("^")) return null;
    pattern = pattern.slice(1);
  }
  if (!pattern.endsWith("$")) return null;
  pattern = pattern.slice(0, -1);
  let position = 0;
  const combine = (a: Set<string>, b: Set<string>) => {
    if (a.size * b.size > limit) throw Error("Expansion limit");
    const out = new Set<string>();
    for (const x of a)
      for (const y of b) {
        if ((x + y).length > 253) throw Error("Domain length");
        out.add(x + y);
      }
    return out;
  };
  const expression = (nested = false): Set<string> => {
    const choices = new Set<string>();
    let sequence = new Set([""]);
    while (position < pattern.length && pattern[position] !== ")") {
      const char = pattern[position++];
      let atom: Set<string>;
      if (char === "|") {
        if (!nested) throw Error("Alternation crosses anchors");
        for (const s of sequence) choices.add(s);
        sequence = new Set([""]);
        continue;
      }
      if (char === "(") {
        if (pattern.slice(position, position + 2) === "?:") position += 2;
        atom = expression(true);
        if (pattern[position] !== ")") throw Error("Unclosed group");
        position++;
      } else if (char === "\\") {
        const c = pattern[position++];
        if (c === "d") atom = new Set("0123456789");
        else if (c && ".-_".includes(c)) atom = new Set([c]);
        else throw Error("Unsupported escape");
      } else if (char === "[") {
        atom = new Set();
        while (position < pattern.length && pattern[position] !== "]") {
          const first = pattern[position++];
          if (!/^[a-zA-Z0-9_-]$/.test(first)) throw Error("Unsupported class");
          if (
            position + 1 < pattern.length &&
            pattern[position] === "-" &&
            pattern[position + 1] !== "]"
          ) {
            const last = pattern[position + 1];
            position += 2;
            if (
              !(
                (/^\d$/.test(first) && /^\d$/.test(last)) ||
                (first >= "a" && first <= last && last <= "z") ||
                (first >= "A" && first <= last && last <= "Z")
              )
            )
              throw Error("Unsupported range");
            for (let n = first.charCodeAt(0); n <= last.charCodeAt(0); n++)
              atom.add(String.fromCharCode(n));
          } else atom.add(first);
        }
        if (!atom.size || position >= pattern.length)
          throw Error("Invalid class");
        position++;
      } else if (char === ".") atom = new Set(["?"]);
      else if (/^[a-zA-Z0-9_-]$/.test(char)) atom = new Set([char]);
      else throw Error("Unsupported operator");
      if (
        atom.size === 1 &&
        atom.has("?") &&
        ["*", "+"].includes(pattern[position])
      ) {
        atom = new Set([pattern[position] === "*" ? "*" : "?*"]);
        position++;
        if (pattern[position] === "?") position++;
      }
      let min = 1,
        max = 1;
      if (pattern[position] === "?") {
        min = 0;
        position++;
      } else if (pattern[position] === "{") {
        const count = pattern.slice(position).match(/^\{(\d+)(?:,(\d+))?\}/);
        if (!count) throw Error("Unbounded repetition");
        min = Number(count[1]);
        max = Number(count[2] ?? count[1]);
        position += count[0].length;
        if (min < 0 || min > max || max > 8) throw Error("Repetition limit");
      }
      if (pattern[position] === "?") position++;
      let repeated = new Set<string>(),
        power = new Set([""]);
      for (let n = 0; n <= max; n++) {
        if (n >= min) for (const s of power) repeated.add(s);
        if (repeated.size > limit) throw Error("Expansion limit");
        if (n < max) power = combine(power, atom);
      }
      sequence = combine(sequence, repeated);
    }
    for (const s of sequence) choices.add(s);
    if (choices.size > limit) throw Error("Expansion limit");
    return choices;
  };
  try {
    const values = expression();
    if (position !== pattern.length) return null;
    const result = new Set<Rule>();
    for (const v of values) {
      if (v.includes("*") || v.includes("?")) {
        result.add(normalized("DOMAIN-WILDCARD", v));
        if (suffix) result.add(normalized("DOMAIN-WILDCARD", "*." + v));
      } else result.add(normalized(suffix ? "DOMAIN-SUFFIX" : "DOMAIN", v));
    }
    return result;
  } catch {
    return null;
  }
}
export function* wireFields(
  data: Uint8Array,
): Generator<[number, number, number | Uint8Array]> {
  let offset = 0;
  const varint = () => {
    let value = 0n;
    for (let shift = 0n; shift < 70n; shift += 7n) {
      if (offset >= data.length) throw Error("Truncated protobuf varint");
      const byte = data[offset++];
      value |= BigInt(byte & 127) << shift;
      if (byte < 128) {
        if (value > BigInt(Number.MAX_SAFE_INTEGER))
          throw Error("Oversized protobuf integer");
        return Number(value);
      }
    }
    throw Error("Oversized protobuf varint");
  };
  while (offset < data.length) {
    const key = varint(),
      field = Math.floor(key / 8),
      wire = key & 7;
    if (!field) throw Error("Invalid protobuf field number");
    if (wire === 0) yield [field, wire, varint()];
    else if (wire === 2) {
      const length = varint();
      if (length > data.length - offset)
        throw Error("Truncated protobuf payload");
      yield [field, wire, data.slice(offset, offset + length)];
      offset += length;
    } else throw Error("Unsupported protobuf wire type: " + wire);
  }
}
type GeoEntry = [number, string, Set<string>];
export function geosites(
  data: Uint8Array,
  _anomalies: any[] = [],
): Map<string, GeoEntry[]> {
  const sites = new Map<string, GeoEntry[]>(),
    decode = (x: any) => Buffer.from(x).toString("utf8");
  for (const [field, wire, payload] of wireFields(data)) {
    if (field !== 1 || wire !== 2) throw Error("Unknown GeoSiteList schema");
    let name: string | null = null;
    const entries: GeoEntry[] = [];
    for (const [key, type, value] of wireFields(payload as Uint8Array)) {
      if (key === 1 && type === 2) name = decode(value).toLowerCase();
      else if (key === 2 && type === 2) {
        let kind = 0,
          operand: string | null = null;
        const attributes = new Set<string>();
        for (const [k, t, v] of wireFields(value as Uint8Array)) {
          if (k === 1 && t === 0) kind = v as number;
          else if (k === 2 && t === 2) operand = decode(v);
          else if (k === 3 && t === 2) {
            for (const [ak, at, av] of wireFields(v as Uint8Array)) {
              if (ak === 1 && at === 2)
                attributes.add(decode(av).toLowerCase());
              else if (![2, 3].includes(ak))
                throw Error("Unknown domain attribute schema");
            }
          } else throw Error("Unknown domain schema");
        }
        if (operand === null || kind < 0 || kind > 3)
          throw Error("Invalid domain record");
        entries.push([kind, operand, attributes]);
      } else throw Error("Unknown GeoSite schema");
    }
    if (!name || sites.has(name)) throw Error("Missing/duplicate geosite name");
    sites.set(name, entries);
  }
  if (!sites.size) throw Error("Empty geosite database");
  return sites;
}
export const qxPolicy = (policy: string) => {
  const p = String(policy || "")
    .trim()
    .toUpperCase();
  return p.startsWith("REJECT")
    ? "REJECT"
    : p === "DIRECT"
      ? "DIRECT"
      : "PROXY";
};
export const surgeOptions = (rule: Rule) => [
  ...new Set([
    ...rule.options,
    ...(["IP-CIDR", "IP-CIDR6", "GEOIP", "IP-ASN"].includes(rule.kind)
      ? ["no-resolve"]
      : []),
  ]),
];
export function serialize(rule: Rule, policy: string, target: string): string {
  if (target === "QuantumultX") {
    const action = qxPolicy(policy).toLowerCase();
    return [
      QX_TYPES[rule.kind],
      rule.value,
      action === "proxy" ? "ssid" : action,
    ].join(",");
  }
  if (
    !["DIRECT", "PROXY"].includes(policy) &&
    !policy.startsWith("REJECT") &&
    !/^[A-Za-z][A-Za-z0-9_]*$/.test(policy)
  )
    throw Error("Invalid policy name");
  return [
    rule.kind,
    rule.kind === "GEOIP" ? rule.value.toUpperCase() : rule.value,
    ...surgeOptions(rule),
  ].join(",");
}
export function nativeRules(
  text: string,
  source: any,
  anomalies: any[],
  withOrigin = false,
): any[] {
  const result: any[] = [],
    emit = (rule: Rule, policy: string, explicit = false) =>
      result.push(withOrigin ? [rule, policy, explicit] : [rule, policy]),
    desktop =
      /\b(?:PROCESS-NAME|PROCESS-PATH|PROCESS-NAME-REGEX|PROCESS-PATH-REGEX|UID|USER|USER-ID)\s*,/i;
  const filtered = (
    line: any,
    reason: string,
    code = "filtered-unsupported-rule",
    number?: number,
  ) =>
    anomalies.push({
      source: source.id,
      ...(number ? { line: number } : {}),
      declaration: typeof line === "string" ? line : JSON.stringify(line),
      code,
      reason,
    });
  if (source.format === "sing-box-json") {
    const doc = JSON.parse(text);
    if (![1, 2, 3, 4, 5].includes(doc.version) || !Array.isArray(doc.rules))
      throw Error("Unsupported sing-box rule-set schema");
    for (const item of doc.rules) {
      const keys = Object.keys(item);
      if (
        keys.some((k) =>
          [
            "process_name",
            "process_path",
            "process_path_regex",
            "process_name_regex",
            "package_name_regex",
            "user",
            "user_id",
            "package_name",
          ].includes(k),
        )
      ) {
        filtered(
          item,
          "Desktop/application identity condition intentionally excluded",
          "filtered-desktop-rule",
        );
        continue;
      }
      if (
        keys.some(
          (k) =>
            ![
              "domain",
              "domain_suffix",
              "domain_keyword",
              "domain_regex",
              "ip_cidr",
            ].includes(k),
        ) ||
        (item.ip_cidr &&
          ["domain", "domain_suffix", "domain_keyword", "domain_regex"].some(
            (k) => item[k],
          ))
      ) {
        filtered(
          item,
          "No native equivalent for all predicates; entire condition omitted",
        );
        continue;
      }
      const exact = new Set(
        typeof item.domain === "string" ? [item.domain] : (item.domain ?? []),
      );
      for (const [key, raw] of Object.entries(item)) {
        const values = typeof raw === "string" ? [raw] : raw;
        if (!Array.isArray(values) || values.some((v) => typeof v !== "string"))
          throw Error("Invalid sing-box operand array");
        for (let value of values) {
          if (key === "domain_regex") {
            const rules = regexNative(value);
            if (rules) for (const r of rules) emit(r, source.policy ?? "PROXY");
            else
              filtered(
                "regexp:" + value,
                "Outside bounded exact native conversion subset; no widening allowed",
                "filtered-unsupported-regexp",
              );
            continue;
          }
          let kind = (
            {
              domain: "DOMAIN",
              domain_suffix: "DOMAIN-SUFFIX",
              domain_keyword: "DOMAIN-KEYWORD",
              ip_cidr: value.includes(":") ? "IP-CIDR6" : "IP-CIDR",
            } as any
          )[key];
          if (key === "domain_suffix" && value.startsWith(".")) {
            if (exact.has(value.slice(1))) value = value.slice(1);
            else {
              kind = "DOMAIN-WILDCARD";
              value = "*" + value;
            }
          }
          emit(normalized(kind, value), source.policy ?? "PROXY");
        }
      }
    }
    return result;
  }
  for (const [number, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || /^(?:#|;|\/\/)/.test(line)) continue;
    try {
      if (desktop.test(line)) {
        filtered(
          line,
          "Desktop identity condition intentionally excluded",
          "filtered-desktop-rule",
          number + 1,
        );
        continue;
      }
      let policy = source.policy ?? "PROXY",
        explicit = false,
        rule: Rule;
      if (source.format === "domain-suffixes")
        rule = normalized("DOMAIN-SUFFIX", line.replace(/^\.+/, ""));
      else if (source.format === "cidr")
        rule = normalized(line.includes(":") ? "IP-CIDR6" : "IP-CIDR", line, [
          "no-resolve",
        ]);
      else if (source.format === "domainset")
        rule = normalized(
          line.startsWith(".") ? "DOMAIN-SUFFIX" : "DOMAIN",
          line.replace(/^\.+/, ""),
        );
      else if (source.format === "geosite-text") {
        let [value, ...attributes] = line.split(/\s+/);
        if (attributes.some((v) => !v.startsWith("@")))
          throw Error("Unsupported geosite fields");
        let prefix = "domain";
        if (value.includes(":")) {
          const i = value.indexOf(":");
          prefix = value.slice(0, i);
          value = value.slice(i + 1);
        }
        if (prefix === "regexp") {
          const rules = regexNative(value);
          if (rules) for (const r of rules) emit(r, policy);
          else
            filtered(
              line,
              "No exact native regex conversion; intentionally omitted",
              "filtered-unsupported-regexp",
              number + 1,
            );
          continue;
        }
        rule = normalized(
          (
            {
              domain: "DOMAIN-SUFFIX",
              full: "DOMAIN",
              keyword: "DOMAIN-KEYWORD",
            } as any
          )[prefix] ?? prefix,
          value,
        );
      } else {
        const [kind, value, ...tail] = line.split(",").map((s) => s.trim());
        if (value === undefined) throw Error("Missing rule operand");
        const options: string[] = [];
        for (const field of tail) {
          if (
            ["DIRECT", "PROXY"].includes(field.toUpperCase()) ||
            field.toUpperCase().startsWith("REJECT")
          ) {
            policy = field.toUpperCase();
            explicit = true;
          } else options.push(field);
        }
        rule = normalized(kind, value, options);
      }
      emit(rule, policy, explicit);
    } catch (error: any) {
      filtered(
        line,
        String(error.message),
        /^Unsupported native rule (?:type:|parameters)/.test(error.message)
          ? "filtered-unsupported-rule"
          : "unsupported-source-rule",
        number + 1,
      );
    }
  }
  return result;
}
export function build(
  config: any,
  inputs: Record<string, Uint8Array>,
): [Record<string, string>, Record<string, any>, any[]] {
  const anomalies: any[] = [],
    sites = geosites(inputs.geosite, anomalies),
    appNames = new Set<string>(config.applications.map((a: any) => a.name)),
    routingPolicies = config.routing_policies ?? {},
    scope = new Map<string, Set<Rule>>(),
    exclusions = new Map<string, [string, RegExp][]>();
  const records: [string, string, Rule, string, string, boolean][] = [],
    buckets = new Map<string, Set<Rule>>(),
    authors = new Map<string, Set<string>>(),
    urls = new Map<string, Set<string>>();
  const key = (...parts: any[]) => JSON.stringify(parts);
  if (
    Object.entries(routingPolicies).some(
      ([n, p]) => !appNames.has(n) || p !== "PROXY",
    )
  )
    throw Error("Invalid application routing policy");
  if (
    config.applications.some(
      (a: any) =>
        a.name in routingPolicies && (a.split || a.proxy_tags?.length),
    )
  )
    throw Error(
      "Proxy-only applications cannot declare direct/proxy selectors",
    );
  for (const [name, specs] of Object.entries(config.rule_exclusions ?? {})) {
    if (
      !appNames.has(name) &&
      ![
        "adblock",
        "adblock_extra",
        "media",
        "media_cn",
        "cn",
        "proxy",
      ].includes(name)
    )
      throw Error("Unknown rule exclusion category: " + name);
    exclusions.set(
      name,
      (specs as any[]).map((s) => {
        if (
          Object.keys(s).sort().join(",") !== "kind,value_regex" ||
          !(s.kind in QX_TYPES)
        )
          throw Error("Invalid configured rule exclusion");
        return [s.kind, new RegExp(s.value_regex)];
      }),
    );
  }
  const excluded = (name: string, rule: Rule) => {
    if (
      exclusions
        .get(name)
        ?.some(
          ([kind, pattern]) => rule.kind === kind && pattern.test(rule.value),
        )
    )
      return true;
    const rules = scope.get(name);
    if (!rules?.size) return false;
    return (
      rules.has(new Rule(rule.kind, rule.value)) ||
      (["DOMAIN", "DOMAIN-SUFFIX"].includes(rule.kind) &&
        rule.value
          .split(".")
          .some((_, i) =>
            rules.has(
              new Rule(
                "DOMAIN-SUFFIX",
                rule.value.split(".").slice(i).join("."),
              ),
            ),
          ))
    );
  };
  const add = (
    name: string,
    policy: string,
    rules: Iterable<Rule>,
    author: string,
    source: string,
    explicit = false,
  ) => {
    for (const rule of rules)
      if (
        !exclusions
          .get(name)
          ?.some(([k, p]) => rule.kind === k && p.test(rule.value))
      )
        records.push([name, policy, rule, author, source, explicit]);
  };
  const select = (tags: string[], group: string): Set<Rule> => {
    const result = new Set<Rule>();
    for (const selector of tags) {
      const [tag, attribute] = selector.split("@");
      const entries = sites.get(tag);
      if (!entries) throw Error("Unknown configured geosite: " + tag);
      if (attribute !== undefined && !/^!?[a-z0-9_-]+$/.test(attribute))
        throw Error("Invalid geosite attribute selector: " + selector);
      for (const [kind, operand, attributes] of entries) {
        if (
          attribute !== undefined &&
          attributes.has(attribute.replace(/^!/, "")) ===
            attribute.startsWith("!")
        )
          continue;
        if (kind === 1) {
          const converted = regexNative(operand);
          if (converted) {
            for (const r of converted) result.add(r);
            continue;
          }
          anomalies.push({
            source: "V2Fly",
            category: group,
            declaration: "regexp:" + operand,
            code: "filtered-unsupported-regexp",
            reason:
              "Outside bounded exact native conversion subset; no widening allowed",
          });
          continue;
        }
        try {
          result.add(
            normalized(
              ({ 0: "DOMAIN-KEYWORD", 2: "DOMAIN-SUFFIX", 3: "DOMAIN" } as any)[
                kind
              ],
              operand,
            ),
          );
        } catch (error: any) {
          anomalies.push({
            source: "V2Fly",
            category: group,
            declaration: operand,
            code: "unsupported-source-rule",
            reason: error.message,
          });
        }
      }
    }
    return result;
  };
  for (const app of config.applications)
    scope.set(app.name, select(app.exclude_tags ?? [], app.name));
  const origin = config.geosite.repository;
  for (const app of config.applications) {
    const name = app.name,
      ordinary = new Set(
        [...select(app.tags, name)].filter((r) => !excluded(name, r)),
      ),
      proxy = new Set(
        [...select(app.proxy_tags ?? [], name)].filter(
          (r) => !excluded(name, r),
        ),
      );
    if (app.split) {
      add(
        name,
        "DIRECT",
        [...ordinary].filter((r) => !proxy.has(r)),
        "V2Fly",
        origin,
      );
      add(name, name, proxy, "V2Fly", origin);
    } else add(name, name, ordinary, "V2Fly", origin);
  }
  const domestic = select(config.collections.media_cn, "media_cn"),
    overseas = select(config.collections.media, "media");
  add("media_cn", "DIRECT", domestic, "V2Fly", origin);
  add("media", "Media", overseas, "V2Fly", origin);
  add("cn", "DIRECT", select(config.collections.cn, "cn"), "V2Fly", origin);
  add(
    "proxy",
    "PROXY",
    select(config.collections.proxy, "proxy"),
    "V2Fly",
    origin,
  );
  const parsed = config.sources.map(
    (s: any) =>
      [
        s,
        nativeRules(
          Buffer.from(inputs[s.id])
            .toString("utf8")
            .replace(/^\uFEFF/, ""),
          s,
          anomalies,
          true,
        ),
      ] as [any, any[]],
  );
  for (const [source, rows] of parsed)
    if (!source.standalone)
      for (const [rule, policy, explicit] of rows)
        add(
          source.category,
          policy,
          [rule],
          source.author,
          source.url,
          explicit,
        );
  const routingLayers = new Map<string, [string, string, Set<Rule>][]>();
  for (const app of config.applications) {
    const layers: [string, string, Set<Rule>][] = [];
    for (const layer of app.routing_layers ?? []) {
      if (
        !["DIRECT", "PROXY"].includes(layer.policy) ||
        !/^[a-z][a-z0-9_]*$/.test(layer.surge_suffix)
      )
        throw Error("Invalid application routing layer");
      if (
        (layer.sources ?? []).some(
          (id: string) => !parsed.some(([s]: any) => s.id === id),
        )
      )
        throw Error("Unknown application routing layer source");
      const rules = select(layer.tags ?? [], app.name);
      for (const [source, rows] of parsed)
        if (layer.sources?.includes(source.id))
          for (const [rule] of rows) rules.add(rule);
      layers.push([layer.policy, layer.surge_suffix, rules]);
    }
    routingLayers.set(app.name, layers);
  }
  const routeLayer = (
    name: string,
    rule: Rule,
    policy: string | null = null,
  ): [number, string | null, string | null] => {
    const layers = routingLayers.get(name) ?? [];
    for (const [position, [action, suffix, rules]] of layers.entries())
      if (rules.has(rule) && (policy === null || qxPolicy(policy) === action))
        return [position, action, suffix];
    return [layers.length, null, null];
  };
  const classification = config.classification ?? {},
    priority: string[] = classification.priority ?? [];
  if (
    new Set(priority).size !== priority.length ||
    priority.some((n) => !appNames.has(n))
  )
    throw Error("Invalid classification priority");
  const ownership = new Map<string, Set<string>>(),
    suffixOwners = new Map<string, Set<string>>();
  const index = (name: string, rules: Iterable<Rule>) => {
    for (const r of rules) {
      if (excluded(name, r)) continue;
      const k = key(r.kind, r.value);
      if (!ownership.has(k)) ownership.set(k, new Set());
      ownership.get(k)!.add(name);
      if (r.kind === "DOMAIN-SUFFIX") {
        if (!suffixOwners.has(r.value)) suffixOwners.set(r.value, new Set());
        suffixOwners.get(r.value)!.add(name);
      }
    }
  };
  for (const app of config.applications)
    index(app.name, select([...app.tags, ...(app.proxy_tags ?? [])], app.name));
  index(
    "media_cn",
    union(domestic, select(classification.domestic_tags ?? [], "media_cn")),
  );
  index(
    "media",
    union(overseas, select(classification.overseas_tags ?? [], "media")),
  );
  for (const [name, , r] of records)
    if (appNames.has(name) || ["media", "media_cn"].includes(name))
      index(name, [r]);
  const destination = (
    name: string,
    policy: string,
    rule: Rule,
    source: string,
  ): string => {
    if (name.startsWith("adblock") || policy.startsWith("REJECT")) return name;
    if (["cn", "proxy"].includes(name))
      return qxPolicy(policy) === "DIRECT" ? "cn" : "proxy";
    const candidates = new Set(ownership.get(key(rule.kind, rule.value)) ?? []);
    if (
      ["DOMAIN", "DOMAIN-SUFFIX"].includes(rule.kind) &&
      ![...candidates].some((n) => appNames.has(n))
    ) {
      const labels = rule.value.split(".");
      for (let i = 0; i < labels.length; i++) {
        const matches = suffixOwners.get(labels.slice(i).join("."));
        if (matches?.size) {
          for (const v of matches) candidates.add(v);
          if ([...candidates].some((n) => appNames.has(n))) break;
        }
      }
    }
    const named = [...candidates].filter((n) => appNames.has(n)),
      preferred = priority.find((n) => named.includes(n));
    if (preferred) return preferred;
    if (named.length === 1) return named[0];
    if (named.length > 1) {
      if (named.includes(name)) return name;
      anomalies.push({
        source,
        category: name,
        declaration: rule.kind + "," + rule.value,
        code: "ambiguous-app-ownership",
        reason:
          "Conflicting upstream app ownership: " + named.sort().join(", "),
      });
      return name;
    }
    if (candidates.has("media_cn")) return "media_cn";
    if (candidates.has("media")) return "media";
    return name;
  };
  const defaults = config.default_policies ?? {};
  if (
    Object.entries(defaults).some(
      ([name, policy]) =>
        !(
          appNames.has(name) ||
          ["media", "media_cn", "cn", "proxy"].includes(name)
        ) || !["DIRECT", "PROXY"].includes(policy as string),
    )
  )
    throw Error("Invalid category default policy");
  if (
    Object.entries(defaults).some(
      ([name, p]) => name in routingPolicies && p !== routingPolicies[name],
    )
  )
    throw Error("Category default conflicts with application routing policy");
  const applicationDefaults = new Map<string, Set<string>>();
  for (const [name, p, r, , , explicit] of records)
    if (
      appNames.has(name) &&
      !explicit &&
      !p.startsWith("REJECT") &&
      !excluded(name, r)
    ) {
      const k = key(name, r.key);
      if (!applicationDefaults.has(k)) applicationDefaults.set(k, new Set());
      applicationDefaults.get(k)!.add(qxPolicy(p));
    }
  const explicitRules = new Set<string>();
  for (const [
    name,
    originalPolicy,
    rule,
    author,
    source,
    explicit,
  ] of records) {
    let policy = originalPolicy,
      target = destination(name, policy, rule, source);
    if (excluded(target, rule)) continue;
    if (target in routingPolicies && policy === "DIRECT") {
      target = "cn";
      if (excluded(target, rule)) continue;
    }
    if (target === "apple" && !explicit && !policy.startsWith("REJECT"))
      policy = routeLayer(target, rule)[1] ?? "DIRECT";
    else if (
      routingLayers.get(target)?.length &&
      !explicit &&
      !policy.startsWith("REJECT")
    )
      policy = routeLayer(target, rule)[1] ?? policy;
    if (
      !explicit &&
      !["DIRECT", "PROXY"].includes(policy) &&
      !policy.startsWith("REJECT")
    ) {
      const preferred = applicationDefaults.get(key(target, rule.key));
      if (name !== target && preferred?.size === 1) policy = [...preferred][0];
      policy = defaults[target] ?? policy;
    }
    if (
      target in routingPolicies &&
      !["DIRECT", "PROXY"].includes(policy) &&
      !policy.startsWith("REJECT")
    )
      policy = routingPolicies[target];
    if (target === "media_cn" && qxPolicy(policy) === "PROXY") {
      target = "media";
      if (excluded(target, rule)) continue;
    }
    if (explicit) explicitRules.add(key(target, rule.key, qxPolicy(policy)));
    const k = key(target, policy);
    if (!buckets.has(k)) {
      buckets.set(k, new Set());
      authors.set(k, new Set());
      urls.set(k, new Set());
    }
    buckets.get(k)!.add(rule);
    authors.get(k)!.add(author);
    urls.get(k)!.add(source);
  }
  const rendered: Record<string, string> = {},
    metadata: Record<string, any> = {},
    surgeAction = (p: string) =>
      p === "DIRECT" || p.startsWith("REJECT") ? p : "PROXY",
    layouts = config.surge_output ?? {},
    categories = new Set([
      ...appNames,
      "media",
      "media_cn",
      "cn",
      "proxy",
      "adblock",
      "adblock_extra",
    ]);
  if (
    Object.entries(layouts).some(
      ([n, v]) =>
        !categories.has(n) || !["split", "combined"].includes(v as string),
    )
  )
    throw Error("Invalid Surge output layout");
  if (Object.keys(routingPolicies).some((n) => layouts[n] === "split"))
    throw Error("Proxy-only applications require a single Surge rule-set");
  const splitNames = new Set<string>();
  for (const k of buckets.keys()) {
    const [name] = JSON.parse(k);
    if (
      !(name in routingPolicies) &&
      (layouts[name] === "split" ||
        (layouts[name] !== "combined" &&
          new Set(
            [...buckets.keys()]
              .map((k) => JSON.parse(k))
              .filter(([n]) => n === name)
              .map(([, p]) => surgeAction(p)),
          ).size > 1))
    )
      splitNames.add(name);
  }
  const appleProxy = sorted(
    union(
      ...[...buckets]
        .filter(([k]) => {
          const [n, p] = JSON.parse(k);
          return n === "apple" && qxPolicy(p) === "PROXY";
        })
        .map(([, rules]) => rules),
    ),
  );
  const overlaps = (a: Rule, b: Rule) =>
    !["DOMAIN", "DOMAIN-SUFFIX"].includes(a.kind) ||
    !["DOMAIN", "DOMAIN-SUFFIX"].includes(b.kind) ||
    a.value === b.value ||
    (a.kind === "DOMAIN-SUFFIX" && b.value.endsWith("." + a.value)) ||
    (b.kind === "DOMAIN-SUFFIX" && a.value.endsWith("." + b.value));
  const surgeAppleDirect = (r: Rule) => {
    const native = serialize(r, "DIRECT", "Surge");
    if (routeLayer("apple", r, "DIRECT")[2] !== null) return native;
    const blockers = appleProxy
      .filter((b) => overlaps(r, b))
      .map((b) => serialize(b, "PROXY", "Surge"));
    if (!blockers.length) return native;
    const blocked =
      blockers.length === 1
        ? blockers[0]
        : "OR,(" + blockers.map((b) => "(" + b + ")").join(",") + ")";
    return "AND,((" + native + "),(NOT,((" + blocked + "))))";
  };
  for (const target of ["QuantumultX", "Surge"]) {
    const grouped = new Map<string, [string, string, Rule[]][]>();
    for (const [k, rules] of buckets) {
      const [name, policy] = JSON.parse(k);
      let suffix =
        target === "Surge" && splitNames.has(name)
          ? "_" + surgeAction(policy).toLowerCase().replaceAll("-", "_")
          : "";
      if (
        target === "Surge" &&
        !splitNames.has(name) &&
        policy.startsWith("REJECT") &&
        (policy !== "REJECT" ||
          [...buckets.keys()]
            .map((k) => JSON.parse(k))
            .some(([n, p]) => n === name && !p.startsWith("REJECT")))
      )
        suffix = "_" + policy.toLowerCase().replaceAll("-", "_");
      const partitions = new Map<string, Rule[]>();
      for (const r of rules) {
        const layer = routeLayer(name, r, policy)[2];
        let outputSuffix = target === "Surge" && layer ? "_" + layer : suffix;
        if (target === "Surge" && name === "apple" && policy === "DIRECT")
          outputSuffix = "_cn";
        if (!partitions.has(outputSuffix)) partitions.set(outputSuffix, []);
        partitions.get(outputSuffix)!.push(r);
      }
      for (const [suffix, partition] of partitions) {
        const file = `Rule/${target}/${name}${suffix}.list`;
        if (!grouped.has(file)) grouped.set(file, []);
        grouped.get(file)!.push([name, policy, sorted(partition)]);
      }
    }
    for (const [file, groups] of grouped) {
      groups.sort(
        (a, b) => Number(a[1] === "DIRECT") - Number(b[1] === "DIRECT"),
      );
      const lines: string[] = [],
        seen = new Set<string>(),
        sourceAuthors = new Set<string>(),
        sources = new Set<string>();
      let ordered: [Rule, string][] = [];
      for (const [name, p, rules] of groups) {
        for (const a of authors.get(key(name, p)) ?? []) sourceAuthors.add(a);
        for (const u of urls.get(key(name, p)) ?? []) sources.add(u);
        for (const r of rules) {
          if (
            target === "QuantumultX" &&
            (!(r.kind in QX_TYPES) || r.options.includes("extended-matching"))
          ) {
            anomalies.push({
              source: [...(authors.get(key(name, p)) ?? [])].sort().join(" / "),
              category: name,
              target,
              declaration: r.kind + "," + r.value,
              code: "filtered-unsupported-target",
              reason:
                "Native rule type/options are not supported by Quantumult X",
            });
            continue;
          }
          ordered.push([r, p]);
        }
      }
      if (target === "QuantumultX") {
        const actions = new Map<string, Set<Rule>>();
        for (const [r, p] of ordered) {
          const action = qxPolicy(p);
          if (!actions.has(action)) actions.set(action, new Set());
          actions.get(action)!.add(r);
        }
        ordered = [...actions].flatMap(([p, rules]) =>
          sorted(rules).map((r) => [r, p] as [Rule, string]),
        );
      }
      const outputKey = ([r, p]: [Rule, string]) => [
        routeLayer(groups[0][0], r, p)[0],
        r.kind === "DOMAIN"
          ? 0
          : r.kind === "DOMAIN-SUFFIX"
            ? 1
            : ["DOMAIN-WILDCARD", "DOMAIN-KEYWORD"].includes(r.kind)
              ? 2
              : 3,
        -(r.value.match(/\./g)?.length ?? 0),
        r.value,
        !explicitRules.has(key(groups[0][0], r.key, qxPolicy(p))),
        p === "DIRECT" ? 0 : p.startsWith("REJECT") ? 1 : 2,
        p,
        r.kind,
        r.options,
      ];
      ordered.sort((a, b) => cmp(outputKey(a), outputKey(b)));
      for (const [r, p] of ordered) {
        const line =
          target === "Surge" && groups[0][0] === "apple" && p === "DIRECT"
            ? surgeAppleDirect(r)
            : serialize(r, p, target);
        if (!seen.has(line)) {
          seen.add(line);
          lines.push(line);
        }
      }
      if (!lines.length) continue;
      rendered[file] = lines.join("\n") + "\n";
      metadata[file] = {
        authors: [...sourceAuthors].sort(),
        sources: [...sources].sort(),
        category: groups[0][0].startsWith("adblock")
          ? "Adblock"
          : ["cn", "proxy"].includes(groups[0][0])
            ? "general"
            : "app",
        count: lines.length,
        policy: groups[0][1],
      };
    }
  }
  for (const [source, rows] of parsed) {
    if (!source.standalone) continue;
    const comments = Buffer.from(inputs[source.id])
      .toString("utf8")
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((l) => /^\s*(?:#|;|\/\/)/.test(l))
      .map((l) => (/^\s*#!/.test(l) ? "# " + l : l));
    for (const target of ["QuantumultX", "Surge"]) {
      const lines: string[] = [];
      for (const [r, p] of rows) {
        if (
          target === "QuantumultX" &&
          (!(r.kind in QX_TYPES) || r.options.includes("extended-matching"))
        ) {
          anomalies.push({
            source: source.id,
            category: source.category,
            target,
            declaration: r.kind + "," + r.value,
            code: "filtered-unsupported-target",
            reason:
              "Native rule type/options are not supported by Quantumult X",
          });
          continue;
        }
        lines.push(
          target === "Surge"
            ? [
                r.kind,
                r.kind === "GEOIP" ? r.value.toUpperCase() : r.value,
                p,
                ...surgeOptions(r),
              ].join(",")
            : serialize(r, p, target),
        );
      }
      const file = `Rule/${target}/${source.category}${target === "Surge" ? ".dconf" : ".list"}`;
      if (file in rendered)
        throw Error(
          "Independent source output collides with a collection: " + file,
        );
      const section =
        target === "Surge"
          ? [
              "# Include this file in the profile [Rule] section with #!include.",
              "# PROXY must refer to an existing proxy or policy group in that profile.",
              "[Rule]",
            ]
          : [];
      rendered[file] =
        [...comments, "", ...section, ...lines].join("\n") + "\n";
      metadata[file] = {
        authors: [source.author],
        sources: [source.url],
        category: "general",
        count: lines.length,
        policy: "mixed",
      };
    }
  }
  const unique = new Map<string, any>();
  for (const item of anomalies) {
    const k = key(
      item.source,
      item.code,
      item.declaration,
      item.target ?? "both",
    );
    if (!unique.has(k)) unique.set(k, { ...item, categories: [] });
    if (item.category && !unique.get(k).categories.includes(item.category))
      unique.get(k).categories.push(item.category);
  }
  return [rendered, metadata, [...unique.values()]];
}
