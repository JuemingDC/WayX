#!/usr/bin/env python3
"""Regression tests for generated-target conversion policy validator."""

from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VALIDATOR = ROOT / ".github" / "scripts" / "validate_conversion_policy.py"

spec = importlib.util.spec_from_file_location("wayx_validate_conversion_policy", VALIDATOR)
if spec is None or spec.loader is None:
    raise RuntimeError("cannot load validate_conversion_policy.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

qx = """# Converted: 2026-10-01 13:00:00
# Converted by: chance
# Category: 去广告
# Target: Quantumult X
# Source: https://example.com/demo.lpx

# [filter_local]
{# 分组说明 #} host, example.com, reject

# [rewrite_local]
{# JSON 处理 #} ^https:\/\/example\.com\/api url jsonjq-response-body '.data |= if .ad then del(.ad) else . end'

# [mitm]
hostname = example.com
"""

errors: list[str] = []
module.validate_qx("Adblock/Quantumult X/Demo.snippet", qx, errors)
assert errors == [], errors

bad = qx.replace(
    "{# JSON 处理 #} ^https:\/\/example\.com\/api url jsonjq-response-body '.data |= if .ad then del(.ad) else . end'",
    "response if ${url} ~= /api/ then response.body.replace(\"ad\", \"\")",
)
errors = []
module.validate_qx("Adblock/Quantumult X/Demo.snippet", bad, errors)
assert any("Loon new syntax leaked" in item for item in errors), errors

print("Conversion policy QX inline-note/JQ regression passed")
