#!/usr/bin/env python3
"""Semantic contract tests for the deterministic conversion gate."""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot load {rel}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


gate = load("wayx_conversion_gate", ".github/scripts/conversion_gate.py")
validator = load("wayx_conversion_validator", ".github/scripts/validate_conversion_policy.py")

for policy in (
    "REJECT",
    "REJECT-200",
    "REJECT-IMG",
    "REJECT-DICT",
    "REJECT-ARRAY",
    "REJECT-DROP",
):
    ok, reason = gate.simple_rule(f"URL-REGEX,^https://ads\\.example\\.com,{policy}")
    assert ok, (policy, reason)

ok, reason = gate.simple_rule("URL-REGEX,^https://ads\\.example\\.com,REJECT-NO-DROP")
assert not ok and "require semantic review" in reason

ok, reason = gate.simple_rule("DOMAIN,example.com,DIRECT")
assert ok, reason

ok, reason = gate.simple_rule("DOMAIN,example.com,PROXY")
assert not ok and "outside safe tier" in reason

ok, reason = gate.simple_old_rewrite(r"^https://ads\.example\.com reject")
assert ok, reason

# Vendor/subdirectory identity must not affect risk classification.
old_text = gate.old_text
new_text = gate.new_text
try:
    gate.old_text = lambda _path: "[Rule]\nDOMAIN,old.example,DIRECT\n"
    gate.new_text = lambda _path: "[Rule]\nDOMAIN,new.example,DIRECT\n"
    manifest = {
        "UnknownVendor/unfamiliar.lpx": {
            "id": "Unfamiliar",
            "file": "UnknownVendor/unfamiliar.lpx",
        }
    }
    reasons = gate.classify_resource(
        "Resource/Loon/UnknownVendor/unfamiliar.lpx",
        manifest,
    )
    assert reasons == [], reasons

    gate.new_text = lambda _path: "[Rule]\nDOMAIN,new.example,PROXY\n"
    reasons = gate.classify_resource(
        "Resource/Loon/UnknownVendor/unfamiliar.lpx",
        manifest,
    )
    assert reasons and any("policy PROXY" in item for item in reasons), reasons

    # Loon [Argument] is not converted into target parameter UI. An Argument-only
    # source change is safe by itself; dependent executable declarations are
    # caught by converter-generated Review markers.
    gate.old_text = lambda _path: "[Argument]\nmode=select,old,new\n[Rule]\nDOMAIN,example.com,DIRECT\n"
    gate.new_text = lambda _path: "[Argument]\nmode=select,new,old\n[Rule]\nDOMAIN,example.com,DIRECT\n"
    reasons = gate.classify_resource(
        "Resource/Loon/UnknownVendor/unfamiliar.lpx",
        manifest,
    )
    assert reasons == [], reasons
finally:
    gate.old_text = old_text
    gate.new_text = new_text

assert gate.has_manual_review_marker("# [WayX] SCRIPT V2 REVIEW REQUIRED: source plugin parameter dependency")
assert gate.has_manual_review_marker("# [WayX] REWRITE V2 REVIEW REQUIRED: source plugin parameter dependency")
assert gate.has_manual_review_marker("# [WayX] ARGUMENT REVIEW REQUIRED: undeclared source plugin argument reference")
assert gate.has_manual_review_marker("# [WayX] QUANTUMULT X UNSUPPORTED - source script disabled:")
assert not gate.has_manual_review_marker("# Source [Argument] legacy comment only")

assert "script-analyze-echo-response" in validator.QX_REWRITE_ACTIONS

print("Conversion gate semantic contract passed")
