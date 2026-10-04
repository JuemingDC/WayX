#!/usr/bin/env python3
"""Chance upstream monitor.

GitHub Actions records monitored specification/repository changes and updates
local state/mirrors. Conversion handling is performed by the unified WayX
automation workflow; this monitor does not create review pull requests.
"""
from __future__ import annotations

import argparse
import copy
import fnmatch
import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / ".github" / "monitor" / "sources.json"


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
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


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
    mirror = safe(safe(ROOT, settings.get("mirror_root", "upstream")), src["save_as"])
    cached = state.get("url") == src["url"] and state.get("sha256")
    mirror_valid = mirror.is_file() and cached and sha256(mirror.read_bytes()) == state["sha256"]
    headers = {
        "User-Agent": settings.get("user_agent", "chance-upstream-monitor/2.0"),
        "Accept-Encoding": "identity",
    }
    if mirror_valid and state.get("etag"):
        headers["If-None-Match"] = state["etag"]
    if mirror_valid and state.get("last_modified"):
        headers["If-Modified-Since"] = state["last_modified"]

    code, raw, response_headers = request(
        src["url"],
        headers,
        int(settings.get("timeout_seconds", 25)),
    )
    if code == 304:
        if mirror_valid:
            return False, False, "304 Not Modified"
        raise RuntimeError("HTTP 304 without a valid cached mirror: " + src["url"])
    if code != 200:
        raise RuntimeError(f"HTTP {code}: {src['url']}")

    data = normalize(raw, src.get("normalize", "raw"))
    digest = sha256(data)
    old_digest = state.get("sha256") if cached else None
    response_headers = {key.lower(): value for key, value in response_headers.items()}

    new_state = {
        "kind": "http",
        "url": src["url"],
        "sha256": digest,
        "etag": response_headers.get("etag"),
        "last_modified": response_headers.get("last-modified"),
        "checked_at": now(),
    }

    if old_digest is None:
        mirror.parent.mkdir(parents=True, exist_ok=True)
        mirror.write_bytes(data)
        state.clear()
        state.update(new_state)
        return False, True, "baseline created"

    if digest == old_digest:
        if not mirror_valid:
            mirror.parent.mkdir(parents=True, exist_ok=True)
            mirror.write_bytes(data)
        metadata_changed = any(
            state.get(key) != new_state.get(key)
            for key in ("etag", "last_modified")
        )
        state.update(new_state)
        return False, metadata_changed or not mirror_valid, "content hash unchanged" + ("; mirror repaired" if not mirror_valid else "")

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
    old = state.get("remote_sha") if state.get("repo") == repo and state.get("ref") == src.get("ref", "HEAD") else None

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
        return False, True, "baseline commit recorded"

    if old == head:
        return False, False, "HEAD unchanged"

    compare = github_json(
        f"https://api.github.com/repos/{repo}/compare/{old}...{head}",
        user_agent,
        timeout,
    )
    # GitHub's compare API reports at most 300 files, even with pagination.
    # Never advance a baseline when the returned change list may be truncated.
    if not isinstance(compare.get("files"), list) or len(compare["files"]) >= 300:
        raise RuntimeError("Incomplete GitHub comparison file list; baseline retained")
    if compare.get("status") != "ahead":
        raise RuntimeError("GitHub history is not a forward comparison; baseline retained")
    globs = src.get("include_globs", [])
    base = safe(
        safe(ROOT, settings.get("mirror_root", "upstream")),
        src.get("save_as", src["id"]),
    )
    matched = 0

    for item in compare.get("files", []):
        path = item.get("filename", "")
        previous = item.get("previous_filename") if item.get("status") == "renamed" else None
        current_selected = bool(path) and selected(path, globs)
        previous_selected = bool(previous) and selected(previous, globs)
        if not current_selected and not previous_selected:
            continue

        matched += 1
        status = item.get("status", "modified")
        target = safe(base, path) if current_selected else None
        if previous_selected and src.get("sync_changed_files", True):
            safe(base, previous).unlink(missing_ok=True)
        if not current_selected:
            continue

        if status == "removed":
            if src.get("sync_changed_files", True) and target.exists():
                target.unlink()
            continue

        raw_url = item.get("raw_url")
        if src.get("sync_changed_files", True):
            if not raw_url:
                raise RuntimeError("Missing raw URL for monitored file: " + path)
            response_status, response_body, _ = request(
                raw_url,
                {
                    "User-Agent": user_agent,
                    "Accept-Encoding": "identity",
                },
                timeout,
            )
            if response_status != 200:
                raise RuntimeError(f"HTTP {response_status} downloading monitored file: {path}")
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


def snapshot_source(src: dict, settings: dict, state_path: Path):
    base = safe(ROOT, settings.get("mirror_root", "upstream"))
    mirror = safe(base, src.get("save_as", src["id"]))
    directory = src["kind"] == "github_repo"
    files = [state_path]
    if directory:
        if mirror.is_file():
            raise ValueError("Repository mirror must be a directory")
        files.extend(file for file in mirror.rglob("*") if file.is_file())
    else:
        files.append(mirror)
    return mirror, directory, {file: file.read_bytes() if file.exists() else None for file in files}


def restore_source(snapshot) -> None:
    mirror, directory, files = snapshot
    failures = []
    targets = set(files)
    if directory:
        targets.update(file for file in mirror.rglob("*") if file.is_file())
    for file in targets:
        try:
            data = files.get(file)
            if data is None:
                file.unlink(missing_ok=True)
            else:
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(data)
        except Exception as exc:
            failures.append(str(exc))
    if failures:
        raise RuntimeError("Monitor rollback failed: " + "; ".join(failures))


def build_change_summary(results: list[dict], runtime: Path) -> Path:
    runtime.mkdir(parents=True, exist_ok=True)
    summary = runtime / "upstream_changes.md"
    lines = [
        "# WayX monitored upstream changes\n\n",
        f"- Checked at: `{now()}`\n\n",
        "Every source result belongs to this run. Failed monitoring blocks publication; "
        "document changes do not automatically alter conversion semantics.\n\n",
        "## Source results\n\n",
    ]
    for result in results:
        src, message = result["source"], result["message"]
        lines.extend([
            f"### {src.get('name', src['id'])}\n\n",
            f"- Source ID: `{src['id']}`\n",
            f"- Platform: `{src.get('platform', 'unknown')}`\n",
            f"- Category: `{src.get('category', 'unspecified')}`\n",
            f"- Result: {message}\n",
            f"- Succeeded: {str(result['succeeded']).lower()}\n",
            f"- Upstream: `{src.get('url') or src.get('repo')}`\n\n",
        ])
    summary.write_text("".join(lines), "utf-8")
    return summary

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default=str(CONFIG))
    args = parser.parse_args()

    runtime = ROOT / ".github/monitor/.runtime"
    try:
        cfg = load_json(Path(args.config), {})
        settings = cfg.get("settings", {})
        runtime = safe(ROOT, settings.get("runtime_root", ".github/monitor/.runtime"))
        sources = cfg.get("sources")
        if not isinstance(sources, list) or not sources:
            raise ValueError("Monitor configuration must contain sources")
        ids = [src.get("id") if isinstance(src, dict) else None for src in sources]
        if any(not isinstance(value, str) or not value for value in ids) or len(set(ids)) != len(ids):
            raise ValueError("Monitor source IDs must be nonempty and unique")
        state_path = safe(ROOT, settings.get("state_file", ".github/monitor/state.json"))
        state = load_json(state_path, {"version": 1, "sources": {}})
        if not isinstance(state.get("sources", {}), dict):
            raise ValueError("Monitor state sources must be an object")
        state.setdefault("sources", {})
    except Exception as exc:
        source = {"id": "monitor-configuration", "url": ".github/monitor/sources.json"}
        reason = f"{type(exc).__name__}: {exc}"
        failure = {"source": source, "stage": "configuration", "errorType": type(exc).__name__, "reason": reason, "rollbackSucceeded": True}
        result = {"source": source, "changed": False, "succeeded": False, "message": reason}
        summary = build_change_summary([result], runtime)
        save_json(runtime / "monitor-result.json", {"version": 1, "complete": False, "results": [result], "failures": [failure]})
        set_output("has_change", "false")
        set_output("change_summary", summary.relative_to(ROOT).as_posix())
        set_output("complete", "false")
        set_output("has_failures", "true")
        print("[error] monitor configuration: " + reason, file=sys.stderr)
        return 1

    results = []
    failures = []

    for src in cfg.get("sources", []):
        source_id = src["id"]
        previous_state = copy.deepcopy(state)
        snapshot = None
        stage = "snapshot"
        try:
            snapshot = snapshot_source(src, settings, state_path)
            source_state = state["sources"].setdefault(source_id, {})
            stage = "fetch-and-mirror"
            if src["kind"] == "http":
                changed, state_changed, message = check_http(src, source_state, settings)
            elif src["kind"] == "github_repo":
                changed, state_changed, message = check_repo(src, source_state, settings)
            else:
                raise ValueError("unsupported source kind: " + src["kind"])
            if state_changed:
                stage = "write-state"
                save_json(state_path, state)
            else:
                state = previous_state
        except Exception as exc:
            rollback_succeeded = True
            reason = f"{type(exc).__name__}: {exc}"
            try:
                if snapshot is not None:
                    restore_source(snapshot)
            except Exception as rollback:
                rollback_succeeded = False
                reason += "; " + str(rollback)
            state = previous_state
            print(f"[error] {source_id}: {type(exc).__name__}: {exc}", file=sys.stderr)
            failure = {"source": src, "stage": stage, "errorType": type(exc).__name__, "reason": reason, "rollbackSucceeded": rollback_succeeded}
            failures.append(failure)
            results.append({"source": src, "changed": False, "succeeded": False, "message": reason})
            continue

        print(f"[result] {source_id}: {message}")
        results.append({"source": src, "changed": changed, "succeeded": True, "message": message})

    changed_items = [
        result for result in results if result["changed"]
    ]

    summary = build_change_summary(results, runtime)
    save_json(runtime / "monitor-result.json", {"version": 1, "complete": not failures, "results": results, "failures": failures})

    set_output("has_change", "true" if changed_items else "false")
    set_output("change_summary", summary.relative_to(ROOT).as_posix())
    set_output("complete", "false" if failures else "true")
    set_output("has_failures", "true" if failures else "false")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
