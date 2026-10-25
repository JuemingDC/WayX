#!/usr/bin/env python3
"""Raw HTTP transport adapter for WayX original upstream resources.

Author: chance
Category: Automation / Original Source Fetch

This helper does not choose mirrors, rewrite URLs, parse plugins, or perform
conversion. Node owns host-profile selection and passes the exact original URL
plus request headers. stdout is reserved for response bytes.
"""

from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.parse
import urllib.request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--user-agent", required=True)
    parser.add_argument("--accept", default="*/*")
    parser.add_argument("--timeout-seconds", type=float, default=20.0)
    # Modified: 2026-10-25 (chance). Enforce the caller's byte limit while reading.
    parser.add_argument("--max-bytes", type=int, default=512 * 1024 * 1024)
    return parser.parse_args()


def validate_url(value: str) -> str:
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"source URL must use HTTP(S): {value}")
    return value


def main() -> int:
    args = parse_args()
    if args.max_bytes <= 0:
        print("max-bytes must be positive", file=sys.stderr)
        return 2
    try:
        url = validate_url(args.url)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": args.user_agent,
            "Accept": args.accept,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=args.timeout_seconds) as response:
            body = bytearray()
            while True:
                chunk = response.read(min(64 * 1024, args.max_bytes + 1 - len(body)))
                if not chunk:
                    break
                body.extend(chunk)
                if len(body) > args.max_bytes:
                    print(f"Source exceeds bounded download size: {url}", file=sys.stderr)
                    return 25
    except urllib.error.HTTPError as exc:
        server = exc.headers.get("server", "") if exc.headers else ""
        print(
            f"HTTP {exc.code} from original source {url}"
            + (f"; server={server}" if server else ""),
            file=sys.stderr,
        )
        return 22
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"request failed for original source {url}: {exc}", file=sys.stderr)
        return 23

    if not body:
        print(f"empty response from original source {url}", file=sys.stderr)
        return 24

    sys.stdout.buffer.write(body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
