#!/usr/bin/env python3
"""Refresh the generated Kelee portion of the WayX Loon source catalog.

Author: chance
Category: Automation / Source Discovery / Kelee

The plugin center list is treated as an ordered discovery feed. Existing Kelee
entries keep their stable WayX ids/output filenames when the same source URL is
still present; newly discovered plugins derive deterministic names from the LPX
filename. Non-Kelee entries live in loon-static.json and are appended unchanged.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / ".github" / "sources" / "loon.json"
STATIC_CATALOG = ROOT / ".github" / "sources" / "loon-static.json"
RUNTIME_DIR = ROOT / ".github" / "monitor" / ".runtime"
RUNTIME_SNAPSHOT = RUNTIME_DIR / "kelee-catalog.json"

DEFAULT_LIST_URL = "https://hub.kelee.one/list.json"
LOON_UA = "Loon/764 CFNetwork/1498.700.1 Darwin/23.6.0 iPhone/17.6.1"
LPX_URL_RE = re.compile(
    r"https://kelee\.one/Tool/Loon/Lpx/[^\s\"'<>]+?\.lpx(?:\?[^\s\"'<>]*)?",
    re.IGNORECASE,
)
ID_SAFE_RE = re.compile(r"[^A-Za-z0-9._-]+")


def load_json(path: Path, default: Any) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return default


def fetch_bytes(url: str, timeout: float = 30.0) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": LOON_UA,
            "Accept": "application/json,text/plain,*/*",
            "Cache-Control": "no-cache",
        },
    )
    last: BaseException | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status} from {url}")
                body = response.read()
                if not body:
                    raise RuntimeError(f"empty response from {url}")
                return body
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError) as exc:
            last = exc
            if attempt < 2:
                time.sleep(1.0 + attempt)
                continue
            raise RuntimeError(f"failed to fetch {url}: {exc}") from exc
    raise RuntimeError(f"failed to fetch {url}: {last}")


def extract_lpx_url(item: Any) -> str | None:
    raw = item.get("url", "") if isinstance(item, dict) else str(item)
    match = LPX_URL_RE.search(str(raw))
    if not match:
        return None
    parsed = urllib.parse.urlsplit(match.group(0))
    if parsed.scheme.lower() != "https" or parsed.hostname != "kelee.one":
        return None
    if not parsed.path.startswith("/Tool/Loon/Lpx/") or not parsed.path.lower().endswith(".lpx"):
        return None
    # Query/fragment are catalog transport details, not source identity.
    return urllib.parse.urlunsplit(("https", "kelee.one", parsed.path, "", ""))


def safe_filename_from_url(url: str) -> str:
    name = urllib.parse.unquote(Path(urllib.parse.urlsplit(url).path).name)
    if not name.lower().endswith(".lpx"):
        raise ValueError(f"Kelee source does not end in .lpx: {url}")
    if not name or name in {".", ".."} or "/" in name or "\\" in name or "\x00" in name:
        raise ValueError(f"unsafe Kelee LPX filename: {name!r}")
    return name


def stable_id(stem: str, source: str, used: set[str]) -> str:
    base = ID_SAFE_RE.sub("_", stem).strip("._-")
    if not base:
        base = "plugin_" + hashlib.sha256(source.encode()).hexdigest()[:12]
    candidate = "Kelee_" + base
    if candidate not in used:
        used.add(candidate)
        return candidate
    suffix = hashlib.sha256(source.encode()).hexdigest()[:8]
    candidate = f"Kelee_{base}_{suffix}"
    if candidate in used:
        raise ValueError(f"cannot derive unique Kelee id for {source}")
    used.add(candidate)
    return candidate


def category_for(item: Any, stem: str) -> str:
    name = str(item.get("name", "")) if isinstance(item, dict) else ""
    tags = item.get("tag", []) if isinstance(item, dict) else []
    tag_text = " ".join(map(str, tags if isinstance(tags, list) else [tags]))
    haystack = f"{name} {tag_text} {stem}".lower()
    if "去广告" in haystack or "remove_ads" in haystack or stem.lower().startswith("block"):
        return "去广告"
    return "增强"


def is_kelee_entry(entry: Any) -> bool:
    return isinstance(entry, dict) and "/Tool/Loon/Lpx/" in str(entry.get("source", "")) and "kelee.one" in str(entry.get("source", ""))


def target_name(stem: str, extension: str, used: set[str]) -> str:
    candidate = stem + extension
    if candidate not in used:
        used.add(candidate)
        return candidate
    candidate = "Kelee_" + stem + extension
    if candidate not in used:
        used.add(candidate)
        return candidate
    suffix = hashlib.sha256(stem.encode()).hexdigest()[:8]
    candidate = f"Kelee_{stem}_{suffix}{extension}"
    if candidate in used:
        raise ValueError(f"cannot derive unique target filename for {stem}")
    used.add(candidate)
    return candidate


def build_catalog(list_payload: Any, previous: list[dict[str, Any]], static: list[dict[str, Any]]) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    lists = list_payload.get("lists") if isinstance(list_payload, dict) else list_payload
    if not isinstance(lists, list):
        raise ValueError("Kelee list.json must be an array or an object with a 'lists' array")

    previous_kelee = {
        str(entry.get("source")): entry
        for entry in previous
        if is_kelee_entry(entry)
    }

    used_ids = {str(e.get("id")) for e in static}
    used_files = {str(e.get("file")) for e in static}
    used_qx = {str(e.get("qx")) for e in static}
    used_surge = {str(e.get("surge")) for e in static}

    discovered: list[dict[str, str]] = []
    metadata: list[dict[str, Any]] = []
    seen_sources: set[str] = set()

    for order, item in enumerate(lists):
        source = extract_lpx_url(item)
        if not source or source in seen_sources:
            continue
        seen_sources.add(source)

        file_name = safe_filename_from_url(source)
        stem = file_name[:-4]
        old = previous_kelee.get(source)

        if old:
            entry = {
                "id": str(old["id"]),
                "file": str(old["file"]),
                "source": source,
                "qx": str(old["qx"]),
                "surge": str(old["surge"]),
                "category": str(old.get("category") or category_for(item, stem)),
            }
            collisions = [
                ("id", entry["id"], used_ids),
                ("file", entry["file"], used_files),
                ("qx", entry["qx"], used_qx),
                ("surge", entry["surge"], used_surge),
            ]
            if any(value in bucket for _, value, bucket in collisions):
                # A static entry now owns a formerly-Kelee output. Derive a fresh
                # target instead of silently overwriting a different source.
                old = None
            else:
                for _, value, bucket in collisions:
                    bucket.add(value)

        if not old:
            entry_id = stable_id(stem, source, used_ids)
            file_rel = file_name
            if file_rel in used_files:
                file_rel = "Kelee/" + file_name
            used_files.add(file_rel)
            qx = target_name(stem, ".snippet", used_qx)
            surge = target_name(stem, ".sgmodule", used_surge)
            entry = {
                "id": entry_id,
                "file": file_rel,
                "source": source,
                "qx": qx,
                "surge": surge,
                "category": category_for(item, stem),
            }

        discovered.append(entry)
        metadata.append(
            {
                "order": len(discovered) - 1,
                "source": source,
                "file": entry["file"],
                "id": entry["id"],
                "name": item.get("name", "") if isinstance(item, dict) else "",
                "desc": item.get("desc", "") if isinstance(item, dict) else "",
                "tag": item.get("tag", []) if isinstance(item, dict) else [],
                "date": item.get("date", "") if isinstance(item, dict) else "",
            }
        )

    if not discovered:
        raise ValueError("Kelee list.json produced zero LPX plugin URLs")

    return discovered + static, metadata


def prune_removed(previous: list[dict[str, Any]], current: list[dict[str, Any]]) -> list[str]:
    current_sources = {str(e.get("source")) for e in current if is_kelee_entry(e)}
    removed = [e for e in previous if is_kelee_entry(e) and str(e.get("source")) not in current_sources]
    changed: list[str] = []
    for entry in removed:
        candidates = [
            ROOT / "Resource" / "Loon" / str(entry.get("file", "")),
            ROOT / "Adblock" / "Quantumult X" / str(entry.get("qx", "")),
            ROOT / "Adblock" / "Surge" / str(entry.get("surge", "")),
        ]
        for path in candidates:
            try:
                resolved = path.resolve()
                resolved.relative_to(ROOT.resolve())
            except Exception as exc:
                raise ValueError(f"refusing unsafe prune path {path}") from exc
            if resolved.is_file():
                resolved.unlink()
                changed.append(str(resolved.relative_to(ROOT)))
        # Empty source subdirectories are safe to remove; Script directories are
        # deliberately not pruned because they may contain user-maintained files.
        source_parent = (ROOT / "Resource" / "Loon" / str(entry.get("file", ""))).parent
        if source_parent != ROOT / "Resource" / "Loon":
            try:
                source_parent.rmdir()
            except OSError:
                pass
    return changed


def validate_combined(entries: list[dict[str, Any]]) -> None:
    required = ("id", "file", "source", "qx", "surge", "category")
    seen = {key: set() for key in ("id", "file", "qx", "surge")}
    for index, entry in enumerate(entries):
        for field in required:
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise ValueError(f"catalog[{index}] missing {field}")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", entry["id"]):
            raise ValueError(f"catalog[{index}] invalid id: {entry['id']}")
        for field in seen:
            value = entry[field]
            if value in seen[field]:
                raise ValueError(f"duplicate catalog {field}: {value}")
            seen[field].add(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-url", default=os.environ.get("KELEE_LIST_URL", DEFAULT_LIST_URL))
    parser.add_argument("--check", action="store_true", help="fail if the generated catalog differs; do not write")
    args = parser.parse_args()

    previous = load_json(CATALOG, [])
    static = load_json(STATIC_CATALOG, [])
    if not isinstance(previous, list) or not isinstance(static, list):
        raise ValueError("WayX source catalogs must be JSON arrays")

    payload = json.loads(fetch_bytes(args.list_url).decode("utf-8-sig"))
    combined, metadata = build_catalog(payload, previous, static)
    validate_combined(combined)

    desired = json.dumps(combined, ensure_ascii=False, indent=2) + "\n"
    current = CATALOG.read_text(encoding="utf-8") if CATALOG.exists() else ""
    changed = desired != current

    if args.check:
        if changed:
            print("Kelee catalog is stale", file=sys.stderr)
            return 1
        print(f"Kelee catalog current: discovered={len(metadata)} static={len(static)}")
        return 0

    pruned = prune_removed(previous, combined)
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(desired, encoding="utf-8")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    RUNTIME_SNAPSHOT.write_text(
        json.dumps(
            {
                "source": args.list_url,
                "count": len(metadata),
                "plugins": metadata,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(
        f"Kelee catalog refreshed: discovered={len(metadata)} static={len(static)} "
        f"catalog_changed={str(changed).lower()} pruned={len(pruned)}"
    )
    for path in pruned:
        print(f"pruned stale managed file: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
