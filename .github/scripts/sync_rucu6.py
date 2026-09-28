#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
RESOURCE_DIR = ROOT / "Resource" / "Loon" / "RuCu6"
SCRIPT_DIR = ROOT / "script" / "RuCu6"
REPORT_DIR = ROOT / "monitor" / ".runtime" / "reports"
UA = "Surge iOS/3374"
CF_BASE = "https://rucu6.pages.dev"
SOURCES = [
    "bilibili.lpx", "jingdong.lpx", "amap.lpx", "weibo.lpx",
    "xiaohongshu.lpx", "zhihu.lpx", "myblockads.lpx", "webpage.lpx", "youtube.lpx",
]
SECTION_RE = re.compile(r"^\[([^\]]+)\]\s*$", re.M)
SCRIPT_URL_RE = re.compile(r'script\("(https://rucu6\.pages\.dev/Scripts/[^"?]+\.js)"')


def session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": UA,
        "Accept": "text/plain,*/*;q=0.8",
        "Cache-Control": "no-cache",
    })
    proxy = os.getenv("HTTP_PROXY_URL", "").strip()
    if proxy:
        s.proxies.update({"http": proxy, "https": proxy})
    return s


def fetch_text(s: requests.Session, url: str) -> str:
    r = s.get(url, timeout=25, allow_redirects=True)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text.replace("\r\n", "\n").replace("\r", "\n")


def validate_lpx(text: str, url: str) -> None:
    head = text[:1200].lower()
    if "<html" in head or "<!doctype html" in head:
        raise ValueError(f"HTML returned instead of LPX: {url}")
    if "#!name" not in text:
        raise ValueError(f"missing #!name: {url}")
    if not SECTION_RE.search(text):
        raise ValueError(f"missing LPX sections: {url}")


def validate_js(text: str, url: str) -> None:
    head = text[:1200].lower()
    if "<html" in head or "<!doctype html" in head:
        raise ValueError(f"HTML returned instead of JS: {url}")
    if len(text.strip()) < 8:
        raise ValueError(f"empty JS: {url}")


def atomic_write(path: Path, text: str) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    old = path.read_text("utf-8") if path.exists() else None
    if old == text:
        return False
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(text, "utf-8")
    tmp.replace(path)
    return True


def main() -> int:
    s = session()
    changed = []
    failures = []
    script_urls = set()

    for name in SOURCES:
        url = f"{CF_BASE}/Plugins/{name}"
        try:
            text = fetch_text(s, url)
            validate_lpx(text, url)
            if atomic_write(RESOURCE_DIR / name, text):
                changed.append(str((RESOURCE_DIR / name).relative_to(ROOT)))
            script_urls.update(SCRIPT_URL_RE.findall(text))
        except Exception as e:
            failures.append({"url": url, "error": str(e)})
            if not (RESOURCE_DIR / name).exists():
                print(f"FATAL: first sync failed for {url}: {e}", file=sys.stderr)

    for url in sorted(script_urls):
        rel = url.split("/Scripts/", 1)[1]
        path = SCRIPT_DIR / rel
        try:
            text = fetch_text(s, url)
            validate_js(text, url)
            if atomic_write(path, text):
                changed.append(str(path.relative_to(ROOT)))
        except Exception as e:
            failures.append({"url": url, "error": str(e)})
            if not path.exists():
                print(f"WARN: script unavailable and no cached copy: {url}: {e}", file=sys.stderr)

    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    report = {
        "source": CF_BASE,
        "plugins": SOURCES,
        "scripts_discovered": len(script_urls),
        "changed": changed,
        "failures": failures,
    }
    (REPORT_DIR / "rucu6-sync.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf-8")

    missing = [n for n in SOURCES if not (RESOURCE_DIR / n).exists()]
    if missing:
        print("Missing required RuCu6 source files: " + ", ".join(missing), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
