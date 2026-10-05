#!/usr/bin/env python3
"""Refresh dynamic Kelee and RuCu6 catalogs and prune retired managed artifacts.

Author: chance
Category: Automation / Source Discovery

Kelee selects only ad-block and dependency tags. RuCu6 includes every plugin in
its author-published directory; plugin bodies come from rucu6.pages.dev.
Existing sources retain stable ids and output filenames. Other authors use
loon-static.json. All validated catalogs are combined before stale cleanup.
"""

from __future__ import annotations

import argparse
import hashlib
import html
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
DEFAULT_RUCU6_LIST_URL = "https://t.me/GitCube/327"
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


def category_for(item: Any, stem: str) -> str | None:
    # The discovery feed's exact category tags are authoritative; names and
    # filenames must not pull enhancement/check-in plugins into the scope.
    tags = item.get("tag", []) if isinstance(item, dict) else []
    tags = tags if isinstance(tags, list) else [tags]
    if "依赖" in tags:
        return "依赖"
    if "去广告" in tags:
        return "去广告"
    return None


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
        category = category_for(item, stem)
        if category is None:
            continue
        old = previous_kelee.get(source)

        if old:
            entry = {
                "id": str(old["id"]),
                "file": str(old["file"]),
                "source": source,
                "qx": str(old["qx"]),
                "surge": str(old["surge"]),
                "category": category,
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
                "category": category,
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
    current_sources = {str(e.get("source")) for e in current}
    removed = [e for e in previous if str(e.get("source")) not in current_sources]
    changed: list[str] = []
    protected = {
        (ROOT / base / str(entry[field])).resolve()
        for entry in current
        for base, field in [("Resource/Loon", "file"), ("Adblock/Quantumult X", "qx"), ("Adblock/Surge", "surge")]
    }
    active_ids = {entry["id"] for entry in current}
    for entry in removed:
        for base, field in [("Resource/Loon", "file"), ("Adblock/Quantumult X", "qx"), ("Adblock/Surge", "surge")]:
            path = ROOT / base / str(entry.get(field, ""))
            try:
                resolved = path.resolve()
                resolved.relative_to((ROOT / base).resolve())
            except Exception as exc:
                raise ValueError(f"refusing unsafe prune path {path}") from exc
            if resolved not in protected and resolved.is_file():
                resolved.unlink()
                changed.append(str(resolved.relative_to(ROOT)))
        script_dir = ROOT / "Script" / str(entry.get("id", ""))
        script_dir.resolve().relative_to((ROOT / "Script").resolve())
        if entry.get("id") not in active_ids and script_dir.is_dir():
            for helper in script_dir.glob("*.js"):
                if re.fullmatch(r"[a-z_]+_[0-9a-f]{10}\.js", helper.name) and "// Converted by: chance" in helper.read_text(encoding="utf-8"):
                    helper.unlink()
                    changed.append(str(helper.relative_to(ROOT)))
            try:
                script_dir.rmdir()
            except OSError:
                pass
        # Preserve files outside the managed source/target/helper contract.
        source_parent = (ROOT / "Resource" / "Loon" / str(entry.get("file", ""))).parent
        if source_parent != ROOT / "Resource" / "Loon":
            try:
                source_parent.rmdir()
            except OSError:
                pass
    return changed



def prune_orphans(current: list[dict[str, Any]]) -> list[str]:
    """Remove abandoned converter-owned artifacts, including pre-policy leftovers."""
    changed = []
    expected_sources = {str(entry["file"]) for entry in current}
    expected_targets = {field: {str(entry[field]) for entry in current} for field in ("qx", "surge")}
    for source in (ROOT / "Resource/Loon").rglob("*.lpx"):
        if str(source.relative_to(ROOT / "Resource/Loon")) not in expected_sources:
            source.unlink(); changed.append(str(source.relative_to(ROOT)))
    for base, field, extension in [("Adblock/Quantumult X", "qx", "*.snippet"), ("Adblock/Surge", "surge", "*.sgmodule")]:
        for target in (ROOT / base).rglob(extension):
            if str(target.relative_to(ROOT / base)) in expected_targets[field]:
                continue
            if re.search(r"^# Converted by:\s*chance\s*$", target.read_text(encoding="utf-8"), re.M):
                target.unlink(); changed.append(str(target.relative_to(ROOT)))
    active_ids = {entry["id"] for entry in current}
    for directory in (ROOT / "Script").iterdir() if (ROOT / "Script").exists() else []:
        if not directory.is_dir() or directory.name in active_ids:
            continue
        for helper in directory.glob("*.js"):
            if re.fullmatch(r"[a-z_]+_[0-9a-f]{10}\.js", helper.name) and "// Converted by: chance" in helper.read_text(encoding="utf-8"):
                helper.unlink(); changed.append(str(helper.relative_to(ROOT)))
        try: directory.rmdir()
        except OSError: pass
    return changed


def build_rucu6_catalog(payload: Any, previous: list[dict[str, Any]], static: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Enumerate all plugin URLs from a supplied author-published index."""
    urls = []
    def collect(value):
        if isinstance(value, dict):
            for child in value.values(): collect(child)
        elif isinstance(value, list):
            for child in value: collect(child)
        elif isinstance(value, str):
            for match in re.finditer(r"https://rucu6\.pages\.dev/Plugins/[^\s\"'<>]+?\.lpx", value):
                if match.group(0) not in urls: urls.append(match.group(0))
    collect(payload)
    if isinstance(payload, str) and "tgme_widget_message_text" in payload:
        message = re.search(r'<div class="tgme_widget_message_text[^"\n]*"[^>]*>(.*?)</div>', payload, re.S)
        if not message: raise ValueError("RuCu6 author message body is unavailable")
        for link in re.findall(r'href="([^"]+)"', message.group(1)):
            link = html.unescape(link)
            parsed = urllib.parse.urlsplit(link)
            if parsed.scheme != "https": continue
            if parsed.hostname == "pse.is":
                request = urllib.request.Request(link, headers={"User-Agent": LOON_UA})
                with urllib.request.urlopen(request, timeout=20) as response:
                    final_url = response.geturl()
                if urllib.parse.urlsplit(final_url).hostname not in {"www.nsloon.com", "nsloon.com", "rucu6.pages.dev"}:
                    raise ValueError("Unexpected RuCu6 import redirect host")
                decoded = urllib.parse.unquote(html.unescape(final_url))
                if not re.search(r"https://rucu6\.pages\.dev/Plugins/[^\s\"'<>]+?\.lpx", decoded):
                    raise ValueError("RuCu6 short link did not resolve to a plugin URL")
                collect(decoded)
            else:
                collect(urllib.parse.unquote(link))
    if not urls: raise ValueError("RuCu6 index produced zero plugin URLs; refusing catalog deletion")
    prior = {entry["source"]: entry for entry in previous + static}
    other = [entry for entry in previous + static if urllib.parse.urlsplit(entry["source"]).hostname != "rucu6.pages.dev"]
    ids = {entry["id"] for entry in other}; files = {entry["file"] for entry in other}
    qx = {entry["qx"] for entry in other}; surge = {entry["surge"] for entry in other}
    entries = []
    for url in urls:
        if url in prior:
            entry = dict(prior[url])
        else:
            name = safe_filename_from_url(url); stem = name[:-4]
            entry = dict(id="RuCu6_" + ID_SAFE_RE.sub("_", stem), file="RuCu6/" + name, source=url,
                         qx="RuCu6_" + stem + ".snippet", surge="RuCu6_" + stem + ".sgmodule", category="插件")
        for field, used in [("id", ids), ("file", files), ("qx", qx), ("surge", surge)]:
            if entry[field] in used: raise ValueError("RuCu6 index collision: " + field + "=" + entry[field])
            used.add(entry[field])
        entries.append(entry)
    return entries


def validate_combined(entries: list[dict[str, Any]]) -> None:
    required = ("id", "file", "source", "qx", "surge", "category")
    seen = {key: set() for key in ("id", "file", "qx", "surge")}
    for index, entry in enumerate(entries):
        for field in required:
            if not isinstance(entry.get(field), str) or not entry[field].strip():
                raise ValueError(f"catalog[{index}] missing {field}")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", entry["id"]):
            raise ValueError(f"catalog[{index}] invalid id: {entry['id']}")
        for field, suffix in [("file", ".lpx"), ("qx", ".snippet"), ("surge", ".sgmodule")]:
            value = entry[field]
            if value.startswith("/") or "\\" in value or ".." in Path(value).parts or not value.endswith(suffix):
                raise ValueError(f"catalog[{index}] unsafe {field}: {value}")
        for field in seen:
            value = entry[field]
            if value in seen[field]:
                raise ValueError(f"duplicate catalog {field}: {value}")
            seen[field].add(value)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--list-url", default=os.environ.get("KELEE_LIST_URL", DEFAULT_LIST_URL))
    parser.add_argument("--rucu6-list-url", default=os.environ.get("RUCU6_LIST_URL") or DEFAULT_RUCU6_LIST_URL)
    parser.add_argument("--check", action="store_true", help="fail if the generated catalog differs; do not write")
    args = parser.parse_args()

    previous = load_json(CATALOG, [])
    static = load_json(STATIC_CATALOG, [])
    if not isinstance(previous, list) or not isinstance(static, list):
        raise ValueError("WayX source catalogs must be JSON arrays")

    feed_text = fetch_bytes(args.list_url).decode("utf-8-sig")
    payload = json.loads(feed_text)
    rucu6_feed = None
    if args.rucu6_list_url:
        index_url = args.rucu6_list_url
        if index_url == DEFAULT_RUCU6_LIST_URL:
            # telegram.me is Telegram's official alias for the same public post.
            index_url = "https://telegram.me/GitCube/327?embed=1"
        elif urllib.parse.urlsplit(index_url).hostname != "rucu6.pages.dev":
            raise ValueError("RuCu6 index must be the authorized GitCube post or rucu6.pages.dev")
        rucu6_feed = fetch_bytes(index_url).decode("utf-8-sig")
        try: rucu6_payload = json.loads(rucu6_feed)
        except json.JSONDecodeError: rucu6_payload = rucu6_feed
        rucu6 = build_rucu6_catalog(rucu6_payload, previous, static)
        static = [entry for entry in static if urllib.parse.urlsplit(entry["source"]).hostname != "rucu6.pages.dev"] + rucu6
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

    pruned = prune_removed(previous, combined) + prune_orphans(combined)
    CATALOG.parent.mkdir(parents=True, exist_ok=True)
    CATALOG.write_text(desired, encoding="utf-8")
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    # Discovery and monitoring share the same validated upstream response.
    (RUNTIME_DIR / "kelee-feed.json").write_text(
        json.dumps({"source": args.list_url, "text": feed_text}, ensure_ascii=False) + "\n", encoding="utf-8",
    )
    (RUNTIME_DIR / "rucu6-discovery.json").write_text(json.dumps({
        "complete": rucu6_feed is not None, "source": args.rucu6_list_url or None,
        "reason": None if rucu6_feed is not None else "Author-published complete index URL is required; static sources only",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if rucu6_feed is not None:
        (RUNTIME_DIR / "rucu6-feed.json").write_text(json.dumps({"source": args.rucu6_list_url, "text": rucu6_feed}, ensure_ascii=False) + "\n", encoding="utf-8")
    else:
        print("RuCu6 discovery incomplete: no author-published complete index URL; validating static sources only")
    old_sources = {entry["source"]: entry for entry in previous}
    new_sources = {entry["source"]: entry for entry in combined}
    (RUNTIME_DIR / "catalog-discovery.json").write_text(json.dumps({
        "version": 1, "source": args.list_url,
        "added": [entry for entry in combined if entry["source"] not in old_sources],
        "removed": [entry for entry in previous if entry["source"] not in new_sources],
        "updated": [entry for entry in combined if entry["source"] in old_sources and entry != old_sources[entry["source"]]],
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
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
