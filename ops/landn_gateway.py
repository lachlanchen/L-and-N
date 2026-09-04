#!/usr/bin/env python3
"""Small same-origin boundary for L-and-N's private LazyEdge Whisper route."""

from __future__ import annotations

import json
import os
import threading
import time
import urllib.error
import urllib.request
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

MAX_BODY_BYTES = 2_500_000
WINDOW_SECONDS = 60
REQUESTS_PER_WINDOW = 6
UPSTREAM_TIMEOUT_SECONDS = 90


class RateWindow:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, client: str, now: float | None = None) -> bool:
        current = time.monotonic() if now is None else now
        with self._lock:
            events = self._events[client]
            while events and current - events[0] >= WINDOW_SECONDS:
                events.popleft()
            if len(events) >= REQUESTS_PER_WINDOW:
                return False
            events.append(current)
            return True


rate_window = RateWindow()
upstream_slot = threading.BoundedSemaphore(1)


def exact_origin_allowed(value: str | None, allowed_origin: str) -> bool:
    if not value:
        return False
    parsed = urlsplit(value)
    return f"{parsed.scheme}://{parsed.netloc}" == allowed_origin


class Handler(BaseHTTPRequestHandler):
    server_version = "LAndNGateway/1"

    def _json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/healthz":
            self._json(404, {"error": "not_found"})
            return
        self._json(200, {"ok": True, "service": "l-and-n-gateway"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/pronunciation/transcriptions":
            self._json(404, {"error": "not_found"})
            return

        allowed_origin = os.environ.get("LANDN_ALLOWED_ORIGIN", "https://l-and-n.lazying.art")
        origin = self.headers.get("Origin")
        referer = self.headers.get("Referer")
        if not (exact_origin_allowed(origin, allowed_origin) or exact_origin_allowed(referer, allowed_origin)):
            self._json(403, {"error": "origin_denied"})
            return

        client = self.headers.get("X-LAndN-Client-Address", self.client_address[0])
        if not rate_window.allow(client):
            self._json(429, {"error": "rate_limited"})
            return

        content_type = self.headers.get("Content-Type", "")
        if not content_type.lower().startswith("multipart/form-data;"):
            self._json(415, {"error": "multipart_required"})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length < 1 or content_length > MAX_BODY_BYTES:
            self._json(413, {"error": "audio_too_large"})
            return
        if not upstream_slot.acquire(blocking=False):
            self._json(503, {"error": "speech_busy"})
            return

        try:
            token_path = Path(os.environ["LANDN_SPEECH_TOKEN_FILE"])
            token = token_path.read_text(encoding="utf-8").strip()
            upstream = os.environ.get(
                "LANDN_SPEECH_UPSTREAM",
                "http://127.0.0.1:18083/api/speech/transcriptions",
            )
            request = urllib.request.Request(
                upstream,
                data=self.rfile.read(content_length),
                method="POST",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": content_type,
                    "Content-Length": str(content_length),
                },
            )
            with urllib.request.urlopen(request, timeout=UPSTREAM_TIMEOUT_SECONDS) as response:
                body = response.read(64_000)
                self.send_response(response.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store, private")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(body)
        except KeyError:
            self._json(503, {"error": "speech_not_configured"})
        except (OSError, urllib.error.URLError) as error:
            status = error.code if isinstance(error, urllib.error.HTTPError) else 503
            self._json(status, {"error": "speech_unavailable"})
        finally:
            upstream_slot.release()

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} {format % args}", flush=True)


def main() -> None:
    listen = os.environ.get("LANDN_GATEWAY_LISTEN", "127.0.0.1")
    port = int(os.environ.get("LANDN_GATEWAY_PORT", "18683"))
    ThreadingHTTPServer((listen, port), Handler).serve_forever()


if __name__ == "__main__":
    main()
