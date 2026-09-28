#!/usr/bin/env python3
"""WayX deterministic conversion gate.

Classifies changes made by GitHub Actions into:
- safe: deterministic conversion/sync changes that may be committed directly;
- work: semantic/script/unsupported changes that must be reviewed by ChatGPT Work.

This gate is intentionally fail-closed: an unknown conversion shape requires Work.
"""
from __future__ import annotations

import collections
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / ".github" / "sources" / "loon.json"
RUNTIME = ROOT / "monitor" / ".runtime"
SUMMARY = RUNTIME / "conversion_gate.md"

BASIC_RULE_TYPES = {
    "DOMAIN", "DOMAIN-SUFFIX", "DOMAIN-KEYWORD", "DOMAIN-WILDCARD",
    "IP-CIDR", "IP-CIDR6", "GEOIP", "IP-ASN", "USER-AGENT",
}
BASIC_POLICIES = {"DIRECT", "REJECT", "PROXY"}
SIMPLE_REWRITE_ACTIONS = {
    "reject", "reject-200", "reject-img", "reject-dict", "reject-array",
}
COMMENT_PREFIXES = ("#", ";", "//")


def run(*args: str, check: bool = True) -> str:
    proc = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and proc.returncode:
        raise RuntimeError(f"{' '.join(args)} failed: {proc.stderr.strip()}")
    return proc.stdout


def changed_files() -> list[str]:
    tracked = run("git", "diff", "--name-only", "HEAD").splitlines()
    untracked = run("git", "ls-files", "--others", "--exclude-standard").splitlines()
    return sorted({x.strip() for x in [*tracked, *untracked] if x.strip()})


def old_text(path: str) -> str:
    proc = subprocess.run(
        ["git", "show", f"HEAD:{path}"],
        cwd=ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    return proc.stdout if proc.returncode == 0 else ""


def new_text(path: str) -> str:
    p = ROOT / path
    return p.read_text("utf-8") if p.exists() else ""


def parse_sections(text: str) -> tuple[list[str], dict[str, list[str]]]:
    header: list[str] = []
    sections: dict[str, list[str]] = collections.OrderedDict()
    current: str | None = None
    for raw in text.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        m = re.fullmatch(r"\s*\[([^\]]+)\]\s*", raw)
        if m:
            current = m.group(1).strip()
            sections.setdefault(current, [])
            continue
        if current is None:
            header.append(raw)
        else:
            sections[current].append(raw)
    return header, sections


def executable(lines: list[str]) -> list[str]:
    out = []
    for raw in lines:
        value = raw.strip()
        if not value or value.startswith(COMMENT_PREFIXES):
            continue
        out.append(value)
    return out


def changed_lines(old: list[str], new: list[str]) -> list[str]:
    a = collections.Counter(executable(old))
    b = collections.Counter(executable(new))
    delta: list[str] = []
    for line, count in (b - a).items():
        delta.extend([line] * count)
    for line, count in (a - b).items():
        delta.extend([line] * count)
    return delta


def split_csv(line: str) -> list[str]:
    # Rule lines used by the safe tier do not contain nested comma expressions.
    # Nested logical rules are rejected before this parser is relied on.
    return [part.strip() for part in line.split(",")]


def simple_rule(line: str) -> tuple[bool, str]:
    upper = line.upper()
    if upper.startswith(("AND,", "OR,", "NOT,")):
        return False, "logical rule requires semantic review"
    parts = split_csv(line)
    if len(parts) < 3:
        return False, "rule does not have type/value/policy"
    rule_type = parts[0].upper()
    policy = parts[2].upper()
    extras = [x.lower() for x in parts[3:] if x]

    if rule_type == "URL-REGEX":
        if policy == "REJECT" and not extras:
            return True, "URL-REGEX REJECT uses project mapping to QX reject-200"
        return False, "URL-REGEX safe tier only accepts REJECT"

    if rule_type not in BASIC_RULE_TYPES:
        return False, f"rule type {rule_type} is outside safe tier"
    if policy not in BASIC_POLICIES:
        return False, f"policy {policy} is outside safe tier"

    if extras:
        if rule_type in {"IP-CIDR", "IP-CIDR6", "GEOIP", "IP-ASN"} and set(extras) <= {"no-resolve"}:
            return True, "QX drops no-resolve; Surge preserves it"
        return False, f"rule has extra parameters: {', '.join(extras)}"
    return True, "basic deterministic rule"


def simple_old_rewrite(line: str) -> tuple[bool, str]:
    if " if ${url} " in line or " then " in line:
        return False, "Loon new Rewrite syntax requires Work unless a dedicated deterministic converter handles it"
    m = re.match(r"^(\S+)\s+(.+)$", line)
    if not m:
        return False, "rewrite has no pattern/action split"
    action = m.group(2).strip()
    lower = action.lower()
    if lower in SIMPLE_REWRITE_ACTIONS:
        return True, "native reject mapping"
    if re.match(r"^(302|307)\s+\S+", action):
        return True, "native redirect mapping"
    if lower.startswith("response-body-json-del "):
        return True, "deterministic JSON delete -> JQ"
    if lower.startswith("response-body-json-replace "):
        return True, "deterministic JSON replacement -> JQ"
    if lower.startswith("response-body-json-jq "):
        return True, "native JQ passthrough"
    if lower.startswith("mock-response-body "):
        return False, "mock/local response generation requires semantic review"
    return False, "rewrite action is outside safe tier"


def simple_mitm(line: str) -> tuple[bool, str]:
    if re.match(r"^hostname\s*=\s*\S", line, re.I):
        return True, "hostname list maps directly; wildcard expansion remains forbidden"
    return False, "MITM option is not a plain hostname list"


def classify_resource(path: str, manifest_by_file: dict[str, dict]) -> list[str]:
    reasons: list[str] = []
    name = Path(path).name
    if path.startswith("Resource/Loon/RuCu6/"):
        return ["RuCu6 uses Loon 3.5.x new syntax/scripts; changed source is Work-tier"]
    entry = manifest_by_file.get(name)
    if not entry:
        return ["Loon resource is not declared in .github/sources/loon.json"]

    old_header, old_sections = parse_sections(old_text(path))
    new_header, new_sections = parse_sections(new_text(path))

    # Header-only metadata/comment changes are safe; the converter preserves metadata/comments.
    section_names = set(old_sections) | set(new_sections)
    for section in sorted(section_names):
        before = old_sections.get(section, [])
        after = new_sections.get(section, [])
        if before == after:
            continue
        key = section.lower()
        delta = changed_lines(before, after)
        if key in {"script", "argument"}:
            reasons.append(f"[{section}] changed")
            continue
        if key == "rule":
            for line in delta:
                ok, why = simple_rule(line)
                if not ok:
                    reasons.append(f"[Rule] {why}: {line}")
        elif key == "rewrite":
            for line in delta:
                ok, why = simple_old_rewrite(line)
                if not ok:
                    reasons.append(f"[Rewrite] {why}: {line}")
        elif key in {"mitm", "mitm "}:
            for line in delta:
                ok, why = simple_mitm(line)
                if not ok:
                    reasons.append(f"[MITM] {why}: {line}")
        else:
            # Empty/comment-only changes in unknown sections are still routed to Work because
            # the converter may not preserve their placement or semantics.
            if before != after:
                reasons.append(f"section [{section}] changed and is outside safe tier")

    return reasons


def mapped_targets(manifest: list[dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for entry in manifest:
        app = entry["id"]
        out[f"adblock/{app}/QuantumultX/{entry['qx']}"] = entry
        out[f"adblock/{app}/Surge/{entry['surge']}"] = entry
    return out


def main() -> int:
    manifest = json.loads(MANIFEST.read_text("utf-8"))
    by_file = {entry["file"]: entry for entry in manifest}
    targets = mapped_targets(manifest)
    changed = changed_files()
    reasons: list[str] = []
    safe_notes: list[str] = []

    for path in changed:
        if path.startswith("script/"):
            reasons.append(f"{path}: JavaScript bytes changed; runtime compatibility must be rechecked")
            continue
        if path.startswith("Resource/Loon/") and path.endswith(".lpx"):
            r = classify_resource(path, by_file)
            if r:
                reasons.extend(f"{path}: {item}" for item in r)
            else:
                safe_notes.append(f"{path}: only deterministic safe-tier changes")
            continue
        if path in targets:
            text = new_text(path)
            entry = targets[path]
            if re.search(r"(?im)^\s*#\s*(?:Unsupported Loon|Loon .*not losslessly expressible|\[WayX\]\s*MANUAL PORT REQUIRED)", text):
                reasons.append(f"{path}: generated output contains an unsupported/manual-review marker")
                continue

            # New target files deserve a full source-risk check rather than being
            # treated as safe merely because no marker was generated.
            if not old_text(path):
                source_path = f"Resource/Loon/{entry['file']}"
                _, sections = parse_sections(new_text(source_path))
                script_lines = executable(sections.get("Script", []))
                argument_lines = executable(sections.get("Argument", []))
                if script_lines:
                    reasons.append(f"{path}: newly generated target comes from a source with [Script]; runtime semantics require Work")
                if argument_lines:
                    reasons.append(f"{path}: newly generated target comes from a source with [Argument]; parameter semantics require Work")
                if script_lines or argument_lines:
                    continue

            safe_notes.append(f"{path}: generated target passed semantic marker gate")
            continue
        if path.startswith("upstream/") or path == "monitor/state.json":
            # Official-doc monitoring decides Work handoff through monitor_upstreams.py.
            continue
        if path.startswith("monitor/.runtime/"):
            continue
        if path.startswith(".github/reports/"):
            continue
        # Converted output under older legacy directory must never be updated automatically now.
        if path.startswith("Adblock/"):
            reasons.append(f"{path}: legacy Adblock/ path changed; automation must use adblock/<App>/<Platform>/")

    RUNTIME.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Conversion Gate\n\n",
        f"Changed files: **{len(changed)}**\n\n",
    ]
    if reasons:
        lines.append("## Work required\n\n")
        lines.extend(f"- {reason}\n" for reason in reasons)
    else:
        lines.append("## Decision\n\nSAFE — deterministic GitHub Actions changes may be committed directly.\n")
    if safe_notes:
        lines.append("\n## Safe-tier observations\n\n")
        lines.extend(f"- {note}\n" for note in safe_notes)
    SUMMARY.write_text("".join(lines), "utf-8")

    output = os.getenv("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as handle:
            handle.write(f"requires_work={'true' if reasons else 'false'}\n")
            handle.write(f"has_change={'true' if changed else 'false'}\n")
            handle.write(f"summary={SUMMARY.relative_to(ROOT).as_posix()}\n")

    print(SUMMARY.read_text("utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
