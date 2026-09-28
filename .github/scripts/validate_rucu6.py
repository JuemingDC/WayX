#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
QX_ALLOWED_FILTER = {
    "user-agent", "host", "host-keyword", "host-wildcard", "host-suffix",
    "ip6-cidr", "ip-cidr", "geoip", "ip-asn", "final",
}
QX_ALLOWED_REWRITE = {
    "reject", "reject-img", "reject-200", "reject-dict", "reject-array",
    "302", "307", "jsonjq-response-body", "jsonjq-request-body",
    "request-header", "request-body", "response-body", "echo-response",
    "script-response-body", "script-echo-response", "script-response-header",
    "script-request-header", "script-request-body", "url-and-header",
}
SURGE_SECTIONS = {
    "General", "MITM", "Rule", "Script", "URL Rewrite",
    "Header Rewrite", "Host", "Body Rewrite", "Map Local",
}
SURGE_RULE_POLICIES = {"DIRECT", "REJECT", "REJECT-TINYGIF"}

errors = []


def error(path, message, line=None):
    errors.append(f"{path}: {message}" + (f" :: {line}" if line else ""))


for path in ROOT.glob("adblock/*/QuantumultX/RuCu6_*.snippet"):
    text = path.read_text("utf-8")
    if re.search(r"^\[(filter_local|rewrite_local|mitm)\]$", text, re.M):
        error(path, "QX section title must be commented")
    for title in ("# [filter_local]", "# [rewrite_local]", "# [mitm]"):
        if title not in text:
            error(path, f"missing {title}")
    section = None
    for raw in text.splitlines():
        line = raw.strip()
        if line == "# [filter_local]":
            section = "filter"
            continue
        if line == "# [rewrite_local]":
            section = "rewrite"
            continue
        if line == "# [mitm]":
            section = "mitm"
            continue
        if not line or line.startswith("#") or line.startswith("#!"):
            continue
        if "if ${url}" in line or " then " in line:
            error(path, "Loon new syntax leaked into executable QX line", line)
        if section == "filter":
            rule_type = line.split(",", 1)[0].strip()
            if rule_type not in QX_ALLOWED_FILTER:
                error(path, f"QX filter type outside official sample allowlist: {rule_type}", line)
        elif section == "rewrite":
            if " url " not in line:
                error(path, "invalid QX rewrite line", line)
                continue
            action = line.split(" url ", 1)[1].strip().split()[0]
            if action not in QX_ALLOWED_REWRITE:
                error(path, f"QX rewrite action outside official sample allowlist: {action}", line)
        elif section == "mitm":
            if not line.startswith("hostname ="):
                error(path, "invalid QX MITM line", line)


for path in ROOT.glob("adblock/*/Surge/RuCu6_*.sgmodule"):
    text = path.read_text("utf-8")
    current = None
    for raw in text.splitlines():
        line = raw.strip()
        match = re.fullmatch(r"\[([^\]]+)\]", line)
        if match:
            current = match.group(1)
            if current not in SURGE_SECTIONS:
                error(path, f"unsupported Surge module section: {current}")
            continue
        if not line or line.startswith("#") or line.startswith("#!"):
            continue
        if current == "Rule":
            match = re.search(
                r",\s*(DIRECT|REJECT(?:-[A-Z-]+)?|PROXY)(?:\s*,[^,]+)*$",
                line,
                re.I,
            )
            if not match:
                error(path, "unable to identify Surge Module rule policy", line)
            elif match.group(1).upper() not in SURGE_RULE_POLICIES:
                error(path, "Surge Module rule uses a policy not allowed by official Module docs", line)
        if current == "MITM" and line.startswith("hostname") and "%APPEND%" not in line:
            error(path, "Surge Module MITM hostname must use %APPEND%", line)
        if current == "Script" and "rucu6.pages.dev/Scripts/" in line:
            error(path, "Surge output still references upstream script rather than WayX mirror", line)


report = ROOT / ".github" / "reports" / "rucu6-conversion.json"
if not report.exists():
    errors.append("missing .github/reports/rucu6-conversion.json")
else:
    try:
        json.loads(report.read_text("utf-8"))
    except Exception as exc:
        errors.append(f"invalid conversion report: {exc}")

if errors:
    print("\n".join("ERROR: " + item for item in errors), file=sys.stderr)
    raise SystemExit(1)

print("RuCu6 conversion validation passed")
