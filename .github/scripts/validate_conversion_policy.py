#!/usr/bin/env python3
"""Validate WayX generated Quantumult X and Surge outputs against project policy.

This validator is fail-closed for generated targets and intentionally does not
validate unrelated hand-written files outside the manifest mapping.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / ".github" / "sources" / "loon.json"

QX_FILTER_TYPES = {
    "user-agent", "host", "host-keyword", "host-wildcard", "host-suffix",
    "ip6-cidr", "ip-cidr", "geoip", "ip-asn", "final",
}
QX_IP_TYPES = {"ip-cidr", "ip6-cidr", "geoip", "ip-asn"}
QX_REWRITE_ACTIONS = {
    "reject", "reject-img", "reject-200", "reject-dict", "reject-array",
    "302", "307", "jsonjq-response-body", "jsonjq-request-body",
    "request-header", "request-body", "response-body", "echo-response",
    "script-response-body", "script-echo-response", "script-analyze-echo-response",
    "script-response-header", "script-request-header", "script-request-body",
    "url-and-header",
}
SURGE_SECTIONS = {
    "Rule", "URL Rewrite", "Header Rewrite", "Body Rewrite", "Map Local",
    "Script", "MITM",
}
COMMON_META = (
    r"^# Converted:\s*.+$",
    r"^# Converted by:\s*chance\s*$",
    r"^# Target:\s*(Quantumult X|Surge)\s*$",
    r"^# Source:\s*.+$",
)
QX_META = COMMON_META + (r"^# Category:\s*.+$",)


def git_lines(*args: str) -> list[str]:
    proc = subprocess.run(
        ["git", *args], cwd=ROOT, text=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False,
    )
    if proc.returncode:
        raise RuntimeError(proc.stderr.strip())
    return [line.strip() for line in proc.stdout.splitlines() if line.strip()]


def changed_files() -> set[str]:
    return set(git_lines("diff", "--name-only", "HEAD")) | set(
        git_lines("ls-files", "--others", "--exclude-standard")
    )


def mapped_targets() -> dict[str, str]:
    manifest = json.loads(MANIFEST.read_text("utf-8"))
    out: dict[str, str] = {}
    for entry in manifest:
        app = entry["id"]
        out[f"Adblock/Quantumult X/{entry['qx']}"] = "qx"
        out[f"Adblock/Surge/{entry['surge']}"] = "surge"
    return out


def metadata(text: str, path: str, errors: list[str], patterns=COMMON_META) -> None:
    for pattern in patterns:
        if not re.search(pattern, text, re.M):
            errors.append(f"{path}: missing required metadata matching {pattern}")


def strip_qx_leading_note(line: str, path: str, errors: list[str]) -> tuple[str, bool]:
    if not line.startswith("{#"):
        return line, False
    match = re.match(r"^\{#\s*(.*?)\s*#\}\s+(.+)$", line)
    if not match:
        errors.append(f"{path}: malformed QX leading rule note: {line}")
        return "", True
    return match.group(2).strip(), True


def validate_qx(path: str, text: str, errors: list[str]) -> None:
    metadata(text, path, errors, QX_META)
    for title in ("# [filter_local]", "# [rewrite_local]", "# [mitm]"):
        if title not in text:
            errors.append(f"{path}: missing commented section {title}")
    if re.search(r"(?im)^\s*\[(filter_local|rewrite_local|mitm)\]\s*$", text):
        errors.append(f"{path}: QX snippet section headings must be commented")

    section = None
    for raw in text.splitlines():
        line = raw.strip()
        if line.lower() == "# [filter_local]":
            section = "filter"; continue
        if line.lower() == "# [rewrite_local]":
            section = "rewrite"; continue
        if line.lower() == "# [mitm]":
            section = "mitm"; continue
        if not line or line.startswith(("#", ";", "//")):
            continue

        executable, has_note = strip_qx_leading_note(line, path, errors)
        if not executable:
            continue
        if has_note and section not in {"filter", "rewrite"}:
            errors.append(f"{path}: QX leading notes are only valid on filter/rewrite rules: {line}")

        if section == "filter":
            parts = [x.strip() for x in executable.split(",")]
            rule_type = parts[0].lower() if parts else ""
            if rule_type not in QX_FILTER_TYPES:
                errors.append(f"{path}: QX filter type outside official sample allowlist: {rule_type}")
            if rule_type in QX_IP_TYPES and any(x.lower() == "no-resolve" for x in parts[3:]):
                errors.append(f"{path}: QX IP-class rule must not contain no-resolve: {line}")
        elif section == "rewrite":
            if " url " not in executable:
                if " if ${url} " in executable or re.search(r"\bthen\b", executable):
                    errors.append(f"{path}: Loon new syntax leaked into executable QX line: {line}")
                else:
                    errors.append(f"{path}: invalid QX rewrite line: {line}")
                continue
            action = executable.split(" url ", 1)[1].strip().split()[0]
            if action not in QX_REWRITE_ACTIONS:
                errors.append(f"{path}: QX rewrite action outside official sample allowlist: {action}")
        elif section == "mitm":
            if not re.match(r"^hostname\s*=", executable, re.I):
                errors.append(f"{path}: invalid QX MITM line: {line}")


def validate_surge(path: str, text: str, errors: list[str]) -> None:
    metadata(text, path, errors)
    if len(re.findall(r"(?m)^#!category=WayX$", text)) != 1:
        errors.append(f"{path}: Surge module must declare exactly one #!category=WayX")
    if re.search(r"(?m)^# Category:\s*.+$", text):
        errors.append(f"{path}: generated Surge module must not use legacy # Category comment")
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        match = re.fullmatch(r"\[([^\]]+)\]", line)
        if match:
            current = match.group(1)
            if current not in SURGE_SECTIONS:
                errors.append(f"{path}: unsupported generated Surge section [{current}]")
            continue
        if not line or line.startswith(("#", ";", "//", "#!")):
            continue
        if current == "MITM" and re.match(r"^hostname\s*=", line, re.I):
            value = line.split("=", 1)[1].strip()
            if not value.startswith("%APPEND%"):
                errors.append(f"{path}: Surge Module MITM hostname must use %APPEND%")
        # no-resolve is valid in Surge IP rules and must not be stripped by this validator.


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="validate all manifest targets instead of only changed targets")
    args = ap.parse_args()
    targets = mapped_targets()
    selected = set(targets) if args.all else (set(targets) & changed_files())
    errors: list[str] = []
    for path in sorted(selected):
        file = ROOT / path
        if not file.exists():
            errors.append(f"{path}: generated target is missing")
            continue
        text = file.read_text("utf-8")
        if targets[path] == "qx":
            validate_qx(path, text, errors)
        else:
            validate_surge(path, text, errors)
    if errors:
        for item in errors:
            print("ERROR: " + item, file=sys.stderr)
        return 1
    print(f"Conversion policy validation passed for {len(selected)} generated target(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
