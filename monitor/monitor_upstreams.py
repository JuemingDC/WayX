#!/usr/bin/env python3
"""Chance upstream monitor.

GitHub Actions performs cheap upstream checks. Real semantic changes are handed
off to ChatGPT Work through a GitHub pull request. This file never calls the
OpenAI API.
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "monitor" / "sources.json"


class TextParser(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        self.depth += tag.lower() in self.SKIP

    def handle_endtag(self, tag):
        if tag.lower() in self.SKIP and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            value = re.sub(r"\s+", " ", data).strip()
            if value:
                self.parts.append(value)

    def text(self) -> str:
        return "\n".join(self.parts).strip() + "\n"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text("utf-8"))
    except FileNotFoundError:
        return default


def save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        "utf-8",
    )


def safe(base: Path, relative: str) -> Path:
    path = PurePosixPath(relative)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"unsafe path: {relative}")
    return base.joinpath(*path.parts)


def normalize(data: bytes, mode: str) -> bytes:
    if mode == "raw":
        return data
    if mode == "html_text":
        parser = TextParser()
        parser.feed(data.decode("utf-8", "replace"))
        return parser.text().encode()
    raise ValueError(f"unknown normalize mode: {mode}")


def request(url: str, headers=None, timeout: int = 30):
    req = urllib.request.Request(url, headers=headers or {}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.status, response.read(), dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        return (
            exc.code,
            exc.read(),
            dict(exc.headers.items()) if exc.headers else {},
        )


def github_headers(user_agent: str) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": user_agent,
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = "Bearer " + token
    return headers


def github_json(url: str, user_agent: str, timeout: int):
    status, body, _ = request(url, github_headers(user_agent), timeout)
    if status != 200:
        raise RuntimeError(f"GitHub API HTTP {status}: {url}")
    return json.loads(body)


def selected(path: str, globs: list[str]) -> bool:
    return not globs or any(fnmatch.fnmatch(path, pattern) for pattern in globs)


def check_http(src: dict, state: dict, settings: dict):
    headers = {
        "User-Agent": settings.get("user_agent", "chance-upstream-monitor/2.0"),
        "Accept-Encoding": "identity",
    }
    if state.get("etag"):
        headers["If-None-Match"] = state["etag"]
    if state.get("last_modified"):
        headers["If-Modified-Since"] = state["last_modified"]

    code, raw, response_headers = request(
        src["url"],
        headers,
        int(settings.get("timeout_seconds", 25)),
    )
    if code == 304:
        return False, False, "304 Not Modified"
    if code != 200:
        raise RuntimeError(f"HTTP {code}: {src['url']}")

    data = normalize(raw, src.get("normalize", "raw"))
    digest = sha256(data)
    old_digest = state.get("sha256")
    mirror = safe(
        ROOT / settings.get("mirror_root", "upstream"),
        src["save_as"],
    )

    new_state = {
        "kind": "http",
        "url": src["url"],
        "sha256": digest,
        "etag": response_headers.get("ETag"),
        "last_modified": response_headers.get("Last-Modified"),
        "checked_at": now(),
    }

    if old_digest is None:
        mirror.parent.mkdir(parents=True, exist_ok=True)
        mirror.write_bytes(data)
        state.clear()
        state.update(new_state)
        return False, True, "baseline created; Work review skipped"

    if digest == old_digest:
        metadata_changed = any(
            state.get(key) != new_state.get(key)
            for key in ("etag", "last_modified")
        )
        state.update(new_state)
        return False, metadata_changed, "content hash unchanged"

    mirror.parent.mkdir(parents=True, exist_ok=True)
    mirror.write_bytes(data)
    state.clear()
    state.update(new_state)
    return True, True, "content changed"


def check_repo(src: dict, state: dict, settings: dict):
    user_agent = settings.get("user_agent", "chance-upstream-monitor/2.0")
    timeout = int(settings.get("timeout_seconds", 25))
    repo = src["repo"]
    ref = urllib.parse.quote(src.get("ref", "HEAD"), safe="")

    commit = github_json(
        f"https://api.github.com/repos/{repo}/commits/{ref}",
        user_agent,
        timeout,
    )
    head = commit["sha"]
    old = state.get("remote_sha")

    if old is None:
        state.clear()
        state.update(
            {
                "kind": "github_repo",
                "repo": repo,
                "ref": src.get("ref", "HEAD"),
                "remote_sha": head,
                "checked_at": now(),
            }
        )
        return False, True, "baseline commit recorded; Work review skipped"

    if old == head:
        return False, False, "HEAD unchanged"

    compare = github_json(
        f"https://api.github.com/repos/{repo}/compare/{old}...{head}",
        user_agent,
        timeout,
    )
    globs = src.get("include_globs", [])
    base = safe(
        ROOT / settings.get("mirror_root", "upstream"),
        src.get("save_as", src["id"]),
    )
    matched = 0

    for item in compare.get("files", []):
        path = item.get("filename", "")
        if not path or not selected(path, globs):
            continue

        matched += 1
        status = item.get("status", "modified")
        target = safe(base, path)

        if status == "removed":
            if src.get("sync_changed_files", True) and target.exists():
                target.unlink()
            continue

        raw_url = item.get("raw_url")
        if src.get("sync_changed_files", True) and raw_url:
            response_status, response_body, _ = request(
                raw_url,
                {
                    "User-Agent": user_agent,
                    "Accept-Encoding": "identity",
                },
                timeout,
            )
            if response_status == 200:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(response_body)

    state.clear()
    state.update(
        {
            "kind": "github_repo",
            "repo": repo,
            "ref": src.get("ref", "HEAD"),
            "remote_sha": head,
            "checked_at": now(),
        }
    )

    if not matched:
        return False, True, "repository changed; no monitored file matched"

    return True, True, f"repository changed; {matched} monitored file(s) affected"


def set_output(name: str, value: str) -> None:
    output_file = os.getenv("GITHUB_OUTPUT")
    if output_file:
        with open(output_file, "a", encoding="utf-8") as handle:
            handle.write(f"{name}={value}\n")


def build_review_summary(review_items: list[tuple], runtime: Path) -> Path:
    runtime.mkdir(parents=True, exist_ok=True)
    summary = runtime / "work_review.md"
    lines = [
        "# WayX upstream semantic review\n\n",
        f"- Checked at: `{now()}`\n",
        "- Handoff: `ChatGPT Work`\n",
        "- OpenAI API: `not used`\n\n",
        "This PR was created by GitHub Actions. Use the PR Files changed view as the primary diff source.\n\n",
        "## Sources requiring review\n\n",
    ]
    for src, message in review_items:
        lines.extend([
            f"### {src.get('name', src['id'])}\n\n",
            f"- Source ID: `{src['id']}`\n",
            f"- Platform: `{src.get('platform', 'unknown')}`\n",
            f"- Category: `{src.get('category', 'unspecified')}`\n",
            f"- Result: {message}\n",
            f"- Upstream: `{src.get('url') or src.get('repo')}`\n\n",
        ])
    lines.extend([
        "## Work requirement\n\n",
        "Read `CONVERSION_SPEC.md`, the relevant `docs/conversion-spec/` blocks, and "
        "`monitor/WORK_TASK_PROMPT.md` before changing any target file. "
        "Add `work-complete` only after all required changes and validation pass. "
        "If the upstream change should not be adopted, add `work-reject`. "
        "If anything remains uncertain, add neither label.\n",
    ])
    summary.write_text("".join(lines), "utf-8")
    return summary


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(CONFIG))
    args = parser.parse_args()

    cfg = load_json(Path(args.config), {})
    settings = cfg.get("settings", {})
    state_path = safe(ROOT, settings.get("state_file", "monitor/state.json"))
    state = load_json(state_path, {"version": 1, "sources": {}})
    states = state.setdefault("sources", {})
    runtime = safe(ROOT, settings.get("runtime_root", "monitor/.runtime"))

    results = []
    any_state = False

    for src in cfg.get("sources", []):
        source_id = src["id"]
        source_state = states.setdefault(source_id, {})
        try:
            if src["kind"] == "http":
                changed, state_changed, message = check_http(src, source_state, settings)
            elif src["kind"] == "github_repo":
                changed, state_changed, message = check_repo(src, source_state, settings)
            else:
                raise ValueError("unsupported source kind: " + src["kind"])
        except Exception as exc:
            print(f"[error] {source_id}: {type(exc).__name__}: {exc}", file=sys.stderr)
            results.append((src, False, False, "ERROR: " + str(exc)))
            continue

        any_state |= state_changed
        print(f"[result] {source_id}: {message}")
        results.append((src, changed, state_changed, message))

    if any_state:
        save_json(state_path, state)

    review_items = [
        (src, message)
        for src, changed, _, message in results
        if changed and src.get("analysis", "none") == "work"
    ]

    summary = runtime / "work_review.md"
    if review_items:
        summary = build_review_summary(review_items, runtime)

    set_output("has_change", "true" if any(item[1] for item in results) else "false")
    set_output("has_review", "true" if review_items else "false")
    set_output("review_summary", summary.relative_to(ROOT).as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
