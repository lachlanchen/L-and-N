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


# The packaged Android and iOS apps are not served from the site, so their
# WebView origin has to be allowed as well or they have no transcription at
# all: Android's system WebView has no speech recognizer, and Apple's
# dictation returns nothing for some languages.
NATIVE_APP_ORIGINS = ("https://localhost", "capacitor://localhost", "ionic://localhost")


def allowed_origins() -> tuple[str, ...]:
    configured = os.environ.get("LANDN_ALLOWED_ORIGIN", "https://l-and-n.lazying.art")
    return tuple(part.strip() for part in configured.split(",") if part.strip()) + NATIVE_APP_ORIGINS


def exact_origin_allowed(value: str | None, allowed_origin: str | tuple[str, ...]) -> bool:
    if not value:
        return False
    parsed = urlsplit(value)
    candidate = f"{parsed.scheme}://{parsed.netloc}"
    if isinstance(allowed_origin, str):
        return candidate == allowed_origin
    return candidate in allowed_origin


class Handler(BaseHTTPRequestHandler):
    server_version = "LAndNGateway/1"

    def _json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        cors_origin = getattr(self, "cors_origin", None)
        if cors_origin:
            self.send_header("Access-Control-Allow-Origin", cors_origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        origin = self.headers.get("Origin")
        if self.path == "/api/pronunciation/transcriptions" and exact_origin_allowed(origin, allowed_origins()):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", origin or "")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "600")
            self.send_header("Vary", "Origin")
            self.end_headers()
            return
        self._json(404, {"error": "not_found"})

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/healthz":
            self._json(404, {"error": "not_found"})
            return
        self._json(200, {"ok": True, "service": "l-and-n-gateway"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/api/pronunciation/transcriptions":
            self._json(404, {"error": "not_found"})
            return

        allowed = allowed_origins()
        origin = self.headers.get("Origin")
        referer = self.headers.get("Referer")
        if not (exact_origin_allowed(origin, allowed) or exact_origin_allowed(referer, allowed)):
            self._json(403, {"error": "origin_denied"})
            return
        # A WebView reads the response only when the origin is echoed back.
        self.cors_origin = origin if exact_origin_allowed(origin, allowed) else None

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
                if self.cors_origin:
                    self.send_header("Access-Control-Allow-Origin", self.cors_origin)
                    self.send_header("Vary", "Origin")
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
